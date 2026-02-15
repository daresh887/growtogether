-- Add DELETE policy for post_comments
-- Allows: comment author, group owner, or group moderator to delete comments

-- Drop existing delete policy if any
DROP POLICY IF EXISTS "Users can delete own comments" ON post_comments;
DROP POLICY IF EXISTS "Allow comment deletion" ON post_comments;

-- Allow comment author to delete their own comments
CREATE POLICY "Allow comment deletion"
ON post_comments
FOR DELETE
USING (
    -- Comment author can delete their own
    auth.uid() = user_id
    OR
    -- Group owner can delete any comment (via post -> group)
    EXISTS (
        SELECT 1 FROM posts p
        JOIN groups g ON g.id = p.group_id
        WHERE p.id = post_comments.post_id
        AND g.created_by = auth.uid()
    )
    OR
    -- Moderator can delete any comment (via post -> group_members)
    EXISTS (
        SELECT 1 FROM posts p
        JOIN group_members gm ON gm.group_id = p.group_id
        WHERE p.id = post_comments.post_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'moderator'
    )
);
