'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '../../components/AppShell'
import { useSupabase, useUser } from '../../lib/hooks'
import { hasAdminAccess, isSuperAdmin } from '../../lib/profile'

// =============================================================
// Settings hub — admin-only landing for all admin sub-pages.
// People role sees only Snapshots + Edit requests.
// Super admin sees everything.
// =============================================================

const ITEMS = [
  {
    href: '/settings/roles',
    label: 'Roles & permissions',
    desc: 'Brand owners, team leads, chapter leads — who can write OKRs at which level.',
    Icon: () => (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M3 16c0-3 2.5-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    roles: ['admin', 'super_admin'],
  },
  {
    href: '/settings/org',
    label: 'Org chart & reporting',
    desc: 'Set each person\'s manager — used by the OKR approval flow.',
    Icon: () => (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="6" y="2" width="6" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="2" y="11" width="4" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="7" y="11" width="4" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="12" y="11" width="4" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M9 5v3M4 11V8h10v3" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
    roles: ['admin', 'super_admin'],
  },
  {
    href: '/settings/edit-requests',
    label: 'Edit requests',
    desc: 'Review and approve retroactive edits to locked quarters.',
    Icon: () => (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3 3v12h12V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M11 3l4 4-7 7H4v-4l7-7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
    roles: ['admin', 'super_admin', 'people'],
    badgeKey: 'pendingEditRequests',
  },
  {
    href: '/okrs/snapshots',
    label: 'Snapshots & archives',
    desc: 'Immutable records of each locked period. People-team & admin only.',
    Icon: () => (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="4" width="14" height="11" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M2 7h14" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M5 4V2.5M13 4V2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    roles: ['admin', 'super_admin', 'people'],
  },
  {
    href: '/api/okrs/export?year=' + new Date().getFullYear() + '&kind=objectives&format=csv',
    label: 'Export data',
    desc: 'Download CSV exports of objectives, KPIs, reflections, check-ins.',
    external: true,
    Icon: () => (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 2v9m0 0l-3-3m3 3l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3 13v2h12v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    roles: ['admin', 'super_admin', 'people'],
  },
]

export default function SettingsPage() {
  const supabase = useSupabase()
  const router = useRouter()
  const { profile, loading: userLoading } = useUser()
  const [pendingEditRequests, setPendingEditRequests] = useState(0)
  const [incompleteProfiles, setIncompleteProfiles] = useState(0)

  const canView = hasAdminAccess(profile) || profile?.role === 'people'
  const role = profile?.role

  useEffect(() => {
    if (userLoading) return
    if (!canView) { router.push('/'); return }
    // Pending edit requests (badge)
    supabase.from('edit_requests').select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .then(({ count }) => setPendingEditRequests(count || 0))
    // Incomplete profiles (info)
    supabase.from('profiles').select('id', { count: 'exact', head: true })
      .eq('profile_complete', false)
      .then(({ count }) => setIncompleteProfiles(count || 0))
  }, [supabase, canView, userLoading, router])

  const visible = ITEMS.filter(item => item.roles.includes(role))
  const badgeCounts = { pendingEditRequests }

  return (
    <AppShell>
      <div className="min-h-screen bg-[#DFDDD9] p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-[15px] font-medium text-[#2C2C2A]">Settings</h1>
          <p className="text-[11px] text-[#9B8C82] mt-0.5">
            {role === 'super_admin' ? 'Super admin' : role === 'admin' ? 'Admin' : 'People team'} · Tools for managing Kindfolks.
          </p>

          {incompleteProfiles > 0 && hasAdminAccess(profile) && (
            <div className="mt-4 bg-[rgba(186,117,23,0.08)] border border-[rgba(186,117,23,0.18)] rounded-lg px-3.5 py-2.5 flex items-center gap-3">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L13 12H1L7 1z" stroke="#854F0B" strokeWidth="1.3" strokeLinejoin="round"/>
                <path d="M7 5v3M7 10v.5" stroke="#854F0B" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <p className="text-[11.5px] text-[#854F0B] flex-1">
                {incompleteProfiles} member{incompleteProfiles !== 1 ? 's have' : ' has'} an incomplete profile.
              </p>
              <button onClick={() => router.push('/members')}
                className="text-[11px] text-[#854F0B] hover:underline font-medium">
                Review →
              </button>
            </div>
          )}

          <div className="mt-5 grid gap-2">
            {visible.map(item => {
              const badge = item.badgeKey ? badgeCounts[item.badgeKey] : 0
              return (
                <SettingsRow key={item.href}
                  href={item.href}
                  external={item.external}
                  label={item.label}
                  desc={item.desc}
                  Icon={item.Icon}
                  badge={badge}
                />
              )
            })}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function SettingsRow({ href, external, label, desc, Icon, badge }) {
  const router = useRouter()
  const handleClick = () => {
    if (external) window.location.href = href
    else router.push(href)
  }
  return (
    <button onClick={handleClick}
      className="w-full text-left bg-[#F5F3EF] border border-[rgba(0,0,0,0.04)] rounded-xl px-4 py-3.5 flex items-center gap-4 hover:bg-[rgba(0,0,0,0.02)] transition-colors group">
      <div className="w-9 h-9 rounded-lg bg-[rgba(44,44,42,0.06)] text-[#5F5E5A] flex items-center justify-center flex-shrink-0">
        <Icon />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-medium text-[#2C2C2A]">{label}</p>
          {badge > 0 && (
            <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full bg-[rgba(186,117,23,0.12)] text-[#854F0B]">
              {badge}
            </span>
          )}
        </div>
        <p className="text-[11px] text-[#9B8C82] mt-0.5 truncate">{desc}</p>
      </div>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[#B7A99D] group-hover:text-[#2C2C2A] transition-colors flex-shrink-0">
        <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}
