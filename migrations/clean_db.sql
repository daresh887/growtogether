-- FULL RESET — deletes every row of data in the project, accounts included.
--
-- TWO STEPS, IN THIS ORDER:
--
--   1. Empty ALL THREE storage buckets from the dashboard. Storage →
--      avatars → select all → delete, then the same for post-images and
--      faces. This cannot be done in SQL: Supabase guards storage.objects
--      with a trigger that rejects direct deletes. Do it first, because a
--      leftover file owned by an account can block that account's deletion
--      in step 2.
--
--      `faces` is the private bucket holding the photos people signed with.
--      It is easy to miss because nothing in the app ever links to it.
--
--   2. Run this file in the Supabase SQL Editor. It needs privileges the
--      app's anon key does not have, so the editor is the only way.
--
-- THERE IS NO UNDO. Take a backup first if you want one:
--   Supabase dashboard → Database → Backups.
--
-- What survives: the schema itself — tables, columns, RLS policies, storage
-- buckets, functions. Structure stays, contents go.
--
-- What goes: contracts, the sealed identities signed against them, posts,
-- comments, reactions, contract events, profiles, the abandoned buddy/group
-- tables, every uploaded photo, and every account in auth.users — INCLUDING
-- YOURS. You will be signed out and will have to sign up again.
--
-- Written for the current schema. The previous version of this file
-- truncated the pre-pivot group tables and would have left every contract
-- and post in place.

begin;

-- 1. The record: posts and everything hanging off them, then the contracts.
--    Deepest dependency first, so nothing relies on a deleted parent.
delete from checkin_reactions;
delete from checkin_comments;
delete from checkins;
delete from contract_comments;
delete from contract_events;
delete from contract_witnesses;

-- The sealed names, faces and signatures. `on delete cascade` from
-- contracts would take these anyway; deleting them by name means the file
-- says out loud that the sealed table is being emptied too, and it still
-- works if that cascade is ever loosened. Skipped on a database that has
-- not run add_pseudonymous_identity.sql yet.
do $$
begin
    if to_regclass('public.contract_identity') is not null then
        delete from public.contract_identity;
    end if;
end $$;

delete from contracts;

-- 2. The abandoned buddy and group features. Some of these tables may not
--    exist in this project, so each one is checked before it is touched.
do $$
declare
    t text;
begin
    for t in select unnest(array[
        'buddy_checkins', 'buddy_pairs', 'buddy_requests', 'buddy_profiles',
        'group_members', 'post_reactions', 'post_comments', 'posts', 'groups'
    ])
    loop
        if to_regclass('public.' || t) is not null then
            execute format('delete from public.%I', t);
        end if;
    end loop;
end $$;

-- 3. Profiles: names, bios, avatar URLs.
delete from profiles;

-- 4. Uploaded files are NOT deleted here. Supabase guards storage.objects
--    with a trigger (storage.protect_delete) that rejects direct deletes, to
--    stop the object rows and the actual blobs drifting apart. Empty all
--    three buckets from the dashboard BEFORE running this file — avatars,
--    post-images and faces. See step 1 of the header instructions.

-- 5. The accounts themselves. Last, because everything above referenced them.
delete from auth.users;

commit;

-- Confirm the result. Every count should be zero — except storage.objects,
-- which only reaches zero once you have emptied the buckets in the dashboard.
--
-- This runs after the commit and deletes nothing, so it is the one place
-- that names contract_identity without checking the table exists first. On
-- a database that has not run add_pseudonymous_identity.sql it errors here
-- and nothing is lost — the wipe above has already committed.
select 'contracts' as table_name, count(*) from contracts
union all select 'contract_identity', count(*) from contract_identity
union all select 'contract_comments', count(*) from contract_comments
union all select 'checkins', count(*) from checkins
union all select 'checkin_comments', count(*) from checkin_comments
union all select 'checkin_reactions', count(*) from checkin_reactions
union all select 'contract_events', count(*) from contract_events
union all select 'profiles', count(*) from profiles
union all select 'storage.objects', count(*) from storage.objects
    where bucket_id in ('avatars', 'post-images', 'faces')
union all select 'auth.users', count(*) from auth.users;

-- IF auth.users FAILS with a storage error: files still exist that are owned
-- by an account being deleted. Go back and empty both buckets in the
-- dashboard, then run this file again. Nothing will have been deleted in the
-- meantime — the whole file is one transaction, so a failure rolls it all
-- back rather than leaving the database half-wiped.
