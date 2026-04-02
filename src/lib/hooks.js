'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { getSupabaseBrowser } from './supabase/client'
import { fetchTasks, fetchProjects, fetchMembers } from './db'
import { fetchNotifications, getUnreadCount } from './notifications'

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

export function useTasks(projectId = null) {
  const supabase = useSupabase()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await fetchTasks(supabase, { projectId })
      setTasks(data)
    } catch (err) {
      console.error('Failed to load tasks:', err)
    }
    setLoading(false)
  }, [supabase, projectId])

  useEffect(() => {
    load()

    // Realtime subscription
    const channel = supabase
      .channel(`tasks-${projectId || 'personal'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, projectId, load])

  return { tasks, loading, reload: load }
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
      .channel('projects')
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
      const data = await fetchMembers(supabase)
      setMembers(data)
    } catch (err) {
      console.error('Failed to load members:', err)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
    const channel = supabase
      .channel('members')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, load])

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

    const channel = supabase
      .channel(`notifications-${userId}`)
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
