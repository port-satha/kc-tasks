-- Two fixes for tasks RLS:
--   1. Grant edit + delete access on PUBLIC projects to any authenticated user
--      (the frontend already treats non-member users as editors on public projects;
--      RLS was not granting that, so updates/deletes silently failed).
--   2. Fix the project_members JOIN — the previous version compared
--      pm.project_id to itself (tautology) instead of tasks.project_id.

-- ===== UPDATE =====
DROP POLICY IF EXISTS "Update tasks" ON public.tasks;

CREATE POLICY "Update tasks" ON public.tasks FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = tasks.project_id
        AND (p.owner_id = auth.uid() OR p.is_private = false)
    )
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      JOIN public.members m ON m.id = pm.member_id
      WHERE pm.project_id = tasks.project_id
        AND m.profile_id = auth.uid()
        AND pm.role = 'editor'
    )
  );

-- ===== DELETE =====
DROP POLICY IF EXISTS "Delete tasks" ON public.tasks;

CREATE POLICY "Delete tasks" ON public.tasks FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = tasks.project_id
        AND (p.owner_id = auth.uid() OR p.is_private = false)
    )
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      JOIN public.members m ON m.id = pm.member_id
      WHERE pm.project_id = tasks.project_id
        AND m.profile_id = auth.uid()
        AND pm.role = 'editor'
    )
  );
