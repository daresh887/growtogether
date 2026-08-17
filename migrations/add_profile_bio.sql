-- Living profile: a picture you can change and a short bio.
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
--
-- The contract keeps the photo you signed with, frozen, so a breach
-- always publishes the face that made the promise. These fields are
-- how you appear everywhere else.

create table if not exists profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text,
    avatar_url text,
    updated_at timestamptz not null default now()
);

alter table profiles
    add column if not exists bio text not null default '',
    add column if not exists avatar_url text;

alter table profiles enable row level security;

-- Profiles are readable by anyone: the feed shows faces to visitors too.
drop policy if exists "profiles_select_public" on profiles;
create policy "profiles_select_public" on profiles
    for select to anon, authenticated using (true);

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles
    for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles
    for update to authenticated using (auth.uid() = id);
