'use client'
import { useEffect, useMemo, useState } from 'react'
import { useSupabase } from '../lib/hooks'
import {
  fetchAllObjectivesForYear, buildCascadeTree, findRoot,
  calcObjectivePercent, progressColor, countDescendantsByLevel,
} from '../lib/okr'

const LEVEL_CHIP = {
  brand:      { bg: 'rgba(45,80,22,0.10)',   fg: '#2D5016', label: 'Brand' },
  team:       { bg: 'rgba(186,117,23,0.10)', fg: '#854F0B', label: 'Team' },
  individual: { bg: 'rgba(55,138,221,0.10)', fg: '#185FA5', label: 'Individual' },
  kr:         { bg: 'rgba(44,44,42,0.04)',   fg: '#5F5E5A', label: 'KR' },
}

export default function CascadeTreeModal({ objectiveId, year, onClose, onNavigate }) {
  const supabase = useSupabase()
  const [flat, setFlat] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchAllObjectivesForYear(supabase, year)
      .then(data => { if (active) setFlat(data) })
      .catch(err => console.error(err))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [supabase, year])

  // Find root ancestor and build tree from there so we see the full chain
  const { tree, targetId } = useMemo(() => {
    if (!flat.length) return { tree: null, targetId: objectiveId }
    const root = findRoot(flat, objectiveId) || flat.find(o => o.id === objectiveId)
    const t = root ? buildCascadeTree(flat, root.id) : null
    return { tree: t, targetId: objectiveId }
  }, [flat, objectiveId])

  const summary = useMemo(() => {
    if (!tree) return null
    const counts = countDescendantsByLevel(tree)
    const allNodes = []
    function walk(n) { allNodes.push(n); (n.children || []).forEach(walk) }
    walk(tree)
    const totalObjectives = allNodes.length
    const avgProgress = totalObjectives === 0 ? 0
      : Math.round(allNodes.reduce((s, n) => s + calcObjectivePercent(n), 0) / totalObjectives)
    const underperforming = allNodes.filter(n => n.id !== tree.id && calcObjectivePercent(n) < 30).length
    return { totalObjectives, avgProgress, underperforming, counts }
  }, [tree])

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-2 sm:p-4">
      <div className="bg-[#DFDDD9] rounded-xl shadow-xl w-full max-w-[720px] my-4">
        <div className="bg-[#2C2C2A] rounded-t-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#9F9A8C]">Cascade tree</p>
            <p className="text-[13px] text-[#DFDDD9] font-medium truncate">{tree?.title || 'Loading…'}</p>
          </div>
          <button onClick={onClose} className="text-[#9F9A8C] hover:text-[#DFDDD9] text-[18px]">×</button>
        </div>

        {summary && (
          <div className="px-4 py-2.5 border-b border-[rgba(0,0,0,0.06)] flex flex-wrap gap-2">
            <Badge>{summary.totalObjectives} objectives in cascade</Badge>
            <Badge style={{ color: progressColor(summary.avgProgress) }}>
              Average progress {summary.avgProgress}%
            </Badge>
            {summary.underperforming > 0 && (
              <Badge style={{ color: '#A32D2D', background: 'rgba(163,45,45,0.08)' }}>
                ⚠ {summary.underperforming} children below 30%
              </Badge>
            )}
          </div>
        )}

        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-8 bg-[#F5F3EF] rounded" />
              <div className="h-8 bg-[#F5F3EF] rounded ml-6" />
              <div className="h-8 bg-[#F5F3EF] rounded ml-12" />
            </div>
          ) : !tree ? (
            <p className="text-[12px] text-[#9B8C82] italic">No cascade data available.</p>
          ) : (
            <TreeNode node={tree} depth={0} targetId={targetId} onNavigate={onNavigate} />
          )}
        </div>
      </div>
    </div>
  )
}

function Badge({ children, style }) {
  return (
    <span className="text-[10px] px-2 py-1 rounded-full bg-[rgba(0,0,0,0.04)] text-[#2C2C2A]" style={style}>
      {children}
    </span>
  )
}

function TreeNode({ node, depth, targetId, onNavigate }) {
  const isKrNode = node._isKrNode
  const chip = LEVEL_CHIP[node.level] || LEVEL_CHIP.company
  const isTarget = node.id === targetId
  const isLocked = node.is_private && node.level === 'individual'

  // KR nodes compute % from their own value, objective nodes from their KRs
  let pct = 0
  if (isKrNode) {
    const start = Number(node.start_value) || 0
    const target = Number(node.target_value)
    const current = Number(node.current_value) || 0
    if (target && target !== start) {
      pct = Math.max(0, Math.min(100, Math.round(((current - start) / (target - start)) * 100)))
    }
  } else {
    pct = calcObjectivePercent(node)
  }
  const color = progressColor(pct)

  return (
    <div className="relative">
      <div
        className={`flex items-start gap-2 py-1.5 px-2 rounded-md transition-colors ${isTarget ? 'bg-[rgba(44,44,42,0.06)]' : 'hover:bg-[rgba(0,0,0,0.03)]'} ${isKrNode || isLocked ? 'cursor-default' : 'cursor-pointer'}`}
        style={{ marginLeft: depth * 20 }}
        onClick={() => !isKrNode && !isLocked && onNavigate?.(node)}>
        {depth > 0 && (
          <div className="absolute left-0 top-0 bottom-0 border-l border-[rgba(0,0,0,0.08)]" style={{ left: (depth - 1) * 20 + 10 }} />
        )}
        <span
          className="text-[9px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 mt-0.5"
          style={{ background: chip.bg, color: chip.fg }}>
          {node.level === 'brand' ? (node.brand || chip.label) :
           node.level === 'team' ? (node.team || chip.label) : chip.label}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`leading-tight truncate ${isKrNode ? 'text-[11.5px] italic text-[#5F5E5A]' : isLocked ? 'text-[#B7A99D] text-[12.5px]' : 'text-[#2C2C2A] text-[12.5px]'}`}>
            {isLocked && <span className="mr-1">🔒</span>}
            {isLocked ? 'Private objective' : node.title}
            {isKrNode && node.target_value != null && (
              <span className="text-[10px] text-[#B7A99D] ml-1">
                · {node.current_value ?? 0} / {node.target_value}{node.unit ? ` ${node.unit}` : ''}
              </span>
            )}
          </p>
          {!isKrNode && !isLocked && node.owner && (
            <p className="text-[10px] text-[#9B8C82] truncate">{node.owner.nickname} {node.owner.position || ''}</p>
          )}
        </div>
        {!isLocked && (
          <span className="text-[11px] font-medium flex-shrink-0" style={{ color }}>{pct}%</span>
        )}
      </div>
      {(node.children || []).map(c => (
        <TreeNode key={c.id} node={c} depth={depth + 1} targetId={targetId} onNavigate={onNavigate} />
      ))}
    </div>
  )
}
