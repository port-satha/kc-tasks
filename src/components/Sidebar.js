'use client'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSupabase } from '../lib/hooks'
import AvatarChip from './AvatarChip'
import NotificationBell from './NotificationBell'
import ProfileEdit from './ProfileEdit'
import { getDisplayName, getSubline } from '../lib/profile'

const KCLogo = () => (
  <div className="w-8 h-8 bg-[#DFDDD9] rounded-[7px] flex items-center justify-center flex-shrink-0">
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
      <path d="M3 2v14M3 9l6-7v14l6-7" stroke="#2C2C2A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
)

const IconMyTasks = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
    <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
)

const IconBoard = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
    <rect x="1" y="2" width="3.5" height="10" rx="1" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="5.25" y="2" width="3.5" height="7" rx="1" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="9.5" y="2" width="3.5" height="10" rx="1" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
)

const IconOKRs = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="7" cy="7" r="0.8" fill="currentColor"/>
  </svg>
)

const IconTeam = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
    <circle cx="5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M1.5 11.5c0-2 1.5-3 3.5-3s3.5 1 3.5 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <circle cx="10" cy="4.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M10 8c1.5 0 2.5.8 2.5 2.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

const IconSettings = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
    <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.76 2.76l1.06 1.06M10.18 10.18l1.06 1.06M2.76 11.24l1.06-1.06M10.18 3.82l1.06-1.06" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

const NAV_ITEMS = [
  { href: '/', label: 'My Tasks', Icon: IconMyTasks },
  { href: '/okrs', label: 'OKRs', Icon: IconOKRs },
  { href: '/members', label: 'Team', Icon: IconTeam },
]

// Admin-only nav — only shown to users with role='admin'
const ADMIN_NAV_ITEMS = [
  { href: '/settings/roles', label: 'Roles', Icon: IconSettings },
  { href: '/settings/org', label: 'Org chart', Icon: IconSettings },
  { href: '/settings/edit-requests', label: 'Edit requests', Icon: IconSettings },
  { href: '/okrs/snapshots', label: 'Snapshots', Icon: IconSettings },
]

export default function Sidebar({ user, profile, projects }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useSupabase()

  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('kc-dark-mode')
    const isDark = saved === 'true' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setDarkMode(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  const toggleDarkMode = () => {
    const next = !darkMode
    setDarkMode(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('kc-dark-mode', String(next))
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navigate = (href) => {
    router.push(href)
    setMobileOpen(false)
  }

  const isActive = (href) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand block */}
      <div className="px-4 pt-5 pb-4 border-b border-[rgba(255,255,255,0.06)]" style={{ borderBottomWidth: '0.5px' }}>
        <div className="flex items-center gap-2.5">
          <KCLogo />
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-[#DFDDD9] leading-tight" style={{ letterSpacing: '0.3px' }}>
              Kindfolks
            </p>
            <p className="text-[8.5px] uppercase text-[#9F9A8C] leading-tight" style={{ letterSpacing: '1.8px' }}>
              KIND COLLECTIVE
            </p>
          </div>
        </div>
      </div>

      {/* Primary nav */}
      <div className="px-[10px] pt-[14px]">
        <div className="flex flex-col gap-[2px]">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = isActive(href)
            return (
              <button
                key={href}
                onClick={() => navigate(href)}
                className={`w-full flex items-center gap-[10px] px-[10px] py-[8px] rounded-[7px] text-[12.5px] transition-colors ${
                  active
                    ? 'bg-[rgba(255,255,255,0.08)] text-[#DFDDD9] font-medium'
                    : 'text-[#9F9A8C] hover:bg-[rgba(255,255,255,0.04)]'
                }`}
              >
                <Icon />
                <span>{label}</span>
              </button>
            )
          })}
        </div>
        {/* Admin-only nav */}
        {(profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'people') && (
          <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.06)]" style={{ borderTopWidth: '0.5px' }}>
            <p className="text-[9px] uppercase text-[#6B665C] font-medium mb-1.5 px-[10px]" style={{ letterSpacing: '1.2px' }}>
              Admin
            </p>
            <div className="flex flex-col gap-[2px]">
              {ADMIN_NAV_ITEMS.filter(item => {
                // People role only sees Snapshots (and edit-requests for review)
                if (profile?.role === 'people') return ['/okrs/snapshots', '/settings/edit-requests'].includes(item.href)
                return true
              }).map(({ href, label, Icon }) => {
                const active = isActive(href)
                return (
                  <button
                    key={href}
                    onClick={() => navigate(href)}
                    className={`w-full flex items-center gap-[10px] px-[10px] py-[8px] rounded-[7px] text-[12.5px] transition-colors ${
                      active
                        ? 'bg-[rgba(255,255,255,0.08)] text-[#DFDDD9] font-medium'
                        : 'text-[#9F9A8C] hover:bg-[rgba(255,255,255,0.04)]'
                    }`}
                  >
                    <Icon />
                    <span>{label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Projects section */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-4 pt-[22px] pb-[8px]">
          <span className="text-[9.5px] uppercase text-[#6B665C] font-medium" style={{ letterSpacing: '1.2px' }}>
            PROJECTS
          </span>
          <button
            onClick={() => navigate('/projects/new')}
            className="text-[#6B665C] hover:text-[#9F9A8C] text-sm transition-colors leading-none"
          >
            +
          </button>
        </div>
        <div className="px-[10px] flex flex-col gap-[2px]">
          {projects.map(p => {
            const active = pathname === `/projects/${p.id}`
            return (
              <button
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className={`w-full flex items-center gap-[10px] px-[10px] py-[8px] rounded-[7px] text-[12px] transition-colors ${
                  active
                    ? 'bg-[rgba(255,255,255,0.08)] text-[#DFDDD9]'
                    : 'text-[#9F9A8C] hover:bg-[rgba(255,255,255,0.04)]'
                }`}
              >
                {p.is_private
                  ? <span className="text-[10px] flex-shrink-0 leading-none">🔒</span>
                  : <span
                      className="w-[6px] h-[6px] rounded-full flex-shrink-0"
                      style={{ backgroundColor: p.color || '#1D9E75' }}
                    />
                }
                <span className="truncate">{p.name}</span>
              </button>
            )
          })}
          {projects.length === 0 && (
            <p className="px-[10px] py-2 text-[11px] text-[#6B665C] italic">No projects yet</p>
          )}
        </div>
      </div>

      {/* User profile (bottom) */}
      <div className="mt-auto px-3 pb-3 pt-3 border-t border-[rgba(255,255,255,0.06)]" style={{ borderTopWidth: '0.5px' }}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProfileEdit(true)}
            className="flex-1 flex items-center gap-2 rounded-[7px] px-1 py-1 -mx-1 hover:bg-[rgba(255,255,255,0.04)] transition-colors min-w-0"
            title="Edit profile"
          >
            <AvatarChip
              name={profile?.nickname || profile?.full_name || user?.email || 'U'}
              size={26}
              avatarColor={profile?.avatar_color}
              avatarUrl={profile?.avatar_url}
            />
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[11.5px] text-[#DFDDD9] truncate leading-tight">
                {getDisplayName(profile) || 'User'}
              </p>
              <p className="text-[11.5px] text-[#9F9A8C] truncate leading-tight">
                {profile?.position || getSubline(profile) || user?.email}
              </p>
              {profile?.squad && (
                <p className="text-[9.5px] text-[#6B665C] truncate leading-tight mt-0.5">
                  {profile.squad}
                </p>
              )}
            </div>
          </button>
          {user?.id && <NotificationBell userId={user.id} />}
        </div>
        <div className="flex gap-1 mt-2">
          <button
            onClick={toggleDarkMode}
            className="flex-1 text-[11px] px-3 py-1.5 rounded-[7px] text-[#6B665C] hover:text-[#9F9A8C] hover:bg-[rgba(255,255,255,0.04)] transition-colors flex items-center justify-center gap-1"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? (
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="8" cy="8" r="3.5"/><path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M3.4 12.6l.7-.7M11.9 4.1l.7-.7"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M13.5 9.2A5.5 5.5 0 116.8 2.5a4.5 4.5 0 006.7 6.7z"/>
              </svg>
            )}
            <span>{darkMode ? 'Light' : 'Dark'}</span>
          </button>
          <button
            onClick={signOut}
            className="flex-1 text-[11px] px-3 py-1.5 rounded-[7px] text-[#6B665C] hover:text-[#9F9A8C] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      {!mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 bg-[#2C2C2A] rounded-lg flex items-center justify-center"
        >
          <span className="text-white text-base">&#9776;</span>
        </button>
      )}

      {/* Mobile overlay + drawer */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-50"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="w-72 h-full bg-[#2C2C2A] shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:block w-[200px] h-screen sticky top-0 bg-[#2C2C2A] flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Profile edit modal */}
      {showProfileEdit && (
        <ProfileEdit
          onClose={() => setShowProfileEdit(false)}
          onSave={() => window.location.reload()}
        />
      )}
    </>
  )
}
