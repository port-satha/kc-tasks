'use client'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSupabase } from '../lib/hooks'
import AvatarChip from './AvatarChip'
import NotificationBell from './NotificationBell'

export default function Sidebar({ user, profile, projects }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
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
    setMobileOpen(false)
  }

  const navItem = (href, label, icon, isActive) => (
    <button
      onClick={() => navigate(href)}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
        isActive ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <span className="text-base">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  )

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="px-3 py-3 border-b border-gray-200 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">KC</span>
            </div>
            <span className="text-sm font-semibold text-gray-900 truncate">KC Tasks</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          {user?.id && <NotificationBell userId={user.id} />}
          {/* Collapse toggle - desktop only */}
          <button onClick={() => setCollapsed(!collapsed)} className="hidden md:block text-gray-400 hover:text-gray-600 text-xs p-1">
            {collapsed ? '▶' : '◀'}
          </button>
          {/* Close button - mobile only */}
          <button onClick={() => setMobileOpen(false)} className="md:hidden text-gray-400 hover:text-gray-600 text-lg p-1">
            ✕
          </button>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {navItem('/', 'My Tasks', '✓', pathname === '/')}
        {navItem('/members', 'Members', '👥', pathname === '/members')}

        {!collapsed && (
          <div className="pt-3">
            <div className="flex items-center justify-between px-3 mb-1">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Projects</span>
              <button onClick={() => navigate('/projects/new')}
                className="text-gray-400 hover:text-indigo-600 text-sm">+</button>
            </div>
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  pathname === `/projects/${p.id}` ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {p.is_private
                  ? <span className="text-xs flex-shrink-0 leading-none">🔒</span>
                  : <span className="w-2 h-2 rounded-full flex-shrink-0 bg-green-400"></span>
                }
                <span className="truncate">{p.name}</span>
              </button>
            ))}
            {projects.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-400">No projects yet</p>
            )}
          </div>
        )}
      </div>

      {/* User */}
      <div className="px-3 py-3 border-t border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <AvatarChip name={profile?.full_name || user?.email || 'U'} size="sm" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-900 truncate">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button onClick={signOut}
            className="w-full text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
            Sign out
          </button>
        )}
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      <button onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 w-9 h-9 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm">
        <span className="text-gray-600 text-sm">☰</span>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-50" onClick={() => setMobileOpen(false)}>
          <div className="bg-white w-72 h-full flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className={`hidden md:flex bg-white border-r border-gray-200 flex-col h-screen sticky top-0 transition-all ${collapsed ? 'w-14' : 'w-56'}`}>
        {sidebarContent}
      </div>
    </>
  )
}
