import { getSupabaseServer } from '@/lib/supabase/server'
import projectsData from './data.json'

export async function POST(req) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = []

    for (const project of projectsData) {
      // Create project
      const { data: proj, error: projError } = await supabase
        .from('projects')
        .insert({ name: project.name, description: '', is_private: false, owner_id: user.id })
        .select()
        .single()

      if (projError) {
        results.push({ project: project.name, error: projError.message })
        continue
      }

      // Insert tasks in batches of 50 (Supabase limit)
      let taskCount = 0
      for (let i = 0; i < project.tasks.length; i += 50) {
        const batch = project.tasks.slice(i, i + 50).map(t => ({
          title: t.title,
          section: t.section,
          due: t.due || null,
          priority: t.priority || '',
          progress: t.progress || '',
          project_id: proj.id,
          created_by: user.id,
          sort_order: t.sort_order
        }))

        const { error: taskError } = await supabase.from('tasks').insert(batch)
        if (taskError) {
          results.push({ project: project.name, error: `Tasks batch ${i}: ${taskError.message}` })
        } else {
          taskCount += batch.length
        }
      }

      results.push({ project: project.name, id: proj.id, tasks: taskCount })
    }

    return Response.json({ success: true, results })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
