-- 1:1 Accountability Buddies
-- Tables + RLS for buddy matching, requests, pairs, and check-ins.
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

-- ============================================
-- TABLES
-- ============================================

-- What each user is like / looks for in a buddy
create table if not exists buddy_profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    is_looking boolean not null default true,
    focus_areas text[] not null default '{}',
    goal text not null default '',
    cadence text not null default 'daily' check (cadence in ('daily', 'weekdays', 'few_week', 'weekly')),
    style text not null default 'hype' check (style in ('straight', 'hype', 'analyst', 'zen')),
    looking_for text[] not null default '{}',
    intensity int not null default 3 check (intensity between 1 and 5),
    region text not null default 'europe' check (region in ('americas', 'europe', 'asia')),
    pitch text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists buddy_requests (
    id uuid primary key default gen_random_uuid(),
    sender_id uuid not null references auth.users(id) on delete cascade,
    receiver_id uuid not null references auth.users(id) on delete cascade,
    message text not null default '',
    status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
    created_at timestamptz not null default now(),
    constraint no_self_request check (sender_id <> receiver_id),
    constraint unique_request unique (sender_id, receiver_id)
);

create table if not exists buddy_pairs (
    id uuid primary key default gen_random_uuid(),
    user_a uuid not null references auth.users(id) on delete cascade,
    user_b uuid not null references auth.users(id) on delete cascade,
    status text not null default 'active' check (status in ('active', 'ended')),
    shared_goal text not null default '',
    created_at timestamptz not null default now(),
    ended_at timestamptz,
    constraint no_self_pair check (user_a <> user_b)
);

-- One active pair per unique couple, regardless of order
create unique index if not exists buddy_pairs_unique_active
    on buddy_pairs (least(user_a, user_b), greatest(user_a, user_b))
    where status = 'active';

create table if not exists buddy_checkins (
    id uuid primary key default gen_random_uuid(),
    pair_id uuid not null references buddy_pairs(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    content text not null,
    mood text,
    created_at timestamptz not null default now()
);

create index if not exists buddy_checkins_pair_idx on buddy_checkins (pair_id, created_at desc);
create index if not exists buddy_requests_receiver_idx on buddy_requests (receiver_id, status);

-- ============================================
-- RLS
-- ============================================

alter table buddy_profiles enable row level security;
alter table buddy_requests enable row level security;
alter table buddy_pairs enable row level security;
alter table buddy_checkins enable row level security;

-- Buddy profiles: readable by any signed-in user (needed for matching), writable only by owner
create policy "buddy_profiles_select" on buddy_profiles
    for select to authenticated using (true);
create policy "buddy_profiles_insert" on buddy_profiles
    for insert to authenticated with check (auth.uid() = user_id);
create policy "buddy_profiles_update" on buddy_profiles
    for update to authenticated using (auth.uid() = user_id);
create policy "buddy_profiles_delete" on buddy_profiles
    for delete to authenticated using (auth.uid() = user_id);

-- Requests: only visible to the two people involved
create policy "buddy_requests_select" on buddy_requests
    for select to authenticated using (auth.uid() in (sender_id, receiver_id));
create policy "buddy_requests_insert" on buddy_requests
    for insert to authenticated with check (auth.uid() = sender_id);
create policy "buddy_requests_update" on buddy_requests
    for update to authenticated using (auth.uid() = receiver_id);
create policy "buddy_requests_delete" on buddy_requests
    for delete to authenticated using (auth.uid() = sender_id);

-- Pairs: only visible/editable by the two members
create policy "buddy_pairs_select" on buddy_pairs
    for select to authenticated using (auth.uid() in (user_a, user_b));
create policy "buddy_pairs_insert" on buddy_pairs
    for insert to authenticated with check (auth.uid() in (user_a, user_b));
create policy "buddy_pairs_update" on buddy_pairs
    for update to authenticated using (auth.uid() in (user_a, user_b));

-- Check-ins: only members of the pair can read or write
create policy "buddy_checkins_select" on buddy_checkins
    for select to authenticated using (
        exists (
            select 1 from buddy_pairs p
            where p.id = pair_id and auth.uid() in (p.user_a, p.user_b)
        )
    );
create policy "buddy_checkins_insert" on buddy_checkins
    for insert to authenticated with check (
        auth.uid() = user_id
        and exists (
            select 1 from buddy_pairs p
            where p.id = pair_id and p.status = 'active' and auth.uid() in (p.user_a, p.user_b)
        )
    );
create policy "buddy_checkins_delete" on buddy_checkins
    for delete to authenticated using (auth.uid() = user_id);
