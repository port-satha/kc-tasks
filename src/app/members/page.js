'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '../../components/AppShell'
import { useSupabase, useMembers, useUser } from '../../lib/hooks'
import { createMember, updateMember, deleteMember, updateProfileRole, updateMemberSquad } from '../../lib/db'
import { hasAdminAccess, isSuperAdmin } from '../../lib/profile'
import { CHAPTERS, TEAM_TO_CHAPTER } from '../../lib/okr'
import MemberCard from '../../components/MemberCard'

// Section 12 of the UX/UI brief — Team directory redesign.
// Members are grouped by Chapter (Strategy & BD / Marketing / Innovation /
// Backbone / Factory). Filters: Brand row + Chapter row + Incomplete-only
// toggle. Member card shows role pill, brand + team badges, and an
// "incomplete" amber state when the profile gate hasn't been completed.

// ===== Token-style constants (match Sandy Serenity tokens) =====
const CHAPTER_DOT = {
  'Strategy':   '#888780',
  'Marketing':  '#639922',
  'Innovation': '#185FA5',
  'Backbone':   '#7F77DD',
  'Factory':    '#D85A30',
  'Unassigned': '#B7A99D',
}

// Brand pill colors used by the FilterPill below. The full table of brand
// styles (incl. avatar bg, "both" purple) lives in components/MemberCard.js.
const BRAND_BADGE = {
  onest:  { bg: '#D4EDBE', fg: '#2D5016' },
  grubby: { bg: '#C8E0D0', fg: '#1B4D2A' },
  KC:     { bg: '#E8E5DF', fg: '#5F5E5A' },
  both:   { bg: '#EEEDFE', fg: '#3C3489' },
}

function chapterOf(member) {
  if (!member?.team) return 'Unassigned'
  return TEAM_TO_CHAPTER[member.team] || 'Unassigned'
}

function isIncomplete(member) {
  // The DB trigger keeps profile_complete in sync with the three required
  // fields, so checking the flag is sufficient. We also treat unlinked
  // member rows (no profile_id yet) as incomplete.
  if (!member?.profile) return true
  if (member.profile.profile_complete === false) return true
  if (!member.profile.nickname?.trim()) return true
  if (!member.profile.full_name?.trim()) return true
  if (!member.profile.position_title?.trim()) return true
  return false
}

// ===========================================================
// Page
// ===========================================================
export default function MembersPage() {
  const supabase = useSupabase()
  const router = useRouter()
  const { user, profile } = useUser()
  const { members, loading, reload } = useMembers()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState('member')
  const [brandFilter, setBrandFilter] = useState('all')         // 'all' | 'KC' | 'onest' | 'grubby'
  const [chapterFilter, setChapterFilter] = useState('all')      // 'all' | chapter name
  const [incompleteOnly, setIncompleteOnly] = useState(false)
  const [collapsedChapters, setCollapsedChapters] = useState({}) // { chapterName: true }

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

  const handleRemind = (member) => {
    const name = member.profile?.nickname || member.nickname || member.name || 'this member'
    alert(`Reminder sent to ${name}. (They'll be prompted to complete their profile on next login.)`)
  }

  // Edit own profile — routes to /onboarding which acts as the profile editor.
  // Admins can also edit other people's profiles by passing through there.
  const handleEdit = () => router.push('/onboarding')

  // ===== Filtering =====
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      if (brandFilter !== 'all' && (m.profile?.squad || m.squad) !== brandFilter) return false
      if (chapterFilter !== 'all' && chapterOf(m) !== chapterFilter) return false
      if (incompleteOnly && !isIncomplete(m)) return false
      return true
    })
  }, [members, brandFilter, chapterFilter, incompleteOnly])

  // ===== Group by chapter =====
  const grouped = useMemo(() => {
    const map = {}
    ;[...CHAPTERS, 'Unassigned'].forEach(ch => { map[ch] = [] })
    filteredMembers.forEach(m => {
      const ch = chapterOf(m)
      ;(map[ch] || (map[ch] = [])).push(m)
    })
    return map
  }, [filteredMembers])

  const incompleteCount = useMemo(() =>
    members.filter(isIncomplete).length, [members])

  const inputCls = "w-full text-[13px] border border-ss-divider rounded-lg px-3 py-2.5 text-ss-text placeholder-ss-hint bg-ss-card focus:outline-none focus:border-ss-text transition-colors"

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-6 pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-semibold text-ss-text tracking-tight">Team Directory</h1>
            <p className="text-[13px] text-ss-muted-text mt-0.5">
              {members.length} member{members.length !== 1 ? 's' : ''} in Kind Collective
              {incompleteCount > 0 && (
                <span className="ml-2 text-[12px]">
                  · <span className="text-ss-amber font-medium">{incompleteCount} incomplete</span>
                </span>
              )}
            </p>
          </div>
          {canAddRemove && (
            <button onClick={() => setShowAdd(!showAdd)}
              className="text-[12px] px-3.5 py-2 bg-ss-text text-ss-page rounded-lg hover:opacity-90 transition-colors font-medium">
              + Add member
            </button>
          )}
        </div>

        {/* Filter bar — Brand row + Chapter row + Incomplete toggle */}
        <div className="bg-ss-card rounded-xl border border-ss-divider p-3 mb-4 space-y-2">
          {/* Row 1: Brand + Incomplete toggle */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9.5px] uppercase tracking-wider text-ss-hint font-medium mr-1.5 w-12 hidden sm:inline">Brand</span>
            <FilterPill active={brandFilter === 'all'} onClick={() => setBrandFilter('all')}>All</FilterPill>
            <FilterPill active={brandFilter === 'onest'}  onClick={() => setBrandFilter('onest')}  brand="onest">onest</FilterPill>
            <FilterPill active={brandFilter === 'grubby'} onClick={() => setBrandFilter('grubby')} brand="grubby">grubby</FilterPill>
            <FilterPill active={brandFilter === 'KC'}     onClick={() => setBrandFilter('KC')}     brand="KC">KC · Shared</FilterPill>
            <div className="flex-1" />
            <button
              onClick={() => setIncompleteOnly(v => !v)}
              className={`text-[11px] px-3 py-1.5 rounded-full border transition-colors font-medium ${
                incompleteOnly
                  ? 'bg-[#FAEEDA] border-[#EFCC80] text-[#854F0B]'
                  : 'bg-transparent border-ss-divider text-ss-muted-text hover:bg-ss-hover'
              }`}>
              ⚠ Incomplete only
            </button>
          </div>
          {/* Row 2: Chapter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9.5px] uppercase tracking-wider text-ss-hint font-medium mr-1.5 w-12 hidden sm:inline">Chapter</span>
            <FilterPill active={chapterFilter === 'all'} onClick={() => setChapterFilter('all')}>All</FilterPill>
            {CHAPTERS.map(ch => {
              const label = ch === 'Strategy' ? 'Strategy & BD' : ch
              return (
                <FilterPill
                  key={ch}
                  active={chapterFilter === ch}
                  onClick={() => setChapterFilter(ch)}
                  dotColor={CHAPTER_DOT[ch]}
                >
                  {label}
                </FilterPill>
              )
            })}
          </div>
        </div>

        {/* Incomplete profiles banner */}
        {incompleteCount > 0 && !incompleteOnly && (
          <div className="bg-[#FAEEDA] border border-[#EFCC80] rounded-lg px-3.5 py-2.5 mb-4 flex items-center gap-2">
            <span className="text-[14px]">⚠</span>
            <p className="text-[11.5px] text-[#854F0B] flex-1">
              <strong>{incompleteCount} member{incompleteCount !== 1 ? 's' : ''}</strong> haven't completed their profile.
              They will be prompted automatically on next login.
            </p>
            <button
              onClick={() => setIncompleteOnly(true)}
              className="text-[11px] text-[#854F0B] hover:underline whitespace-nowrap">
              View only →
            </button>
          </div>
        )}

        {/* Add member form */}
        {showAdd && (
          <form onSubmit={handleAdd} className="bg-ss-card rounded-xl border border-ss-divider p-4 mb-5 shadow-sm">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-[11px] text-ss-muted-text font-medium block mb-1">Name *</label>
                <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} required
                  placeholder="e.g. Port" className={inputCls} />
              </div>
              <div>
                <label className="text-[11px] text-ss-muted-text font-medium block mb-1">Email</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  placeholder="optional" className={inputCls} />
              </div>
              <div>
                <label className="text-[11px] text-ss-muted-text font-medium block mb-1">Role</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value)}
                  className={inputCls}>
                  <option value="member">Member</option>
                  <option value="manager">Manager</option>
                  <option value="people">People</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAdd(false)}
                className="text-[12px] px-3.5 py-2 border border-ss-divider rounded-lg text-ss-muted-text hover:text-ss-text hover:bg-ss-hover transition-colors">
                Cancel
              </button>
              <button type="submit"
                className="text-[12px] px-4 py-2 bg-ss-text text-ss-page rounded-lg hover:opacity-90 transition-colors font-medium">
                Add
              </button>
            </div>
          </form>
        )}

        {loading && (
          <div className="text-center py-12">
            <p className="text-[13px] text-ss-hint">Loading team...</p>
          </div>
        )}

        {!loading && filteredMembers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[15px] text-ss-muted-text mb-1">No members match these filters</p>
            <p className="text-[12px] text-ss-hint">Try clearing filters or switching brand</p>
          </div>
        )}

        {/* Chapter groups */}
        {!loading && [...CHAPTERS, 'Unassigned'].map(ch => {
          const list = grouped[ch] || []
          if (list.length === 0) return null
          const collapsed = !!collapsedChapters[ch]
          const teams = Array.from(new Set(list.map(m => m.team).filter(Boolean)))
          const label = ch === 'Strategy' ? 'Strategy & BD' : ch
          return (
            <div key={ch} className="mb-5">
              {/* Chapter section header */}
              <button
                onClick={() => setCollapsedChapters(prev => ({ ...prev, [ch]: !prev[ch] }))}
                className="w-full flex items-center gap-2.5 mb-2 px-1 hover:opacity-80 transition-opacity">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CHAPTER_DOT[ch] || '#B7A99D' }} />
                <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-ss-text">
                  {label}
                </span>
                <span className="text-[10px] text-ss-hint truncate">
                  {teams.length > 0 ? teams.join(' · ') : '—'}
                </span>
                <div className="flex-1 h-px bg-ss-divider" />
                <span className="text-[10px] text-ss-hint">{list.length}</span>
                <span className={`text-[10px] text-ss-hint transition-transform ${collapsed ? '' : 'rotate-90'}`}>›</span>
              </button>
              {!collapsed && (
                <div className="bg-ss-card rounded-xl border border-ss-divider overflow-hidden shadow-sm">
                  {list.map((m, i) => (
                    <MemberCard
                      key={m.id}
                      member={m}
                      isLast={i === list.length - 1}
                      onRoleChange={handleRoleChange}
                      onSquadChange={handleSquadChange}
                      onDelete={handleDelete}
                      onRemind={handleRemind}
                      onEdit={handleEdit}
                      canEditRoles={canEditRoles}
                      canAddRemove={canAddRemove}
                      isOwnRow={user?.id && m.profile?.id === user.id}
                      isIncomplete={isIncomplete(m)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </AppShell>
  )
}

// ===========================================================
// Filter pill — used in the brand and chapter rows
// ===========================================================
function FilterPill({ children, active, onClick, brand, dotColor }) {
  let activeStyle = null
  if (active && brand && BRAND_BADGE[brand]) {
    activeStyle = { backgroundColor: BRAND_BADGE[brand].bg, color: BRAND_BADGE[brand].fg }
  } else if (active) {
    activeStyle = { backgroundColor: '#2C2C2A', color: '#F5F3EF' }
  }
  return (
    <button
      onClick={onClick}
      style={activeStyle || undefined}
      className={`text-[11px] px-3 py-1.5 rounded-full transition-colors font-medium inline-flex items-center gap-1.5 ${
        active
          ? '' // colors set via inline style
          : 'bg-transparent text-ss-muted-text hover:bg-ss-hover'
      }`}
    >
      {dotColor && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />}
      {children}
    </button>
  )
}

// MemberCard is now in src/components/MemberCard.js
