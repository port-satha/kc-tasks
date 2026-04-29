'use client'
// Section 6 + Section 17 of the UX/UI brief — quarterly milestone KPI card.
//
// Layout:
//   [Label — 9.5px uppercase]
//   [Current value 18px medium]   [pct vs current quarter]
//   [Annual target — 10px muted]
//   [Q1 ✓done | Q2 current | Q3 future | Q4 future]   ← 4-cell milestone row
//   [Progress bar — 2px, color by status against the CURRENT quarter]
//
// Progress percentage is computed against the CURRENT quarter's milestone
// target (q1_target … q4_target). When a per-quarter target isn't set, we
// fall back to annual_target / 4 so progress still feels grounded.

import { currentQuarter, currentYear, progressColor } from '../lib/okr'

// Cell styling per Section 6 spec.
const CELL_STYLE = {
  past:    { background: '#EAF3DE', borderColor: '#B8D98A', label: '#3B6D11', value: '#2D5016' },
  current: { background: '#FAEEDA', borderColor: '#F0C870', label: '#854F0B', value: '#854F0B' },
  future:  { background: '#F5F3EF', borderColor: 'rgba(0,0,0,0.04)', label: '#B7A99D', value: '#B7A99D' },
}

function formatNumber(n) {
  if (n === null || n === undefined || n === '') return '—'
  const num = Number(n)
  if (Number.isNaN(num)) return '—'
  if (Math.abs(num) >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(num) >= 1_000) return (num / 1_000).toFixed(1) + 'K'
  return String(num)
}

// Per-quarter milestone state — past / current / future based on today.
function milestoneStateFor(kpiYear, q) {
  const y = currentYear()
  const tq = currentQuarter()
  if (kpiYear < y) return 'past'
  if (kpiYear > y) return 'future'
  if (q < tq) return 'past'
  if (q === tq) return 'current'
  return 'future'
}

// Returns a per-quarter target — the explicit q_target if set, else
// annual_target / 4 as a fallback so progress math still works.
function targetForQuarter(kpi, q) {
  const explicit = kpi[`q${q}_target`]
  if (explicit != null && explicit !== '') return Number(explicit)
  const annual = Number(kpi.target_value) || 0
  return annual ? annual / 4 : 0
}

export default function KpiMilestoneCard({
  kpi,
  onClick,
  onDelete,
  onUpdateValue,
  currentUserId,
}) {
  const todayQ = currentQuarter()
  const cur = Number(kpi.current_value) || 0

  // Hide the milestone row entirely if no per-quarter targets are set.
  // Falls back to plain annual-target progress so the card stays useful
  // even when the brand owner hasn't broken the year into quarters yet.
  const hasMilestones = [1, 2, 3, 4].some(q => {
    const v = kpi[`q${q}_target`]
    return v != null && v !== ''
  })

  // Progress denominator: current quarter's milestone if set, else
  // annual target. Either way, % reflects the right reference point.
  const annualTarget = Number(kpi.target_value) || 0
  const denom = hasMilestones ? targetForQuarter(kpi, todayQ) : annualTarget
  const qpct = !denom ? 0 : Math.max(0, Math.min(100, Math.round((cur / denom) * 100)))
  const color = progressColor(qpct)

  const isOwner = kpi.owner_id && currentUserId && kpi.owner_id === currentUserId
  const staleDays = kpi.last_updated_at
    ? Math.floor((Date.now() - new Date(kpi.last_updated_at).getTime()) / 86400000)
    : null
  const isStale = staleDays != null && staleDays > 30
  const unitInline = kpi.target_unit && kpi.target_unit.length <= 2 ? kpi.target_unit : ''

  return (
    <div className="bg-ss-card border border-ss-divider rounded-lg p-[10px] relative group">
      <button
        onClick={onClick}
        className={`w-full text-left ${onClick ? 'cursor-pointer' : 'cursor-default'}`}>

        {/* Label */}
        <p className="text-[9.5px] uppercase tracking-[0.4px] text-ss-muted-text truncate">
          {kpi.name}
        </p>

        {/* Current value + quarterly pct */}
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="text-[18px] font-medium text-ss-text leading-none">
            {formatNumber(kpi.current_value)}{unitInline}
          </span>
          <span className="text-[10.5px] font-medium" style={{ color }}>{qpct}%</span>
          {isStale && (
            <span className="text-[9px] text-ss-amber" title={`Last updated ${staleDays} days ago`}>
              ⚠
            </span>
          )}
        </div>

        {/* Annual target subtitle */}
        <p className="text-[10px] text-ss-hint mt-0.5 truncate">
          Annual target {formatNumber(kpi.target_value)}{kpi.target_unit ? ` ${kpi.target_unit}` : ''}
          {kpi.owner?.nickname ? ` · ${kpi.owner.nickname}` : ''}
        </p>

        {/* Quarterly milestone cells — only render cells that have a target set.
            Empty cells are hidden entirely (never show "—"). The whole row
            disappears when no milestones are set (hasMilestones === false). */}
        {hasMilestones && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {[1, 2, 3, 4].filter(q => {
              const v = kpi[`q${q}_target`]
              return v != null && v !== ''
            }).map(q => {
              const state = milestoneStateFor(kpi.year, q)
              const tval = kpi[`q${q}_target`]
              const cs = CELL_STYLE[state]
              return (
                <div
                  key={q}
                  className="rounded px-1.5 py-0.5 text-center min-w-[2.5rem]"
                  style={{
                    background: cs.background,
                    border: `0.5px solid ${cs.borderColor}`,
                  }}
                >
                  <p className="text-[8.5px] uppercase tracking-wider font-medium" style={{ color: cs.label }}>
                    Q{q}
                  </p>
                  <p className="text-[10px] font-medium leading-tight" style={{ color: cs.value }}>
                    {formatNumber(tval)}{state === 'past' ? ' ✓' : ''}
                  </p>
                </div>
              )
            })}
          </div>
        )}

        {/* Progress bar — colored by quarterly progress */}
        <div className="h-[2px] bg-[rgba(0,0,0,0.04)] rounded-full mt-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${qpct}%`, background: color }}
          />
        </div>
      </button>

      {/* Footer actions */}
      <div className="flex gap-1 mt-1.5">
        {(isOwner || onClick) && onUpdateValue && (
          <button
            onClick={(e) => { e.stopPropagation(); onUpdateValue() }}
            className="text-[9.5px] px-2 py-0.5 bg-ss-text text-ss-page rounded-full hover:opacity-90"
          >
            Update value
          </button>
        )}
      </div>

      {/* Hover delete */}
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-ss-red text-[10px] p-1 transition-opacity"
          title="Delete"
        >
          ✕
        </button>
      )}
    </div>
  )
}
