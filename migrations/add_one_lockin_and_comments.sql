-- One lock-in per person, and comments on posts.
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

-- ============================================
-- ONE ACTIVE CONTRACT PER USER
-- ============================================

-- If dev data has users with several active contracts, keep the newest
-- and void the rest so the unique index can be created.
update contracts c
set status = 'void'
where status = 'active'
  and exists (
      select 1 from contracts c2
      where c2.user_id = c.user_id
        and c2.status = 'active'
        and c2.created_at > c.created_at
  );

drop index if exists contracts_one_active_per_register;

create unique index if not exists contracts_one_active
    on contracts (user_id)
    where status = 'active';

-- ============================================
-- COMMENTS ON POSTS
-- ============================================

create table if not exists checkin_comments (
    id uuid primary key default gen_random_uuid(),
    checkin_id uuid not null references checkins(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    author_name text not null default '',
    content text not null,
    created_at timestamptz not null default now()
);

create index if not exists checkin_comments_checkin_idx
    on checkin_comments (checkin_id, created_at);

alter table checkin_comments enable row level security;

create policy "checkin_comments_select_public" on checkin_comments
    for select to anon, authenticated using (true);

create policy "checkin_comments_insert_own" on checkin_comments
    for insert to authenticated with check (auth.uid() = user_id);

create policy "checkin_comments_delete_own" on checkin_comments
    for delete to authenticated using (auth.uid() = user_id);
