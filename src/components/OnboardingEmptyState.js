'use client'
// Section 10 + Section 17 of the UX/UI brief — first-time empty state for
// the "My OKRs" tab. Shown when a member has zero individual OKRs for the
// current quarter. Walks them through the three things to do next.

import { useEffect, useState } from 'react'
import { useSupabase } from '../lib/hooks'
import { TEAM_TO_CHAPTER, currentQuarter } from '../lib/okr'

const BRAND_LABEL = {
  onest:  { label: 'onest',       fg: '#2D5016' },
  grubby: { label: 'grubby',      fg: '#1B4D2A' },
  KC:     { label: 'KC · Shared', fg: '#5F5E5A' },
  both:   { label: 'Both brands', fg: '#3C3489' },
}

export default function OnboardingEmptyState({ profile, onWriteFirst, onSeeBrand }) {
  const supabase = useSupabase()
  const [managerName, setManagerName] = useState(null)

  // Resolve manager nickname for the position strip.
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
        setManagerName(data?.nickname || data?.full_name || null)
      })
    return () => { active = false }
  }, [supabase, profile?.manager_id])

  const nickname  = profile?.nickname || profile?.full_name || 'there'
  const brand     = profile?.squad
  const brandStyle = BRAND_LABEL[brand] || { label: brand || '—', fg: '#5F5E5A' }
  const chapter   = profile?.team ? (TEAM_TO_CHAPTER[profile.team] || null) : null
  const team      = profile?.team
  const quarter   = currentQuarter()
  const initial   = (nickname || '?').charAt(0).toUpperCase()

  return (
    <div className="bg-ss-card border border-ss-divider rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-[16px] font-medium flex-shrink-0"
          style={{
            background: brand && BRAND_LABEL[brand] ? `${BRAND_LABEL[brand].fg}20` : '#E8E5DF',
            color: profile?.avatar_color || brandStyle.fg,
          }}
        >
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt={nickname} className="w-full h-full rounded-full object-cover" />
          ) : initial}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[16px] font-medium text-ss-text leading-tight">
            Welcome, {nickname}
          </h2>
          <p className="text-[12px] text-ss-muted-text mt-1 leading-relaxed">
            You're all set up. Here's where you sit in Kind Collective and what to do next.
          </p>
        </div>
      </div>

      {/* Position strip */}
      <div className="px-5 py-2.5 border-y border-ss-divider bg-ss-page/40">
        <div className="flex items-center gap-1.5 text-[11px] text-ss-muted-text flex-wrap">
          {brand && (
            <>
              <span
                className="px-2 py-0.5 rounded-full font-medium"
                style={{ color: brandStyle.fg, background: `${brandStyle.fg}15` }}
              >
                {brandStyle.label}
              </span>
              <span className="text-ss-hint">›</span>
            </>
          )}
          {chapter && (
            <>
              <span className="text-ss-text">{chapter === 'Strategy' ? 'Strategy & BD' : chapter}</span>
              <span className="text-ss-hint">›</span>
            </>
          )}
          {team && (
            <span className="text-ss-text font-medium">{team}</span>
          )}
          {(brand || chapter || team) && managerName && <span className="text-ss-hint">·</span>}
          {managerName && (
            <span className="text-ss-muted-text">Lead: <span className="text-ss-text">{managerName}</span></span>
          )}
          {!brand && !chapter && !team && !managerName && (
            <span className="italic text-ss-hint">Your brand and team will appear here once an admin assigns them.</span>
          )}
        </div>
      </div>

      {/* 3-step guide */}
      <div className="px-5 py-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        <Step
          n={1}
          tag="Do this first"
          tagColor={{ bg: '#E8E5DF', fg: '#5F5E5A' }}
          title="Review brand goals"
          body={`See what ${brandStyle.label !== '—' ? brandStyle.label : 'your brand'} is working toward this quarter. Brand KPIs and objectives are visible to you.`}
        />
        <Step
          n={2}
          tag="Due: end of Week 1"
          tagColor={{ bg: '#FAEEDA', fg: '#854F0B' }}
          title={`Draft your Q${quarter} OKRs`}
          body="Write 1–2 personal objectives. Link each one to a specific brand key result so your work counts."
        />
        <Step
          n={3}
          tag="After step 2"
          tagColor={{ bg: '#E8E5DF', fg: '#9B8C82' }}
          title="Request approval"
          body={`Submit your OKRs to ${managerName || 'your manager'} for review. Once approved, check in every Friday.`}
        />
      </div>

      {/* CTA footer */}
      <div className="px-5 pb-5 pt-1 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[10.5px] text-ss-hint italic flex-1 min-w-0">
          Tip: peeking at your brand's quarterly KRs first makes step 2 way easier.
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onSeeBrand}
            className="text-[11.5px] text-ss-text hover:underline"
          >
            See brand goals first
          </button>
          <button
            onClick={onWriteFirst}
            className="text-[11.5px] px-4 py-2 bg-ss-text text-ss-page rounded-lg font-medium hover:opacity-90"
          >
            Write my first OKR →
          </button>
        </div>
      </div>
    </div>
  )
}

function Step({ n, tag, tagColor, title, body }) {
  return (
    <div className="bg-ss-page rounded-lg border border-ss-divider p-3.5">
      <div className="flex items-center justify-between mb-2">
        <span className="w-6 h-6 rounded-full bg-ss-muted text-ss-text text-[11px] font-medium flex items-center justify-center">
          {n}
        </span>
        <span
          className="text-[9.5px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium"
          style={{ background: tagColor.bg, color: tagColor.fg }}
        >
          {tag}
        </span>
      </div>
      <p className="text-[12.5px] font-medium text-ss-text mb-1.5 leading-tight">{title}</p>
      <p className="text-[10.5px] text-ss-muted-text leading-relaxed">{body}</p>
    </div>
  )
}
