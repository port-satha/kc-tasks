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
  const res = await asanaFetch(`/tasks/${taskGid}/subtasks?opt_fields=name,completed`, token)
  return res.data.map(s => ({ title: s.name, done: s.completed }))
}

export async function POST(req) {
  try {
    const { asana_token } = await req.json()
    if (!asana_token) {
      return Response.json({ error: 'asana_token is required in request body' }, { status: 400 })
    }

    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all projects from Asana
    const projectsRes = await asanaFetch('/projects?limit=100&opt_fields=name', asana_token)
    const asanaProjects = projectsRes.data

    // Get all projects from Supabase
    const { data: dbProjects } = await supabase.from('projects').select('id, name')
    const projectMap = {}
    for (const p of dbProjects) {
      projectMap[p.name.trim().toLowerCase()] = p.id
    }

    const results = []

    for (const asanaProject of asanaProjects) {
      const dbProjectId = projectMap[asanaProject.name.trim().toLowerCase()]
      if (!dbProjectId) {
        results.push({ project: asanaProject.name, skipped: 'not found in DB' })
        continue
      }

      // Get tasks with subtasks from Asana
      const tasksWithSubs = await getAllTasks(asanaProject.gid, asana_token)
      if (tasksWithSubs.length === 0) {
        results.push({ project: asanaProject.name, subtasks: 0 })
        continue
      }

      // Get all tasks from this project in Supabase
      const { data: dbTasks } = await supabase
        .from('tasks')
        .select('id, title')
        .eq('project_id', dbProjectId)

      const taskMap = {}
      for (const t of dbTasks) {
        taskMap[t.title.trim().toLowerCase()] = t.id
      }

      let subtaskCount = 0

      for (const asanaTask of tasksWithSubs) {
        const dbTaskId = taskMap[asanaTask.name.trim().toLowerCase()]
        if (!dbTaskId) continue

        // Fetch subtasks from Asana
        const subtasks = await getSubtasks(asanaTask.gid, asana_token)

        // Insert into Supabase
        if (subtasks.length > 0) {
          const rows = subtasks.map((s, i) => ({
            task_id: dbTaskId,
            title: s.title,
            done: s.done,
            sort_order: i + 1
          }))

          const { error } = await supabase.from('subtasks').insert(rows)
          if (!error) subtaskCount += rows.length
        }
      }

      results.push({ project: asanaProject.name, subtasks: subtaskCount })
    }

    return Response.json({ success: true, results })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
