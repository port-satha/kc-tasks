-- =============================================================
-- Migration: Fix private project access + viewer/editor roles
-- Run this in Supabase SQL Editor
-- =============================================================

-- 1. Fix all existing members who were incorrectly set as admin
-- Keep only the project owner (Port) as admin, set everyone else to member
UPDATE public.members
SET role = 'member'
WHERE role = 'admin'
AND email != (SELECT email FROM auth.users ORDER BY created_at ASC LIMIT 1);

-- 2. Drop and recreate project RLS policies for stricter enforcement
DROP POLICY IF EXISTS "Users can view public projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Owner can manage projects" ON public.projects;
DROP POLICY IF EXISTS "Owner can update projects" ON public.projects;
DROP POLICY IF EXISTS "Owner can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;

-- Only see public projects, or private ones you own/are a member of
CREATE POLICY "Users can view projects" ON public.projects FOR SELECT TO authenticated
  USING (
    NOT is_private
    OR owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      JOIN public.members m ON m.id = pm.member_id
      WHERE pm.project_id = projects.id AND m.profile_id = auth.uid()
    )
  );

-- Only owner can update/delete projects
CREATE POLICY "Owner can update projects" ON public.projects FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owner can delete projects" ON public.projects FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- Any authenticated user can create projects
CREATE POLICY "Users can create projects" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- 3. Drop and recreate task RLS policies for viewer/editor enforcement
DROP POLICY IF EXISTS "View own personal tasks" ON public.tasks;
DROP POLICY IF EXISTS "View tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Task creator or project owner can update" ON public.tasks;
DROP POLICY IF EXISTS "Update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Task creator or project owner can delete" ON public.tasks;
DROP POLICY IF EXISTS "Delete tasks" ON public.tasks;

-- View tasks: personal tasks (own) + project tasks (if project is visible)
CREATE POLICY "View tasks" ON public.tasks FOR SELECT TO authenticated
  USING (
    -- Personal tasks: only creator
    (project_id IS NULL AND created_by = auth.uid())
    OR
    -- Assigned tasks (from any project you have access to)
    (assigned_to IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.members m WHERE m.id = assigned_to AND m.profile_id = auth.uid()
    ))
    OR
    -- Project tasks: if you can see the project
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.projects p WHERE p.id = project_id
      AND (
        NOT p.is_private
        OR p.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.project_members pm
          JOIN public.members m ON m.id = pm.member_id
          WHERE pm.project_id = p.id AND m.profile_id = auth.uid()
        )
      )
    ))
  );

-- Create tasks: personal (own) or project (if editor/owner)
CREATE POLICY "Create tasks" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      project_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.projects p WHERE p.id = project_id
        AND (
          p.owner_id = auth.uid()
          OR NOT p.is_private
          OR EXISTS (
            SELECT 1 FROM public.project_members pm
            JOIN public.members m ON m.id = pm.member_id
            WHERE pm.project_id = p.id AND m.profile_id = auth.uid()
            AND pm.role = 'editor'
          )
        )
      )
    )
  );

-- Update tasks: creator, project owner, or project editor
CREATE POLICY "Update tasks" ON public.tasks FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      JOIN public.members m ON m.id = pm.member_id
      WHERE pm.project_id = project_id AND m.profile_id = auth.uid()
      AND pm.role = 'editor'
    )
  );

-- Delete tasks: creator or project owner only
CREATE POLICY "Delete tasks" ON public.tasks FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
  );

-- 4. Ensure project_members policies are correct
DROP POLICY IF EXISTS "View project members" ON public.project_members;
DROP POLICY IF EXISTS "Project owner manages members" ON public.project_members;
DROP POLICY IF EXISTS "Owner manages project members" ON public.project_members;
DROP POLICY IF EXISTS "Owner updates project members" ON public.project_members;
DROP POLICY IF EXISTS "Owner removes project members" ON public.project_members;
DROP POLICY IF EXISTS "Users can add project members" ON public.project_members;

-- Anyone can view project memberships (needed for UI)
CREATE POLICY "View project members" ON public.project_members FOR SELECT TO authenticated
  USING (true);

-- Only project owner can add/update/remove members
CREATE POLICY "Owner manages project members" ON public.project_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid())
  );

CREATE POLICY "Owner updates project members" ON public.project_members FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid())
  );

CREATE POLICY "Owner removes project members" ON public.project_members FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid())
  );
