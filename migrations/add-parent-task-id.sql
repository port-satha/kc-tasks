-- Make subtasks full tasks (Asana-style)
-- Subtasks are now tasks with a parent_task_id pointing to the parent task.
-- This allows subtasks to have all task fields (priority, value, effort, progress, etc.)
-- and appear in assignee's personal task list when assigned.

-- 1. Add parent_task_id column to tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON public.tasks(parent_task_id);

-- 2. Update RLS: child tasks inherit visibility from project_id and created_by
-- No self-referencing check needed (would cause infinite recursion in PostgreSQL RLS)
DROP POLICY IF EXISTS "View own personal tasks" ON public.tasks;
CREATE POLICY "View own personal tasks" ON public.tasks FOR SELECT TO authenticated
  USING (
    -- Personal tasks (including child tasks): creator can see
    (project_id IS NULL AND created_by = auth.uid())
    OR
    -- Project tasks (including child tasks in projects)
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.projects p WHERE p.id = project_id
      AND (NOT p.is_private OR p.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.project_members pm
        JOIN public.members m ON m.id = pm.member_id
        WHERE pm.project_id = p.id AND m.profile_id = auth.uid()
      ))
    ))
    OR
    -- Tasks assigned to the current user (via members table)
    (assigned_to IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.members m WHERE m.id = assigned_to AND m.profile_id = auth.uid()
    ))
  );

-- 3. Migrate existing subtasks to child tasks
-- This converts all records in the subtasks table to proper tasks
INSERT INTO public.tasks (title, parent_task_id, due, assigned_to, progress, section, project_id, created_by, sort_order, created_at)
SELECT
  s.title,
  s.task_id AS parent_task_id,
  s.due,
  s.assigned_to,
  CASE WHEN s.done THEN 'Done' ELSE '' END AS progress,
  t.section,
  t.project_id,
  t.created_by,
  s.sort_order,
  s.created_at
FROM public.subtasks s
JOIN public.tasks t ON s.task_id = t.id;

-- Note: After verifying the migration worked, you can optionally drop the subtasks table:
-- DROP TABLE IF EXISTS public.subtasks;
