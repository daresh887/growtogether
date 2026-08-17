-- PSEUDONYMOUS UNTIL YOU FAIL
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
--
-- The stake changes shape. You sign under a username and whatever picture
-- you like; the real name and the face you signed with are sealed. They
-- are unsealed by one event only — the contract is breached.
--
-- This has to be enforced here, not in the app. The anon key is public,
-- so anything a page merely declines to render is still one REST call
-- away. Splitting the sealed fields into their own table lets RLS make
-- the seal real: the row is unreadable until you fail.
--
-- Sealed:  real name, face photo, signature (people sign their own name).
-- Public:  username, avatar, social handle, and the terms themselves.

-- ============================================
-- 1. Public identity lives on the profile.
--    Social moves here from the contract: optional, editable in
--    settings, and shown on the profile from day one.
-- ============================================
alter table profiles
    add column if not exists username text,
    add column if not exists social_platform text not null default '',
    add column if not exists social_handle text not null default '';

-- Lowercased on write, so a plain unique index is the whole rule.
do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'profiles_username_format'
    ) then
        alter table profiles add constraint profiles_username_format
            check (username is null or username ~ '^[a-z0-9_]{3,20}$');
    end if;
    if not exists (
        select 1 from pg_constraint where conname = 'profiles_social_handle_len'
    ) then
        alter table profiles add constraint profiles_social_handle_len
            check (char_length(social_handle) <= 60);
    end if;
    if not exists (
        select 1 from pg_constraint where conname = 'profiles_social_platform_len'
    ) then
        alter table profiles add constraint profiles_social_platform_len
            check (char_length(social_platform) <= 20);
    end if;
end $$;

create unique index if not exists profiles_username_key on profiles (username);

-- ============================================
-- 2. The sealed table.
-- ============================================
create table if not exists contract_identity (
    contract_id uuid primary key references contracts(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    -- The legal name that was signed. Published on breach.
    real_name text not null,
    -- A path inside the private `faces` bucket, never a public URL.
    face_path text not null default '',
    -- People sign their own name, so the strokes are identifying too.
    signature_strokes jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now(),
    constraint contract_identity_real_name_len check (char_length(real_name) <= 80),
    constraint contract_identity_face_path_len check (char_length(face_path) <= 300),
    constraint contract_identity_strokes_size check (pg_column_size(signature_strokes) <= 100000)
);

-- ============================================
-- 3. Carry across anything already signed, then drop the public copies.
--    Written as a no-op when the columns are already gone, so the file
--    is safe to run twice.
-- ============================================
do $$
begin
    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'contracts'
          and column_name = 'signer_name'
    ) then
        execute $mig$
            insert into contract_identity (contract_id, user_id, real_name, face_path, signature_strokes)
            select id, user_id, coalesce(signer_name, ''), '', coalesce(signature_strokes, '[]'::jsonb)
            from contracts
            on conflict (contract_id) do nothing
        $mig$;
    end if;
end $$;

alter table contracts
    drop column if exists signer_name,
    drop column if exists photo_url,
    drop column if exists social_url,
    drop column if exists social_platform,
    drop column if exists social_handle,
    drop column if exists signature_strokes;

-- The old hardening constraints referenced columns that no longer exist;
-- dropping the columns took them with it. These are the survivors.
alter table contracts
    drop constraint if exists contracts_signer_name_len,
    drop constraint if exists contracts_photo_url_len,
    drop constraint if exists contracts_social_handle_len,
    drop constraint if exists contracts_social_url_len,
    drop constraint if exists contracts_strokes_size;

-- ============================================
-- 4. The seal itself.
--    Your own row is always yours to read. Everyone else gets it only
--    once the contract is breached.
-- ============================================
alter table contract_identity enable row level security;

drop policy if exists "contract_identity_select_sealed" on contract_identity;
create policy "contract_identity_select_sealed" on contract_identity
    for select to anon, authenticated using (
        auth.uid() = user_id
        or exists (
            select 1 from contracts c
            where c.id = contract_id and c.status = 'breached'
        )
    );

drop policy if exists "contract_identity_insert_own" on contract_identity;
create policy "contract_identity_insert_own" on contract_identity
    for insert to authenticated with check (auth.uid() = user_id);

-- Deliberately no UPDATE and no DELETE policy. You cannot edit or erase
-- the identity you signed with; that is what makes it a stake.

-- ============================================
-- 5. The face lives in a private bucket.
--    A public bucket would mean the photo is only as hidden as its URL.
-- ============================================
insert into storage.buckets (id, name, public)
values ('faces', 'faces', false)
on conflict (id) do update set public = false;

drop policy if exists "faces_insert_own" on storage.objects;
create policy "faces_insert_own" on storage.objects
    for insert to authenticated with check (
        bucket_id = 'faces'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

-- Same rule as the sealed row, applied to the object.
drop policy if exists "faces_select_sealed" on storage.objects;
create policy "faces_select_sealed" on storage.objects
    for select to anon, authenticated using (
        bucket_id = 'faces'
        and (
            (storage.foldername(name))[1] = auth.uid()::text
            or exists (
                select 1
                from contract_identity ci
                join contracts c on c.id = ci.contract_id
                where ci.face_path = storage.objects.name
                  and c.status = 'breached'
            )
        )
    );

-- ============================================
-- 6. Comments carry the username, never the name.
--    The previous version of this trigger read the author's name off
--    contracts.signer_name, which would now publish the sealed name
--    under every comment they ever wrote.
-- ============================================
create or replace function public.stamp_comment_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_name text;
    v_photo text;
begin
    if auth.uid() is null then
        return new; -- service role / SQL editor: trusted paths keep their values
    end if;

    new.created_at := now();

    select p.username, p.avatar_url into v_name, v_photo
    from profiles p
    where p.id = auth.uid();

    new.author_name := coalesce(nullif(v_name, ''), 'someone');
    new.author_photo := coalesce(v_photo, '');
    return new;
end;
$$;

-- ============================================
-- 7. Events are public, so they must not narrate the sealed name.
-- ============================================
update contract_events
set detail = regexp_replace(detail, '^Locked in by .*?\.', 'Locked in.')
where type = 'signed' and detail like 'Locked in by %';
