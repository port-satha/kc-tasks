-- ============================================
-- KC Tasks: Combined Migration (safe to re-run)
-- Run this in Supabase SQL Editor
-- ============================================

-- ===== 1. COMMENTS TABLE =====
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  subtask_id uuid REFERENCES public.subtasks(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  body text NOT NULL,
  mentions uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_task_id ON public.comments(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_subtask_id ON public.comments(subtask_id);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.comments;
CREATE POLICY "Authenticated users can view comments"
  ON public.comments FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.comments;
CREATE POLICY "Authenticated users can insert comments"
  ON public.comments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update own comments" ON public.comments;
CREATE POLICY "Authenticated users can update own comments"
  ON public.comments FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete own comments" ON public.comments;
CREATE POLICY "Authenticated users can delete own comments"
  ON public.comments FOR DELETE
  USING (auth.role() = 'authenticated');

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===== 2. SUBTASK FIELDS =====
ALTER TABLE public.subtasks
  ADD COLUMN IF NOT EXISTS due date,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.members(id);

-- ===== 3. PARENT TASK ID (makes subtasks real tasks) =====
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON public.tasks(parent_task_id);

-- Only migrate subtasks if they haven't been migrated yet
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
JOIN public.tasks t ON s.task_id = t.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.tasks existing
  WHERE existing.parent_task_id = s.task_id AND existing.title = s.title
);

-- ===== 4. SECTIONS + RECURRENCE =====
CREATE TABLE IF NOT EXISTS public.sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view sections" ON public.sections;
CREATE POLICY "Authenticated users can view sections" ON public.sections
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage sections" ON public.sections;
CREATE POLICY "Authenticated users can manage sections" ON public.sections
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS recurrence_rule jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recurrence_parent_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL;

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]';

-- ===== 5. NOTIFICATIONS =====
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text DEFAULT '',
  link text DEFAULT '',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;
CREATE POLICY "Service can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===== 6. FIX MEMBERS RLS =====
DROP POLICY IF EXISTS "Authenticated users can view members" ON public.members;
DROP POLICY IF EXISTS "Admins can manage members" ON public.members;
DROP POLICY IF EXISTS "Members can insert" ON public.members;
DROP POLICY IF EXISTS "Authenticated users can insert members" ON public.members;
DROP POLICY IF EXISTS "Admins or self can update members" ON public.members;
DROP POLICY IF EXISTS "Admins can delete members" ON public.members;

CREATE POLICY "Authenticated users can view members"
  ON public.members FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert members"
  ON public.members FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins or self can update members"
  ON public.members FOR UPDATE TO authenticated
  USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.members
      WHERE profile_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete members"
  ON public.members FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE profile_id = auth.uid() AND role = 'admin'
    )
  );

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- ===== 7. FIX TASKS RLS (privacy + assigned visibility) =====
DROP POLICY IF EXISTS "View own personal tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "view_tasks" ON public.tasks;

CREATE POLICY "View own personal tasks" ON public.tasks FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = assigned_to AND m.profile_id = auth.uid()
    )
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

DROP POLICY IF EXISTS "Task creator or project owner can delete" ON public.tasks;
CREATE POLICY "Task creator or project owner can delete" ON public.tasks FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()
    )
  );

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- ===== 8. CLEANUP DUPLICATE SUBTASKS (last step) =====
DELETE FROM public.subtasks s
WHERE EXISTS (
  SELECT 1 FROM public.tasks t
  WHERE t.parent_task_id = s.task_id
  AND t.title = s.title
);
