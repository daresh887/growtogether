-- Storage buckets and policies for proof photos and profile photos.
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
--
-- Fixes "Failed to upload the photo": the app uploads proof photos to
-- 'post-images' and identity photos to 'avatars'. Both buckets must
-- exist and allow authenticated users to upload into their own folder
-- (paths start with the user's id). Everything is publicly readable,
-- which matches the product: the record is public.

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Recreate policies idempotently
drop policy if exists "post_images_public_read" on storage.objects;
drop policy if exists "post_images_insert_own" on storage.objects;
drop policy if exists "avatars_public_read" on storage.objects;
drop policy if exists "avatars_insert_own" on storage.objects;
drop policy if exists "avatars_update_own" on storage.objects;

create policy "post_images_public_read" on storage.objects
    for select to public using (bucket_id = 'post-images');

create policy "post_images_insert_own" on storage.objects
    for insert to authenticated with check (
        bucket_id = 'post-images'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "avatars_public_read" on storage.objects
    for select to public using (bucket_id = 'avatars');

create policy "avatars_insert_own" on storage.objects
    for insert to authenticated with check (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "avatars_update_own" on storage.objects
    for update to authenticated using (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
    );
