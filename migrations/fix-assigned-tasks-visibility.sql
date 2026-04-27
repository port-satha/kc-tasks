-- Fix: Allow assignees to see tasks assigned to them in their My Tasks
-- The previous policy only allowed personal tasks to be seen by creator,
-- which blocked assignees from seeing subtasks assigned to them.

-- 1. Drop existing SELECT policy
DROP POLICY IF EXISTS "View own personal tasks" ON public.tasks;

-- 2. Re-create SELECT policy with assigned_to visibility
--    Personal tasks (project_id IS NULL) → creator can see them
--    Project tasks → visible if public project, or you're owner/member
--    Assigned tasks → visible to the assignee (via members.profile_id)
CREATE POLICY "View own personal tasks" ON public.tasks FOR SELECT TO authenticated
  USING (
    -- Creator can always see their own tasks
    created_by = auth.uid()
    OR
    -- Assignee can see tasks assigned to them
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = assigned_to AND m.profile_id = auth.uid()
    )
    OR
    -- Project tasks: visible based on project access
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

-- 3. Make sure RLS is enabled
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
