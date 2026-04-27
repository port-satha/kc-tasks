'use client'
// Section 7 + Section 17 of the UX/UI brief — "line of sight" preview.
// Three colored badges in a chain: parent brand → parent KR → your OKR.
// Used inside OkrCreateWizard step 2 (live preview) and step 3 (locked).

const BRAND_BADGE = {
  onest:  { bg: '#D4EDBE', fg: '#2D5016', label: 'onest' },
  grubby: { bg: '#C8E0D0', fg: '#1B4D2A', label: 'grubby' },
  KC:     { bg: '#E8E5DF', fg: '#5F5E5A', label: 'KC · Shared' },
  both:   { bg: '#EEEDFE', fg: '#3C3489', label: 'Both brands' },
}

export default function LineOfSight({ brand, parentLabel, ownLabel, locked }) {
  const brandStyle = BRAND_BADGE[brand] || BRAND_BADGE.KC
  return (
    <div
      className={`flex items-center gap-1.5 flex-wrap rounded-md p-2.5 ${
        locked ? 'bg-ss-muted' : 'bg-ss-card border border-ss-divider'
      }`}
      role="group"
      aria-label="Line of sight"
    >
      <span className="text-[9.5px] uppercase tracking-[1px] text-ss-hint mr-0.5">
        Line of sight
      </span>

      {/* Brand badge */}
      <span
        className="text-[10.5px] px-2 py-0.5 rounded-full font-medium"
        style={{ background: brandStyle.bg, color: brandStyle.fg }}
      >
        {brandStyle.label} brand
      </span>
      <Chevron />

      {/* Parent KR badge */}
      <span
        className="text-[10.5px] px-2 py-0.5 rounded-full font-medium max-w-[260px] truncate"
        style={{ background: '#FAEEDA', color: '#854F0B' }}
        title={parentLabel || ''}
      >
        {parentLabel || '— pick a parent KR —'}
      </span>
      <Chevron />

      {/* Your OKR badge */}
      <span
        className="text-[10.5px] px-2 py-0.5 rounded-full font-medium max-w-[260px] truncate"
        style={{ background: '#E8E5DF', color: '#2C2C2A' }}
        title={ownLabel || ''}
      >
        {ownLabel || 'Your OKR'}
      </span>
    </div>
  )
}

function Chevron() {
  return <span className="text-ss-hint text-[12px] leading-none">›</span>
}
