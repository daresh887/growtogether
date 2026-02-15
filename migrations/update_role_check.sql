-- Update the check constraint for group_members role to include 'moderator'
-- The previous constraint likely only allowed 'admin' and 'member'.

ALTER TABLE group_members 
DROP CONSTRAINT IF EXISTS group_members_role_check;

ALTER TABLE group_members
ADD CONSTRAINT group_members_role_check
CHECK (role IN ('admin', 'moderator', 'member'));
