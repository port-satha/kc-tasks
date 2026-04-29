'use client'
import { useState, useEffect } from 'react'
import { useUser, useProjects } from '../lib/hooks'
import Sidebar from './Sidebar'
import ProfileGate from './ProfileGate'

export default function AppShell({ children }) {
  const { user, profile, loading: userLoading } = useUser()
  const { projects, loading: projLoading } = useProjects()
  const [localProfile, setLocalProfile] = useState(null)

  // Mirror the loaded profile into local state so the gate's onComplete
  // can refresh it without waiting for the next useUser refetch.
  useEffect(() => { if (profile) setLocalProfile(profile) }, [profile])

  if (userLoading) {
    return (
      <div className="min-h-screen bg-ss-page flex items-center justify-center">
        <div className="text-[13px] text-ss-hint">Loading...</div>
      </div>
    )
  }

  if (!user) return children

  // Profile gate — block access until the 3 required self-completed fields
  // (nickname, full_name, position) are filled. Section 13 of the brief.
  const p = localProfile || profile
  const isAdmin = p?.role === 'admin' || p?.role === 'super_admin' || p?.role === 'brand_owner'
  const profileNeedsCompletion =
    !p?.nickname?.trim() ||
    !p?.full_name?.trim() ||
    !p?.position_title?.trim() ||
    p?.profile_complete === false

  return (
    <div className="min-h-screen bg-ss-page flex">
      <Sidebar user={user} profile={p} projects={projects} />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1">{children}</main>
        <footer className="px-4 py-3 flex items-center justify-between">
          <p className="text-[10px] italic text-[#B7A99D]">Designed for one. Built for the all.</p>
          {isAdmin && (
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
          )}
        </footer>
      </div>
      {profileNeedsCompletion && p && (
        <ProfileGate
          profile={p}
          onComplete={(updated) => setLocalProfile(updated)}
        />
      )}
    </div>
  )
}
