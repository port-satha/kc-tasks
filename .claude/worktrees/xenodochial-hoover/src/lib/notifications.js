// Notification helpers

export async function createNotification(supabase, { user_id, type, title, message = '', link = '' }) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({ user_id, type, title, message, link })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchNotifications(supabase, userId, { limit = 20 } = {}) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function markNotificationRead(supabase, notificationId) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
  if (error) throw error
}

export async function markAllNotificationsRead(supabase, userId) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
  if (error) throw error
}

export async function getUnreadCount(supabase, userId) {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)
  if (error) throw error
  return count || 0
}
