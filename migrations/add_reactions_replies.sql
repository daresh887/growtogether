-- Comment photos, replies, and like/dislike on posts.
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

-- Comments get the author's photo (snapshotted at write time, same as
-- the name) and an optional parent for one level of replies.
alter table checkin_comments
    add column if not exists author_photo text not null default '',
    add column if not exists parent_id uuid references checkin_comments(id) on delete cascade;

create index if not exists checkin_comments_parent_idx
    on checkin_comments (parent_id);

-- Like/dislike: one reaction per person per post.
create table if not exists checkin_reactions (
    checkin_id uuid not null references checkins(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    value smallint not null check (value in (-1, 1)),
    created_at timestamptz not null default now(),
    primary key (checkin_id, user_id)
);

alter table checkin_reactions enable row level security;

create policy "checkin_reactions_select_public" on checkin_reactions
    for select to anon, authenticated using (true);

create policy "checkin_reactions_insert_own" on checkin_reactions
    for insert to authenticated with check (auth.uid() = user_id);

create policy "checkin_reactions_update_own" on checkin_reactions
    for update to authenticated using (auth.uid() = user_id);

create policy "checkin_reactions_delete_own" on checkin_reactions
    for delete to authenticated using (auth.uid() = user_id);
