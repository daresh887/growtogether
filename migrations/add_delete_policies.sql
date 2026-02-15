-- Add DELETE RLS policies for group deletion
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

-- Allow group owners to delete their own groups
CREATE POLICY "Group owners can delete their groups"
  ON groups FOR DELETE
  USING (auth.uid() = created_by);

-- Allow group owners to delete all members from their groups
CREATE POLICY "Group owners can delete members from their groups"
  ON group_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR auth.uid() = (SELECT created_by FROM groups WHERE id = group_id)
  );

-- Allow group owners to delete all posts from their groups
CREATE POLICY "Group owners can delete posts from their groups"
  ON posts FOR DELETE
  USING (
    auth.uid() = user_id
    OR auth.uid() = (SELECT created_by FROM groups WHERE id = group_id)
  );

-- Allow deletion of reactions on posts the user owns or in groups they own
CREATE POLICY "Users can delete reactions"
  ON post_reactions FOR DELETE
  USING (
    auth.uid() = user_id
    OR auth.uid() = (
      SELECT g.created_by FROM groups g
      JOIN posts p ON p.group_id = g.id
      WHERE p.id = post_id
    )
  );

-- Allow deletion of comments on posts the user owns or in groups they own
CREATE POLICY "Users can delete comments"
  ON post_comments FOR DELETE
  USING (
    auth.uid() = user_id
    OR auth.uid() = (
      SELECT g.created_by FROM groups g
      JOIN posts p ON p.group_id = g.id
      WHERE p.id = post_id
    )
  );
