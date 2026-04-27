-- Add due date and assignee to subtasks
ALTER TABLE public.subtasks
  ADD COLUMN IF NOT EXISTS due date,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.members(id);
