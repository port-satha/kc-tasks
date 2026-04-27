'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AppShell from '../../../components/AppShell'
import TaskApp from '../../../components/TaskApp'
import ProjectSettings from '../../../components/ProjectSettings'
import { useSupabase } from '../../../lib/hooks'

export default function ProjectPage() {
  const { id } = useParams()
  const supabase = useSupabase()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)

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
      <TaskApp
        projectId={id}
        projectName={project.name}
        settingsButton={
          <button
            onClick={() => setShowSettings(true)}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
            title="Project settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        }
      />
      {showSettings && (
        <ProjectSettings
          project={project}
          onClose={() => setShowSettings(false)}
          onUpdate={(updated) => setProject(updated)}
        />
      )}
    </AppShell>
  )
}
