-- Comments on a failed contract: the humiliation the signer agreed to.
-- Mirrors checkin_comments so the same UI renders both.
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

create table if not exists contract_comments (
    id uuid primary key default gen_random_uuid(),
    contract_id uuid not null references contracts(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    author_name text not null default 'Someone',
    author_photo text not null default '',
    content text not null,
    parent_id uuid references contract_comments(id) on delete cascade,
    created_at timestamptz not null default now()
);

create index if not exists contract_comments_contract_idx
    on contract_comments (contract_id, created_at);

alter table contract_comments enable row level security;

create policy "contract_comments_select_public" on contract_comments
    for select to anon, authenticated using (true);

create policy "contract_comments_insert_own" on contract_comments
    for insert to authenticated with check (auth.uid() = user_id);

create policy "contract_comments_delete_own" on contract_comments
    for delete to authenticated using (auth.uid() = user_id);
