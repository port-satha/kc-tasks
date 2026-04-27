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
export async function fetchTasks(supabase, { projectId = null, memberId = null, userId = null } = {}) {
  // Build the main query
  let mainQuery = supabase
    .from('tasks')
    .select('*, subtasks(*)')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (projectId) {
    mainQuery = mainQuery.eq('project_id', projectId)
  } else {
    // Personal tasks (no project) — only show the CURRENT user's personal tasks,
    // not everyone's. Without this filter, anyone's personal tasks leak into
    // every other user's "My Tasks" view.
    mainQuery = mainQuery.is('project_id', null)
    if (userId) mainQuery = mainQuery.eq('created_by', userId)
  }

  // For "My Tasks" view, also fetch assigned tasks + legacy assigned subtasks in parallel
  const needsAssigned = !projectId && memberId
  const assignedQuery = needsAssigned
    ? supabase.from('tasks').select('*, subtasks(*)').eq('assigned_to', memberId).order('sort_order', { ascending: true })
    : Promise.resolve({ data: [] })
  const assignedSubtasksQuery = needsAssigned
    ? supabase.from('subtasks').select('*, task:tasks(id, title, project_id, section)').eq('assigned_to', memberId)
    : Promise.resolve({ data: [] })

  // Run all three top-level queries in parallel — saves 2 round-trips
  const [mainRes, assignedRes, subtasksRes] = await Promise.all([mainQuery, assignedQuery, assignedSubtasksQuery])
  if (mainRes.error) throw mainRes.error

  const all = mainRes.data || []
  const assignedTasksData = assignedRes.data || []
  const assignedSubtasksData = subtasksRes.data || []

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

  // Process assigned tasks (for "My Tasks" view)
  if (needsAssigned) {
    try {
      const assignedTasks = assignedTasksData

      if (assignedTasks.length > 0) {
        // Fetch parent tasks + project names in parallel
        const parentIds = [...new Set(assignedTasks.filter(c => c.parent_task_id).map(c => c.parent_task_id))]
        const projectIds = [...new Set(assignedTasks.map(c => c.project_id).filter(Boolean))]

        const [parentsRes, projsRes] = await Promise.all([
          parentIds.length > 0
            ? supabase.from('tasks').select('id, title, project_id, section').in('id', parentIds)
            : Promise.resolve({ data: [] }),
          projectIds.length > 0
            ? supabase.from('projects').select('id, name').in('id', projectIds)
            : Promise.resolve({ data: [] }),
        ])

        const parentMap = {}
        ;(parentsRes.data || []).forEach(p => { parentMap[p.id] = p })
        const projectMap = {}
        ;(projsRes.data || []).forEach(p => { projectMap[p.id] = p })

        assignedTasks.forEach(c => {
          // Skip tasks already shown as top-level items (not children)
          const isAlreadyTopLevel = topLevel.some(t => t.id === c.id)
          if (isAlreadyTopLevel) return

          c.subtasks = (c.subtasks || []).sort((a, b) => a.sort_order - b.sort_order)
          c.children = []
          c._parentTask = parentMap[c.parent_task_id] || null
          c._project = projectMap[c.project_id] || null
          c._isAssignedChild = true
          // For child tasks in My Tasks: if section still matches parent's section,
          // the user hasn't moved it yet — show in "Recently assigned"
          if (c.parent_task_id) {
            const parentSection = c._parentTask?.section || c._project?.section
            // If section is empty, matches parent, or is a project section name, default to Recently assigned
            if (!c.section || c.section === '' || c.section === parentSection) {
              c.section = 'Recently assigned'
            }
          } else if (!c.section || c.section === '') {
            c.section = 'Recently assigned'
          }
          existingIds.add(c.id)
          topLevel.push(c)
        })
      }
    } catch (err) {
      console.error('Failed to load assigned tasks:', err)
    }

    // Process legacy subtasks (already fetched in parallel at top)
    try {
      const assignedSubtasks = assignedSubtasksData

      if (assignedSubtasks.length > 0) {
        const subProjectIds = [...new Set(assignedSubtasks.map(s => s.task?.project_id).filter(Boolean))]
        const subProjectMap = {}
        if (subProjectIds.length > 0) {
          const { data: projs } = await supabase
            .from('projects')
            .select('id, name')
            .in('id', subProjectIds)
          ;(projs || []).forEach(p => { subProjectMap[p.id] = p })
        }

        assignedSubtasks.forEach(st => {
          if (!st.task) return
          // Create a virtual task entry from the subtask
          const virtualTask = {
            id: `subtask-${st.id}`,
            _realSubtaskId: st.id,
            title: st.title,
            due: st.due,
            assigned_to: st.assigned_to,
            progress: st.done ? 'Done' : 'Not started',
            section: 'Recently assigned',
            subtasks: [],
            children: [],
            _parentTask: { id: st.task.id, title: st.task.title, project_id: st.task.project_id },
            _project: subProjectMap[st.task.project_id] || null,
            _isAssignedChild: true,
            _isLegacySubtask: true,
            created_at: st.created_at,
          }
          topLevel.push(virtualTask)
        })
      }
    } catch (err) {
      console.error('Failed to load assigned subtasks:', err)
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

  // Fire notifications in the background — don't block the UI
  // Only runs if there's something notification-worthy
  const needsNotif = (cleanUpdates.assigned_to && cleanUpdates.assigned_to !== previousAssignedTo) ||
                     (cleanUpdates.progress === 'Done' && data.project_id)
  if (needsNotif) {
    // Intentionally not awaited — fire and forget
    _sendTaskUpdateNotifications(supabase, data, cleanUpdates, previousAssignedTo).catch(err =>
      console.error('Notification error (non-blocking):', err)
    )
  }

  return data
}

async function _sendTaskUpdateNotifications(supabase, data, cleanUpdates, previousAssignedTo) {
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  const currentUserId = currentUser?.id
  const taskTitle = data.title || 'a task'
  const projectLink = data.project_id ? `/projects/${data.project_id}` : '/'

  if (cleanUpdates.assigned_to && cleanUpdates.assigned_to !== previousAssignedTo) {
    const { data: member } = await supabase
      .from('members')
      .select('id, name, profile_id')
      .eq('id', cleanUpdates.assigned_to)
      .single()
    if (member?.profile_id && member.profile_id !== currentUserId) {
      await createNotification(supabase, {
        user_id: member.profile_id,
        type: 'task_assigned',
        title: 'Task assigned to you',
        message: `You were assigned to "${taskTitle}"`,
        link: projectLink,
      })
    }
  }

  if (cleanUpdates.progress === 'Done' && data.project_id) {
    const { data: project } = await supabase
      .from('projects')
      .select('owner_id, name')
      .eq('id', data.project_id)
      .single()
    if (project?.owner_id && project.owner_id !== currentUserId) {
      const { data: currentMember } = await supabase
        .from('members')
        .select('name')
        .eq('profile_id', currentUserId)
        .single()
      const doerName = currentMember?.name || 'Someone'
      await createNotification(supabase, {
        user_id: project.owner_id,
        type: 'task_completed',
        title: `${doerName} completed a task`,
        message: `"${taskTitle}" in ${project.name}`,
        link: projectLink,
      })
    }
  }
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
  // Fetch task + legacy subtasks + real child tasks in parallel
  const [taskRes, childrenRes] = await Promise.all([
    supabase.from('tasks').select('*, subtasks(*)').eq('id', taskId).single(),
    supabase.from('tasks').select('*, subtasks(*)').eq('parent_task_id', taskId).order('sort_order', { ascending: true }),
  ])
  if (taskRes.error) return null
  const data = taskRes.data
  data.subtasks = (data.subtasks || []).sort((a, b) => a.sort_order - b.sort_order)
  // Actually populate children (was previously empty array — bug)
  data.children = (childrenRes.data || []).map(c => ({
    ...c,
    subtasks: (c.subtasks || []).sort((a, b) => a.sort_order - b.sort_order),
  }))
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

// Duplicate a task (with its subtasks and child tasks)
export async function duplicateTask(supabase, taskId, { owner_id } = {}) {
  // Fetch the original task with subtasks
  const { data: original, error: fetchErr } = await supabase
    .from('tasks')
    .select('*, subtasks(*)')
    .eq('id', taskId)
    .single()
  if (fetchErr) throw fetchErr

  // Build new task data (exclude id, created_at, updated_at)
  const { id, created_at, updated_at, subtasks, ...taskData } = original
  const newTaskData = {
    ...taskData,
    title: `${taskData.title} (copy)`,
    progress: '', // Reset to not-done
    created_by: owner_id || taskData.created_by,
    sort_order: (taskData.sort_order ?? 0) + 1,
  }

  // Clean empty strings to null
  const nullIfEmpty = ['due', 'priority', 'value', 'effort', 'progress', 'assigned_to']
  nullIfEmpty.forEach(f => { if (newTaskData[f] === '') newTaskData[f] = null })

  const { data: newTask, error: insertErr } = await supabase
    .from('tasks')
    .insert(newTaskData)
    .select()
    .single()
  if (insertErr) throw insertErr

  // Duplicate subtasks (legacy)
  if (subtasks && subtasks.length > 0) {
    const newSubtasks = subtasks.map(({ id, task_id, created_at, ...st }) => ({
      ...st,
      task_id: newTask.id,
      done: false,
    }))
    await supabase.from('subtasks').insert(newSubtasks)
  }

  // Duplicate child tasks
  const { data: children } = await supabase
    .from('tasks')
    .select('*')
    .eq('parent_task_id', taskId)
  if (children && children.length > 0) {
    const newChildren = children.map(({ id, created_at, updated_at, ...c }) => {
      const child = {
        ...c,
        parent_task_id: newTask.id,
        progress: '',
        created_by: owner_id || c.created_by,
      }
      nullIfEmpty.forEach(f => { if (child[f] === '') child[f] = null })
      return child
    })
    await supabase.from('tasks').insert(newChildren)
  }

  return newTask
}

// Duplicate a project (with optional: copy tasks, members)
export async function duplicateProject(supabase, projectId, { owner_id, copyTasks = true, copyMembers = true } = {}) {
  // Fetch original project
  const { data: original, error: fetchErr } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()
  if (fetchErr) throw fetchErr

  const { id, created_at, updated_at, ...projectData } = original
  const newProjectData = {
    ...projectData,
    name: `${projectData.name} (copy)`,
    owner_id: owner_id || projectData.owner_id,
  }

  const { data: newProject, error: insertErr } = await supabase
    .from('projects')
    .insert(newProjectData)
    .select()
    .single()
  if (insertErr) throw insertErr

  // Copy members
  if (copyMembers) {
    const { data: members } = await supabase
      .from('project_members')
      .select('member_id, role')
      .eq('project_id', projectId)
    if (members && members.length > 0) {
      const newMembers = members.map(m => ({
        project_id: newProject.id,
        member_id: m.member_id,
        role: m.role,
      }))
      await supabase.from('project_members').insert(newMembers)
    }
  }

  // Copy tasks (top-level only first, then their children)
  if (copyTasks) {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*, subtasks(*)')
      .eq('project_id', projectId)
      .is('parent_task_id', null)
    if (tasks && tasks.length > 0) {
      const taskIdMap = {} // old id -> new id
      const nullIfEmpty = ['due', 'priority', 'value', 'effort', 'progress', 'assigned_to']
      for (const t of tasks) {
        const { id: oldId, created_at, updated_at, subtasks, ...td } = t
        const newTd = { ...td, project_id: newProject.id, progress: '' }
        nullIfEmpty.forEach(f => { if (newTd[f] === '') newTd[f] = null })
        const { data: newT } = await supabase.from('tasks').insert(newTd).select().single()
        if (newT) {
          taskIdMap[oldId] = newT.id
          // Copy subtasks
          if (subtasks && subtasks.length > 0) {
            const newSubs = subtasks.map(({ id, task_id, created_at, ...st }) => ({
              ...st, task_id: newT.id, done: false,
            }))
            await supabase.from('subtasks').insert(newSubs)
          }
        }
      }
      // Copy child tasks with remapped parent_task_id
      const { data: childTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .not('parent_task_id', 'is', null)
      if (childTasks && childTasks.length > 0) {
        const newChildren = childTasks
          .filter(c => taskIdMap[c.parent_task_id])
          .map(({ id, created_at, updated_at, ...c }) => {
            const child = {
              ...c,
              project_id: newProject.id,
              parent_task_id: taskIdMap[c.parent_task_id],
              progress: '',
            }
            nullIfEmpty.forEach(f => { if (child[f] === '') child[f] = null })
            return child
          })
        if (newChildren.length > 0) await supabase.from('tasks').insert(newChildren)
      }
    }
  }

  return newProject
}

// ===== MEMBERS =====
export async function fetchMembers(supabase) {
  const { data, error } = await supabase
    .from('members')
    .select('*, profile:profiles!profile_id(id, role, squad, team, full_name, nickname, position_title, profile_complete)')
    .order('name', { ascending: true })
  if (error) throw error
  return data || []
}

export async function updateProfileRole(supabase, profileId, role) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', profileId)
    .select('id, role')
    .single()
  if (error) throw error
  return data
}

// Update a member's squad. Writes to both tables so the members-table
// cache used by the task UI stays in sync with the profile source of truth.
export async function updateMemberSquad(supabase, { memberId, profileId, squad }) {
  const value = squad || null
  const { error: memErr } = await supabase
    .from('members')
    .update({ squad: value })
    .eq('id', memberId)
  if (memErr) throw memErr
  if (profileId) {
    const { error: profErr } = await supabase
      .from('profiles')
      .update({ squad: value })
      .eq('id', profileId)
    if (profErr) throw profErr
  }
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
      role: 'member',
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

  // Notify the added member
  try {
    const [{ data: member }, { data: project }] = await Promise.all([
      supabase.from('members').select('id, name, profile_id').eq('id', memberId).single(),
      supabase.from('projects').select('id, name').eq('id', projectId).single(),
    ])
    if (!member?.profile_id) {
      console.warn(`Cannot notify member ${member?.name || memberId}: no profile_id linked (member hasn't signed up yet)`)
      return
    }
    if (project) {
      await createNotification(supabase, {
        user_id: member.profile_id,
        type: 'project_invited',
        title: `You were added to "${project.name}"`,
        message: `You now have ${role} access to this project`,
        link: `/projects/${projectId}`,
      })
    }
  } catch (notifErr) {
    console.error('Failed to send project invite notification:', notifErr)
  }
}

export async function removeProjectMember(supabase, projectId, memberId) {
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('member_id', memberId)
  if (error) throw error
}

export async function updateProjectMemberRole(supabase, projectId, memberId, role) {
  const { error } = await supabase
    .from('project_members')
    .update({ role })
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
