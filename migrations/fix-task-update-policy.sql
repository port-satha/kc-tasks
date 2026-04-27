-- Fix: Allow all team members to update tasks in projects they can access
-- Previously only creator, project owner, or explicit project_members could update

DROP POLICY IF EXISTS "Task creator or project owner can update" ON public.tasks;
CREATE POLICY "Task creator or project owner can update" ON public.tasks FOR UPDATE TO authenticated
  USING (
    -- Creator can always update
    created_by = auth.uid()
    OR
    -- Project owner can update
    EXISTS (
      SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()
    )
    OR
    -- Explicit project members can update
    EXISTS (
      SELECT 1 FROM public.members m
      JOIN public.project_members pm ON pm.member_id = m.id
      WHERE m.profile_id = auth.uid() AND pm.project_id = tasks.project_id
    )
    OR
    -- Assignee can update their own assigned tasks
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = tasks.assigned_to AND m.profile_id = auth.uid()
    )
    OR
    -- Any authenticated member can update tasks in PUBLIC projects
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND NOT p.is_private
    ) AND EXISTS (
      SELECT 1 FROM public.members m WHERE m.profile_id = auth.uid()
    ))
  );
