-- Cleanup: Delete ALL legacy subtasks that have matching child tasks in the tasks table
-- Every legacy subtask (subtasks table) has been migrated to the new child task system
-- (tasks table with parent_task_id), causing duplicates in the UI.

-- Delete legacy subtasks where a child task with the same title exists under the same parent
DELETE FROM public.subtasks s
WHERE EXISTS (
  SELECT 1 FROM public.tasks t
  WHERE t.parent_task_id = s.task_id
  AND t.title = s.title
);

-- Verify: check if any legacy subtasks remain
-- SELECT count(*) FROM public.subtasks;
