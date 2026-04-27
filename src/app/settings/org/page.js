'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '../../../components/AppShell'
import AvatarChip from '../../../components/AvatarChip'
import { useSupabase, useUser } from '../../../lib/hooks'
import { updateProfileManager } from '../../../lib/okr'

export default function OrgPage() {
  const supabase = useSupabase()
  const router = useRouter()
  const { profile, loading: userLoading } = useUser()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [search, setSearch] = useState('')

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  useEffect(() => {
    if (userLoading) return
    if (!isAdmin) { router.push('/'); return }
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, nickname, full_name, position_title, team, squad, manager_id, avatar_color, avatar_url, role')
          .order('nickname')
        if (error) throw error
        setProfiles(data || [])
      } catch (err) { console.error(err) }
      setLoading(false)
    }
    load()
  }, [supabase, isAdmin, userLoading, router])

  const handleManagerChange = async (profileId, managerId) => {
    setSavingId(profileId)
    try {
      const updated = await updateProfileManager(supabase, profileId, managerId || null)
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, manager_id: updated.manager_id } : p))
    } catch (err) {
      if (err.message?.includes('coerce the result')) {
        alert('Permission denied. Run migrations/fix-admin-profile-update.sql in Supabase — the profiles table RLS needs an admin update policy.')
      } else {
        alert('Failed: ' + err.message)
      }
    }
    setSavingId(null)
  }

  const filtered = profiles.filter(p => {
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return (p.nickname || '').toLowerCase().includes(s)
      || (p.full_name || '').toLowerCase().includes(s)
      || (p.position_title || '').toLowerCase().includes(s)
  })

  const managerOf = (id) => profiles.find(p => p.id === id)

  return (
    <AppShell>
      <div className="min-h-screen bg-[#DFDDD9] p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-[15px] font-medium text-[#2C2C2A]">Org structure</h1>
          <p className="text-[11px] text-[#9B8C82] mt-0.5">Admin only · Assign each person their manager. Used by OKR approval flow.</p>

          <div className="mt-4 mb-3">
            <input type="text" placeholder="Search by name or position..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-[12px] bg-[#F5F3EF] border border-[rgba(0,0,0,0.08)] rounded-md px-3 py-2 focus:outline-none focus:border-[#2C2C2A]" />
          </div>

          {loading ? (
            <div className="animate-pulse space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 bg-[#F5F3EF] rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="bg-[#F5F3EF] border border-[rgba(0,0,0,0.04)] rounded-xl divide-y divide-[rgba(0,0,0,0.04)]">
              {filtered.map(p => {
                const manager = managerOf(p.manager_id)
                const eligibleManagers = profiles.filter(m => m.id !== p.id) // can't manage self
                return (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <AvatarChip
                      name={p.nickname || p.full_name || '?'}
                      size={32}
                      avatarColor={p.avatar_color}
                      avatarUrl={p.avatar_url}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#2C2C2A] truncate">
                        {p.nickname || p.full_name}
                        {p.position_title && <span className="text-[#9B8C82] font-normal"> · {p.position_title}</span>}
                      </p>
                      <p className="text-[10px] text-[#B7A99D] truncate">
                        {p.squad || 'No squad'} · {p.team || 'No team'}
                        {p.role && p.role !== 'member' && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-[rgba(44,44,42,0.08)] text-[#5F5E5A] uppercase tracking-wider">{p.role}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-[#9B8C82] hidden sm:inline">Manager</span>
                      <select
                        value={p.manager_id || ''}
                        onChange={e => handleManagerChange(p.id, e.target.value)}
                        disabled={savingId === p.id}
                        className="text-[12px] bg-[#DFDDD9] border border-[rgba(0,0,0,0.08)] rounded-md px-2 py-1 min-w-[140px] focus:outline-none focus:border-[#2C2C2A]">
                        <option value="">— None —</option>
                        {eligibleManagers.map(m => (
                          <option key={m.id} value={m.id}>{m.nickname || m.full_name} {m.position_title || ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <p className="p-4 text-[12px] text-[#9B8C82] italic">No profiles match your search.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
