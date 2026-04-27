'use client'
// Section 4 of the UX/UI brief — persistent "you are here" context bar.
// Light Linen background under the nav and chapter drawer. Three things:
//   1. Breadcrumb of the current selection (View › Brand › Chapter › Team)
//   2. Brand-owner badge for the active brand
//   3. Compact quarter selector (Q1/Q2/Q3/Q4/Annual)

import { TEAM_TO_CHAPTER } from '../lib/okr'

const BRAND_LABEL = {
  onest:  { label: 'onest',       fg: '#2D5016' },
  grubby: { label: 'grubby',      fg: '#1B4D2A' },
  KC:     { label: 'KC · Shared', fg: '#5F5E5A' },
}

function ownerOfBrand(brandOwners, brand) {
  if (!brand) return null
  const entry = (brandOwners || []).find(b => b.brand === brand)
  return entry?.profile?.nickname || entry?.profile?.full_name || null
}

export default function ContextBar({
  viewMode,           // 'level' | 'mine' | 'team-manage'
  levelSelection,     // { level, brand, team }
  quarter,
  onQuarterChange,
  brandOwners,
}) {
  // Build the breadcrumb segments based on viewMode.
  let segments = []
  if (viewMode === 'mine') {
    segments = ['My OKRs']
  } else if (viewMode === 'team-manage') {
    segments = ['Team I manage']
  } else {
    if (levelSelection?.brand) segments.push(BRAND_LABEL[levelSelection.brand]?.label || levelSelection.brand)
    if (levelSelection?.team) {
      const ch = TEAM_TO_CHAPTER[levelSelection.team]
      if (ch) segments.push(ch === 'Strategy' ? 'Strategy & BD' : ch)
      segments.push(levelSelection.team)
    }
    if (segments.length === 0) segments = ['All brands']
  }

  const lead = ownerOfBrand(brandOwners, levelSelection?.brand)

  return (
    <div
      className="px-[18px] py-2 flex items-center gap-3 flex-wrap"
      style={{ background: '#F5F3EF', borderBottom: '0.5px solid #E8E5DF' }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[11px] text-ss-muted-text min-w-0">
        <span className="text-[9.5px] uppercase tracking-[1px] text-ss-hint">Viewing</span>
        {segments.map((seg, i) => (
          <span key={`${seg}-${i}`} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <span className="text-ss-hint">›</span>}
            <span className={`truncate ${i === segments.length - 1 ? 'text-ss-text font-medium' : ''}`}>
              {seg}
            </span>
          </span>
        ))}
      </div>

      {/* Brand-owner badge */}
      {viewMode === 'level' && levelSelection?.brand && (
        <span
          className="text-[10.5px] px-2.5 py-1 rounded-full font-medium hidden md:inline-flex items-center gap-1"
          style={{
            background: levelSelection.brand === 'onest' ? '#D4EDBE'
              : levelSelection.brand === 'grubby' ? '#C8E0D0' : '#E8E5DF',
            color: BRAND_LABEL[levelSelection.brand]?.fg || '#5F5E5A',
          }}
        >
          Brand: {BRAND_LABEL[levelSelection.brand]?.label || levelSelection.brand}
          {lead && <span className="opacity-70"> · Lead: {lead}</span>}
        </span>
      )}

      {/* Quarter selector — pushed to the right */}
      <div className="flex-1" />
      <div className="flex items-center gap-0.5 bg-ss-page rounded-full px-0.5 py-0.5 border border-ss-divider">
        {[1, 2, 3, 4].map(q => {
          const active = quarter === q
          return (
            <button
              key={q}
              onClick={() => onQuarterChange(q)}
              className={`text-[10.5px] px-2.5 py-1 rounded-full transition-colors font-medium ${
                active
                  ? 'bg-ss-text text-ss-page'
                  : 'text-ss-muted-text hover:bg-ss-hover'
              }`}
            >
              Q{q}{active ? ' ✓' : ''}
            </button>
          )
        })}
        <button
          onClick={() => onQuarterChange('annual')}
          className={`text-[10.5px] px-2.5 py-1 rounded-full transition-colors font-medium ${
            quarter === 'annual'
              ? 'bg-ss-text text-ss-page'
              : 'text-ss-muted-text hover:bg-ss-hover'
          }`}
        >
          Annual{quarter === 'annual' ? ' ✓' : ''}
        </button>
      </div>
    </div>
  )
}
