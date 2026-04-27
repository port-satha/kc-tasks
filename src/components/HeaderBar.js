'use client'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSupabase } from '../lib/hooks'
import AvatarChip from './AvatarChip'
import NotificationBell from './NotificationBell'
import ProfileEdit from './ProfileEdit'
import { getDisplayName, getSubline } from '../lib/profile'

const KCLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="2" fill="#DFDDD9"/>
    <path d="M5 3v18" stroke="#2C2C2A" strokeWidth="2.8" strokeLinecap="round"/>
    <path d="M5 12l7-9v18l7-9" stroke="#2C2C2A" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export default function HeaderBar({ user, profile, projects }) {
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useSupabase()

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navigate = (href) => {
    router.push(href)
    setMobileMenuOpen(false)
    setShowProjectDropdown(false)
  }

  const isActive = (href) => pathname === href

  const navLink = (href, label) => (
    <button
      onClick={() => navigate(href)}
      className={`text-[12px] px-3 py-1.5 rounded-full transition-colors whitespace-nowrap ${
        isActive(href)
          ? 'bg-[#DFDDD9] text-[#2C2C2A] font-medium'
          : 'text-[#9F9A8C] hover:text-[#DFDDD9] border border-[rgba(255,255,255,0.12)]'
      }`}
    >
      {label}
    </button>
  )

  return (
    <>
      <header className="bg-[#2C2C2A] sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-2.5 max-w-[1400px] mx-auto">
          {/* Left: Logo + Brand */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
              <div className="w-[34px] h-[34px] rounded-lg flex items-center justify-center bg-[#DFDDD9] flex-shrink-0">
                <KCLogo />
              </div>
              <div className="hidden sm:block">
                <span className="text-[15px] font-medium text-[#DFDDD9] block leading-tight tracking-[0.5px]">Kindfolks</span>
                <span className="text-[10px] uppercase tracking-[2px] text-[#9F9A8C]">By Kind Collective</span>
              </div>
            </button>
          </div>

          {/* Center: Navigation */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navLink('/', 'My Tasks')}

            {/* Projects dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                className={`text-[12px] px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 ${
                  pathname.startsWith('/projects')
                    ? 'bg-[#DFDDD9] text-[#2C2C2A] font-medium'
                    : 'text-[#9F9A8C] hover:text-[#DFDDD9] border border-[rgba(255,255,255,0.12)]'
                }`}
              >
                Projects
                <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showProjectDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowProjectDropdown(false)} />
                  <div className="absolute top-full mt-1.5 left-0 w-52 bg-[#F5F3EF] border border-[rgba(0,0,0,0.06)] rounded-xl shadow-lg z-20 overflow-hidden">
                    {projects.map(p => (
                      <button key={p.id} onClick={() => navigate(`/projects/${p.id}`)}
                        className={`w-full text-left flex items-center gap-2 px-3 py-2 text-[12px] transition-colors ${
                          pathname === `/projects/${p.id}` ? 'bg-[rgba(0,0,0,0.04)] text-[#2C2C2A] font-medium' : 'text-[#6B665C] hover:bg-[rgba(0,0,0,0.03)]'
                        }`}>
                        {p.is_private
                          ? <span className="text-[10px] opacity-60">🔒</span>
                          : <span className="w-1.5 h-1.5 rounded-full bg-[rgba(99,153,34,0.5)]" />
                        }
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                    {projects.length === 0 && (
                      <p className="px-3 py-2 text-[11px] text-[#B7A99D] italic">No projects yet</p>
                    )}
                    <div className="border-t border-[rgba(0,0,0,0.06)]">
                      <button onClick={() => navigate('/projects/new')}
                        className="w-full text-left px-3 py-2 text-[12px] text-[#9B8C82] hover:text-[#2C2C2A] hover:bg-[rgba(0,0,0,0.03)] transition-colors">
                        + New project
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {navLink('/members', 'Team')}
            {navLink('/okrs', 'OKRs')}
          </nav>

          {/* Right: Notifications + User */}
          <div className="flex items-center gap-2">
            {user?.id && <NotificationBell userId={user.id} />}

            {/* User avatar button */}
            <button
              onClick={() => setShowProfileEdit(true)}
              className="flex items-center gap-2 rounded-full hover:bg-[rgba(255,255,255,0.06)] transition-colors pl-1 pr-2 py-1"
              title="Edit profile"
            >
              <AvatarChip
                name={profile?.nickname || profile?.full_name || user?.email || 'U'}
                size="sm"
                avatarColor={profile?.avatar_color}
                avatarUrl={profile?.avatar_url}
              />
              <span className="hidden sm:block text-[11px] text-[#9F9A8C]">
                {profile?.nickname || profile?.full_name || 'User'}
              </span>
            </button>

            {/* Mobile hamburger */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-[#9F9A8C] hover:text-[#DFDDD9] p-1 transition-colors">
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[rgba(255,255,255,0.08)] px-4 pb-3 pt-2 space-y-1">
            <button onClick={() => navigate('/')}
              className={`w-full text-left text-[13px] px-3 py-2 rounded-lg transition-colors ${isActive('/') ? 'bg-[rgba(223,221,217,0.12)] text-[#DFDDD9] font-medium' : 'text-[#9F9A8C]'}`}>
              My Tasks
            </button>
            {projects.map(p => (
              <button key={p.id} onClick={() => navigate(`/projects/${p.id}`)}
                className={`w-full text-left text-[13px] px-3 py-2 rounded-lg transition-colors ${pathname === `/projects/${p.id}` ? 'bg-[rgba(223,221,217,0.12)] text-[#DFDDD9] font-medium' : 'text-[#9F9A8C]'}`}>
                {p.name}
              </button>
            ))}
            <button onClick={() => navigate('/projects/new')}
              className="w-full text-left text-[13px] px-3 py-2 rounded-lg text-[#9F9A8C]">+ New project</button>
            <button onClick={() => navigate('/members')}
              className={`w-full text-left text-[13px] px-3 py-2 rounded-lg transition-colors ${isActive('/members') ? 'bg-[rgba(223,221,217,0.12)] text-[#DFDDD9] font-medium' : 'text-[#9F9A8C]'}`}>
              Team
            </button>
            <button onClick={() => navigate('/okrs')}
              className={`w-full text-left text-[13px] px-3 py-2 rounded-lg transition-colors ${isActive('/okrs') ? 'bg-[rgba(223,221,217,0.12)] text-[#DFDDD9] font-medium' : 'text-[#9F9A8C]'}`}>
              OKRs
            </button>
            <div className="border-t border-[rgba(255,255,255,0.08)] pt-2 mt-2">
              <button onClick={signOut}
                className="w-full text-left text-[13px] px-3 py-2 rounded-lg text-[#9F9A8C] hover:text-[#DFDDD9]">
                Sign out
              </button>
            </div>
          </div>
        )}
      </header>

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
