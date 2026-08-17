-- Proof photos on check-ins.
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
--
-- Check-ins can carry up to a few photos as evidence. Uploads go to the
-- existing 'post-images' storage bucket; this only adds the column.

alter table checkins
    add column if not exists images text[] not null default '{}';
