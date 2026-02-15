-- Rollback: Remove the extra FK constraint that causes ambiguity
-- The duplicate FK from group_members.user_id to profiles.id
-- conflicts with the existing FK to auth.users, breaking PostgREST joins.

ALTER TABLE group_members
DROP CONSTRAINT IF EXISTS group_members_user_id_fkey_profiles;
