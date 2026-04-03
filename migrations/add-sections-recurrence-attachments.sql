-- 1. Custom Sections table (per project or personal)
CREATE TABLE IF NOT EXISTS public.sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sections" ON public.sections
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage sections" ON public.sections
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Add recurrence fields to tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS recurrence_rule jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recurrence_parent_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL;

-- recurrence_rule format:
-- { "type": "daily|weekly|monthly|yearly|custom", "interval": 1, "days": [1,3,5], "dayOfMonth": 15, "endDate": "2026-12-31" }

-- 3. Add attachments column to comments
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]';

-- attachments format: [{ "name": "file.pdf", "url": "https://...", "type": "image/png", "size": 12345 }]

-- 4. Create storage bucket for comment attachments (run this separately if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true)
-- ON CONFLICT DO NOTHING;
