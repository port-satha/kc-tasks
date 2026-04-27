'use client'
import { useUser, useProjects } from '../lib/hooks'
import Sidebar from './Sidebar'

export default function AppShell({ children }) {
  const { user, profile, loading: userLoading } = useUser()
  const { projects, loading: projLoading } = useProjects()

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#DFDDD9] flex items-center justify-center">
        <div className="text-[13px] text-[#B7A99D]">Loading...</div>
      </div>
    )
  }

  if (!user) return children

  return (
    <div className="min-h-screen bg-[#DFDDD9] flex">
      <Sidebar user={user} profile={profile} projects={projects} />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1">{children}</main>
        <footer className="px-4 py-3 flex items-center justify-between">
          <p className="text-[10px] italic text-[#B7A99D]">Designed for one. Built for the all.</p>
          <div className="hidden sm:flex items-center gap-3">
            {[
              { name: 'Port', color: '#D85A30' },
              { name: 'Noon', color: '#D85A30' },
              { name: 'Amp', color: '#1D9E75' },
              { name: 'Pim', color: '#D4537E' },
              { name: 'Sek', color: '#534AB7' },
              { name: 'Jomjam', color: '#BA7517' },
              { name: 'Ping', color: '#378ADD' },
              { name: 'Nid', color: '#639922' },
            ].map(m => (
              <div key={m.name} className="flex items-center gap-1">
                <span className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                <span className="text-[10px] text-[#9B8C82]">{m.name}</span>
              </div>
            ))}
          </div>
        </footer>
      </div>
    </div>
  )
}
