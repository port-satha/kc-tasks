'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useSupabase, useUser, useMembers } from '../lib/hooks'
import {
  fetchKpis, createKpi, updateKpi, deleteKpi,
  fetchObjectives, createObjective, updateObjective, deleteObjective,
  createKeyResult, updateKeyResult, deleteKeyResult,
  calcKrPercent, calcObjectivePercent, calcKpiPercent,
  progressColor, currentQuarter, currentYear, availableYears,
  fetchBrandOwners, fetchTeamLeads, fetchParentCandidates,
  canWriteAtLevel, BRANDS, TEAMS, CHAPTERS, TEAM_TO_CHAPTER, teamsInChapter,
  getWritableScopes, writableLevels, writableBrandsForLevel, writableTeams,
  fetchMyIndividualObjectives, fetchReportsIndividualObjectives,
  countDirectReports, fetchIndividualParentCandidates,
  requestApproval, approveObjective, requestObjectiveChanges,
  fetchKrsNeedingCheckIn, countPendingCheckIns, fetchLatestCheckIns,
  fetchCheckInsBatch,
  fetchReflectionsForObjectives, isLastWeekOfQuarter, isFriday,
  fetchLocks, isPeriodLocked, createEditRequest,
  fetchAllObjectivesForYear,
} from '../lib/okr'
import KrSparkline from './KrSparkline'
import ChapterDrawer from './ChapterDrawer'
import ContextBar from './ContextBar'
import KpiMilestoneCard from './KpiMilestoneCard'
import MainTabs from './MainTabs'
import OkrCreateWizard from './OkrCreateWizard'
import ApprovalStatusPill from './ApprovalStatusPill'
import OnboardingEmptyState from './OnboardingEmptyState'

const CascadeTreeModal = dynamic(() => import('./CascadeTreeModal'), { ssr: false })
const CheckInDrawer = dynamic(() => import('./CheckInDrawer'), { ssr: false })
const ReflectionModal = dynamic(() => import('./ReflectionModal'), { ssr: false })
const KpiUpdateModal = dynamic(() => import('./KpiUpdateModal'), { ssr: false })

const BRAND_CHIP = {
  onest:  { bg: 'rgba(45,80,22,0.08)',   fg: '#2D5016' },
  grubby: { bg: 'rgba(45,122,62,0.08)',  fg: '#1B4D2A' },
  KC:     { bg: 'rgba(44,44,42,0.06)',   fg: '#5F5E5A' },
}

const TAG_CHIP = {
  'Must-win':   { bg: 'rgba(44,44,42,0.06)',   fg: '#5F5E5A' },
  'Stretch':    { bg: 'rgba(186,117,23,0.08)', fg: '#854F0B' },
  'Experiment': { bg: 'rgba(55,138,221,0.08)', fg: '#185FA5' },
}

// Level pills — Kindfolks model: onest and grubby are consumer brands; KC
// is the shared / holding-level brand. No separate "Company" level —
// each brand owns its own cascade.
const LEVEL_PILLS = [
  { key: 'brand:onest', label: 'onest', level: 'brand', brand: 'onest', style: { color: '#2D5016' } },
  { key: 'brand:grubby', label: 'grubby', level: 'brand', brand: 'grubby', style: { color: '#1B4D2A' } },
  { key: 'brand:KC', label: 'KC · Shared', level: 'brand', brand: 'KC', style: { color: '#5F5E5A' } },
  ...TEAMS.map(t => ({ key: `team:${t}`, label: t, level: 'team', team: t, style: { color: '#5F5E5A' } })),
]

export default function OkrDashboard() {
  const supabase = useSupabase()
  const { user, profile } = useUser()
  const { members } = useMembers()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  const [year, setYear] = useState(currentYear())
  const [quarter, setQuarter] = useState(currentQuarter()) // 1-4 or 'annual'
  // Default landing: onest brand (can be overridden via URL ?level=...&brand=...)
  const [levelSelection, setLevelSelection] = useState({ level: 'brand', brand: 'onest', team: null })
  const [expandedChapter, setExpandedChapter] = useState(null) // UI-only: which chapter pill is expanded to show its teams
  // Phase 3: view mode — 'level' (company/brand/team), 'mine', or 'team-manage'
  const [viewMode, setViewMode] = useState('level')
  // Section 5: main-content tab — 'company' (KC health) | 'brand' | 'mine'.
  // 'team-manage' is reached via the Team I manage pill, not the tabs.
  const [mainTab, setMainTab] = useState('brand')
  const [reportsCount, setReportsCount] = useState(0)
  const [myObjectives, setMyObjectives] = useState([])
  const [reportsData, setReportsData] = useState({ reports: [], objectives: [] })
  const [kpis, setKpis] = useState([])
  const [objectives, setObjectives] = useState([])
  const [loading, setLoading] = useState(true)
  const [brandOwners, setBrandOwners] = useState([])
  const [teamLeads, setTeamLeads] = useState([])
  const [showKpiForm, setShowKpiForm] = useState(false)
  const [editingKpi, setEditingKpi] = useState(null)
  const [showOkrForm, setShowOkrForm] = useState(false)
  const [editingOkr, setEditingOkr] = useState(null)
  const [expandedOkrs, setExpandedOkrs] = useState({})
  const [treeObjectiveId, setTreeObjectiveId] = useState(null)
  const [allObjectivesForYear, setAllObjectivesForYear] = useState([])
  // Phase 4: check-ins + reflections + kpi updates
  const [checkInKrs, setCheckInKrs] = useState(null) // array of KRs or null (drawer closed)
  const [pendingCheckInCount, setPendingCheckInCount] = useState(0)
  const [fridayBannerDismissed, setFridayBannerDismissed] = useState(false)
  const [reflectionState, setReflectionState] = useState(null) // { objective, mode }
  const [kpiUpdating, setKpiUpdating] = useState(null)
  const [latestCheckIns, setLatestCheckIns] = useState({}) // krId -> check-in
  const [checkInsByKr, setCheckInsByKr] = useState({}) // krId -> [check-ins oldest→newest]
  const [reflectionsByObjective, setReflectionsByObjective] = useState({})
  // Phase 5
  const [locks, setLocks] = useState([])
  const [editRequestState, setEditRequestState] = useState(null) // { targetTable, targetId, year, quarter, title }

  // Load ownership tables + period locks once
  useEffect(() => {
    Promise.all([fetchBrandOwners(supabase), fetchTeamLeads(supabase), fetchLocks(supabase)])
      .then(([bo, tl, lk]) => { setBrandOwners(bo); setTeamLeads(tl); setLocks(lk) })
      .catch(err => console.error(err))
  }, [supabase])

  const currentPeriodLocked = isPeriodLocked(locks, year, quarter)

  // Parse URL query params on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const view = params.get('view')
    if (view === 'mine') { setViewMode('mine'); return }
    if (view === 'team-manage') { setViewMode('team-manage'); return }
    const lv = params.get('level')
    if (lv === 'brand' && BRANDS.includes(params.get('brand'))) {
      setLevelSelection({ level: 'brand', brand: params.get('brand'), team: null })
    } else if (lv === 'team' && TEAMS.includes(params.get('team'))) {
      setLevelSelection({ level: 'team', brand: params.get('brand') || null, team: params.get('team') })
    }
  }, [])

  // Sync URL when view/level changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (viewMode === 'mine') {
      url.searchParams.set('view', 'mine')
      url.searchParams.delete('level'); url.searchParams.delete('brand'); url.searchParams.delete('team')
    } else if (viewMode === 'team-manage') {
      url.searchParams.set('view', 'team-manage')
      url.searchParams.delete('level'); url.searchParams.delete('brand'); url.searchParams.delete('team')
    } else {
      url.searchParams.delete('view')
      url.searchParams.delete('chapter')
      url.searchParams.set('level', levelSelection.level)
      if (levelSelection.brand) url.searchParams.set('brand', levelSelection.brand)
      else url.searchParams.delete('brand')
      if (levelSelection.team) url.searchParams.set('team', levelSelection.team)
      else url.searchParams.delete('team')
    }
    window.history.replaceState({}, '', url.toString())
  }, [viewMode, levelSelection])

  // Load reports count for showing "Team I manage" nav
  useEffect(() => {
    if (!user?.id) return
    countDirectReports(supabase, user.id).then(setReportsCount).catch(() => setReportsCount(0))
  }, [supabase, user?.id])

  // Section 8 — realtime subscription so an OKR owner sees their
  // approval_status flip the moment a manager approves or requests
  // changes. Filtered to rows the current user owns; debounced reload
  // (300 ms) skips realtime echoes of our own optimistic writes.
  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel(`okr-status-${user.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'objectives', filter: `owner_id=eq.${user.id}` },
        () => {
          // Lightweight: just reload the user's view. Debounced via timer
          // to coalesce rapid bursts.
          if (typeof window === 'undefined') return
          if (window.__kc_okr_reload_t) clearTimeout(window.__kc_okr_reload_t)
          window.__kc_okr_reload_t = setTimeout(() => { load() }, 300)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // load() identity changes by design; we only care about (user, supabase) here
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, user?.id])

  // Load pending check-in count (used by Friday banner + badge)
  useEffect(() => {
    if (!user?.id) return
    countPendingCheckIns(supabase, user.id).then(setPendingCheckInCount).catch(() => setPendingCheckInCount(0))
  }, [supabase, user?.id])

  // Session-dismissible Friday banner
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem('kc-friday-banner-dismissed') === '1') setFridayBannerDismissed(true)
  }, [])

  const dismissFridayBanner = () => {
    setFridayBannerDismissed(true)
    if (typeof window !== 'undefined') sessionStorage.setItem('kc-friday-banner-dismissed', '1')
  }

  // Load latest check-ins for visible objectives' KRs (for confidence warnings)
  useEffect(() => {
    const allKrs = []
    ;[...objectives, ...myObjectives, ...(reportsData?.objectives || [])].forEach(o => {
      (o.key_results || []).forEach(kr => allKrs.push(kr.id))
    })
    const uniqueIds = [...new Set(allKrs)]
    if (uniqueIds.length === 0) { setLatestCheckIns({}); return }
    fetchLatestCheckIns(supabase, uniqueIds).then(setLatestCheckIns).catch(() => {})
  }, [supabase, objectives, myObjectives, reportsData])

  // Load last 8 weeks of check-ins for each visible KR (for sparklines)
  useEffect(() => {
    const allKrs = []
    ;[...objectives, ...myObjectives, ...(reportsData?.objectives || [])].forEach(o => {
      (o.key_results || []).forEach(kr => allKrs.push(kr.id))
    })
    const uniqueIds = [...new Set(allKrs)]
    if (uniqueIds.length === 0) { setCheckInsByKr({}); return }
    fetchCheckInsBatch(supabase, uniqueIds, 8).then(setCheckInsByKr).catch(() => {})
  }, [supabase, objectives, myObjectives, reportsData])

  // Section 5 — load the full objectives list for the year so we can show
  // depth indicators ("N team OKRs cascade here · N individual OKRs") on
  // brand-level cards. Only fetches when viewing brand-level OKRs.
  useEffect(() => {
    if (viewMode !== 'level' || levelSelection.level !== 'brand') return
    fetchAllObjectivesForYear(supabase, year).then(setAllObjectivesForYear).catch(() => {})
  }, [supabase, year, viewMode, levelSelection.level])

  // Map of brand-objective.id → { team: N, individual: M } cascade counts.
  // Walks the full year tree so children-of-children (individuals cascading
  // through a team OKR) are counted too.
  const cascadeCountsByObjective = useMemo(() => {
    if (!allObjectivesForYear || allObjectivesForYear.length === 0) return {}
    const byParent = {}
    for (const o of allObjectivesForYear) {
      const pid = o.parent_objective_id
      if (!pid) continue
      ;(byParent[pid] || (byParent[pid] = [])).push(o)
    }
    const counts = {}
    function walk(rootId) {
      const counter = { team: 0, individual: 0 }
      const stack = [...(byParent[rootId] || [])]
      while (stack.length > 0) {
        const node = stack.pop()
        if (node.level === 'team') counter.team++
        else if (node.level === 'individual') counter.individual++
        ;(byParent[node.id] || []).forEach(c => stack.push(c))
      }
      return counter
    }
    for (const o of allObjectivesForYear) {
      if (o.level === 'brand') counts[o.id] = walk(o.id)
    }
    return counts
  }, [allObjectivesForYear])

  // Load reflections for visible objectives
  useEffect(() => {
    const ids = [...new Set([
      ...objectives.map(o => o.id),
      ...myObjectives.map(o => o.id),
      ...(reportsData?.objectives || []).map(o => o.id),
    ])]
    if (ids.length === 0) { setReflectionsByObjective({}); return }
    const q = quarter === 'annual' ? null : quarter
    fetchReflectionsForObjectives(supabase, ids, { year, quarter: q }).then(setReflectionsByObjective).catch(() => {})
  }, [supabase, objectives, myObjectives, reportsData, year, quarter])

  const openCheckInDrawer = async () => {
    if (!user?.id) return
    try {
      const krs = await fetchKrsNeedingCheckIn(supabase, user.id)
      if (krs.length === 0) { alert('All check-ins are done for this week — nice work!'); return }
      setCheckInKrs(krs)
    } catch (err) { alert('Failed: ' + err.message) }
  }

  const openCheckInForSingle = (kr, parentObj) => {
    setCheckInKrs([{ ...kr, objective: { id: parentObj.id, title: parentObj.title } }])
  }

  const handleCheckInSaved = async () => {
    // Refresh lists + count
    await load()
    if (user?.id) countPendingCheckIns(supabase, user.id).then(setPendingCheckInCount)
  }

  const handleKpiSaved = (updated) => {
    setKpis(prev => prev.map(k => k.id === updated.id ? updated : k))
  }

  const showReflectionBanner = isLastWeekOfQuarter() && viewMode === 'mine' && myObjectives.length > 0

  const canCreate = canWriteAtLevel({
    level: levelSelection.level,
    brand: levelSelection.brand,
    team: levelSelection.team,
    profile,
    brandOwners,
    teamLeads,
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (viewMode === 'mine') {
        if (user?.id) {
          const mine = await fetchMyIndividualObjectives(supabase, { ownerId: user.id, year, quarter })
          setMyObjectives(mine)
        }
      } else if (viewMode === 'team-manage') {
        if (user?.id) {
          const rd = await fetchReportsIndividualObjectives(supabase, { managerId: user.id, year, quarter })
          setReportsData(rd)
        }
      } else {
        const kpiOpts = { year, level: levelSelection.level }
        const okrOpts = { year, quarter, level: levelSelection.level }
        if (levelSelection.brand) { kpiOpts.brand = levelSelection.brand; okrOpts.brand = levelSelection.brand }
        if (levelSelection.team)  { kpiOpts.team  = levelSelection.team;  okrOpts.team  = levelSelection.team  }
        const [kpiData, okrData] = await Promise.all([
          fetchKpis(supabase, kpiOpts),
          fetchObjectives(supabase, okrOpts),
        ])
        setKpis(kpiData)
        setObjectives(okrData)
      }
    } catch (err) {
      console.error('Failed to load OKRs:', err)
    }
    setLoading(false)
  }, [supabase, year, quarter, levelSelection.level, levelSelection.brand, levelSelection.team, viewMode, user?.id])

  useEffect(() => { load() }, [load])

  const years = useMemo(() => availableYears([year]), [year])

  const stats = useMemo(() => {
    const totalKrs = objectives.reduce((s, o) => s + (o.key_results?.length || 0), 0)
    return `${year} · ${objectives.length} objectives · ${totalKrs} key results`
  }, [year, objectives])

  const handleSaveKpi = async (payload) => {
    try {
      const isNew = !editingKpi
      if (editingKpi) {
        const updated = await updateKpi(supabase, editingKpi.id, payload)
        setKpis(prev => prev.map(k => k.id === updated.id ? updated : k))
      } else {
        await createKpi(supabase, { ...payload, created_by: user?.id })
      }
      setShowKpiForm(false); setEditingKpi(null)

      // Switch view so the new/updated KPI is visible — matches the
      // "navigate to where it lives" fix applied to OKR saves.
      if (isNew) {
        setViewMode('level')
        setLevelSelection({
          level: payload.level,
          brand: payload.brand || null,
          team: payload.team || null,
        })
        if (payload.year) setYear(Number(payload.year))
      }
      await load()
    } catch (err) { alert('Failed: ' + err.message) }
  }

  const handleDeleteKpi = async (kpiId) => {
    if (!confirm('Delete this KPI?')) return
    try {
      await deleteKpi(supabase, kpiId)
      setKpis(prev => prev.filter(k => k.id !== kpiId))
    } catch (err) { alert('Failed: ' + err.message) }
  }

  const handleSaveOkr = async ({ objective, keyResults }) => {
    try {
      let objId
      const isNew = !editingOkr
      if (editingOkr) {
        const updated = await updateObjective(supabase, editingOkr.id, objective)
        objId = updated.id
        // Delete existing KRs, recreate from form (simple Phase-1 approach)
        for (const kr of (editingOkr.key_results || [])) {
          await deleteKeyResult(supabase, kr.id)
        }
      } else {
        const created = await createObjective(supabase, { ...objective, created_by: user?.id })
        objId = created.id
      }
      // Create KRs
      for (let i = 0; i < keyResults.length; i++) {
        const kr = keyResults[i]
        await createKeyResult(supabase, { ...kr, objective_id: objId, display_order: i })
      }
      setShowOkrForm(false); setEditingOkr(null)

      // Switch view so the newly-created OKR is visible.
      if (isNew) {
        if (objective.level === 'individual') {
          setViewMode('mine')
        } else {
          setViewMode('level')
          setLevelSelection({
            level: objective.level,
            brand: objective.brand || null,
            team: objective.team || null,
          })
        }
        if (objective.is_annual) setQuarter('annual')
        else if (objective.quarter) setQuarter(objective.quarter)
      }
      await load()
    } catch (err) { alert('Failed: ' + err.message) }
  }

  // Phase 3: approval flow handlers
  const handleRequestApproval = async (obj) => {
    try {
      const managerId = profile?.manager_id
      if (!managerId) { alert('No manager assigned. Ask an admin to set your manager in /settings/org.'); return }
      await requestApproval(supabase, {
        objectiveId: obj.id,
        objectiveTitle: obj.title,
        managerId,
        ownerNickname: profile?.nickname || 'Someone',
      })
      await load()
    } catch (err) { alert('Failed: ' + err.message) }
  }

  // Optimistic helper — patch an objective inside reportsData.objectives in
  // place so the manager sees the status change instantly. The DB write
  // fires after; load() reconciles when it returns.
  const patchReportObjectiveLocal = (objId, patch) => {
    setReportsData(prev => ({
      ...prev,
      objectives: (prev.objectives || []).map(o =>
        o.id === objId ? { ...o, ...patch } : o
      ),
    }))
  }

  const handleApprove = async (obj) => {
    // Optimistic update — flip the badge before the DB round-trip.
    patchReportObjectiveLocal(obj.id, { approval_status: 'approved', change_request_note: null })
    try {
      await approveObjective(supabase, {
        objectiveId: obj.id,
        objectiveTitle: obj.title,
        ownerId: obj.owner_id,
        approverNickname: profile?.nickname,
      })
      await load()
    } catch (err) {
      // Roll back the optimistic flip on failure.
      patchReportObjectiveLocal(obj.id, { approval_status: 'pending_approval' })
      alert('Failed: ' + err.message)
    }
  }

  const handleRequestChanges = async (obj, note) => {
    if (!note || !note.trim()) { alert('Please add a note for the change request.'); return }
    patchReportObjectiveLocal(obj.id, {
      approval_status: 'changes_requested',
      change_request_note: note.trim(),
    })
    try {
      await requestObjectiveChanges(supabase, {
        objectiveId: obj.id,
        objectiveTitle: obj.title,
        ownerId: obj.owner_id,
        note: note.trim(),
        approverNickname: profile?.nickname,
      })
      await load()
    } catch (err) {
      patchReportObjectiveLocal(obj.id, { approval_status: 'pending_approval' })
      alert('Failed: ' + err.message)
    }
  }

  const handleDeleteOkr = async (okrId) => {
    if (!confirm('Delete this objective and all its key results?')) return
    try {
      await deleteObjective(supabase, okrId)
      setObjectives(prev => prev.filter(o => o.id !== okrId))
      setMyObjectives(prev => prev.filter(o => o.id !== okrId))
    } catch (err) { alert('Failed: ' + err.message) }
  }

  return (
    <div className="min-h-screen bg-[#DFDDD9]">
      {/* Top controls */}
      <div className="px-[18px] pt-3">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-[15px] font-medium text-[#2C2C2A]">OKRs &amp; KPIs</h1>
            <p className="text-[11px] text-[#9B8C82] mt-0.5">{stats}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Segmented
              options={years.map(y => ({ value: y, label: String(y) }))}
              value={year}
              onChange={setYear}
            />
            {/* Quarter selector now lives inside ContextBar (Section 4) */}
            {/* Phase 5: Export button for people / admin */}
            {(isAdmin || profile?.role === 'people') && (
              <div className="relative group">
                <button className="text-[11px] px-3 py-1.5 border border-[rgba(0,0,0,0.08)] text-[#2C2C2A] rounded-md hover:bg-[rgba(0,0,0,0.03)] flex items-center gap-1">
                  ↓ Export
                </button>
                <div className="absolute right-0 top-full mt-1 w-56 bg-[#F5F3EF] border border-[rgba(0,0,0,0.08)] rounded-lg shadow-lg z-50 py-1 hidden group-hover:block">
                  <a href={`/api/okrs/export?year=${year}${typeof quarter === 'number' ? `&quarter=${quarter}` : ''}&kind=objectives&format=csv`}
                    className="block text-[11px] px-3 py-1.5 hover:bg-[rgba(0,0,0,0.04)] text-[#2C2C2A]">
                    Objectives + Reflections (CSV)
                  </a>
                  <a href={`/api/okrs/export?year=${year}&kind=kpis&format=csv`}
                    className="block text-[11px] px-3 py-1.5 hover:bg-[rgba(0,0,0,0.04)] text-[#2C2C2A]">
                    KPIs (CSV)
                  </a>
                  <a href={`/api/okrs/export?year=${year}${typeof quarter === 'number' ? `&quarter=${quarter}` : ''}&kind=aggregate&format=csv`}
                    className="block text-[11px] px-3 py-1.5 hover:bg-[rgba(0,0,0,0.04)] text-[#2C2C2A]">
                    Team / Brand aggregate (CSV)
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================
          Section 4 — Top navigation pill bar.
          Three layers stacked: pill bar (dark) → optional chapter
          drawer (slightly lighter dark) → context bar (light Linen).
          ============================================================ */}

      {/* Pill bar — dark band. Section 4 of the brief. The "My OKRs" pill
          was removed in Section 5 — that mode is now reachable through the
          MainTabs strip below ContextBar. "Team I manage" stays here as a
          manager-specific entry point. */}
      <div
        className="px-[18px] py-[10px] mt-2 flex gap-1.5 flex-wrap items-center"
        style={{ background: '#2C2C2A' }}
      >
        {reportsCount > 0 && (
          <button
            onClick={() => { setViewMode('team-manage'); setExpandedChapter(null) }}
            className={`text-[11px] px-3 py-1.5 rounded-full transition-colors whitespace-nowrap font-medium ${
              viewMode === 'team-manage'
                ? 'bg-ss-card text-ss-text'
                : 'text-[#C2B39F] hover:bg-[rgba(255,255,255,0.06)]'
            }`}>
            Team I manage
          </button>
        )}

        <span className="w-px h-4 bg-[rgba(255,255,255,0.15)] mx-1" />

        {/* Brand pills */}
        <span className="text-[9.5px] uppercase tracking-[1px] text-[#9F9A8C] font-medium mr-0.5 hidden md:inline">
          Brands
        </span>
        {[
          { brand: 'onest',  label: 'onest',       dot: '#2D5016', activeBg: '#2D5016', activeFg: '#C8E6A8' },
          { brand: 'grubby', label: 'grubby',      dot: '#1B4D2A', activeBg: '#1B4D2A', activeFg: '#A8D4B0' },
          { brand: 'KC',     label: 'KC · Shared', dot: '#888780', activeBg: '#4A4A47', activeFg: '#D4CFC9' },
        ].map(b => {
          const active = viewMode === 'level' && levelSelection.level === 'brand' && levelSelection.brand === b.brand
          return (
            <button key={b.brand}
              onClick={() => {
                setViewMode('level')
                setLevelSelection({ level: 'brand', brand: b.brand, team: null })
                setExpandedChapter(null)
                // Section 5 tab sync: KC → Company tab, others → Brand tab
                setMainTab(b.brand === 'KC' ? 'company' : 'brand')
              }}
              style={active ? { background: b.activeBg, color: b.activeFg } : undefined}
              className={`text-[11px] px-3 py-1.5 rounded-full transition-colors whitespace-nowrap font-medium inline-flex items-center gap-1.5 ${
                active ? '' : 'text-[#C2B39F] hover:bg-[rgba(255,255,255,0.06)]'
              }`}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: b.dot }} />
              {b.label}
            </button>
          )
        })}

        <span className="w-px h-4 bg-[rgba(255,255,255,0.15)] mx-1" />

        {/* Chapter pills — disclosure only. Click rotates the chevron
            and reveals the chapter sub-drawer below. */}
        <span className="text-[9.5px] uppercase tracking-[1px] text-[#9F9A8C] font-medium mr-0.5 hidden md:inline">
          Chapters
        </span>
        {CHAPTERS.map(chapter => {
          const teamInChapterActive = viewMode === 'level' && levelSelection.level === 'team'
            && TEAM_TO_CHAPTER[levelSelection.team] === chapter
          const isOpen = expandedChapter === chapter
          const showActive = isOpen || teamInChapterActive
          const label = chapter === 'Strategy' ? 'Strategy & BD' : chapter
          return (
            <button
              key={chapter}
              onClick={() => setExpandedChapter(isOpen ? null : chapter)}
              className={`text-[11px] px-3 py-1.5 rounded-full transition-colors whitespace-nowrap font-medium inline-flex items-center gap-1 ${
                showActive
                  ? 'bg-[#3A3A37] text-white'
                  : 'text-[#C2B39F] hover:bg-[rgba(255,255,255,0.06)]'
              }`}>
              {label}
              <span className={`text-[10px] transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
            </button>
          )
        })}
      </div>

      {/* Chapter sub-drawer */}
      <ChapterDrawer
        chapter={expandedChapter}
        activeTeam={viewMode === 'level' && levelSelection.level === 'team' ? levelSelection.team : null}
        onPickTeam={(team) => {
          setViewMode('level')
          setLevelSelection({ level: 'team', brand: null, team })
          setMainTab('brand')
        }}
      />

      {/* Context bar — persistent "you are here" + quarter selector */}
      <ContextBar
        viewMode={viewMode}
        levelSelection={levelSelection}
        quarter={quarter}
        onQuarterChange={setQuarter}
        brandOwners={brandOwners}
      />

      {/* Section 5 — main content tabs (Company health / Brand: X / My OKRs) */}
      {viewMode !== 'team-manage' && (
        <MainTabs
          active={mainTab}
          brand={profile?.squad || levelSelection?.brand || 'KC'}
          isManager={reportsCount > 0}
          onSwitchToManage={() => setViewMode('team-manage')}
          onChange={(t) => {
            setMainTab(t)
            if (t === 'company') {
              setViewMode('level')
              setLevelSelection({ level: 'brand', brand: 'KC', team: null })
              setExpandedChapter(null)
            } else if (t === 'mine') {
              setViewMode('mine')
              setExpandedChapter(null)
            } else if (t === 'brand') {
              setViewMode('level')
              // If currently on KC (Company tab default), drop user back to
              // their primary brand. Otherwise keep current selection.
              if (levelSelection.level === 'brand' && levelSelection.brand === 'KC' && profile?.squad && profile.squad !== 'KC') {
                setLevelSelection({
                  level: 'brand',
                  brand: profile.squad === 'both' ? 'onest' : profile.squad,
                  team: null,
                })
              }
            }
          }}
        />
      )}

      {/* Friday banner — Section 9. Dark Charcoal card with icon, week
          label, KR count, and a green "Start check-in" CTA. */}
      {!fridayBannerDismissed && isFriday() && pendingCheckInCount > 0 && (
        <div
          className="mx-[18px] mt-3 rounded-lg px-4 py-3 flex items-center gap-3"
          style={{ background: '#2C2C2A', color: '#F5F3EF' }}
        >
          <span className="text-[18px] leading-none flex-shrink-0">📅</span>
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-medium">
              Friday check-in — Q{currentQuarter()} Week {(() => {
                const now = new Date()
                const q = currentQuarter()
                const start = new Date(now.getFullYear(), (q - 1) * 3, 1)
                return Math.max(1, Math.min(13, Math.floor((now - start) / (7 * 24 * 3600 * 1000)) + 1))
              })()}
            </p>
            <p className="text-[10.5px] text-[#9F9A8C] mt-0.5">
              {pendingCheckInCount} key result{pendingCheckInCount !== 1 ? 's' : ''} need your update · Takes about 2 minutes
            </p>
          </div>
          <button
            onClick={openCheckInDrawer}
            className="text-[11.5px] px-4 py-1.5 rounded-md font-medium hover:opacity-90 whitespace-nowrap"
            style={{ background: '#639922', color: '#FFFFFF' }}
          >
            Start check-in
          </button>
          <button
            onClick={dismissFridayBanner}
            className="text-[11px] text-[#9F9A8C] hover:text-ss-page"
          >
            Later
          </button>
        </div>
      )}
      {/* Always-accessible check-in button for non-Friday */}
      {!isFriday() && pendingCheckInCount > 0 && viewMode === 'mine' && (
        <div className="mx-[18px] mt-3 flex items-center justify-between bg-[#F5F3EF] border border-[rgba(0,0,0,0.04)] rounded-lg px-3 py-2">
          <p className="text-[11px] text-[#9B8C82]">{pendingCheckInCount} KR{pendingCheckInCount !== 1 ? 's' : ''} awaiting this week's check-in</p>
          <button onClick={openCheckInDrawer}
            className="text-[10.5px] px-3 py-1 bg-[#2C2C2A] text-[#DFDDD9] rounded-full hover:bg-[#3D3D3A]">
            Check in
          </button>
        </div>
      )}
      {/* End-of-quarter reflection banner */}
      {showReflectionBanner && (
        <div className="mx-[18px] mt-3 bg-[rgba(55,138,221,0.08)] border border-[rgba(55,138,221,0.2)] rounded-lg px-3 py-2.5 text-[11.5px] text-[#185FA5]">
          <strong>Q{quarter} ends this week.</strong> Complete reflection for your OKRs below.
        </div>
      )}

      {/* Phase 5: Locked quarter banner */}
      {currentPeriodLocked && (
        <div className="mx-[18px] mt-3 bg-[rgba(186,117,23,0.06)] border border-[rgba(186,117,23,0.2)] rounded-lg px-3 py-2.5 flex items-center gap-3">
          <span className="text-[13px]">🔒</span>
          <p className="text-[11.5px] text-[#854F0B] flex-1">
            <strong>Q{quarter} {year} is locked</strong> — data frozen. To amend, submit an edit request.
          </p>
          {profile?.role !== 'admin' && (
            <button onClick={() => setEditRequestState({ targetTable: 'objectives', targetId: null, year, quarter, title: `Q${quarter} ${year}` })}
              className="text-[11px] px-3 py-1.5 border border-[#854F0B] text-[#854F0B] rounded-md hover:bg-[rgba(186,117,23,0.08)]">
              Request edit
            </button>
          )}
          {isAdmin && (
            <span className="text-[10px] text-[#854F0B] italic">Admin edits flagged retroactive.</span>
          )}
        </div>
      )}

      {loading ? (
        <div className="p-4 space-y-3 animate-pulse">
          <div className="h-4 w-48 bg-[#D1CBC5] rounded" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Array.from({length:4}).map((_,i)=>(<div key={i} className="h-24 bg-[#F5F3EF] rounded-lg" />))}
          </div>
          <div className="h-4 w-56 bg-[#D1CBC5] rounded mt-6" />
          <div className="h-20 bg-[#F5F3EF] rounded-xl" />
          <div className="h-20 bg-[#F5F3EF] rounded-xl" />
        </div>
      ) : viewMode === 'mine' ? (
        <MyOkrsView
          profile={profile}
          objectives={myObjectives}
          year={year} quarter={quarter}
          expandedOkrs={expandedOkrs}
          onToggleExpand={(id) => setExpandedOkrs(prev => ({ ...prev, [id]: !prev[id] }))}
          onAdd={() => { setEditingOkr(null); setShowOkrForm(true) }}
          onEdit={(obj) => { setEditingOkr(obj); setShowOkrForm(true) }}
          onDelete={handleDeleteOkr}
          onRequestApproval={handleRequestApproval}
          onViewTree={(id) => setTreeObjectiveId(id)}
          onCheckInKr={openCheckInForSingle}
          onReflect={(obj) => setReflectionState({ objective: obj, mode: 'owner' })}
          latestCheckIns={latestCheckIns}
          checkInsByKr={checkInsByKr}
          reflectionsByObjective={reflectionsByObjective}
          onSeeBrand={() => {
            setMainTab('brand')
            setViewMode('level')
            const b = profile?.squad === 'both' ? 'onest' : (profile?.squad || 'KC')
            setLevelSelection({ level: 'brand', brand: b, team: null })
          }}
        />
      ) : viewMode === 'team-manage' ? (
        <TeamManageView
          reports={reportsData.reports}
          objectives={reportsData.objectives}
          year={year} quarter={quarter}
          expandedOkrs={expandedOkrs}
          onToggleExpand={(id) => setExpandedOkrs(prev => ({ ...prev, [id]: !prev[id] }))}
          onApprove={handleApprove}
          onRequestChanges={handleRequestChanges}
          onViewTree={(id) => setTreeObjectiveId(id)}
          onReflect={(obj) => setReflectionState({ objective: obj, mode: 'manager' })}
          latestCheckIns={latestCheckIns}
          checkInsByKr={checkInsByKr}
          reflectionsByObjective={reflectionsByObjective}
        />
      ) : (
        <>
          {/* KPIs section */}
          {true && (
            <div className="px-[18px] pt-[14px] pb-[10px]">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[9.5px] uppercase tracking-[1px] text-[#9B8C82] font-medium">
                  {levelTitle(levelSelection)} KPIs — {year} Annual
                </h2>
                {canCreate && (
                  <button onClick={() => { setEditingKpi(null); setShowKpiForm(true) }}
                    className="text-[10px] px-2.5 py-1 bg-[#2C2C2A] text-[#DFDDD9] rounded-full hover:bg-[#3D3D3A]">
                    + Add KPI
                  </button>
                )}
              </div>
              {kpis.length === 0 ? (
                <p className="text-[11px] text-[#B7A99D] italic py-3">No KPIs for this view yet.</p>
              ) : (
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                  {kpis.map(kpi => (
                    <KpiMilestoneCard key={kpi.id} kpi={kpi}
                      onClick={canCreate ? () => { setEditingKpi(kpi); setShowKpiForm(true) } : null}
                      onDelete={canCreate ? () => handleDeleteKpi(kpi.id) : null}
                      onUpdateValue={(canCreate || kpi.owner_id === user?.id) ? () => setKpiUpdating(kpi) : null}
                      currentUserId={user?.id} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* OKRs section — hidden on the Company health tab (KPIs only) */}
          {mainTab !== 'company' && (
          <div className="px-[18px] pt-2 pb-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[9.5px] uppercase tracking-[1px] text-[#9B8C82] font-medium">
                {levelTitle(levelSelection)} OKRs — {quarter === 'annual' ? 'Annual' : `Q${quarter}`} {year}
              </h2>
              {canCreate && (
                <button onClick={() => { setEditingOkr(null); setShowOkrForm(true) }}
                  className="text-[10px] px-2.5 py-1 bg-[#2C2C2A] text-[#DFDDD9] rounded-full hover:bg-[#3D3D3A]">
                  + Add objective
                </button>
              )}
            </div>
            {objectives.length === 0 ? (
              <p className="text-[11px] text-[#B7A99D] italic py-3">No objectives for this quarter yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {objectives.map(obj => (
                  <ObjectiveCard key={obj.id} obj={obj}
                    expanded={!!expandedOkrs[obj.id]}
                    onToggle={() => setExpandedOkrs(prev => ({ ...prev, [obj.id]: !prev[obj.id] }))}
                    onEdit={canCreate ? () => { setEditingOkr(obj); setShowOkrForm(true) } : null}
                    onDelete={canCreate ? () => handleDeleteOkr(obj.id) : null}
                    onViewTree={() => setTreeObjectiveId(obj.id)}
                    checkInsByKr={checkInsByKr}
                    cascadeCounts={cascadeCountsByObjective[obj.id]}
                    canEdit={canCreate} />
                ))}
              </div>
            )}
          </div>
          )}
        </>
      )}

      {/* KPI Form modal */}
      {showKpiForm && canCreate && (
        <KpiFormModal
          kpi={editingKpi}
          year={year}
          members={members}
          levelSelection={levelSelection}
          profile={profile}
          brandOwners={brandOwners}
          teamLeads={teamLeads}
          onSave={handleSaveKpi}
          onClose={() => { setShowKpiForm(false); setEditingKpi(null) }}
        />
      )}

      {/* OKR creation wizard — Section 7. Used for NEW OKRs only;
          edit-mode falls through to the legacy OkrFormModal below. */}
      {showOkrForm && !editingOkr && (canCreate || viewMode === 'mine') && (
        <OkrCreateWizard
          level={viewMode === 'mine' ? 'individual' : (levelSelection.level || 'brand')}
          defaultBrand={levelSelection.brand || profile?.squad || 'KC'}
          defaultTeam={levelSelection.team}
          defaultYear={year}
          defaultQuarter={quarter}
          currentProfile={profile}
          members={members}
          supabase={supabase}
          onSaveDraft={handleSaveOkr}
          onSubmitForApproval={async (payload) => {
            // Create as draft first, then flip approval_status. The
            // existing handleSaveOkr already creates + reloads; we just
            // call it here. Auto-approval-request can be a follow-up.
            await handleSaveOkr(payload)
          }}
          onClose={() => { setShowOkrForm(false); setEditingOkr(null) }}
        />
      )}

      {/* OKR Form modal — edit mode only (legacy single-modal form) */}
      {showOkrForm && editingOkr && (canCreate || viewMode === 'mine') && (
        <OkrFormModal
          objective={editingOkr}
          year={year}
          quarter={quarter}
          members={members}
          levelSelection={levelSelection}
          viewMode={viewMode}
          currentProfile={profile}
          isAdmin={isAdmin}
          brandOwners={brandOwners}
          teamLeads={teamLeads}
          supabase={supabase}
          onSave={handleSaveOkr}
          onClose={() => { setShowOkrForm(false); setEditingOkr(null) }}
        />
      )}

      {/* Cascade tree modal */}
      {treeObjectiveId && (
        <CascadeTreeModal
          objectiveId={treeObjectiveId}
          year={year}
          onClose={() => setTreeObjectiveId(null)}
          onNavigate={(node) => {
            // Switch level to match the clicked node
            if (node.level === 'brand') setLevelSelection({ level: 'brand', brand: node.brand, team: null })
            else if (node.level === 'team') setLevelSelection({ level: 'team', brand: node.brand || null, team: node.team })
            setTreeObjectiveId(null)
          }}
        />
      )}

      {/* Check-in drawer */}
      {checkInKrs && checkInKrs.length > 0 && (
        <CheckInDrawer
          krs={checkInKrs}
          onClose={() => setCheckInKrs(null)}
          onSaved={handleCheckInSaved}
        />
      )}

      {/* Reflection modal */}
      {reflectionState && (
        <ReflectionModal
          objective={reflectionState.objective}
          year={year}
          quarter={quarter === 'annual' ? null : quarter}
          mode={reflectionState.mode}
          onClose={() => setReflectionState(null)}
          onSaved={() => load()}
        />
      )}

      {/* KPI update modal */}
      {kpiUpdating && (
        <KpiUpdateModal
          kpi={kpiUpdating}
          onClose={() => setKpiUpdating(null)}
          onSaved={handleKpiSaved}
        />
      )}

      {/* Phase 5: Edit request modal */}
      {editRequestState && (
        <EditRequestModal
          targetTable={editRequestState.targetTable}
          targetId={editRequestState.targetId}
          year={editRequestState.year}
          quarter={editRequestState.quarter}
          title={editRequestState.title}
          userId={user?.id}
          supabase={supabase}
          onClose={() => setEditRequestState(null)}
        />
      )}
    </div>
  )
}

function EditRequestModal({ targetTable, targetId, year, quarter, title, userId, supabase, onClose }) {
  const [whatChanges, setWhatChanges] = useState('')
  const [why, setWhy] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const doSubmit = async () => {
    if (!whatChanges.trim() || !why.trim()) { alert('Both fields are required.'); return }
    setSaving(true)
    try {
      await createEditRequest(supabase, {
        targetTable,
        targetId: targetId || '00000000-0000-0000-0000-000000000000',
        year,
        quarter,
        justification: `WHAT: ${whatChanges.trim()}\n\nWHY: ${why.trim()}`,
        requestedBy: userId,
      })
      setSubmitted(true)
    } catch (err) {
      alert('Failed: ' + err.message)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-[#DFDDD9] rounded-xl shadow-xl w-full max-w-md my-8">
        <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.06)]">
          <p className="text-[10px] uppercase tracking-wider text-[#9B8C82]">Request retroactive edit</p>
          <p className="text-[13px] font-medium text-[#2C2C2A]">{title} is locked</p>
        </div>
        <div className="p-4 space-y-3">
          {submitted ? (
            <div className="text-center py-6">
              <p className="text-[14px] font-medium text-[#2C2C2A]">✓ Request submitted</p>
              <p className="text-[11px] text-[#9B8C82] mt-2">Admins will review and notify you. If approved, you'll have 7 days to make the edit.</p>
              <button onClick={onClose}
                className="mt-4 text-[12px] px-4 py-1.5 bg-[#2C2C2A] text-[#DFDDD9] rounded-md hover:bg-[#3D3D3A] font-medium">
                Close
              </button>
            </div>
          ) : (
            <>
              <p className="text-[11.5px] text-[#2C2C2A]">
                You're amending data from a locked period. Admins must approve.
              </p>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#9B8C82] block mb-1.5">What needs to change?</label>
                <textarea value={whatChanges} onChange={e => setWhatChanges(e.target.value)}
                  rows={2} autoFocus
                  className="w-full text-[12px] text-[#2C2C2A] bg-[#F5F3EF] border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-2 focus:outline-none focus:border-[#2C2C2A]" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#9B8C82] block mb-1.5">Why? (explain the change — this is logged)</label>
                <textarea value={why} onChange={e => setWhy(e.target.value)}
                  rows={3}
                  className="w-full text-[12px] text-[#2C2C2A] bg-[#F5F3EF] border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-2 focus:outline-none focus:border-[#2C2C2A]" />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={onClose} disabled={saving}
                  className="text-[12px] px-4 py-1.5 border border-[rgba(0,0,0,0.08)] text-[#9B8C82] rounded-md hover:bg-[rgba(0,0,0,0.03)] disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={doSubmit} disabled={saving || !whatChanges.trim() || !why.trim()}
                  className="text-[12px] px-4 py-1.5 bg-[#2C2C2A] text-[#DFDDD9] rounded-md hover:bg-[#3D3D3A] font-medium disabled:opacity-50">
                  {saving ? 'Submitting…' : 'Submit request'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------- Segmented control ----------
function Segmented({ options, value, onChange }) {
  return (
    <div className="inline-flex items-center p-[2px] rounded-md bg-[rgba(44,44,42,0.06)]">
      {options.map(opt => (
        <button key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`text-[11px] px-2.5 py-[4px] rounded-[4px] transition-colors ${
            value === opt.value
              ? 'bg-[#F5F3EF] text-[#2C2C2A] font-medium'
              : 'text-[#9B8C82] hover:text-[#2C2C2A]'
          }`}>
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// KpiCard moved to src/components/KpiMilestoneCard.js (Section 6)

// ---------- Objective card ----------
function ObjectiveCard({ obj, expanded, onToggle, onEdit, onDelete, onViewTree, checkInsByKr, cascadeCounts, canEdit }) {
  const pct = calcObjectivePercent(obj)
  const color = progressColor(pct)
  const brand = obj.brand || 'KC'
  const brandChip = BRAND_CHIP[brand]
  const hasParent = !!obj.parent_objective_id
  const hasKrParent = !!obj.parent_kr_id
  return (
    <div className="bg-[#F5F3EF] border border-[rgba(0,0,0,0.04)] rounded-[10px] px-[14px] py-[12px]">
      <div className="flex items-start gap-3">
        <button onClick={onToggle} className="text-[11px] text-[#9B8C82] mt-0.5 w-4 flex-shrink-0">
          <span className={`inline-block transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
        </button>
        <div className="flex-1 min-w-0">
          {hasParent && (
            <button
              onClick={(e) => { e.stopPropagation(); onViewTree?.() }}
              className="text-[10px] text-[#378ADD] mb-0.5 hover:underline flex items-center gap-1">
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M6 10V2m0 0l-3 3m3-3l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              {hasKrParent ? 'Cascades from a parent KR' : 'Cascades from parent objective'} · View tree
            </button>
          )}
          <div className="flex items-start gap-2">
            <p className="text-[12.5px] font-medium text-[#2C2C2A] leading-[1.4] flex-1">{obj.title}</p>
            {obj.approval_status && obj.approval_status !== 'approved' && (
              <ApprovalStatusPill status={obj.approval_status} className="flex-shrink-0 mt-0.5" />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {obj.is_annual && (
              <span className="text-[9px] px-[7px] py-[2px] rounded-[10px] font-medium"
                style={{ background: 'rgba(44,44,42,0.08)', color: '#5F5E5A' }}>
                Annual
              </span>
            )}
            {brandChip && (
              <span className="text-[9px] px-[7px] py-[2px] rounded-[10px]" style={{ background: brandChip.bg, color: brandChip.fg }}>
                {brand}
              </span>
            )}
            {(obj.tags || []).map(tag => {
              const t = TAG_CHIP[tag]
              return t ? (
                <span key={tag} className="text-[9px] px-[7px] py-[2px] rounded-[10px]" style={{ background: t.bg, color: t.fg }}>
                  {tag}
                </span>
              ) : null
            })}
          </div>
          {obj.owner && (
            <p className="text-[10px] text-[#9B8C82] mt-1">Owner: {obj.owner.nickname} {obj.owner.position_title}</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[15px] font-medium" style={{ color }}>{pct}%</p>
          <p className="text-[9px] text-[#B7A99D]">{obj.key_results?.length || 0} KRs</p>
        </div>
      </div>
      <div className="h-[4px] bg-[rgba(0,0,0,0.04)] rounded-full mt-2 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>

      {/* Section 5 — depth indicator + permission badge on brand cards */}
      {(obj.level === 'brand' && (cascadeCounts || canEdit === false)) && (
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {cascadeCounts && (cascadeCounts.team > 0 || cascadeCounts.individual > 0) && (
            <span className="text-[10px] text-[#9B8C82]">
              {cascadeCounts.team} team OKR{cascadeCounts.team !== 1 ? 's' : ''} cascade here
              {cascadeCounts.individual > 0 && (
                <> · {cascadeCounts.individual} individual OKR{cascadeCounts.individual !== 1 ? 's' : ''}</>
              )}
            </span>
          )}
          {canEdit === false && (
            <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-ss-muted text-ss-muted-text inline-flex items-center gap-1">
              <LockIcon /> view only
            </span>
          )}
        </div>
      )}

      {expanded && (
        <div className="mt-3 pl-7 space-y-1.5">
          {(obj.key_results || []).map((kr, idx) => {
            const krPct = calcKrPercent(kr)
            const krColor = progressColor(krPct)
            const krHistory = checkInsByKr?.[kr.id]
            return (
              <div key={kr.id} className="bg-[rgba(255,255,255,0.5)] rounded-md px-2.5 py-2 flex items-start gap-2.5">
                <span className="text-[10px] text-[#9B8C82] font-medium w-8 flex-shrink-0">KR{idx+1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11.5px] text-[#2C2C2A] leading-tight">{kr.title}</p>
                  {kr.owner && (
                    <p className="text-[10px] text-[#9B8C82] mt-0.5">{kr.owner.nickname} {kr.owner.position_title}</p>
                  )}
                  {krHistory && krHistory.length >= 2 && (
                    <div className="mt-1"><KrSparkline checkIns={krHistory} kr={kr} /></div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-[60px] h-[3px] bg-[rgba(0,0,0,0.04)] rounded-full overflow-hidden">
                    <div className="h-full" style={{ width: `${krPct}%`, background: krColor }} />
                  </div>
                  <span className="text-[10.5px] font-medium" style={{ color: krColor }}>{krPct}%</span>
                </div>
              </div>
            )
          })}
          <div className="flex gap-2 pt-1 items-center">
            {onViewTree && (
              <button onClick={(e) => { e.stopPropagation(); onViewTree() }}
                className="text-[10px] text-[#378ADD] hover:underline">
                View cascade tree
              </button>
            )}
            {(onEdit || onDelete) && (
              <div className="flex gap-2 ml-auto">
              {onEdit && (
                <button onClick={onEdit}
                  className="text-[10px] px-2 py-1 border border-[rgba(0,0,0,0.08)] text-[#2C2C2A] rounded-md hover:bg-[rgba(0,0,0,0.03)]">
                  Edit
                </button>
              )}
              {onDelete && (
                <button onClick={onDelete}
                  className="text-[10px] px-2 py-1 text-[#A32D2D] rounded-md hover:bg-[rgba(163,45,45,0.06)]">
                  Delete
                </button>
              )}
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function levelTitle({ level, brand, team }) {
  if (level === 'brand') return brand === 'KC' ? 'KC · Shared' : brand
  if (level === 'team') return team
  return ''
}

function formatNumber(n) {
  if (n === null || n === undefined || n === '') return '—'
  const num = Number(n)
  if (Number.isNaN(num)) return '—'
  if (Math.abs(num) >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(num) >= 1_000) return (num / 1_000).toFixed(1) + 'K'
  return String(num)
}

// ==========================================================
// KPI Form Modal
// ==========================================================
function KpiFormModal({ kpi, year: defaultYear, members, levelSelection, profile, brandOwners, teamLeads, onSave, onClose }) {
  // Compute scope so we restrict dropdowns to what the user can actually write
  const scopes = useMemo(() => getWritableScopes({ profile, brandOwners, teamLeads }), [profile, brandOwners, teamLeads])
  // KPIs don't exist at company level — default to brand if nothing else is specified.
  // Filter writable levels to non-individual (KPIs aren't individual-scoped).
  const allowedLevels = writableLevels(scopes).filter(l => l !== 'individual')
  const initialLevel = kpi?.level
    || levelSelection?.level
    || (allowedLevels[0] || 'brand')
  const [form, setForm] = useState({
    name: kpi?.name || '',
    description: kpi?.description || '',
    level: initialLevel,
    brand: kpi?.brand || levelSelection?.brand || 'onest',
    team: kpi?.team || levelSelection?.team || '',
    owner_id: kpi?.owner_id || '',
    year: kpi?.year || defaultYear,
    target_value: kpi?.target_value ?? '',
    target_unit: kpi?.target_unit || '',
    current_value: kpi?.current_value ?? 0,
    q1_target: kpi?.q1_target ?? '',
    q2_target: kpi?.q2_target ?? '',
    q3_target: kpi?.q3_target ?? '',
    q4_target: kpi?.q4_target ?? '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    const payload = {
      name: form.name.trim(),
      description: form.description || null,
      level: form.level,
      brand: form.level === 'team' && !form.brand ? null : form.brand,
      team: form.level === 'team' ? (form.team || null) : null,
      year: Number(form.year),
      owner_id: form.owner_id || null,
      target_value: form.target_value === '' ? null : Number(form.target_value),
      target_unit: form.target_unit || null,
      current_value: form.current_value === '' ? 0 : Number(form.current_value),
      q1_target: form.q1_target === '' ? null : Number(form.q1_target),
      q2_target: form.q2_target === '' ? null : Number(form.q2_target),
      q3_target: form.q3_target === '' ? null : Number(form.q3_target),
      q4_target: form.q4_target === '' ? null : Number(form.q4_target),
    }
    onSave(payload)
  }

  return (
    <ModalShell title={kpi ? 'Edit KPI' : 'New KPI'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Name *">
          <input autoFocus required value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className={inputCls} />
        </Field>
        <Field label="Description">
          <textarea value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            rows={2} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Level">
            <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value, team: '' })}
              className={inputCls}>
              {allowedLevels.map(lv => (
                <option key={lv} value={lv}>
                  {lv === 'brand' ? 'Brand' : lv === 'team' ? 'Team' : lv}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Year">
            <input type="number" value={form.year}
              onChange={e => setForm({ ...form, year: e.target.value })}
              className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Brand">
            <select value={form.brand || ''} onChange={e => setForm({ ...form, brand: e.target.value })} className={inputCls}>
              {form.level === 'team' && <option value="">— Any / cross-brand —</option>}
              {writableBrandsForLevel(scopes, form.level).map(b => (
                <option key={b} value={b}>{b === 'KC' ? 'KC · Shared' : b}</option>
              ))}
            </select>
          </Field>
          {form.level === 'team' ? (
            <Field label="Team *">
              <select required value={form.team || ''}
                onChange={e => setForm({ ...form, team: e.target.value })}
                className={inputCls}>
                <option value="">— Select team —</option>
                {writableTeams(scopes, form.brand).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          ) : <div />}
        </div>
        <Field label="Owner">
          <select value={form.owner_id} onChange={e => setForm({ ...form, owner_id: e.target.value })} className={inputCls}>
            <option value="">— Select owner —</option>
            {(members || []).filter(m => m.profile_id).map(m => (
              <option key={m.profile_id} value={m.profile_id}>{m.nickname || m.name} {m.position || ''}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Current value">
            <input type="number" step="any" value={form.current_value}
              onChange={e => setForm({ ...form, current_value: e.target.value })}
              className={inputCls} />
          </Field>
          <Field label="Target value *">
            <input type="number" step="any" required value={form.target_value}
              onChange={e => setForm({ ...form, target_value: e.target.value })}
              className={inputCls} />
          </Field>
          <Field label="Unit">
            <input placeholder="฿ / members / %" value={form.target_unit}
              onChange={e => setForm({ ...form, target_unit: e.target.value })}
              className={inputCls} />
          </Field>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#B7A99D] mb-1.5">Quarterly milestones (optional)</p>
          <div className="grid grid-cols-4 gap-2">
            {['q1_target','q2_target','q3_target','q4_target'].map((k, i) => (
              <Field key={k} label={`Q${i+1}`}>
                <input type="number" step="any" value={form[k]}
                  onChange={e => setForm({ ...form, [k]: e.target.value })}
                  className={inputCls} />
              </Field>
            ))}
          </div>
        </div>
        <ModalActions onClose={onClose} submitLabel={kpi ? 'Save changes' : 'Create KPI'} />
      </form>
    </ModalShell>
  )
}

// ==========================================================
// OKR Form Modal
// ==========================================================
function OkrFormModal({ objective, year: defaultYear, quarter: defaultQuarter, members, levelSelection, viewMode, currentProfile, isAdmin, brandOwners, teamLeads, supabase, onSave, onClose }) {
  const isIndividual = viewMode === 'mine' || objective?.level === 'individual'

  // Compute the user's writable scopes (which levels/brands/teams)
  const scopes = useMemo(() => getWritableScopes({ profile: currentProfile, brandOwners, teamLeads }), [currentProfile, brandOwners, teamLeads])
  const [form, setForm] = useState({
    title: objective?.title || '',
    description: objective?.description || '',
    level: objective?.level || (isIndividual ? 'individual' : (levelSelection?.level || 'brand')),
    // Prefer the current view's brand → then the user's own squad (right default
    // for brand-scoped team leads like Marketing-grubby) → finally KC.
    brand: objective?.brand || levelSelection?.brand || currentProfile?.squad || 'KC',
    team: objective?.team || levelSelection?.team || (isIndividual ? (currentProfile?.team || '') : ''),
    year: objective?.year || defaultYear,
    quarter: objective?.is_annual ? 'annual' : (objective?.quarter || (defaultQuarter === 'annual' ? 1 : defaultQuarter)),
    owner_id: objective?.owner_id || (isIndividual ? currentProfile?.id : ''),
    parent_objective_id: objective?.parent_objective_id || '',
    parent_kr_id: objective?.parent_kr_id || '',
    tags: objective?.tags || [],
    is_private: objective?.is_private ?? isIndividual,
  })
  const [parentCandidates, setParentCandidates] = useState([])

  // Fetch parent candidates when level/brand changes
  useEffect(() => {
    if (!supabase) return
    if (form.level === 'individual') {
      fetchIndividualParentCandidates(supabase, {
        year: form.year,
        quarter: form.quarter,
        userTeam: currentProfile?.team,
        userSquad: currentProfile?.squad,
      }).then(setParentCandidates).catch(err => console.error(err))
    } else {
      fetchParentCandidates(supabase, {
        year: form.year, quarter: form.quarter, level: form.level,
        brand: form.brand,
      }).then(setParentCandidates).catch(err => console.error(err))
    }
  }, [supabase, form.level, form.brand, form.year, form.quarter, currentProfile?.team, currentProfile?.squad])
  const [krs, setKrs] = useState(() => {
    const existing = objective?.key_results
    if (existing && existing.length > 0) {
      return existing.map(kr => ({
        title: kr.title,
        kr_type: kr.kr_type || 'numeric',
        start_value: kr.start_value ?? 0,
        target_value: kr.target_value ?? '',
        current_value: kr.current_value ?? 0,
        unit: kr.unit || '',
        owner_id: kr.owner_id || '',
      }))
    }
    return [newBlankKr()]
  })

  const toggleTag = (tag) => {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag]
    }))
  }

  const updateKr = (idx, patch) => {
    setKrs(prev => prev.map((kr, i) => i === idx ? { ...kr, ...patch } : kr))
  }

  const addKr = () => setKrs(prev => [...prev, newBlankKr()])
  const removeKr = (idx) => setKrs(prev => prev.filter((_, i) => i !== idx))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.owner_id) return
    const validKrs = krs.filter(k => k.title.trim())
    if (validKrs.length === 0) { alert('Add at least one Key Result'); return }

    const isAnnual = form.quarter === 'annual'
    onSave({
      objective: {
        title: form.title.trim(),
        description: form.description || null,
        level: form.level,
        brand: (form.level === 'team' || form.level === 'individual') && !form.brand ? null : form.brand,
        team: (form.level === 'team' || form.level === 'individual') ? (form.team || null) : null,
        year: Number(form.year),
        quarter: isAnnual ? null : Number(form.quarter),
        is_annual: isAnnual,
        owner_id: form.owner_id,
        parent_objective_id: form.parent_objective_id || null,
        parent_kr_id: form.parent_kr_id || null,
        tags: form.tags,
        is_private: form.level === 'individual' ? true : false,
      },
      keyResults: validKrs.map(kr => ({
        title: kr.title.trim(),
        kr_type: kr.kr_type,
        start_value: kr.start_value === '' ? 0 : Number(kr.start_value),
        target_value: kr.target_value === '' ? null : Number(kr.target_value),
        current_value: kr.current_value === '' ? 0 : Number(kr.current_value),
        unit: kr.unit || null,
        owner_id: kr.owner_id || null,
      })),
    })
  }

  return (
    <ModalShell title={objective ? 'Edit objective' : 'New objective'} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Title *">
          <input autoFocus required value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Establish brand presence in hero markets"
            className={inputCls} />
        </Field>
        <Field label="Description">
          <textarea value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            rows={2} className={inputCls} />
        </Field>
        {/* Level selector — restricted to user's writable scopes */}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Level">
            <select
              value={form.level}
              onChange={e => setForm({ ...form, level: e.target.value, parent_objective_id: '', team: '' })}
              disabled={isIndividual /* individual mode is hardcoded; non-admins can still change between their writable levels */}
              className={inputCls}>
              {writableLevels(scopes).map(lv => (
                <option key={lv} value={lv}>
                  {lv === 'brand' ? 'Brand' : lv === 'team' ? 'Team' : 'Individual (private)'}
                </option>
              ))}
            </select>
          </Field>
          {/* Brand dropdown — only show brands user has access to */}
          {(() => {
            const allowedBrands = writableBrandsForLevel(scopes, form.level)
            const allowEmpty = (form.level === 'team' || form.level === 'individual')
            return (
              <Field label={allowEmpty ? 'Brand (optional)' : 'Brand'}>
                <select value={form.brand || ''} onChange={e => setForm({ ...form, brand: e.target.value })} className={inputCls}>
                  {allowEmpty && <option value="">— Any / cross-brand —</option>}
                  {allowedBrands.map(b => (
                    <option key={b} value={b}>{b === 'KC' ? 'KC · Shared' : b}</option>
                  ))}
                </select>
              </Field>
            )
          })()}
          {form.level === 'team' ? (
            <Field label="Team *">
              <select required value={form.team}
                onChange={e => setForm({ ...form, team: e.target.value })}
                className={inputCls}>
                <option value="">— Select team —</option>
                {(() => {
                  // Allowed teams based on the brand we're writing for
                  const allowed = writableTeams(scopes, form.brand)
                  // Group by chapter for readability
                  const byChapter = {}
                  allowed.forEach(t => {
                    const ch = TEAM_TO_CHAPTER[t] || 'Other'
                    if (!byChapter[ch]) byChapter[ch] = []
                    byChapter[ch].push(t)
                  })
                  return Object.entries(byChapter).map(([chapter, teams]) => (
                    <optgroup key={chapter} label={chapter}>
                      {teams.map(t => <option key={t} value={t}>{t}</option>)}
                    </optgroup>
                  ))
                })()}
              </select>
            </Field>
          ) : <div /> }
        </div>

        {/* Parent OKR / KR picker — brand level has no parents */}
        {form.level !== 'brand' && (
          <Field label="Cascades from (parent OKR or KR)">
            <select
              value={form.parent_kr_id ? `kr:${form.parent_kr_id}` : (form.parent_objective_id ? `o:${form.parent_objective_id}` : '')}
              onChange={e => {
                const v = e.target.value
                if (!v) { setForm({ ...form, parent_objective_id: '', parent_kr_id: '' }); return }
                if (v.startsWith('kr:')) {
                  const krId = v.slice(3)
                  // Find the objective that owns this KR
                  const parentObj = parentCandidates.find(p => (p.key_results || []).some(k => k.id === krId))
                  setForm({ ...form, parent_kr_id: krId, parent_objective_id: parentObj?.id || '' })
                } else if (v.startsWith('o:')) {
                  setForm({ ...form, parent_objective_id: v.slice(2), parent_kr_id: '' })
                }
              }}
              className={inputCls}>
              <option value="">— None (standalone) —</option>
              {parentCandidates.map(p => {
                const tag = p.level === 'brand' ? (p.brand || 'Brand') : p.level.charAt(0).toUpperCase() + p.level.slice(1)
                const ownerSuffix = p.owner?.nickname ? ` (${p.owner.nickname})` : ''
                return (
                  <optgroup key={p.id} label={`[${tag}] ${p.title}${ownerSuffix}`}>
                    <option value={`o:${p.id}`}>→ Whole Objective: {p.title}</option>
                    {(p.key_results || []).map((kr, idx) => (
                      <option key={kr.id} value={`kr:${kr.id}`}>
                        → KR{idx + 1}: {kr.title}{kr.target_value != null ? ` (target ${kr.target_value}${kr.unit ? ' ' + kr.unit : ''})` : ''}
                      </option>
                    ))}
                  </optgroup>
                )
              })}
            </select>
            <p className="text-[9px] text-[#B7A99D] mt-1">
              Tip: cascade to a specific <strong>KR</strong> for sharper line of sight. "Whole Objective" is fine for strategic support.
            </p>
          </Field>
        )}

        <div className="grid grid-cols-3 gap-3">
          <Field label="Year">
            <input type="number" value={form.year}
              onChange={e => setForm({ ...form, year: e.target.value })}
              className={inputCls} />
          </Field>
          <Field label="Quarter">
            <select value={form.quarter} onChange={e => setForm({ ...form, quarter: e.target.value === 'annual' ? 'annual' : Number(e.target.value) })} className={inputCls}>
              <option value={1}>Q1</option>
              <option value={2}>Q2</option>
              <option value={3}>Q3</option>
              <option value={4}>Q4</option>
              <option value="annual">Annual</option>
            </select>
          </Field>
          <Field label="Owner *">
            <select required value={form.owner_id} onChange={e => setForm({ ...form, owner_id: e.target.value })} className={inputCls}>
              <option value="">— Select —</option>
              {(members || []).filter(m => m.profile_id).map(m => (
                <option key={m.profile_id} value={m.profile_id}>{m.nickname || m.name}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Tags">
          <div className="flex gap-1.5 flex-wrap">
            {['Must-win','Stretch','Experiment'].map(tag => {
              const active = form.tags.includes(tag)
              const t = TAG_CHIP[tag]
              return (
                <button type="button" key={tag} onClick={() => toggleTag(tag)}
                  className={`text-[11px] px-3 py-1 rounded-full border transition-colors ${
                    active
                      ? 'border-[#2C2C2A] bg-[#2C2C2A] text-[#DFDDD9]'
                      : 'border-[rgba(0,0,0,0.1)] text-[#9B8C82] hover:bg-[rgba(0,0,0,0.03)]'
                  }`}>
                  {tag}
                </button>
              )
            })}
          </div>
        </Field>

        {/* Key Results */}
        <div className="pt-3 border-t border-[rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider text-[#B7A99D]">Key Results *</p>
            <button type="button" onClick={addKr} className="text-[11px] text-[#2C2C2A] hover:underline">+ Add KR</button>
          </div>
          <div className="space-y-2">
            {krs.map((kr, idx) => (
              <div key={idx} className="bg-[rgba(0,0,0,0.02)] border border-[rgba(0,0,0,0.04)] rounded-lg p-2.5 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-[#9B8C82] font-medium mt-1 w-8 flex-shrink-0">KR{idx+1}</span>
                  <input required value={kr.title}
                    placeholder="Measurable outcome statement"
                    onChange={e => updateKr(idx, { title: e.target.value })}
                    className={`${inputCls} flex-1`} />
                  {krs.length > 1 && (
                    <button type="button" onClick={() => removeKr(idx)}
                      className="text-[#A32D2D] text-[11px] px-1.5" title="Remove">✕</button>
                  )}
                </div>
                <div className="pl-10 grid grid-cols-2 md:grid-cols-5 gap-2">
                  <Field label="Type" small>
                    <select value={kr.kr_type} onChange={e => updateKr(idx, { kr_type: e.target.value })} className={smallInputCls}>
                      <option value="numeric">Number</option>
                      <option value="percentage">%</option>
                      <option value="currency">Currency</option>
                      <option value="binary">Yes/No</option>
                      <option value="milestone">Milestone</option>
                    </select>
                  </Field>
                  <Field label="Start" small>
                    <input type="number" step="any" value={kr.start_value}
                      onChange={e => updateKr(idx, { start_value: e.target.value })}
                      className={smallInputCls} />
                  </Field>
                  <Field label="Target" small>
                    <input type="number" step="any" value={kr.target_value}
                      onChange={e => updateKr(idx, { target_value: e.target.value })}
                      className={smallInputCls} />
                  </Field>
                  <Field label="Unit" small>
                    <input value={kr.unit} onChange={e => updateKr(idx, { unit: e.target.value })}
                      placeholder="฿/%/users" className={smallInputCls} />
                  </Field>
                  <Field label="Owner" small>
                    <select value={kr.owner_id} onChange={e => updateKr(idx, { owner_id: e.target.value })} className={smallInputCls}>
                      <option value="">—</option>
                      {(members || []).filter(m => m.profile_id).map(m => (
                        <option key={m.profile_id} value={m.profile_id}>{m.nickname || m.name}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </div>

        <ModalActions onClose={onClose} submitLabel={objective ? 'Save changes' : 'Create objective'} />
      </form>
    </ModalShell>
  )
}

function newBlankKr() {
  return { title: '', kr_type: 'numeric', start_value: 0, target_value: '', current_value: 0, unit: '', owner_id: '' }
}

// ---------- Modal primitives ----------
const inputCls = 'w-full text-[12.5px] text-[#2C2C2A] bg-[#F5F3EF] border border-[rgba(0,0,0,0.08)] rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#2C2C2A]'
const smallInputCls = 'w-full text-[11px] text-[#2C2C2A] bg-[#F5F3EF] border border-[rgba(0,0,0,0.08)] rounded px-2 py-1 focus:outline-none focus:border-[#2C2C2A]'

function Field({ label, children, small }) {
  return (
    <label className="block">
      <p className={`${small ? 'text-[9.5px]' : 'text-[10px]'} uppercase tracking-wider text-[#B7A99D] mb-1`}>{label}</p>
      {children}
    </label>
  )
}

function ModalShell({ title, children, onClose, wide }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4">
      <div className={`bg-[#DFDDD9] rounded-xl shadow-xl my-8 ${wide ? 'max-w-2xl' : 'max-w-md'} w-full`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(0,0,0,0.06)]">
          <h2 className="text-[14px] font-medium text-[#2C2C2A]">{title}</h2>
          <button onClick={onClose} className="text-[#9B8C82] hover:text-[#2C2C2A] text-[16px]">×</button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  )
}

function ModalActions({ onClose, submitLabel }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button type="button" onClick={onClose}
        className="text-[12px] px-4 py-1.5 border border-[rgba(0,0,0,0.08)] text-[#9B8C82] rounded-md hover:bg-[rgba(0,0,0,0.03)]">
        Cancel
      </button>
      <button type="submit"
        className="text-[12px] px-4 py-1.5 bg-[#2C2C2A] text-[#DFDDD9] rounded-md hover:bg-[#3D3D3A] font-medium">
        {submitLabel}
      </button>
    </div>
  )
}

// ============================================================
// Phase 3: My OKRs view
// ============================================================
// Local alias kept so the ~3 inline JSX call sites below don't need rewiring.
// New code should import ApprovalStatusPill directly. Section 8 of the brief.
const ApprovalBadge = ApprovalStatusPill

function MyOkrsView({ profile, objectives, year, quarter, expandedOkrs, onToggleExpand, onAdd, onEdit, onDelete, onRequestApproval, onViewTree, onCheckInKr, onReflect, latestCheckIns, checkInsByKr, reflectionsByObjective, onSeeBrand }) {
  const pendingCount = objectives.filter(o => o.approval_status === 'pending_approval').length
  const managerName = profile?.manager_nickname || 'your manager'
  const hasManager = !!profile?.manager_id

  return (
    <div className="px-[18px] pt-[14px] pb-8">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
        <div>
          <h2 className="text-[14px] font-medium text-[#2C2C2A]">
            My OKRs · {quarter === 'annual' ? 'Annual' : `Q${quarter}`} {year}
          </h2>
          <p className="text-[10.5px] text-[#9B8C82] mt-0.5">
            {profile?.nickname || 'You'} · Private — visible to you, your manager, and the People team
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="text-[10.5px] text-[#854F0B]">{pendingCount} pending approval</span>
          )}
          <button onClick={onAdd}
            className="text-[10.5px] px-3 py-1.5 bg-[#2C2C2A] text-[#DFDDD9] rounded-full hover:bg-[#3D3D3A]">
            + Add objective
          </button>
        </div>
      </div>

      {!hasManager && (
        <div className="mb-3 bg-[rgba(186,117,23,0.08)] border border-[rgba(186,117,23,0.2)] rounded-lg px-3 py-2 text-[11px] text-[#854F0B]">
          ⚠ You don't have a manager assigned. Ask an admin to set one in /settings/org so you can request approval.
        </div>
      )}

      {objectives.length === 0 ? (
        <OnboardingEmptyState
          profile={profile}
          onWriteFirst={onAdd}
          onSeeBrand={onSeeBrand}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {objectives.map(obj => (
            <MyObjectiveCard key={obj.id} obj={obj}
              expanded={!!expandedOkrs[obj.id]}
              onToggle={() => onToggleExpand(obj.id)}
              onEdit={onEdit} onDelete={onDelete}
              onRequestApproval={onRequestApproval}
              onViewTree={onViewTree}
              onCheckInKr={onCheckInKr}
              onReflect={onReflect}
              latestCheckIns={latestCheckIns}
              checkInsByKr={checkInsByKr}
              reflection={reflectionsByObjective?.[obj.id]} />
          ))}
        </div>
      )}
    </div>
  )
}

function MyObjectiveCard({ obj, expanded, onToggle, onEdit, onDelete, onRequestApproval, onViewTree, onCheckInKr, onReflect, latestCheckIns, checkInsByKr, reflection }) {
  const pct = calcObjectivePercent(obj)
  const color = progressColor(pct)
  const status = obj.approval_status || 'draft'
  const canEdit = status === 'draft' || status === 'changes_requested'
  const canDelete = status === 'draft' || status === 'changes_requested'

  return (
    <div className="bg-[#F5F3EF] border border-[rgba(0,0,0,0.04)] rounded-[10px] px-[14px] py-[12px]">
      <div className="flex items-start gap-3">
        <button onClick={onToggle} className="text-[11px] text-[#9B8C82] mt-0.5 w-4 flex-shrink-0">
          <span className={`inline-block transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
        </button>
        <div className="flex-1 min-w-0">
          {obj.parent_objective_id && (
            <button onClick={(e) => { e.stopPropagation(); onViewTree?.(obj.id) }}
              className="text-[10px] text-[#378ADD] mb-0.5 hover:underline flex items-center gap-1">
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M6 10V2m0 0l-3 3m3-3l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              {obj.parent_kr_id ? 'Cascades from a parent KR' : 'Cascades from parent objective'} · View tree
            </button>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[12.5px] font-medium text-[#2C2C2A] leading-[1.4]">{obj.title}</p>
            <ApprovalBadge status={status} />
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[15px] font-medium" style={{ color }}>{pct}%</p>
          <p className="text-[9px] text-[#B7A99D]">{obj.key_results?.length || 0} KRs</p>
        </div>
      </div>

      {status === 'changes_requested' && obj.change_request_note && (
        <div className="mt-2 bg-[rgba(186,117,23,0.08)] border border-[rgba(186,117,23,0.2)] rounded-md px-3 py-2">
          <p className="text-[10px] font-medium text-[#854F0B] mb-0.5 uppercase tracking-wider">Manager note</p>
          <p className="text-[11.5px] text-[#2C2C2A]">{obj.change_request_note}</p>
        </div>
      )}

      <div className="h-[4px] bg-[rgba(0,0,0,0.04)] rounded-full mt-2 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>

      {expanded && (
        <div className="mt-3 pl-7">
          <div className="space-y-1.5">
            {(obj.key_results || []).map((kr, idx) => {
              const krPct = calcKrPercent(kr)
              const krColor = progressColor(krPct)
              const latestCi = latestCheckIns?.[kr.id]
              const lowConfWarning = latestCi?.confidence && latestCi.confidence <= 2 && krPct >= 70
              const krHistory = checkInsByKr?.[kr.id]
              return (
                <div key={kr.id} className="bg-[rgba(255,255,255,0.5)] rounded-md px-2.5 py-2 flex items-start gap-2.5 group/kr">
                  <span className="text-[10px] text-[#9B8C82] font-medium w-8 flex-shrink-0">KR{idx+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11.5px] text-[#2C2C2A] leading-tight">{kr.title}</p>
                    {latestCi && (
                      <p className="text-[9.5px] text-[#B7A99D] mt-0.5 flex items-center gap-1">
                        Conf {latestCi.confidence}/5
                        {lowConfWarning && (
                          <span className="inline-block w-[6px] h-[6px] rounded-full bg-[#BA7517]" title="Low confidence despite high progress — may be at risk" />
                        )}
                        {latestCi.week_of && <>· {new Date(latestCi.week_of).toLocaleDateString()}</>}
                      </p>
                    )}
                    {krHistory && krHistory.length >= 2 && (
                      <div className="mt-1"><KrSparkline checkIns={krHistory} kr={kr} /></div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-[60px] h-[3px] bg-[rgba(0,0,0,0.04)] rounded-full overflow-hidden">
                      <div className="h-full" style={{ width: `${krPct}%`, background: krColor }} />
                    </div>
                    <span className="text-[10.5px] font-medium" style={{ color: krColor }}>{krPct}%</span>
                    {onCheckInKr && (
                      <button onClick={() => onCheckInKr(kr, obj)}
                        title="Check in on this KR"
                        className="text-[10px] px-2 py-0.5 bg-[#2C2C2A] text-[#DFDDD9] rounded-full sm:opacity-0 sm:group-hover/kr:opacity-100 transition-opacity">
                        Check in
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {/* Reflection badge */}
          {reflection?.finalized_at && (
            <p className="text-[10px] text-[#3B6D11] mt-2">✓ Reflection finalized on {new Date(reflection.finalized_at).toLocaleDateString()}</p>
          )}
          {reflection && !reflection.finalized_at && reflection.self_submitted_at && (
            <p className="text-[10px] text-[#854F0B] mt-2">Self reflection submitted — awaiting manager review</p>
          )}
          {/* Actions */}
          <div className="flex gap-2 pt-2 items-center flex-wrap">
            {status === 'draft' && (
              <button onClick={() => onRequestApproval(obj)}
                className="text-[10.5px] px-3 py-1.5 bg-[#2C2C2A] text-[#DFDDD9] rounded-md hover:bg-[#3D3D3A] font-medium">
                Request approval
              </button>
            )}
            {status === 'pending_approval' && (
              <span className="text-[10.5px] text-[#9B8C82] italic">Waiting for manager approval…</span>
            )}
            {status === 'changes_requested' && (
              <button onClick={() => onEdit(obj)}
                className="text-[10.5px] px-3 py-1.5 bg-[#2C2C2A] text-[#DFDDD9] rounded-md hover:bg-[#3D3D3A] font-medium">
                Edit &amp; resubmit
              </button>
            )}
            {status === 'approved' && (
              <span className="text-[10.5px] text-[#3B6D11] flex items-center gap-1">
                🔒 Approved{obj.approved_at ? ` on ${new Date(obj.approved_at).toLocaleDateString()}` : ''}
              </span>
            )}
            {status === 'approved' && onReflect && !reflection?.finalized_at && (
              <button onClick={() => onReflect(obj)}
                className="text-[10.5px] px-3 py-1.5 border border-[#378ADD] text-[#185FA5] rounded-md hover:bg-[rgba(55,138,221,0.06)]">
                {reflection?.self_submitted_at ? 'Edit reflection' : 'Reflect'}
              </button>
            )}
            <div className="ml-auto flex gap-2">
              {canEdit && (
                <button onClick={() => onEdit(obj)}
                  className="text-[10px] px-2 py-1 border border-[rgba(0,0,0,0.08)] text-[#2C2C2A] rounded-md hover:bg-[rgba(0,0,0,0.03)]">
                  Edit
                </button>
              )}
              {canDelete && (
                <button onClick={() => onDelete(obj.id)}
                  className="text-[10px] px-2 py-1 text-[#A32D2D] rounded-md hover:bg-[rgba(163,45,45,0.06)]">
                  Delete
                </button>
              )}
              {obj.parent_objective_id && (
                <button onClick={() => onViewTree?.(obj.id)}
                  className="text-[10px] text-[#378ADD] hover:underline">
                  Cascade tree
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Phase 3: Team I Manage view
// ============================================================
function TeamManageView({ reports, objectives, year, quarter, expandedOkrs, onToggleExpand, onApprove, onRequestChanges, onViewTree, onReflect, latestCheckIns, checkInsByKr, reflectionsByObjective }) {
  const pendingCount = objectives.filter(o => o.approval_status === 'pending_approval').length
  const [selectedReportId, setSelectedReportId] = useState(null)
  // changesNote modal removed — Request changes is now an inline expansion
  // inside ReportOkrCard (Section 8 of the brief).

  const byReport = useMemo(() => {
    const map = {}
    reports.forEach(r => { map[r.id] = [] })
    objectives.forEach(o => {
      if (map[o.owner_id]) map[o.owner_id].push(o)
    })
    return map
  }, [reports, objectives])

  return (
    <div className="px-[18px] pt-[14px] pb-8">
      <div className="mb-3">
        <h2 className="text-[14px] font-medium text-[#2C2C2A]">Team I manage</h2>
        <p className="text-[10.5px] text-[#9B8C82] mt-0.5">{reports.length} direct report{reports.length !== 1 ? 's' : ''}</p>
      </div>

      {pendingCount > 0 && (
        <div className="mb-3 bg-[rgba(186,117,23,0.08)] border border-[rgba(186,117,23,0.2)] rounded-lg px-3 py-2 flex items-center justify-between">
          <p className="text-[11px] text-[#854F0B]">⚠ {pendingCount} OKR{pendingCount !== 1 ? 's' : ''} pending your approval</p>
        </div>
      )}

      {reports.length === 0 ? (
        <p className="text-[11px] text-[#B7A99D] italic">No direct reports.</p>
      ) : (
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {reports.map(r => {
            const rpOkrs = byReport[r.id] || []
            const rpPending = rpOkrs.filter(o => o.approval_status === 'pending_approval').length
            const overall = rpOkrs.length === 0 ? 0 : Math.round(rpOkrs.reduce((s, o) => s + calcObjectivePercent(o), 0) / rpOkrs.length)
            const color = progressColor(overall)
            const isSelected = selectedReportId === r.id
            return (
              <button key={r.id}
                onClick={() => setSelectedReportId(isSelected ? null : r.id)}
                className={`text-left bg-[#F5F3EF] border rounded-[10px] px-3 py-2.5 transition-colors ${isSelected ? 'border-[#2C2C2A]' : 'border-[rgba(0,0,0,0.04)] hover:bg-[rgba(0,0,0,0.015)]'}`}>
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] text-white font-medium flex-shrink-0"
                    style={{ background: r.avatar_color || '#9B8C82' }}>
                    {(r.nickname || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#2C2C2A] truncate">
                      {r.nickname}{r.position_title && <span className="text-[#9B8C82] font-normal"> {r.position_title}</span>}
                    </p>
                    <p className="text-[10px] text-[#B7A99D] truncate">
                      {r.squad || '—'} · {r.team || '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-[#9B8C82]">{rpOkrs.length} OKRs</span>
                  {rpOkrs.length > 0 && (
                    <span className="text-[10px] font-medium" style={{ color }}>Overall {overall}%</span>
                  )}
                  {rpPending > 0 && (
                    <span className="text-[9.5px] px-1.5 py-0.5 rounded-full ml-auto" style={{ background: 'rgba(186,117,23,0.10)', color: '#854F0B' }}>
                      {rpPending} pending
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Expanded OKR list for selected report */}
      {selectedReportId && (
        <div className="mt-5">
          <h3 className="text-[9.5px] uppercase tracking-[1px] text-[#9B8C82] font-medium mb-2">
            {reports.find(r => r.id === selectedReportId)?.nickname || 'Report'}'s OKRs
          </h3>
          {(byReport[selectedReportId] || []).length === 0 ? (
            <p className="text-[11px] text-[#B7A99D] italic">No OKRs for this quarter.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {(byReport[selectedReportId] || []).map(obj => (
                <ReportOkrCard key={obj.id} obj={obj}
                  expanded={!!expandedOkrs[obj.id]}
                  onToggle={() => onToggleExpand(obj.id)}
                  onApprove={onApprove}
                  onRequestChanges={onRequestChanges}
                  onViewTree={onViewTree}
                  onReflect={onReflect}
                  checkInsByKr={checkInsByKr}
                  reflection={reflectionsByObjective?.[obj.id]} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Request Changes — moved inline into ReportOkrCard (Section 8) */}
    </div>
  )
}

function ReportOkrCard({ obj, expanded, onToggle, onApprove, onRequestChanges, onViewTree, onReflect, checkInsByKr, reflection }) {
  const pct = calcObjectivePercent(obj)
  const color = progressColor(pct)
  const status = obj.approval_status || 'draft'
  const isPending = status === 'pending_approval'

  return (
    <div className={`bg-[#F5F3EF] border rounded-[10px] px-[14px] py-[12px] ${isPending ? 'border-[rgba(186,117,23,0.3)]' : 'border-[rgba(0,0,0,0.04)]'}`}>
      <div className="flex items-start gap-3">
        <button onClick={onToggle} className="text-[11px] text-[#9B8C82] mt-0.5 w-4 flex-shrink-0">
          <span className={`inline-block transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[12.5px] font-medium text-[#2C2C2A] leading-[1.4]">{obj.title}</p>
            <ApprovalBadge status={status} />
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[15px] font-medium" style={{ color }}>{pct}%</p>
          <p className="text-[9px] text-[#B7A99D]">{obj.key_results?.length || 0} KRs</p>
        </div>
      </div>

      <div className="h-[4px] bg-[rgba(0,0,0,0.04)] rounded-full mt-2 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>

      {expanded && (
        <div className="mt-3 pl-7">
          <div className="space-y-1.5">
            {(obj.key_results || []).map((kr, idx) => {
              const krPct = calcKrPercent(kr)
              const krColor = progressColor(krPct)
              const krHistory = checkInsByKr?.[kr.id]
              return (
                <div key={kr.id} className="bg-[rgba(255,255,255,0.5)] rounded-md px-2.5 py-2 flex items-start gap-2.5">
                  <span className="text-[10px] text-[#9B8C82] font-medium w-8 flex-shrink-0">KR{idx+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11.5px] text-[#2C2C2A] leading-tight">{kr.title}</p>
                    {krHistory && krHistory.length >= 2 && (
                      <div className="mt-1"><KrSparkline checkIns={krHistory} kr={kr} /></div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-[60px] h-[3px] bg-[rgba(0,0,0,0.04)] rounded-full overflow-hidden">
                      <div className="h-full" style={{ width: `${krPct}%`, background: krColor }} />
                    </div>
                    <span className="text-[10.5px] font-medium" style={{ color: krColor }}>{krPct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
          {isPending && (
            <ManagerReviewActions
              obj={obj}
              onApprove={onApprove}
              onRequestChanges={onRequestChanges}
              onViewTree={onViewTree}
            />
          )}
          {/* Manager reflection */}
          {status === 'approved' && onReflect && !reflection?.finalized_at && (
            <div className="pt-2">
              <button onClick={() => onReflect(obj)}
                className="text-[10.5px] px-3 py-1.5 border border-[#378ADD] text-[#185FA5] rounded-md hover:bg-[rgba(55,138,221,0.06)]">
                {reflection?.manager_submitted_at ? 'Edit review' : (reflection?.self_submitted_at ? 'Review reflection' : 'Add review')}
              </button>
            </div>
          )}
          {reflection?.finalized_at && (
            <p className="text-[10px] text-[#3B6D11] mt-2">✓ Reflection finalized</p>
          )}
        </div>
      )}
    </div>
  )
}

// Inline manager review actions — Approve / Request changes (with
// expanding textarea). Section 8 of the brief replaces the previous
// modal-based "Request changes" flow.
function ManagerReviewActions({ obj, onApprove, onRequestChanges, onViewTree }) {
  const [showChanges, setShowChanges] = useState(false)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleApprove = async () => {
    setSubmitting(true)
    try { await onApprove(obj) } finally { setSubmitting(false) }
  }
  const handleSend = async () => {
    if (!note.trim()) return
    setSubmitting(true)
    try {
      await onRequestChanges(obj, note.trim())
      setShowChanges(false); setNote('')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="pt-2 space-y-2">
      <div className="flex gap-2 items-center flex-wrap">
        <button
          onClick={handleApprove}
          disabled={submitting}
          className="text-[10.5px] px-3 py-1.5 bg-[#639922] text-white rounded-md hover:bg-[#557F1B] font-medium disabled:opacity-50">
          ✓ Approve
        </button>
        <button
          onClick={() => setShowChanges(v => !v)}
          className={`text-[10.5px] px-3 py-1.5 border rounded-md font-medium ${
            showChanges
              ? 'bg-ss-muted border-ss-divider text-ss-text'
              : 'border-[rgba(0,0,0,0.1)] text-[#2C2C2A] hover:bg-[rgba(0,0,0,0.03)]'
          }`}>
          {showChanges ? 'Cancel changes' : 'Request changes'}
        </button>
        {obj.parent_objective_id && (
          <button onClick={() => onViewTree?.(obj.id)}
            className="text-[10px] text-[#378ADD] hover:underline ml-auto self-center">
            Cascade tree
          </button>
        )}
      </div>
      {showChanges && (
        <div className="bg-ss-muted rounded-md p-3 space-y-2">
          <p className="text-[10.5px] text-ss-muted-text">
            What needs to change before this can be approved?
          </p>
          <textarea
            autoFocus
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            placeholder="e.g. KR2 is too vague — make it measurable with a specific target."
            className="w-full text-[12px] border border-ss-divider rounded-md px-2.5 py-2 bg-ss-page text-ss-text placeholder-ss-hint focus:outline-none focus:border-ss-text"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setShowChanges(false); setNote('') }}
              className="text-[10.5px] px-3 py-1.5 text-ss-muted-text hover:text-ss-text">
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={!note.trim() || submitting}
              className="text-[10.5px] px-3 py-1.5 bg-ss-text text-ss-page rounded-md font-medium disabled:opacity-50">
              Send request
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Small lock SVG used by view-only badges. Section 5.
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
