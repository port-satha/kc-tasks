-- Performance indexes for faster task queries
-- Run this in Supabase SQL editor

-- Tasks: speed up filters on assigned_to, project_id, parent_task_id, sort_order
CREATE INDEX IF NOT EXISTS tasks_assigned_to_idx ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS tasks_project_id_idx ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS tasks_parent_task_id_idx ON public.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS tasks_sort_order_idx ON public.tasks(sort_order);
CREATE INDEX IF NOT EXISTS tasks_progress_idx ON public.tasks(progress);

-- Composite index for the most common "My Tasks" query pattern
CREATE INDEX IF NOT EXISTS tasks_assigned_sort_idx ON public.tasks(assigned_to, sort_order);
-- Composite for project-scoped queries
CREATE INDEX IF NOT EXISTS tasks_project_sort_idx ON public.tasks(project_id, sort_order);

-- Subtasks: join pattern queries
CREATE INDEX IF NOT EXISTS subtasks_task_id_idx ON public.subtasks(task_id);
CREATE INDEX IF NOT EXISTS subtasks_assigned_to_idx ON public.subtasks(assigned_to);
CREATE INDEX IF NOT EXISTS subtasks_sort_order_idx ON public.subtasks(sort_order);

-- Comments: typical lookup is by task
CREATE INDEX IF NOT EXISTS comments_task_id_idx ON public.comments(task_id);

-- Notifications: heavy filter by user_id + read status
CREATE INDEX IF NOT EXISTS notifications_user_id_read_idx ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications(user_id, created_at DESC);

-- Project members
CREATE INDEX IF NOT EXISTS project_members_project_id_idx ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS project_members_member_id_idx ON public.project_members(member_id);

-- Sections
CREATE INDEX IF NOT EXISTS sections_project_id_idx ON public.sections(project_id);
CREATE INDEX IF NOT EXISTS sections_owner_id_idx ON public.sections(owner_id);

-- Members
CREATE INDEX IF NOT EXISTS members_profile_id_idx ON public.members(profile_id);
