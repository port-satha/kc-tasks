'use client'
import { useUser, useProjects } from '../lib/hooks'
import Sidebar from './Sidebar'

export default function AppShell({ children }) {
  const { user, profile, loading: userLoading } = useUser()
  const { projects, loading: projLoading } = useProjects()

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!user) return children

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} profile={profile} projects={projects} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
