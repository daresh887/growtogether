-- Contracts: structured, signed, enforceable commitments.
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
--
-- The contract is the atomic unit of the product. It is signed with the
-- platform, filed under a curated category (a "register"), and witnessed
-- in public. Proof-of-work check-ins attach to the contract itself.
-- Status changes (breach/honor/redeem) are applied ONLY by the
-- enforcement engine using the service role — there is intentionally
-- no UPDATE policy for regular users.

-- ============================================
-- RESET
-- ============================================
-- An earlier revision of this file created a group-scoped `contracts`
-- table. Re-running would skip it (create-if-not-exists) and then fail
-- on the missing `category` column, so drop the old shape first.
-- The guard refuses to drop anything that holds real rows.

do $$
declare row_count int;
begin
    if to_regclass('public.contracts') is not null then
        execute 'select count(*) from public.contracts' into row_count;
        if row_count > 0 then
            raise exception
                'public.contracts holds % row(s) — refusing to drop. Inspect and migrate manually.',
                row_count;
        end if;
    end if;
end $$;

drop table if exists contract_witnesses cascade;
drop table if exists contract_events cascade;
drop table if exists checkins cascade;
drop table if exists contracts cascade;

-- ============================================
-- TABLES
-- ============================================

create table if not exists contracts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,

    -- Where the contract is filed
    category text not null
        check (category in ('build', 'train', 'learn', 'create', 'discipline')),
    discipline text not null default '',

    -- The terms, in the signer's own words
    commitment text not null,
    cadence text not null default 'daily'
        check (cadence in ('daily', 'weekdays', 'three_per_week', 'weekly')),
    forfeit text not null,

    -- The signature, stored as stroke data so it can be redrawn
    signature_strokes jsonb not null,
    signer_name text not null default '',

    -- Enforcement bookkeeping
    timezone text not null default 'UTC',
    status text not null default 'active'
        check (status in ('active', 'breached', 'honored', 'redeemed', 'void')),
    effective_at timestamptz not null,
    breached_at timestamptz,
    resolved_at timestamptz,
    created_at timestamptz not null default now()
);

-- One live contract per person per register
create unique index if not exists contracts_one_active_per_register
    on contracts (user_id, category)
    where status = 'active';

create index if not exists contracts_wall_idx on contracts (created_at desc);
create index if not exists contracts_category_idx on contracts (category, status);

-- Proof of work, filed against the contract
create table if not exists checkins (
    id uuid primary key default gen_random_uuid(),
    contract_id uuid not null references contracts(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    content text not null,
    created_at timestamptz not null default now()
);

create index if not exists checkins_contract_idx on checkins (contract_id, created_at desc);
create index if not exists checkins_recent_idx on checkins (created_at desc);

-- Append-only ledger of what happened to each contract
create table if not exists contract_events (
    id uuid primary key default gen_random_uuid(),
    contract_id uuid not null references contracts(id) on delete cascade,
    type text not null check (type in ('signed', 'breach', 'honor', 'redeem', 'void')),
    detail text not null default '',
    created_at timestamptz not null default now()
);

create index if not exists contract_events_contract_idx
    on contract_events (contract_id, created_at desc);

-- Witnesses (co-signers). Schema ready; feature ships later.
create table if not exists contract_witnesses (
    contract_id uuid not null references contracts(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    signed_at timestamptz not null default now(),
    primary key (contract_id, user_id)
);

-- ============================================
-- RLS
-- ============================================

alter table contracts enable row level security;
alter table checkins enable row level security;
alter table contract_events enable row level security;
alter table contract_witnesses enable row level security;

-- The record is public: anyone, signed in or not, can read it.
create policy "contracts_select_public" on contracts
    for select to anon, authenticated using (true);

create policy "checkins_select_public" on checkins
    for select to anon, authenticated using (true);

create policy "contract_events_select_public" on contract_events
    for select to anon, authenticated using (true);

create policy "contract_witnesses_select_public" on contract_witnesses
    for select to anon, authenticated using (true);

-- You may only sign for yourself.
create policy "contracts_insert_own" on contracts
    for insert to authenticated with check (auth.uid() = user_id);

-- No user UPDATE/DELETE policies on contracts: breach/honor/redeem are
-- executed by the enforcement engine (service role bypasses RLS).
-- Contracts cannot be edited or removed by their signer. That is the point.

-- Proof may only be filed by the signer, against their own live contract.
create policy "checkins_insert_own" on checkins
    for insert to authenticated with check (
        auth.uid() = user_id
        and exists (
            select 1 from contracts c
            where c.id = contract_id
              and c.user_id = auth.uid()
              and c.status = 'active'
        )
    );

-- Only the 'signed' event may be written from the client path,
-- and only for your own contract.
create policy "contract_events_insert_signed" on contract_events
    for insert to authenticated with check (
        type = 'signed'
        and exists (
            select 1 from contracts c
            where c.id = contract_id and c.user_id = auth.uid()
        )
    );

-- Witnesses sign for themselves, and cannot witness their own contract.
create policy "contract_witnesses_insert_own" on contract_witnesses
    for insert to authenticated with check (
        auth.uid() = user_id
        and not exists (
            select 1 from contracts c
            where c.id = contract_id and c.user_id = auth.uid()
        )
    );
