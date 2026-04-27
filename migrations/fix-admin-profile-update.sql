-- ============================================================
-- Fix: Allow admins to update any profile (manager_id, role, etc.)
-- ============================================================
-- Run in Supabase SQL Editor
--
-- Problem: /settings/org fails with "Cannot coerce the result to a single JSON object"
-- Reason: default RLS only lets a user update their own profile. Admins need
-- to update other people's manager_id field.

-- Add admin-update policy. Existing self-update policy still works.
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update"
  on public.profiles for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Also ensure admins can SELECT every profile (for the /settings/org list)
drop policy if exists "profiles_admin_select" on public.profiles;
create policy "profiles_admin_select"
  on public.profiles for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
