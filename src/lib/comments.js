// Comment helpers for task/subtask discussions
import { createNotification } from './notifications'

export async function fetchComments(supabase, taskId) {
  const { data, error } = await supabase
    .from('comments')
    .select('*, author:members(*)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createComment(supabase, { task_id, subtask_id = null, author_id, body, mentions = [], attachments = [] }) {
  const insertData = { task_id, subtask_id, author_id, body, mentions }
  if (attachments && attachments.length > 0) insertData.attachments = attachments
  const { data, error } = await supabase
    .from('comments')
    .insert(insertData)
    .select('*, author:members(*)')
    .single()
  if (error) throw error

  // Send notifications
  try {
    // Get task details
    const { data: task } = await supabase
      .from('tasks')
      .select('title, project_id, assigned_to, created_by')
      .eq('id', task_id)
      .single()

    const authorName = data.author?.name || 'Someone'
    const taskTitle = task?.title || 'a task'
    const link = task?.project_id ? `/projects/${task.project_id}` : '/'

    // Track who we've already notified to avoid duplicates
    const notifiedIds = new Set()

    // 1. Notify mentioned members
    if (mentions.length > 0) {
      const { data: mentionedMembers } = await supabase
        .from('members')
        .select('id, name, profile_id')
        .in('id', mentions)

      for (const member of (mentionedMembers || [])) {
        if (!member.profile_id || member.id === author_id) continue
        notifiedIds.add(member.id)
        await createNotification(supabase, {
          user_id: member.profile_id,
          type: 'mentioned',
          title: `${authorName} mentioned you`,
          message: `In a comment on "${taskTitle}"`,
          link
        })
      }
    }

    // 2. Notify task assignee (if not the comment author and not already mentioned)
    if (task?.assigned_to && task.assigned_to !== author_id && !notifiedIds.has(task.assigned_to)) {
      const { data: assignee } = await supabase
        .from('members')
        .select('id, profile_id')
        .eq('id', task.assigned_to)
        .single()
      if (assignee?.profile_id) {
        notifiedIds.add(assignee.id)
        await createNotification(supabase, {
          user_id: assignee.profile_id,
          type: 'comment',
          title: `${authorName} commented on your task`,
          message: `New comment on "${taskTitle}"`,
          link
        })
      }
    }
  } catch (notifErr) {
    console.error('Failed to send comment notifications:', notifErr)
  }

  return data
}

export async function updateComment(supabase, commentId, { body, mentions = [] }) {
  const { data, error } = await supabase
    .from('comments')
    .update({ body, mentions, updated_at: new Date().toISOString() })
    .eq('id', commentId)
    .select('*, author:members(*)')
    .single()
  if (error) throw error
  return data
}

export async function deleteComment(supabase, commentId) {
  const { error } = await supabase.from('comments').delete().eq('id', commentId)
  if (error) throw error
}
