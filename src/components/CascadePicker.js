'use client'
// Section 7 + Section 17 of the UX/UI brief — cascade picker.
// Renders the list of parent objectives + their KRs as radio rows so the
// user can pick one specific KR to cascade their new OKR up to.
//
// Each parent objective renders as a card group:
//   - Header line: objective title + objective % progress
//   - Children: KR rows with KR label, mini progress bar, %
//
// Selecting a row calls onChange(krId, parentObjectiveId). The picker
// supports an "empty" / standalone option at the top so users can cascade
// to nothing if they really want to.

import { calcKrPercent, calcObjectivePercent, progressColor } from '../lib/okr'

export default function CascadePicker({ candidates = [], value, onChange }) {
  // value is the selected KR id (or null for "Whole Objective" / standalone).
  return (
    <div className="border border-ss-divider rounded-lg bg-ss-card overflow-hidden">
      {/* Standalone option — no parent */}
      <Row
        active={!value || value === '__none__'}
        onClick={() => onChange(null, null)}
        title="Standalone (no parent)"
        muted
      />

      {(candidates || []).length === 0 && (
        <p className="text-[11px] text-ss-hint italic px-3 py-3 border-t border-ss-divider">
          No parent OKRs found for this brand and quarter.
        </p>
      )}

      {(candidates || []).map(parent => {
        const parentPct = calcObjectivePercent(parent)
        const ownerLabel = parent.owner?.nickname ? ` · ${parent.owner.nickname}` : ''
        return (
          <div key={parent.id} className="border-t border-ss-divider">
            {/* Group header — parent objective */}
            <div className="px-3 pt-2 pb-1.5 bg-ss-page/40">
              <p className="text-[9.5px] uppercase tracking-wider text-ss-hint">
                {parent.level === 'brand' ? (parent.brand || 'Brand') : (parent.team || parent.level)} OKR{ownerLabel}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[12px] font-medium text-ss-text flex-1 truncate">
                  {parent.title}
                </p>
                <span
                  className="text-[10.5px] font-medium flex-shrink-0"
                  style={{ color: progressColor(parentPct) }}
                >
                  {parentPct}%
                </span>
              </div>
            </div>

            {/* "Whole objective" option */}
            <Row
              active={value === `o:${parent.id}`}
              onClick={() => onChange(`o:${parent.id}`, parent.id)}
              title="→ Whole Objective (cascades to any KR)"
              indent
              muted
            />

            {/* KR rows */}
            {(parent.key_results || []).map((kr, idx) => {
              const krPct = calcKrPercent(kr)
              const isActive = value === `kr:${kr.id}`
              return (
                <Row
                  key={kr.id}
                  active={isActive}
                  onClick={() => onChange(`kr:${kr.id}`, parent.id)}
                  title={`KR${idx + 1}: ${kr.title}`}
                  meta={
                    kr.target_value != null
                      ? `target ${kr.target_value}${kr.unit ? ' ' + kr.unit : ''}`
                      : null
                  }
                  pct={krPct}
                  pctColor={progressColor(krPct)}
                  indent
                />
              )
            })}
            {(parent.key_results || []).length === 0 && (
              <p className="text-[10.5px] text-ss-hint italic px-6 py-1.5 border-t border-ss-divider">
                No key results yet on this parent objective.
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Row({ active, onClick, title, meta, pct, pctColor, indent, muted }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors border-t border-ss-divider first:border-t-0 ${
        active
          ? 'bg-[rgba(45,80,22,0.08)]'
          : muted ? 'hover:bg-ss-hover' : 'hover:bg-ss-hover'
      }`}
    >
      <span
        className={`w-3 h-3 rounded-full border flex-shrink-0 ${
          active ? 'bg-[#2D5016] border-[#2D5016]' : 'border-ss-hint'
        }`}
      >
        {active && (
          <span className="block w-1 h-1 rounded-full bg-white mx-auto mt-[3px]" />
        )}
      </span>
      <div className={`flex-1 min-w-0 ${indent ? 'pl-2' : ''}`}>
        <p className={`text-[11.5px] truncate ${muted ? 'text-ss-muted-text' : 'text-ss-text'} ${active ? 'font-medium' : ''}`}>
          {title}
        </p>
        {meta && <p className="text-[9.5px] text-ss-hint mt-0.5 truncate">{meta}</p>}
      </div>
      {pct != null && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-[40px] h-[3px] bg-[rgba(0,0,0,0.04)] rounded-full overflow-hidden">
            <div className="h-full" style={{ width: `${pct}%`, background: pctColor || '#9B8C82' }} />
          </div>
          <span className="text-[10px] font-medium" style={{ color: pctColor || '#9B8C82' }}>
            {pct}%
          </span>
        </div>
      )}
    </button>
  )
}
