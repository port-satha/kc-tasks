'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AppShell from '../../../components/AppShell'
import TaskApp from '../../../components/TaskApp'
import { useSupabase } from '../../../lib/hooks'

export default function ProjectPage() {
  const { id } = useParams()
  const supabase = useSupabase()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('projects').select('*').eq('id', id).single()
      setProject(data)
      setLoading(false)
    }
    load()
  }, [supabase, id])

  if (loading) return (
    <AppShell>
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading project...</p>
      </div>
    </AppShell>
  )

  if (!project) return (
    <AppShell>
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-500">Project not found</p>
      </div>
    </AppShell>
  )

  return (
    <AppShell>
      <TaskApp projectId={id} projectName={project.name} />
    </AppShell>
  )
}
