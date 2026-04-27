'use client'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { getSupabaseBrowser } from './supabase/client'
import { fetchTasks, fetchProjects, fetchMembers, ensureCurrentUserIsMember, fetchSections } from './db'
import { fetchNotifications, getUnreadCount } from './notifications'
import { fetchComments } from './comments'

export function useSupabase() {
  return useMemo(() => getSupabaseBrowser(), [])
}

export function useUser() {
  const supabase = useSupabase()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
      }
      setLoading(false)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  return { user, profile, loading }
}

export function useTasks(projectId = null, memberId = null, userId = null) {
  const supabase = useSupabase()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const reloadTimerRef = useRef(null)
  const localUpdateIdsRef = useRef(new Set()) // Track IDs we just updated optimistically

  const load = useCallback(async () => {
    try {
      const data = await fetchTasks(supabase, { projectId, memberId, userId })
      setTasks(data)
    } catch (err) {
      console.error('Failed to load tasks:', err)
    }
    setLoading(false)
  }, [supabase, projectId, memberId, userId])

  // Debounced reload — avoids thundering herd from realtime
  const debouncedLoad = useCallback(() => {
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current)
    reloadTimerRef.current = setTimeout(() => { load() }, 300)
  }, [load])

  // Optimistic update — updates local state immediately without waiting for server
  const applyOptimistic = useCallback((taskId, updates) => {
    localUpdateIdsRef.current.add(taskId)
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) return { ...t, ...updates }
      // Also update in children array if it's a child task
      if (t.children && t.children.length > 0) {
        return { ...t, children: t.children.map(c => c.id === taskId ? { ...c, ...updates } : c) }
      }
      return t
    }))
    // Clear the skip flag after 2s (enough for server round-trip + realtime echo)
    setTimeout(() => localUpdateIdsRef.current.delete(taskId), 2000)
  }, [])

  // Bulk optimistic update — map of { taskId: updates } applied all at once
  const applyBulkOptimistic = useCallback((updatesByTaskId) => {
    const ids = Object.keys(updatesByTaskId)
    ids.forEach(id => localUpdateIdsRef.current.add(id))
    setTasks(prev => prev.map(t => {
      if (updatesByTaskId[t.id]) return { ...t, ...updatesByTaskId[t.id] }
      return t
    }))
    setTimeout(() => ids.forEach(id => localUpdateIdsRef.current.delete(id)), 2000)
  }, [])

  useEffect(() => {
    load()

    // Realtime subscription — debounced, skip our own updates
    const channelName = `tasks-${projectId || 'personal'}-${Date.now()}`
    const handleChange = (payload) => {
      const changedId = payload?.new?.id || payload?.old?.id
      // Skip if this is an echo of our own optimistic update
      if (changedId && localUpdateIdsRef.current.has(changedId)) return
      debouncedLoad()
    }
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, handleChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' }, handleChange)
      .subscribe()

    return () => {
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current)
      supabase.removeChannel(channel)
    }
  }, [supabase, projectId, load, debouncedLoad])

  return { tasks, loading, reload: load, applyOptimistic, applyBulkOptimistic }
}

export function useProjects() {
  const supabase = useSupabase()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await fetchProjects(supabase)
      setProjects(data)
    } catch (err) {
      console.error('Failed to load projects:', err)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`projects-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, load])

  return { projects, loading, reload: load }
}

export function useMembers() {
  const supabase = useSupabase()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      // Ensure current user exists as a member first
      await ensureCurrentUserIsMember(supabase)
      const data = await fetchMembers(supabase)
      setMembers(data)
    } catch (err) {
      console.error('Failed to load members:', err)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  return { members, loading, reload: load }
}

export function useNotifications(userId) {
  const supabase = useSupabase()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) return
    try {
      const [data, count] = await Promise.all([
        fetchNotifications(supabase, userId),
        getUnreadCount(supabase, userId)
      ])
      setNotifications(data)
      setUnreadCount(count)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    }
    setLoading(false)
  }, [supabase, userId])

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    load()

    const channelName = `notifications-${userId}-${Date.now()}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, userId, load])

  return { notifications, unreadCount, loading, reload: load }
}

export function useSections(projectId = null, ownerId = null) {
  const supabase = useSupabase()
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await fetchSections(supabase, { projectId, ownerId })
      setSections(data)
    } catch (err) {
      console.error('Failed to load sections:', err)
      setSections([])
    }
    setLoading(false)
  }, [supabase, projectId, ownerId])

  useEffect(() => { load() }, [load])

  // Return both names (for backward compat) and full objects (for rename/delete)
  return { sections: sections.map(s => s.name), sectionObjects: sections, loading, reload: load }
}

export function useComments(taskId) {
  const supabase = useSupabase()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!taskId) { setLoading(false); return }
    try {
      const data = await fetchComments(supabase, taskId)
      setComments(data)
    } catch (err) {
      console.error('Failed to load comments:', err)
    }
    setLoading(false)
  }, [supabase, taskId])

  useEffect(() => {
    if (!taskId) { setLoading(false); return }
    load()

    const channel = supabase
      .channel(`comments-${taskId}-${Date.now()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `task_id=eq.${taskId}`
      }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, taskId, load])

  return { comments, loading, reload: load }
}
