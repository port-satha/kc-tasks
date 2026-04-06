// Data access layer for Supabase
import { createNotification } from './notifications'

// ===== RECURRENCE HELPERS =====
export function computeNextDueDate(currentDue, rule) {
  if (!currentDue || !rule) return null
  const date = new Date(currentDue + 'T00:00:00')
  const { type, interval = 1, days, dayOfMonth } = rule

  if (type === 'daily') {
    date.setDate(date.getDate() + interval)
  } else if (type === 'weekly') {
    if (days && days.length > 0) {
      // days are 0-6 (Mon-Sun), JS getDay: 0=Sun,1=Mon...6=Sat
      const jsDay = date.getDay() // 0=Sun
      const currentIdx = jsDay === 0 ? 6 : jsDay - 1 // convert to 0=Mon
      const sorted = [...days].sort((a, b) => a - b)
      const next = sorted.find(d => d > currentIdx)
      if (next !== undefined) {
        date.setDate(date.getDate() + (next - currentIdx))
      } else {
        // wrap to next week
        date.setDate(date.getDate() + (7 * (interval - 1)) + (7 - currentIdx + sorted[0]))
      }
    } else {
      date.setDate(date.getDate() + 7 * interval)
    }
  } else if (type === 'monthly') {
    // Set day to 1 first to avoid month overflow (e.g. Jan 31 + 1 month → Mar 3 instead of Feb 28)
    const targetDay = dayOfMonth || date.getDate()
    date.setDate(1)
    date.setMonth(date.getMonth() + interval)
    const maxDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    date.setDate(Math.min(targetDay, maxDay))
  } else if (type === 'yearly') {
    date.setFullYear(date.getFullYear() + interval)
  }

  // Check end date
  if (rule.endDate && date > new Date(rule.endDate + 'T23:59:59')) return null

  return date.toISOString().split('T')[0]
}

export async function createRecurringFollowUp(supabase, task) {
  if (!task.recurrence_rule || !task.due) return null
  const nextDue = computeNextDueDate(task.due, task.recurrence_rule)
  if (!nextDue) return null

  const newTask = {
    title: task.title,
    section: 'Recently assigned',
    due: nextDue,
    priority: task.priority,
    value: task.value,
    effort: task.effort,
    progress: null,
    notes: task.notes,
    assigned_to: task.assigned_to,
    project_id: task.project_id,
    created_by: task.created_by,
    recurrence_rule: task.recurrence_rule,
    recurrence_parent_id: task.id,
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert(newTask)
    .select('*, subtasks(*)')
    .single()
  if (error) { console.error('Failed to create recurring task:', error); return null }
  return data
}

// ===== TASKS =====
export async function fetchTasks(supabase, { projectId = null, memberId = null } = {}) {
  let query = supabase
    .from('tasks')
    .select('*, subtasks(*)')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (projectId) {
    query = query.eq('project_id', projectId)
  } else {
    query = query.is('project_id', null)
  }

  const { data, error } = await query
  if (error) throw error

  const all = data || []

  // Build parent-child relationships
  const childMap = {} // parent_task_id -> [child tasks]
  const topLevel = []

  all.forEach(t => {
    // Sort old subtasks (backward compat)
    t.subtasks = (t.subtasks || []).sort((a, b) => a.sort_order - b.sort_order)
    if (t.parent_task_id) {
      if (!childMap[t.parent_task_id]) childMap[t.parent_task_id] = []
      childMap[t.parent_task_id].push(t)
    } else {
      topLevel.push(t)
    }
  })

  // Attach children to their parent tasks
  topLevel.forEach(t => {
    t.children = (childMap[t.id] || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  })

  // Track ALL task IDs already loaded (top-level + children) to avoid duplicates
  const existingIds = new Set(all.map(t => t.id))

  // Fetch ALL tasks assigned to this member (for "My Tasks" view)
  // This includes tasks from projects AND subtasks under personal tasks
  if (!projectId && memberId) {
    try {
      const { data: assignedTasks } = await supabase
        .from('tasks')
        .select('*, subtasks(*)')
        .eq('assigned_to', memberId)
        .order('sort_order', { ascending: true })

      if (assignedTasks && assignedTasks.length > 0) {
        // Fetch parent task info for breadcrumbs (for child tasks)
        const parentIds = [...new Set(assignedTasks.filter(c => c.parent_task_id).map(c => c.parent_task_id))]
        const parentMap = {}
        if (parentIds.length > 0) {
          const { data: parents } = await supabase
            .from('tasks')
            .select('id, title, project_id')
            .in('id', parentIds)
          if (parents) parents.forEach(p => { parentMap[p.id] = p })
        }

        // Fetch project names for context
        const projectIds = [...new Set(assignedTasks.map(c => c.project_id).filter(Boolean))]
        const projectMap = {}
        if (projectIds.length > 0) {
          const { data: projs } = await supabase
            .from('projects')
            .select('id, name')
            .in('id', projectIds)
          if (projs) projs.forEach(p => { projectMap[p.id] = p })
        }

        assignedTasks.forEach(c => {
          // Don't duplicate tasks already loaded (as top-level OR as children)
          if (existingIds.has(c.id)) return
          c.subtasks = (c.subtasks || []).sort((a, b) => a.sort_order - b.sort_order)
          c.children = []
          c._parentTask = parentMap[c.parent_task_id] || null
          c._project = projectMap[c.project_id] || null
          c._isAssignedChild = true
          // Show assigned tasks under "Recently assigned" in the assignee's My Tasks
          if (!c.section || c.section === '') c.section = 'Recently assigned'
          existingIds.add(c.id)
          topLevel.push(c)
        })
      }
    } catch (err) {
      console.error('Failed to load assigned tasks:', err)
    }
  }

  return topLevel
}

export async function createTask(supabase, taskData) {
  // Clean empty strings to null for date/enum fields
  const cleaned = { ...taskData }
  const nullIfEmpty = ['due', 'priority', 'value', 'effort', 'progress', 'assigned_to']
  nullIfEmpty.forEach(f => { if (cleaned[f] === '') cleaned[f] = null })

  const { data, error } = await supabase
    .from('tasks')
    .insert(cleaned)
    .select('*, subtasks(*)')
    .single()
  if (error) throw error

  // If assigned to someone in a project task, also create a personal reference
  // The assignee will see the task in their project view
  return data
}

export async function updateTask(supabase, taskId, updates, { previousAssignedTo = null } = {}) {
  const { assigned_member, subtasks, children, _parentTask, _isAssignedChild, _project, ...cleanUpdates } = updates
  // Clean empty strings to null for date/enum fields
  const nullIfEmpty = ['due', 'priority', 'value', 'effort', 'progress', 'assigned_to']
  nullIfEmpty.forEach(f => { if (f in cleanUpdates && cleanUpdates[f] === '') cleanUpdates[f] = null })
  const { data, error } = await supabase
    .from('tasks')
    .update(cleanUpdates)
    .eq('id', taskId)
    .select('*, subtasks(*)')
    .single()
  if (error) throw error

  // If assigned_to changed, notify the new assignee
  if (cleanUpdates.assigned_to && cleanUpdates.assigned_to !== previousAssignedTo) {
    try {
      const { data: member } = await supabase
        .from('members')
        .select('id, name, profile_id')
        .eq('id', cleanUpdates.assigned_to)
        .single()

      if (member?.profile_id) {
        const taskTitle = data.title || 'a task'
        const projectId = data.project_id || ''
        await createNotification(supabase, {
          user_id: member.profile_id,
          type: 'task_assigned',
          title: 'Task assigned to you',
          message: `You were assigned to "${taskTitle}"`,
          link: projectId ? `/projects/${projectId}` : '/'
        })
      }
    } catch (notifErr) {
      console.error('Failed to create notification:', notifErr)
    }
  }

  return data
}

export async function deleteTask(supabase, taskId) {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId)
  if (error) throw error
}

// ===== CHILD TASKS (Asana-style subtasks) =====
export async function createChildTask(supabase, parentTaskId, { title, created_by, project_id, section }) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title,
      parent_task_id: parentTaskId,
      created_by,
      project_id: project_id || null,
      section: section || 'Recently assigned',
      sort_order: 0
    })
    .select('*, subtasks(*)')
    .single()
  if (error) throw error
  data.children = []
  return data
}

export async function fetchChildTasks(supabase, parentTaskId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, subtasks(*)')
    .eq('parent_task_id', parentTaskId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map(t => ({
    ...t,
    subtasks: (t.subtasks || []).sort((a, b) => a.sort_order - b.sort_order),
    children: []
  }))
}

export async function fetchTaskById(supabase, taskId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, subtasks(*)')
    .eq('id', taskId)
    .single()
  if (error) return null
  data.subtasks = (data.subtasks || []).sort((a, b) => a.sort_order - b.sort_order)
  data.children = []
  return data
}

export async function fetchParentTask(supabase, taskId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, project_id')
    .eq('id', taskId)
    .single()
  if (error) return null
  return data
}

// ===== SUBTASKS (legacy) =====
export async function createSubtask(supabase, taskId, title) {
  const { data, error } = await supabase
    .from('subtasks')
    .insert({ task_id: taskId, title })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSubtask(supabase, subtaskId, updates) {
  const { data, error } = await supabase
    .from('subtasks')
    .update(updates)
    .eq('id', subtaskId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSubtask(supabase, subtaskId) {
  const { error } = await supabase.from('subtasks').delete().eq('id', subtaskId)
  if (error) throw error
}

// ===== PROJECTS =====
export async function fetchProjects(supabase) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createProject(supabase, { name, description, is_private, owner_id }) {
  const { data, error } = await supabase
    .from('projects')
    .insert({ name, description, is_private, owner_id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProject(supabase, projectId, updates) {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProject(supabase, projectId) {
  const { error } = await supabase.from('projects').delete().eq('id', projectId)
  if (error) throw error
}

// ===== MEMBERS =====
export async function fetchMembers(supabase) {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createMember(supabase, { name, email, role = 'member', profile_id = null }) {
  // If email is provided but no profile_id, try to find matching profile
  if (email && !profile_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()
    if (profile) profile_id = profile.id
  }

  const { data, error } = await supabase
    .from('members')
    .insert({ name, email, role, profile_id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function ensureCurrentUserIsMember(supabase) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Check if already a member
  const { data: existing } = await supabase
    .from('members')
    .select('*')
    .eq('profile_id', user.id)
    .single()
  if (existing) return existing

  // Check if member exists with same email but no profile_id
  const { data: emailMatch } = await supabase
    .from('members')
    .select('*')
    .eq('email', user.email)
    .single()
  if (emailMatch) {
    const { data: updated } = await supabase
      .from('members')
      .update({ profile_id: user.id })
      .eq('id', emailMatch.id)
      .select()
      .single()
    return updated
  }

  // Create new member from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { data: newMember } = await supabase
    .from('members')
    .insert({
      name: profile?.full_name || user.email.split('@')[0],
      email: user.email,
      role: 'admin',
      profile_id: user.id
    })
    .select()
    .single()
  return newMember
}

export async function updateMember(supabase, memberId, updates) {
  const { data, error } = await supabase
    .from('members')
    .update(updates)
    .eq('id', memberId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteMember(supabase, memberId) {
  const { error } = await supabase.from('members').delete().eq('id', memberId)
  if (error) throw error
}

// ===== SECTIONS =====
export async function fetchSections(supabase, { projectId = null, ownerId = null } = {}) {
  let query = supabase.from('sections').select('*').order('sort_order', { ascending: true })
  if (projectId) {
    query = query.eq('project_id', projectId)
  } else if (ownerId) {
    query = query.eq('owner_id', ownerId).is('project_id', null)
  }
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createSection(supabase, { name, projectId = null, ownerId = null }) {
  const { data, error } = await supabase
    .from('sections')
    .insert({ name, project_id: projectId, owner_id: ownerId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSection(supabase, sectionId) {
  const { error } = await supabase.from('sections').delete().eq('id', sectionId)
  if (error) throw error
}

export async function renameSection(supabase, sectionId, name) {
  const { data, error } = await supabase
    .from('sections')
    .update({ name })
    .eq('id', sectionId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ===== PROJECT MEMBERS =====
export async function addProjectMember(supabase, projectId, memberId, role = 'editor') {
  const { error } = await supabase
    .from('project_members')
    .insert({ project_id: projectId, member_id: memberId, role })
  if (error) throw error
}

export async function removeProjectMember(supabase, projectId, memberId) {
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('member_id', memberId)
  if (error) throw error
}

export async function fetchProjectMembers(supabase, projectId) {
  const { data, error } = await supabase
    .from('project_members')
    .select('*, member:members(*)')
    .eq('project_id', projectId)
  if (error) throw error
  return data || []
}
