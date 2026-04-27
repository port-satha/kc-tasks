'use client'
// Non-dismissable modal shown to a member on first login (or whenever
// their profile is missing nickname / full_name / position). Wraps the
// AppShell so the user cannot reach any page until the three required
// self-completed fields are filled.
//
// Section 13 of the UX/UI brief.

import { useEffect, useMemo, useState } from 'react'
import { useSupabase } from '../lib/hooks'
import { TEAM_TO_CHAPTER } from '../lib/okr'

export default function ProfileGate({ profile, onComplete }) {
  const supabase = useSupabase()

  // Required (self-completed) fields
  const [nickname, setNickname]   = useState(profile?.nickname || '')
  const [fullName, setFullName]   = useState(profile?.full_name || '')
  const [positionTitle, setPositionTitle] = useState(profile?.position_title || '')

  // Optional (self-completed) fields
  const [startDate, setStartDate] = useState(profile?.start_date || '')
  const [lineId,    setLineId]    = useState(profile?.line_id || '')

  const [managerName, setManagerName] = useState(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  // Resolve the manager's nickname for the "Reports to" badge.
  useEffect(() => {
    if (!profile?.manager_id) { setManagerName(null); return }
    let active = true
    supabase
      .from('profiles')
      .select('id, nickname, full_name')
      .eq('id', profile.manager_id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        setManagerName(data?.nickname || data?.full_name || '—')
      })
    return () => { active = false }
  }, [supabase, profile?.manager_id])

  const requiredFilled = useMemo(() => {
    return [nickname, fullName, positionTitle].filter(v => (v || '').trim().length > 0).length
  }, [nickname, fullName, positionTitle])
  const allRequiredFilled = requiredFilled === 3

  const chapter = useMemo(() => {
    if (!profile?.team) return null
    return TEAM_TO_CHAPTER[profile.team] || null
  }, [profile?.team])

  const handleSave = async (e) => {
    e?.preventDefault?.()
    if (!allRequiredFilled || saving) return
    setSaving(true)
    setErr('')
    try {
      const updates = {
        nickname:        nickname.trim(),
        full_name:       fullName.trim(),
        position_title:  positionTitle.trim(),
        start_date:      startDate || null,
        line_id:         lineId.trim() || null,
        // profile_complete is auto-set by the DB trigger when nickname,
        // full_name, and position_title are all non-empty — no need to
        // include it in the update payload.
      }
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id)
      if (error) throw error
      onComplete?.({ ...profile, ...updates })
    } catch (e) {
      setErr(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // ===== Styling helpers (Sandy Serenity tokens) =====
  const fieldLabel  = 'text-[11px] font-medium text-ss-muted-text mb-1.5 block'
  const helperHint  = 'text-[10px] text-ss-hint mt-1'
  const inputCls    = 'w-full text-[13px] border border-ss-divider rounded-lg px-3 py-2.5 text-ss-text placeholder-ss-hint bg-ss-card focus:outline-none focus:border-ss-text transition-colors'
  const lockedBadge = 'inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-ss-muted text-ss-muted-text border border-ss-divider'

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-gate-title"
    >
      <div className="bg-ss-page rounded-2xl shadow-xl w-full max-w-[640px] my-6 overflow-hidden">
        {/* Header */}
        <div className="bg-ss-sidebar text-ss-sidebar-active px-5 py-4 flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-medium flex-shrink-0"
            style={{ backgroundColor: profile?.avatar_color || '#9B8C82', color: '#fff' }}
          >
            {(nickname || profile?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p id="profile-gate-title" className="text-[14px] font-medium leading-tight">
              Complete your profile{nickname ? `, ${nickname}` : ''}
            </p>
            <p className="text-[11px] text-ss-sidebar-text mt-0.5">
              Required before you can access Kindfolks · takes 2 min
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="px-5 pt-4">
          <div className="h-1 bg-ss-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-ss-green transition-all duration-300"
              style={{ width: `${(requiredFilled / 3) * 100}%` }}
            />
          </div>
          <p className="text-[10px] text-ss-hint mt-1.5">
            {requiredFilled} of 3 required fields complete
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="px-5 py-5 space-y-4">
          {/* ===== Self-completed REQUIRED ===== */}
          <div>
            <label className={fieldLabel}>Nickname (display name) *</label>
            <input
              autoFocus
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              required
              maxLength={40}
              placeholder="e.g. Pim, Safe, Ellie"
              className={inputCls}
            />
            <p className={helperHint}>
              This shows everywhere in the app — OKR cards, check-ins, approvals.
            </p>
          </div>

          <div>
            <label className={fieldLabel}>Full name *</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              maxLength={120}
              placeholder="Thai or English — used in formal records"
              className={inputCls}
            />
          </div>

          <div>
            <label className={fieldLabel}>Position / job title *</label>
            <input
              type="text"
              value={positionTitle}
              onChange={e => setPositionTitle(e.target.value)}
              required
              maxLength={80}
              placeholder="e.g. Content Creator"
              className={inputCls}
            />
            <p className={helperHint}>
              Your actual role — not your team or brand.
            </p>
          </div>

          {/* ===== Self-completed OPTIONAL ===== */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={fieldLabel}>Start date</label>
              <input
                type="date"
                value={startDate || ''}
                onChange={e => setStartDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={fieldLabel}>Line ID</label>
              <input
                type="text"
                value={lineId}
                onChange={e => setLineId(e.target.value)}
                maxLength={40}
                placeholder="optional"
                className={inputCls}
              />
            </div>
          </div>

          {/* ===== Admin-set LOCKED ===== */}
          <div className="border-t border-ss-divider pt-4">
            <p className="text-[10px] uppercase tracking-[1px] text-ss-hint mb-2.5">
              Set by admin · contact Port or Noon to change
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className={lockedBadge}>
                <LockIcon />
                Brand: {profile?.squad || '—'}
              </span>
              <span className={lockedBadge}>
                <LockIcon />
                Chapter: {chapter || '—'}
              </span>
              <span className={lockedBadge}>
                <LockIcon />
                Team: {profile?.team || '—'}
              </span>
              <span className={lockedBadge}>
                <LockIcon />
                Reports to: {managerName ?? (profile?.manager_id ? '…' : '—')}
              </span>
              <span className={lockedBadge}>
                <LockIcon />
                Role: {(profile?.role || 'member').replace('_', ' ')}
              </span>
            </div>
          </div>

          {err && (
            <p className="text-[11px] text-ss-red bg-ss-red-bg px-3 py-2 rounded-md">{err}</p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-ss-divider">
            <p className="text-[10.5px] text-ss-hint">
              Step 1 of 1 · Can't skip
            </p>
            <button
              type="submit"
              disabled={!allRequiredFilled || saving}
              className={`text-[12px] px-4 py-2 rounded-lg font-medium transition-colors ${
                allRequiredFilled && !saving
                  ? 'bg-ss-text text-ss-page hover:opacity-90'
                  : 'bg-ss-muted text-ss-hint cursor-not-allowed'
              }`}
            >
              {saving ? 'Saving…' : 'Save & enter Kindfolks →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function LockIcon() {
  return (
    <svg width="9" height="11" viewBox="0 0 9 11" fill="none" aria-hidden="true">
      <path
        d="M2 4.5V3a2.5 2.5 0 0 1 5 0v1.5M1.5 4.5h6a.5.5 0 0 1 .5.5v4.5a.5.5 0 0 1-.5.5h-6a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5Z"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
