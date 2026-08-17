-- FULL RESET — deletes every row of data in the project, accounts included.
--
-- TWO STEPS, IN THIS ORDER:
--
--   1. Empty the storage buckets from the dashboard. Storage → avatars →
--      select all → delete, then the same for post-images. This cannot be
--      done in SQL: Supabase guards storage.objects with a trigger that
--      rejects direct deletes. Do it first, because a leftover file owned by
--      an account can block that account's deletion in step 2.
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
-- What goes: contracts, posts, comments, reactions, contract events,
-- profiles, the abandoned buddy/group tables, every uploaded photo, and
-- every account in auth.users — INCLUDING YOURS. You will be signed out and
-- will have to sign up again.
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
delete from contract_events;
delete from contract_witnesses;
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
--    stop the object rows and the actual blobs drifting apart. Empty the two
--    buckets from the dashboard BEFORE running this file — see step 1 of the
--    header instructions.

-- 5. The accounts themselves. Last, because everything above referenced them.
delete from auth.users;

commit;

-- Confirm the result. Every count should be zero — except storage.objects,
-- which only reaches zero once you have emptied the buckets in the dashboard.
select 'contracts' as table_name, count(*) from contracts
union all select 'checkins', count(*) from checkins
union all select 'checkin_comments', count(*) from checkin_comments
union all select 'checkin_reactions', count(*) from checkin_reactions
union all select 'contract_events', count(*) from contract_events
union all select 'profiles', count(*) from profiles
union all select 'storage.objects', count(*) from storage.objects
    where bucket_id in ('avatars', 'post-images')
union all select 'auth.users', count(*) from auth.users;

-- IF auth.users FAILS with a storage error: files still exist that are owned
-- by an account being deleted. Go back and empty both buckets in the
-- dashboard, then run this file again. Nothing will have been deleted in the
-- meantime — the whole file is one transaction, so a failure rolls it all
-- back rather than leaving the database half-wiped.
