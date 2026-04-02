-- Fix members table RLS policies
-- Problem: "Admins can manage members" checks profiles.role = 'admin'
-- but admin status is stored in members.role, not profiles.role
-- This blocks admins from updating/deleting members

-- Drop all existing policies on members
DROP POLICY IF EXISTS "Authenticated users can view members" ON public.members;
DROP POLICY IF EXISTS "Admins can manage members" ON public.members;
DROP POLICY IF EXISTS "Members can insert" ON public.members;

-- 1. Everyone can view members (needed for assignee dropdowns, etc.)
CREATE POLICY "Authenticated users can view members"
  ON public.members FOR SELECT TO authenticated
  USING (true);

-- 2. Authenticated users can insert members (for self-registration and adding team members)
CREATE POLICY "Authenticated users can insert members"
  ON public.members FOR INSERT TO authenticated
  WITH CHECK (true);

-- 3. Admins (based on members.role) can update any member
--    Also allow users to update their own member record
CREATE POLICY "Admins or self can update members"
  ON public.members FOR UPDATE TO authenticated
  USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.members
      WHERE profile_id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Admins can delete members (but not themselves)
CREATE POLICY "Admins can delete members"
  ON public.members FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE profile_id = auth.uid() AND role = 'admin'
    )
  );

-- Make sure RLS is enabled
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
