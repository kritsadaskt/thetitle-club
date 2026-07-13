-- ============================================================
--  THE TITLE CLUB — Storage bucket: club-assets
--  Run in: Supabase Dashboard > SQL Editor
--  Prerequisite: schema.sql (is_profile_admin helper)
--
--  Also create the bucket in Dashboard → Storage:
--    Name: club-assets
--    Public: yes
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'club-assets',
  'club-assets',
  true,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read (landing page, member app)
create policy "public: read club assets"
  on storage.objects for select
  using (bucket_id = 'club-assets');

-- Admins: upload / replace / delete
create policy "admins: insert club assets"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'club-assets'
    and public.is_profile_admin()
  );

create policy "admins: update club assets"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'club-assets'
    and public.is_profile_admin()
  )
  with check (
    bucket_id = 'club-assets'
    and public.is_profile_admin()
  );

create policy "admins: delete club assets"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'club-assets'
    and public.is_profile_admin()
  );
