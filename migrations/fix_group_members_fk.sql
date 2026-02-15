-- Fix missing foreign key relationship between group_members and profiles
-- This is required for PostgREST to allow joining 'profiles' in 'group_members' queries

-- Add foreign key from group_members.user_id to profiles.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'group_members_user_id_fkey_profiles'
    ) THEN
        ALTER TABLE group_members
        ADD CONSTRAINT group_members_user_id_fkey_profiles
        FOREIGN KEY (user_id)
        REFERENCES profiles(id)
        ON DELETE CASCADE;
    END IF;
END $$;
