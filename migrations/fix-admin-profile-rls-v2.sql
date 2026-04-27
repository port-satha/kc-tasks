-- ============================================================
-- Fix: RLS recursion on profiles table (follow-up to v1)
-- ============================================================
-- Run in Supabase SQL Editor
--
-- Problem: the admin check `exists (select from profiles ...)` inside an RLS
-- policy on `profiles` itself causes infinite recursion — Postgres blocks it,
-- users can no longer read their own profile.
-- Fix: use a SECURITY DEFINER function that runs with elevated privileges
-- and bypasses RLS for the internal role lookup.

-- 1. Drop the broken policies from v1
drop policy if exists "profiles_admin_select" on public.profiles;
drop policy if exists "profiles_admin_update" on public.profiles;

-- 2. Create a helper function that reads the current user's role
--    SECURITY DEFINER means it runs as the function owner (postgres), bypassing RLS.
create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() limit 1;
$$;

-- Grant execute to authenticated users
grant execute on function public.current_user_role() to authenticated;

-- 3. Re-add admin SELECT policy using the function (no recursion)
create policy "profiles_admin_select"
  on public.profiles for select
  using (public.current_user_role() = 'admin');

-- 4. Re-add admin UPDATE policy using the function (no recursion)
create policy "profiles_admin_update"
  on public.profiles for update
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
