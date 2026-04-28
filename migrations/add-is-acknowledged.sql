-- ============================================================
-- Add is_acknowledged column for "Recently assigned" virtual section
-- ============================================================
-- Run in Supabase SQL Editor
--
-- Purpose: when someone is assigned a task by another person, we want
-- to surface it in a "Recently assigned" section in their My Tasks
-- until they acknowledge (= see) it. Self-created tasks are
-- automatically acknowledged.
--
-- Default = true so existing tasks are NOT marked as unacknowledged.

alter table public.tasks
  add column if not exists is_acknowledged boolean not null default true;

create index if not exists tasks_unacknowledged_idx
  on public.tasks(assigned_to)
  where is_acknowledged = false;
