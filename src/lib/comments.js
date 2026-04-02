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

export async function createComment(supabase, { task_id, subtask_id = null, author_id, body, mentions = [] }) {
  const { data, error } = await supabase
    .from('comments')
    .insert({ task_id, subtask_id, author_id, body, mentions })
    .select('*, author:members(*)')
    .single()
  if (error) throw error

  // Send notifications to mentioned members
  if (mentions.length > 0) {
    try {
      // Get task title for notification message
      const { data: task } = await supabase
        .from('tasks')
        .select('title, project_id')
        .eq('id', task_id)
        .single()

      // Get author name
      const authorName = data.author?.name || 'Someone'
      const taskTitle = task?.title || 'a task'
      const link = task?.project_id ? `/projects/${task.project_id}` : '/'

      // Get profile_id for each mentioned member
      const { data: mentionedMembers } = await supabase
        .from('members')
        .select('id, name, profile_id')
        .in('id', mentions)

      for (const member of (mentionedMembers || [])) {
        if (!member.profile_id) continue
        // Don't notify yourself
        if (member.id === author_id) continue

        await createNotification(supabase, {
          user_id: member.profile_id,
          type: 'mentioned',
          title: `${authorName} mentioned you`,
          message: `You were mentioned in a comment on "${taskTitle}"`,
          link
        })
      }
    } catch (notifErr) {
      console.error('Failed to send mention notifications:', notifErr)
    }
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
