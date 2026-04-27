-- Fix personal task privacy: each member can only see their own personal tasks
-- Other members cannot see your "My Tasks" (tasks with project_id = NULL)

-- 1. Drop all existing SELECT policies on tasks to avoid conflicts
DROP POLICY IF EXISTS "View own personal tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "view_tasks" ON public.tasks;

-- 2. Re-create the correct SELECT policy
--    Personal tasks (project_id IS NULL) → only the creator can see them
--    Project tasks → visible if the project is public, or you're the owner, or you're a project member
CREATE POLICY "View own personal tasks" ON public.tasks FOR SELECT TO authenticated
  USING (
    (project_id IS NULL AND created_by = auth.uid())
    OR
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

-- 3. Also fix UPDATE policy to allow assigned members to update tasks (not just creator)
DROP POLICY IF EXISTS "Task creator or project owner can update" ON public.tasks;
CREATE POLICY "Task creator or project owner can update" ON public.tasks FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.members m
      JOIN public.project_members pm ON pm.member_id = m.id
      WHERE m.profile_id = auth.uid() AND pm.project_id = tasks.project_id
    )
  );

-- 4. Fix DELETE policy similarly
DROP POLICY IF EXISTS "Task creator or project owner can delete" ON public.tasks;
CREATE POLICY "Task creator or project owner can delete" ON public.tasks FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()
    )
  );

-- 5. Make sure RLS is enabled (should already be)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
