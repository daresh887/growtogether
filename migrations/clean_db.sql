-- Clean Supabase Data
-- This script truncates all group-related tables to start fresh with new categories.
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

-- Disable foreign key checks to allow truncating tables with dependencies
SET session_replication_role = 'replica';

-- Truncate tables
TRUNCATE TABLE group_members CASCADE;
TRUNCATE TABLE posts CASCADE;
TRUNCATE TABLE post_reactions CASCADE;
TRUNCATE TABLE post_comments CASCADE;
TRUNCATE TABLE groups CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';

-- Optional: Delete uploaded files (requires storage bucket policy or manual deletion)
-- DELETE FROM storage.objects WHERE bucket_id = 'group-icons';
-- DELETE FROM storage.objects WHERE bucket_id = 'post-images';
