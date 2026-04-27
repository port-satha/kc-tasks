import { getSupabaseServer } from '@/lib/supabase/server'

const ASANA_BASE = 'https://app.asana.com/api/1.0'

async function asanaFetch(path, token) {
  const res = await fetch(`${ASANA_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error(`Asana API error: ${res.status}`)
  return res.json()
}

async function getAllTasks(projectGid, token) {
  let tasks = []
  let offset = null
  do {
    const url = `/tasks?project=${projectGid}&opt_fields=name,num_subtasks&limit=100${offset ? `&offset=${offset}` : ''}`
    const res = await asanaFetch(url, token)
    tasks = tasks.concat(res.data.filter(t => t.num_subtasks > 0))
    offset = res.next_page?.offset || null
  } while (offset)
  return tasks
}

async function getSubtasks(taskGid, token) {
  const res = await asanaFetch(`/tasks/${taskGid}/subtasks?opt_fields=name,completed,due_on,assignee,assignee.name`, token)
  return res.data.map(s => ({
    title: s.name,
    done: s.completed,
    due: s.due_on || null,
    assignee_name: s.assignee?.name || null
  }))
}

// GET: list Asana projects (for reference)
// POST with project_gid: import subtasks for one project
// POST without project_gid: list all Asana projects with task counts
export async function POST(req) {
  try {
    const { asana_token, project_gid } = await req.json()
    if (!asana_token) {
      return Response.json({ error: 'asana_token is required' }, { status: 400 })
    }

    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // If no project_gid, list all Asana projects so user knows what to import
    if (!project_gid) {
      const meRes = await asanaFetch('/users/me?opt_fields=workspaces', asana_token)
      const workspaceGid = meRes.data.workspaces[0].gid
      const projectsRes = await asanaFetch(`/projects?workspace=${workspaceGid}&limit=100&opt_fields=name`, asana_token)

      const { data: dbProjects } = await supabase.from('projects').select('id, name')
      const dbNames = new Set(dbProjects.map(p => p.name.trim().toLowerCase()))

      const projects = projectsRes.data.map(p => ({
        gid: p.gid,
        name: p.name,
        in_db: dbNames.has(p.name.trim().toLowerCase())
      }))

      return Response.json({
        message: 'Call again with project_gid to import subtasks for a specific project. Or use "all" to import all.',
        projects
      })
    }

    // If project_gid is "all", process all projects one by one
    if (project_gid === 'all') {
      const meRes = await asanaFetch('/users/me?opt_fields=workspaces', asana_token)
      const workspaceGid = meRes.data.workspaces[0].gid
      const projectsRes = await asanaFetch(`/projects?workspace=${workspaceGid}&limit=100&opt_fields=name`, asana_token)
      const asanaProjects = projectsRes.data

      const { data: dbProjects } = await supabase.from('projects').select('id, name')
      const projectMap = {}
      for (const p of dbProjects) {
        projectMap[p.name.trim().toLowerCase()] = p.id
      }

      const results = []
      for (const ap of asanaProjects) {
        const dbProjectId = projectMap[ap.name.trim().toLowerCase()]
        if (!dbProjectId) continue

        const count = await importSubtasksForProject(ap.gid, dbProjectId, asana_token, supabase)
        results.push({ project: ap.name, subtasks: count })
      }

      return Response.json({ success: true, results })
    }

    // Import subtasks for a single project
    const { data: dbProjects } = await supabase.from('projects').select('id, name')
    const meRes = await asanaFetch('/users/me?opt_fields=workspaces', asana_token)
    const workspaceGid = meRes.data.workspaces[0].gid
    const projectsRes = await asanaFetch(`/projects?workspace=${workspaceGid}&limit=100&opt_fields=name`, asana_token)
    const asanaProject = projectsRes.data.find(p => p.gid === project_gid)

    if (!asanaProject) {
      return Response.json({ error: 'Project not found in Asana' }, { status: 404 })
    }

    const dbProject = dbProjects.find(p => p.name.trim().toLowerCase() === asanaProject.name.trim().toLowerCase())
    if (!dbProject) {
      return Response.json({ error: 'Project not found in database' }, { status: 404 })
    }

    const count = await importSubtasksForProject(project_gid, dbProject.id, asana_token, supabase)
    return Response.json({ success: true, project: asanaProject.name, subtasks: count })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

async function importSubtasksForProject(asanaProjectGid, dbProjectId, token, supabase) {
  // Get tasks with subtasks from Asana (paginated)
  const tasksWithSubs = await getAllTasks(asanaProjectGid, token)
  if (tasksWithSubs.length === 0) return 0

  // Get all tasks from this project in Supabase
  const { data: dbTasks } = await supabase
    .from('tasks')
    .select('id, title')
    .eq('project_id', dbProjectId)

  const taskMap = {}
  for (const t of dbTasks) {
    taskMap[t.title.trim().toLowerCase()] = t.id
  }

  // Build a member name lookup for assignee mapping
  const { data: dbMembers } = await supabase.from('members').select('id, name')
  const memberMap = {}
  for (const m of (dbMembers || [])) {
    memberMap[m.name.trim().toLowerCase()] = m.id
  }

  let subtaskCount = 0

  for (const asanaTask of tasksWithSubs) {
    const dbTaskId = taskMap[asanaTask.name.trim().toLowerCase()]
    if (!dbTaskId) continue

    const subtasks = await getSubtasks(asanaTask.gid, token)
    if (subtasks.length > 0) {
      const rows = subtasks.map((s, i) => ({
        task_id: dbTaskId,
        title: s.title,
        done: s.done,
        sort_order: i + 1,
        due: s.due || null,
        assigned_to: s.assignee_name ? (memberMap[s.assignee_name.trim().toLowerCase()] || null) : null
      }))

      const { error } = await supabase.from('subtasks').insert(rows)
      if (!error) subtaskCount += rows.length
    }
  }

  return subtaskCount
}
