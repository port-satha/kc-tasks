'use client'
import { useState } from 'react'
import AppShell from '../../components/AppShell'
import { useSupabase, useMembers, useUser } from '../../lib/hooks'
import { createMember, updateMember, deleteMember, updateProfileRole, updateMemberSquad } from '../../lib/db'
import AvatarChip from '../../components/AvatarChip'
import { SQUADS, hasAdminAccess, isSuperAdmin } from '../../lib/profile'
import { CHAPTERS, TEAM_TO_CHAPTER } from '../../lib/okr'

function getSquadColor(squadValue) {
  const squad = SQUADS.find(s => s.value === squadValue)
  return squad?.color || '#9B8C82'
}

export default function MembersPage() {
  const supabase = useSupabase()
  const { profile } = useUser()
  const { members, loading, reload } = useMembers()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState('member')
  const [filter, setFilter] = useState('all') // 'all', squad values

  const canEditRoles = hasAdminAccess(profile)
  const canAddRemove = isSuperAdmin(profile)

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      await createMember(supabase, { name: newName.trim(), email: newEmail.trim() || null, role: newRole })
      setNewName(''); setNewEmail(''); setNewRole('member'); setShowAdd(false)
      reload()
    } catch (err) { alert('Failed: ' + err.message) }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Remove ${name} from the team?`)) return
    try { await deleteMember(supabase, id); reload() }
    catch (err) { alert('Failed: ' + err.message) }
  }

  // Role now edits profiles.role (the source of truth). Members without a
  // linked profile_id can't have a role assigned — they're placeholders
  // waiting for the person to sign in.
  const handleRoleChange = async (profileId, role) => {
    if (!profileId) {
      alert('This member has no linked profile yet — they need to sign in first.')
      return
    }
    try { await updateProfileRole(supabase, profileId, role); reload() }
    catch (err) { alert('Failed: ' + err.message) }
  }

  const handleSquadChange = async (memberId, profileId, squad) => {
    try { await updateMemberSquad(supabase, { memberId, profileId, squad }); reload() }
    catch (err) { alert('Failed: ' + err.message) }
  }

  // Filter values can be:
  //   'all'                                              → no filter
  //   'squad:KC' | 'squad:onest' | 'squad:grubby'        → by brand
  //   'chapter:Strategy' | 'chapter:Marketing' | ...     → by chapter (group of teams)
  //   'team:Marketing' | 'team:Production' | ...         → by operational team
  // Back-compat: plain squad values ('KC') are treated as brand filters.
  const filteredMembers = (() => {
    if (filter === 'all') return members
    if (filter.startsWith('chapter:')) {
      const chapter = filter.slice('chapter:'.length)
      const teamsInThisChapter = Object.entries(TEAM_TO_CHAPTER).filter(([t, ch]) => ch === chapter).map(([t]) => t)
      return members.filter(m => teamsInThisChapter.includes(m.team))
    }
    if (filter.startsWith('team:')) {
      const team = filter.slice('team:'.length)
      return members.filter(m => m.team === team)
    }
    const squad = filter.startsWith('squad:') ? filter.slice('squad:'.length) : filter
    return members.filter(m => m.squad === squad)
  })()

  // Group members by squad for display
  const squads = ['KC', 'onest', 'grubby']
  const grouped = {}
  squads.forEach(s => { grouped[s] = [] })
  grouped['Other'] = []
  filteredMembers.forEach(m => {
    if (m.squad && grouped[m.squad]) {
      grouped[m.squad].push(m)
    } else {
      grouped['Other'].push(m)
    }
  })

  const inputClass = "w-full text-[13px] border border-[rgba(0,0,0,0.06)] rounded-lg px-3 py-2.5 text-[#2C2C2A] placeholder-[#B7A99D] bg-[#F5F3EF] focus:outline-none focus:border-[#2C2C2A] transition-colors"

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-6 pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-[#2C2C2A] tracking-tight">Team Directory</h1>
            <p className="text-[13px] text-[#9B8C82] mt-0.5">
              {members.length} member{members.length !== 1 ? 's' : ''} in Kind Collective
            </p>
          </div>
          {canAddRemove && (
            <button onClick={() => setShowAdd(!showAdd)}
              className="text-[12px] px-3.5 py-2 bg-[#2C2C2A] text-[#DFDDD9] rounded-lg hover:bg-[#3D3D3A] transition-colors font-medium">
              + Add member
            </button>
          )}
        </div>

        {/* Filter pills — squad (by brand) and team (by function) */}
        <div className="flex flex-col gap-2 mb-5">
          {/* Row 1: squads */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9.5px] uppercase tracking-wider text-[#B7A99D] font-medium mr-1 hidden sm:inline">Brand</span>
            <button
              onClick={() => setFilter('all')}
              className={`text-[11px] px-3 py-1.5 rounded-full transition-colors font-medium ${
                filter === 'all'
                  ? 'bg-[#2C2C2A] text-[#DFDDD9]'
                  : 'bg-[rgba(0,0,0,0.04)] text-[#9B8C82] hover:bg-[rgba(0,0,0,0.07)]'
              }`}
            >
              All
            </button>
            {SQUADS.map(s => {
              const val = `squad:${s.value}`
              const isActive = filter === val || filter === s.value // back-compat
              return (
                <button
                  key={s.value}
                  onClick={() => setFilter(val)}
                  className={`text-[11px] px-3 py-1.5 rounded-full transition-colors font-medium ${
                    isActive
                      ? 'bg-[#2C2C2A] text-[#DFDDD9]'
                      : 'bg-[rgba(0,0,0,0.04)] text-[#9B8C82] hover:bg-[rgba(0,0,0,0.07)]'
                  }`}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
          {/* Row 2: chapters — top-level org grouping */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9.5px] uppercase tracking-wider text-[#B7A99D] font-medium mr-1 hidden sm:inline">Chapter</span>
            {CHAPTERS.map(chapter => {
              const val = `chapter:${chapter}`
              const isActive = filter === val
              return (
                <button
                  key={chapter}
                  onClick={() => setFilter(val)}
                  className={`text-[11px] px-3 py-1.5 rounded-full transition-colors font-medium ${
                    isActive
                      ? 'bg-[#2C2C2A] text-[#DFDDD9]'
                      : 'bg-[rgba(0,0,0,0.04)] text-[#9B8C82] hover:bg-[rgba(0,0,0,0.07)]'
                  }`}
                >
                  {chapter}
                </button>
              )
            })}
          </div>
          {/* Row 3: teams — for people who work cross-brand (Production, QMS, etc.) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9.5px] uppercase tracking-wider text-[#B7A99D] font-medium mr-1 hidden sm:inline">Team</span>
            {/* Union of canonical team list + any extra teams present in members' data */}
            {Array.from(new Set([
              ...Object.keys(TEAM_TO_CHAPTER),
              ...members.map(m => m.team).filter(Boolean),
            ])).sort().map(team => {
              const val = `team:${team}`
              const isActive = filter === val
              return (
                <button
                  key={team}
                  onClick={() => setFilter(val)}
                  className={`text-[11px] px-3 py-1.5 rounded-full transition-colors font-medium ${
                    isActive
                      ? 'bg-[#2C2C2A] text-[#DFDDD9]'
                      : 'bg-[rgba(0,0,0,0.04)] text-[#9B8C82] hover:bg-[rgba(0,0,0,0.07)]'
                  }`}
                >
                  {team}
                </button>
              )
            })}
          </div>
        </div>

        {/* Add member form */}
        {showAdd && (
          <form onSubmit={handleAdd} className="bg-[#F5F3EF] rounded-xl border border-[rgba(0,0,0,0.04)] p-4 mb-5 shadow-sm">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-[11px] text-[#9B8C82] font-medium block mb-1">Name *</label>
                <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} required
                  placeholder="e.g. Port" className={inputClass} />
              </div>
              <div>
                <label className="text-[11px] text-[#9B8C82] font-medium block mb-1">Email</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  placeholder="optional" className={inputClass} />
              </div>
              <div>
                <label className="text-[11px] text-[#9B8C82] font-medium block mb-1">Role</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value)}
                  className={`${inputClass} bg-[#F5F3EF]`}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAdd(false)}
                className="text-[12px] px-3.5 py-2 border border-[rgba(0,0,0,0.06)] rounded-lg text-[#9B8C82] hover:text-[#2C2C2A] hover:bg-[rgba(0,0,0,0.02)] transition-colors">
                Cancel
              </button>
              <button type="submit"
                className="text-[12px] px-4 py-2 bg-[#2C2C2A] text-[#DFDDD9] rounded-lg hover:bg-[#3D3D3A] transition-colors font-medium">
                Add
              </button>
            </div>
          </form>
        )}

        {loading && (
          <div className="text-center py-12">
            <p className="text-[13px] text-[#B7A99D]">Loading team...</p>
          </div>
        )}

        {!loading && members.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[15px] text-[#9B8C82] mb-1">No members yet</p>
            <p className="text-[12px] text-[#B7A99D]">Add your team to get started</p>
          </div>
        )}

        {/* Members grouped by squad */}
        {!loading && filter === 'all' ? (
          <>
            {squads.map(squadName => {
              const squadMembers = grouped[squadName]
              if (squadMembers.length === 0) return null
              const squad = SQUADS.find(s => s.value === squadName)
              return (
                <div key={squadName} className="mb-6">
                  <div className="flex items-center gap-2 mb-2.5 px-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[1.5px]" style={{ color: squad?.color || '#9B8C82' }}>
                      {squad?.label || squadName}
                    </span>
                    <span className="text-[10px] text-[#B7A99D]">{squad?.subtitle}</span>
                    <div className="flex-1 h-px bg-[rgba(0,0,0,0.04)]"></div>
                    <span className="text-[10px] text-[#B7A99D]">{squadMembers.length}</span>
                  </div>
                  <div className="bg-[#F5F3EF] rounded-xl border border-[rgba(0,0,0,0.04)] overflow-hidden shadow-sm">
                    {squadMembers.map((m, i) => (
                      <MemberRow key={m.id} member={m} isLast={i === squadMembers.length - 1}
                        onRoleChange={handleRoleChange} onSquadChange={handleSquadChange} onDelete={handleDelete}
                        canEditRoles={canEditRoles} canAddRemove={canAddRemove} />
                    ))}
                  </div>
                </div>
              )
            })}
            {grouped['Other'].length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2.5 px-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#B7A99D]">Unassigned</span>
                  <div className="flex-1 h-px bg-[rgba(0,0,0,0.04)]"></div>
                  <span className="text-[10px] text-[#B7A99D]">{grouped['Other'].length}</span>
                </div>
                <div className="bg-[#F5F3EF] rounded-xl border border-[rgba(0,0,0,0.04)] overflow-hidden shadow-sm">
                  {grouped['Other'].map((m, i) => (
                    <MemberRow key={m.id} member={m} isLast={i === grouped['Other'].length - 1}
                      onRoleChange={handleRoleChange} onSquadChange={handleSquadChange} onDelete={handleDelete}
                      canEditRoles={canEditRoles} canAddRemove={canAddRemove} />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : !loading && (
          <div className="bg-[#F5F3EF] rounded-xl border border-[rgba(0,0,0,0.04)] overflow-hidden shadow-sm">
            {filteredMembers.map((m, i) => (
              <MemberRow key={m.id} member={m} isLast={i === filteredMembers.length - 1}
                onRoleChange={handleRoleChange} onSquadChange={handleSquadChange} onDelete={handleDelete}
                canEditRoles={canEditRoles} canAddRemove={canAddRemove} />
            ))}
            {filteredMembers.length === 0 && (
              <div className="px-4 py-8 text-center text-[13px] text-[#B7A99D]">No members in this squad</div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function MemberRow({ member: m, isLast, onRoleChange, onSquadChange, onDelete, canEditRoles, canAddRemove }) {
  const displayName = m.nickname || m.name || 'User'
  const position = m.position || ''
  // Squad: prefer the profile value; fall back to the cached members.squad.
  const squad = m.profile?.squad || m.squad || ''
  const squadColor = getSquadColor(squad)

  // Status is the profile.role (source of truth). Falls back to '—' when
  // the member has no linked profile yet.
  const profileRole = m.profile?.role || null
  const isSuperAdminRow = profileRole === 'super_admin'
  // Admins may edit roles EXCEPT super_admin rows (only super_admin can demote super_admin).
  const canEditThisRow = canEditRoles && m.profile?.id && (!isSuperAdminRow || canAddRemove)

  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${!isLast ? 'border-b border-[rgba(0,0,0,0.04)]' : ''} hover:bg-[rgba(0,0,0,0.015)] transition-colors`}>
      {/* Avatar */}
      <AvatarChip name={displayName} size="md" avatarColor={m.avatar_color} avatarUrl={m.avatar_url} />

      {/* Name & info */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[#2C2C2A] truncate">
          {displayName}{position ? ` ${position}` : ''}
        </p>
        <p className="text-[11px] text-[#9B8C82] truncate">
          {squad && (
            <span style={{ color: squadColor }}>{squad}</span>
          )}
          {squad && m.team && <span className="text-[#B7A99D]"> · </span>}
          {m.team && <span>{m.team}</span>}
          {!squad && !m.team && m.email && <span className="text-[#B7A99D]">{m.email}</span>}
        </p>
      </div>

      {/* Email */}
      <span className="text-[11px] text-[#B7A99D] truncate hidden sm:block max-w-[160px]">
        {m.email || ''}
      </span>

      {/* Brand (KC / onest / grubby) — column is named `squad` in DB */}
      {canEditRoles ? (
        <select
          value={squad}
          onChange={e => onSquadChange(m.id, m.profile?.id || null, e.target.value)}
          className="hidden sm:block text-[11px] border border-[rgba(0,0,0,0.04)] rounded-lg px-2 py-1 bg-[#F5F3EF] text-[#9B8C82] focus:outline-none focus:border-[#2C2C2A] transition-colors">
          <option value="">— Unassigned</option>
          <option value="KC">KC · Shared</option>
          <option value="onest">onest</option>
          <option value="grubby">grubby</option>
        </select>
      ) : null}

      {/* Status (profile.role) */}
      {canEditThisRow ? (
        <select
          value={profileRole || 'member'}
          onChange={e => onRoleChange(m.profile?.id, e.target.value)}
          className="text-[11px] border border-[rgba(0,0,0,0.04)] rounded-lg px-2 py-1 bg-[#F5F3EF] text-[#9B8C82] focus:outline-none focus:border-[#2C2C2A] transition-colors">
          <option value="member">Member</option>
          <option value="manager">Manager</option>
          <option value="people">People</option>
          <option value="admin">Admin</option>
          {isSuperAdminRow && <option value="super_admin">Super admin</option>}
        </select>
      ) : (
        <span className="text-[11px] text-[#B7A99D] capitalize">
          {profileRole ? profileRole.replace('_', ' ') : '—'}
        </span>
      )}

      {/* Remove (super_admin only) */}
      {canAddRemove && (
        <button onClick={() => onDelete(m.id, m.name || m.nickname)}
          className="text-[11px] text-[#B7A99D] hover:text-[#A32D2D] transition-colors flex-shrink-0">
          Remove
        </button>
      )}
    </div>
  )
}
