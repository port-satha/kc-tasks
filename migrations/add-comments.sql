-- Comments table for task/subtask discussions
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  subtask_id uuid REFERENCES public.subtasks(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  body text NOT NULL,
  mentions uuid[] DEFAULT '{}', -- array of member IDs mentioned
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast lookup by task
CREATE INDEX IF NOT EXISTS idx_comments_task_id ON public.comments(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_subtask_id ON public.comments(subtask_id);

-- RLS: authenticated users can do everything (team app)
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view comments"
  ON public.comments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert comments"
  ON public.comments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update own comments"
  ON public.comments FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete own comments"
  ON public.comments FOR DELETE
  USING (auth.role() = 'authenticated');

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
