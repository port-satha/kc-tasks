-- Migration: My Tasks Privacy + Subtask Assignment
-- Run this in your Supabase SQL Editor

-- 1. Drop the existing task SELECT policy
DROP POLICY IF EXISTS "View own personal tasks" ON public.tasks;

-- 2. Create updated policy: personal tasks visible to creator AND assigned member
CREATE POLICY "View own personal tasks" ON public.tasks FOR SELECT TO authenticated
  USING (
    -- Personal tasks (no project): visible to creator OR assigned member
    (project_id IS NULL AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.members m
        WHERE m.id = tasks.assigned_to
        AND m.profile_id = auth.uid()
      )
    ))
    OR
    -- Project tasks: follow project visibility rules
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.projects p WHERE p.id = project_id
      AND (NOT p.is_private OR p.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.project_members pm
        JOIN public.members m ON m.id = pm.member_id
        WHERE pm.project_id = p.id AND m.profile_id = auth.uid()
      ))
    ))
  );

-- 3. Also allow assigned members to update their assigned tasks
DROP POLICY IF EXISTS "Task creator or project owner can update" ON public.tasks;
CREATE POLICY "Task creator or project owner can update" ON public.tasks FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = tasks.assigned_to
      AND m.profile_id = auth.uid()
    )
  );
