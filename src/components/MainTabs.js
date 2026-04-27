'use client'
// Section 5 of the UX/UI brief — "view structure" tabs at the top of
// the main content area. Three tabs:
//   1. Company health — KC KPIs only, read-only for everyone
//   2. Brand: [user's primary brand] — full hierarchy view
//   3. My OKRs — focused personal view of own individual OKRs

const BRAND_LABEL = {
  onest:  { label: 'onest',       color: '#2D5016' },
  grubby: { label: 'grubby',      color: '#1B4D2A' },
  KC:     { label: 'KC · Shared', color: '#5F5E5A' },
  both:   { label: 'Both brands', color: '#3C3489' },
}

export default function MainTabs({ active, onChange, brand, isManager, onSwitchToManage }) {
  const brandStyle = BRAND_LABEL[brand] || { label: brand || 'Brand', color: '#5F5E5A' }
  const tab = (key, label, opts = {}) => {
    const isActive = active === key
    return (
      <button
        key={key}
        onClick={() => onChange(key)}
        className={`relative text-[12px] px-4 py-2 transition-colors whitespace-nowrap ${
          isActive
            ? 'text-ss-text font-medium'
            : 'text-ss-muted-text hover:text-ss-text'
        }`}
        style={isActive ? { color: opts.color } : undefined}
      >
        {label}
        {isActive && (
          <span
            className="absolute left-2 right-2 -bottom-px h-[2px] rounded-full"
            style={{ background: opts.color || '#2C2C2A' }}
          />
        )}
      </button>
    )
  }

  return (
    <div
      className="flex items-center gap-1 px-[18px] border-b border-ss-divider bg-ss-page"
      role="tablist"
    >
      {tab('company', 'Company health', { color: '#5F5E5A' })}
      {tab('brand',   `Brand: ${brandStyle.label}`, { color: brandStyle.color })}
      {tab('mine',    'My OKRs', { color: '#2C2C2A' })}

      <div className="flex-1" />

      {isManager && (
        <button
          onClick={onSwitchToManage}
          className="text-[11px] px-3 py-1.5 rounded-full text-ss-muted-text hover:bg-ss-hover transition-colors"
        >
          Team I manage →
        </button>
      )}
    </div>
  )
}
