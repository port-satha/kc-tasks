-- Allow project editors to delete tasks (matching the UPDATE policy).
-- Previously only the task creator and the project owner could delete,
-- which blocked teammates from cleaning up tasks created by other members.

DROP POLICY IF EXISTS "Delete tasks" ON public.tasks;

CREATE POLICY "Delete tasks" ON public.tasks FOR DELETE TO authenticated
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
