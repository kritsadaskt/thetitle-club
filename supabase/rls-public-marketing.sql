-- Run once in Supabase SQL Editor if the landing page should show privileges
-- and community moments to anonymous visitors (required for public marketing).
-- Existing member-only policies remain; these add OR access for anon role.

create policy "public: read active privileges for marketing"
  on privileges for select
  to anon, authenticated
  using (is_active = true);

create policy "public: read published community moments for marketing"
  on community_moments for select
  to anon, authenticated
  using (is_published = true);
