'use client'
// Section 11 + Section 17 of the UX/UI brief — alignment tree.
// Brand-rooted view: each Brand KR is a root; team OKRs cascade to those
// KRs; individual OKRs cascade to team KRs. Distinguishes from the
// existing CascadeTreeModal which is opened from a single node and walks
// up to its root — here we render every alignment chain in one brand.

import { useEffect, useMemo, useState } from 'react'
import { useSupabase } from '../lib/hooks'
import { fetchAllObjectivesForYear, calcKrPercent, calcObjectivePercent, progressColor, ownerName } from '../lib/okr'
import ApprovalStatusPill from './ApprovalStatusPill'

const NODE_STYLES = {
  brandKr: {
    marker: '#2D5016',
    label:  '#2D5016',
    bg:     'transparent',
    indent: 0,
    border: 'none',
  },
  team: {
    marker: '#BA7517',
    label:  '#854F0B',
    bg:     'rgba(186,117,23,0.04)',
    indent: 20,
    border: 'dashed',
  },
  individual: {
    marker: '#9B8C82',
    label:  '#5F5E5A',
    bg:     'transparent',
    indent: 40,
    border: 'solid',
  },
}

export default function CascadeTree({ year, brand, onClose, onNavigate }) {
  const supabase = useSupabase()
  const [flat, setFlat] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})  // { nodeId: bool }

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchAllObjectivesForYear(supabase, year)
      .then(data => {
        if (!active) return
        setFlat(data || [])
        // Auto-expand all Brand KR nodes (they're the roots).
        const rootDefaults = {}
        for (const o of (data || [])) {
          if (o.level === 'brand' && o.brand === brand) {
            for (const kr of (o.key_results || [])) {
              rootDefaults[`kr:${kr.id}`] = true
            }
          }
        }
        setExpanded(rootDefaults)
      })
      .catch(err => console.error(err))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [supabase, year, brand])

  // Build maps: parent_kr_id → children, parent_objective_id → children.
  // We use both to figure out where a team / individual OKR sits.
  const { byParentKr, byParentObj, brandObjectives } = useMemo(() => {
    const byParentKr  = {}
    const byParentObj = {}
    const brandObjectives = []
    for (const o of flat) {
      if (o.parent_kr_id) {
        ;(byParentKr[o.parent_kr_id]  || (byParentKr[o.parent_kr_id]  = [])).push(o)
      } else if (o.parent_objective_id) {
        ;(byParentObj[o.parent_objective_id] || (byParentObj[o.parent_objective_id] = [])).push(o)
      }
      if (o.level === 'brand' && o.brand === brand) {
        brandObjectives.push(o)
      }
    }
    return { byParentKr, byParentObj, brandObjectives }
  }, [flat, brand])

  // Resolve children of a Brand KR: anything with parent_kr_id = thisKr,
  // PLUS anything with parent_objective_id = parentObjective AND no parent_kr_id
  // (whole-objective cascade gets bucketed to the first KR for clarity? — no,
  // the brief asks for KR-first roots, so we ignore whole-objective cascades
  // here and they'd appear as orphans. Leave them out of the KR view).
  function childrenOfKr(kr) {
    return byParentKr[kr.id] || []
  }
  function childrenOfObjective(obj) {
    return byParentObj[obj.id] || []
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-2 sm:p-4">
      <div className="bg-ss-page rounded-xl shadow-xl w-full max-w-[800px] my-4">
        <div className="bg-ss-sidebar rounded-t-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#9F9A8C]">Alignment tree</p>
            <p className="text-[13px] text-ss-page font-medium">
              {brand === 'KC' ? 'KC · Shared' : brand} brand · {year}
            </p>
          </div>
          <button onClick={onClose} className="text-[#9F9A8C] hover:text-ss-page text-[18px]">×</button>
        </div>

        <div className="p-4 max-h-[78vh] overflow-y-auto">
          {loading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-8 bg-ss-card rounded" />
              <div className="h-8 bg-ss-card rounded ml-6" />
              <div className="h-8 bg-ss-card rounded ml-12" />
            </div>
          ) : brandObjectives.length === 0 ? (
            <p className="text-[12px] text-ss-hint italic">No brand-level OKRs for this brand and year.</p>
          ) : (
            brandObjectives.map(brandObj => {
              const krs = brandObj.key_results || []
              return (
                <div key={brandObj.id} className="mb-5 last:mb-0">
                  {/* Brand objective header — context, not a node itself */}
                  <p className="text-[9.5px] uppercase tracking-wider text-ss-hint mb-1">
                    Brand objective
                  </p>
                  <p className="text-[12.5px] font-medium text-ss-text mb-2">{brandObj.title}</p>

                  {krs.length === 0 ? (
                    <p className="text-[10.5px] text-ss-hint italic ml-2">No KRs on this objective yet.</p>
                  ) : (
                    krs.map((kr, i) => {
                      const krChildren = childrenOfKr(kr)
                      const teamCount = krChildren.filter(c => c.level === 'team').length
                      const indCount  = krChildren.filter(c => c.level === 'individual').length
                      const krNodeId  = `kr:${kr.id}`
                      const isExpanded = !!expanded[krNodeId]
                      const krPct = calcKrPercent(kr)
                      return (
                        <div key={kr.id} className="mb-1">
                          {/* Brand KR node */}
                          <Node
                            kind="brandKr"
                            expanded={isExpanded}
                            hasChildren={krChildren.length > 0}
                            onToggle={() => setExpanded(prev => ({ ...prev, [krNodeId]: !prev[krNodeId] }))}
                          >
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="text-[9.5px] uppercase tracking-wider" style={{ color: NODE_STYLES.brandKr.label }}>
                                KR{i + 1}
                              </span>
                              <span className="text-[12px] font-medium text-ss-text flex-1 min-w-0 truncate">
                                {kr.title}
                              </span>
                              <span className="text-[10.5px] font-medium" style={{ color: progressColor(krPct) }}>
                                {krPct}%
                              </span>
                              {(teamCount > 0 || indCount > 0) && (
                                <span className="text-[9.5px] px-1.5 py-0.5 rounded-full bg-ss-muted text-ss-muted-text">
                                  {teamCount} team · {indCount} individual
                                </span>
                              )}
                            </div>
                          </Node>

                          {/* Team OKR children */}
                          {isExpanded && krChildren
                            .filter(c => c.level === 'team')
                            .map(team => {
                              const teamNodeId = `obj:${team.id}`
                              const isTeamExpanded = !!expanded[teamNodeId]
                              const teamPct = calcObjectivePercent(team)
                              const indChildren = childrenOfObjective(team)
                                .concat(
                                  // Individual OKRs may cascade to a specific KR of the team OKR.
                                  (team.key_results || []).flatMap(tkr => byParentKr[tkr.id] || [])
                                )
                                .filter(c => c.level === 'individual')
                              const indSubCount = indChildren.length
                              const isOrphan = indSubCount === 0
                              return (
                                <div key={team.id}>
                                  <Node
                                    kind="team"
                                    expanded={isTeamExpanded}
                                    hasChildren={indChildren.length > 0}
                                    onToggle={() =>
                                      setExpanded(prev => ({ ...prev, [teamNodeId]: !prev[teamNodeId] }))
                                    }
                                    onClick={() => onNavigate?.(team)}
                                  >
                                    <div className="flex items-baseline gap-2 flex-wrap">
                                      <span className="text-[9.5px] uppercase tracking-wider" style={{ color: NODE_STYLES.team.label }}>
                                        {team.team || 'Team'}
                                      </span>
                                      <span className="text-[12px] font-medium text-ss-text flex-1 min-w-0 truncate">
                                        {team.title}
                                      </span>
                                      <span className="text-[10.5px] text-ss-muted-text whitespace-nowrap">
                                        {ownerName(team.owner) || ''}
                                      </span>
                                      <span className="text-[10.5px] font-medium" style={{ color: progressColor(teamPct) }}>
                                        {teamPct}%
                                      </span>
                                      <span
                                        className="text-[9.5px] px-1.5 py-0.5 rounded-full font-medium"
                                        style={
                                          isOrphan
                                            ? { background: '#FAEEDA', color: '#854F0B' }
                                            : { background: '#E8E5DF', color: '#5F5E5A' }
                                        }
                                      >
                                        {indSubCount} individual
                                      </span>
                                    </div>
                                  </Node>

                                  {/* Individual OKR children */}
                                  {isTeamExpanded && indChildren.map(indiv => {
                                    const indNodeId = `obj:${indiv.id}`
                                    const indPct = calcObjectivePercent(indiv)
                                    return (
                                      <Node
                                        key={indiv.id}
                                        kind="individual"
                                        expanded={false}
                                        hasChildren={false}
                                        onClick={() => onNavigate?.(indiv)}
                                        nodeId={indNodeId}
                                      >
                                        <div className="flex items-baseline gap-2 flex-wrap">
                                          <span className="text-[12px] text-ss-text flex-1 min-w-0 truncate">
                                            {indiv.is_private ? '🔒 ' : ''}
                                            {indiv.title}
                                          </span>
                                          <span className="text-[10.5px] text-ss-muted-text whitespace-nowrap">
                                            {ownerName(indiv.owner) || '—'}
                                          </span>
                                          {indiv.approval_status && indiv.approval_status !== 'approved' && (
                                            <ApprovalStatusPill status={indiv.approval_status} />
                                          )}
                                          <span className="text-[10.5px] font-medium" style={{ color: progressColor(indPct) }}>
                                            {indPct}%
                                          </span>
                                        </div>
                                      </Node>
                                    )
                                  })}
                                </div>
                              )
                            })}
                        </div>
                      )
                    })
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// Single tree node row. Renders chevron + colored marker + indent + body.
function Node({ kind, expanded, hasChildren, onToggle, onClick, children }) {
  const s = NODE_STYLES[kind] || NODE_STYLES.individual
  const borderStyle =
    s.border === 'dashed' ? { borderLeftStyle: 'dashed', borderLeftWidth: 1, borderLeftColor: '#E8E5DF' }
    : s.border === 'solid' ? { borderLeftStyle: 'solid', borderLeftWidth: 1, borderLeftColor: '#E8E5DF' }
    : {}

  return (
    <div
      className={`flex items-start gap-2 py-1.5 px-2 rounded-md transition-colors hover:bg-ss-hover`}
      style={{
        marginLeft: s.indent,
        background: s.bg,
        ...borderStyle,
        paddingLeft: s.border !== 'none' ? 8 : 8,
      }}
    >
      {/* Chevron */}
      {hasChildren ? (
        <button
          onClick={(e) => { e.stopPropagation(); onToggle?.() }}
          className="text-[11px] text-ss-muted-text mt-0.5 flex-shrink-0 w-3 hover:text-ss-text"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <span className={`inline-block transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
        </button>
      ) : (
        <span className="w-3 flex-shrink-0" aria-hidden="true" />
      )}

      {/* Colored marker */}
      <span
        className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
        style={{ background: s.marker }}
        aria-hidden="true"
      />

      {/* Body — clickable when onClick is provided */}
      <div
        className={`flex-1 min-w-0 ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick ? () => onClick() : undefined}
      >
        {children}
      </div>
    </div>
  )
}
