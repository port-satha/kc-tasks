// Data access layer for Supabase

// ===== TASKS =====
export async function fetchTasks(supabase, { projectId = null } = {}) {
  let query = supabase
    .from('tasks')
    .select('*, subtasks(*), assigned_member:members!assigned_to(id, name, email)')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (projectId) {
    query = query.eq('project_id', projectId)
  } else {
    query = query.is('project_id', null)
  }

  const { data, error } = await query
  if (error) throw error

  // Sort subtasks
  return (data || []).map(t => ({
    ...t,
    subtasks: (t.subtasks || []).sort((a, b) => a.sort_order - b.sort_order)
  }))
}

export async function createTask(supabase, taskData) {
  const { data, error } = await supabase
    .from('tasks')
    .insert(taskData)
    .select('*, subtasks(*), assigned_member:members!assigned_to(id, name, email)')
    .single()
  if (error) throw error
  return data
}

export async function updateTask(supabase, taskId, updates) {
  const { assigned_member, subtasks, ...cleanUpdates } = updates
  const { data, error } = await supabase
    .from('tasks')
    .update(cleanUpdates)
    .eq('id', taskId)
    .select('*, subtasks(*), assigned_member:members!assigned_to(id, name, email)')
    .single()
  if (error) throw error
  return data
}

export async function deleteTask(supabase, taskId) {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId)
  if (error) throw error
}

// ===== SUBTASKS =====
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
    .select('*, owner:profiles!owner_id(id, full_name, email)')
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

export async function createMember(supabase, { name, email, role = 'member' }) {
  const { data, error } = await supabase
    .from('members')
    .insert({ name, email, role })
    .select()
    .single()
  if (error) throw error
  return data
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
