// Data access layer for OKR & KPI (Phase 1)
// Schema: kpis (level/brand/year/quarterly targets), objectives (level/quarter),
// key_results (kr_type, start/target/current).

// ===== KPIs =====
export async function fetchKpis(supabase, { year, level = 'brand', brand = null, team = null } = {}) {
  let q = supabase
    .from('kpis')
    .select('*, owner:profiles!owner_id(id, nickname, position, avatar_color, avatar_url)')
    .eq('year', year)
    .eq('level', level)
    .order('created_at', { ascending: true })
  if (brand) q = q.eq('brand', brand)
  if (team) q = q.eq('team', team)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function createKpi(supabase, payload) {
  const { data, error } = await supabase
    .from('kpis')
    .insert(payload)
    .select('*, owner:profiles!owner_id(id, nickname, position, avatar_color, avatar_url)')
    .single()
  if (error) throw error
  return data
}

export async function updateKpi(supabase, kpiId, updates) {
  const { data, error } = await supabase
    .from('kpis')
    .update({ ...updates, last_updated_at: new Date().toISOString() })
    .eq('id', kpiId)
    .select('*, owner:profiles!owner_id(id, nickname, position, avatar_color, avatar_url)')
    .single()
  if (error) throw error
  return data
}

export async function deleteKpi(supabase, kpiId) {
  const { error } = await supabase.from('kpis').delete().eq('id', kpiId)
  if (error) throw error
}

// ===== Objectives =====
export async function fetchObjectives(supabase, { year, quarter, level = 'brand', brand = null, team = null } = {}) {
  let q = supabase
    .from('objectives')
    .select('*, owner:profiles!owner_id(id, nickname, position, avatar_color, avatar_url), key_results!objective_id(*, owner:profiles!owner_id(id, nickname, position, avatar_color, avatar_url))')
    .eq('year', year)
    .eq('level', level)
    .order('created_at', { ascending: true })

  // Annual objectives are relevant in every quarter — include them when filtering to a specific Q
  if (quarter === 'annual') {
    q = q.eq('is_annual', true)
  } else if (typeof quarter === 'number') {
    q = q.or(`is_annual.eq.true,and(is_annual.eq.false,quarter.eq.${quarter})`)
  }

  if (brand) q = q.eq('brand', brand)
  if (team) q = q.eq('team', team)

  const { data, error } = await q
  if (error) throw error
  // Sort KRs by display_order
  return (data || []).map(o => ({
    ...o,
    key_results: (o.key_results || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)),
  }))
}

export async function createObjective(supabase, payload) {
  const { data, error } = await supabase
    .from('objectives')
    .insert(payload)
    .select('*, owner:profiles!owner_id(id, nickname, position, avatar_color, avatar_url)')
    .single()
  if (error) throw error
  return { ...data, key_results: [] }
}

export async function updateObjective(supabase, objectiveId, updates) {
  const { data, error } = await supabase
    .from('objectives')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', objectiveId)
    .select('*, owner:profiles!owner_id(id, nickname, position, avatar_color, avatar_url), key_results!objective_id(*, owner:profiles!owner_id(id, nickname, position, avatar_color, avatar_url))')
    .single()
  if (error) throw error
  return data
}

export async function deleteObjective(supabase, objectiveId) {
  const { error } = await supabase.from('objectives').delete().eq('id', objectiveId)
  if (error) throw error
}

// ===== Key Results =====
export async function createKeyResult(supabase, payload) {
  const { data, error } = await supabase
    .from('key_results')
    .insert(payload)
    .select('*, owner:profiles!owner_id(id, nickname, position, avatar_color, avatar_url)')
    .single()
  if (error) throw error
  return data
}

export async function updateKeyResult(supabase, krId, updates) {
  const { data, error } = await supabase
    .from('key_results')
    .update(updates)
    .eq('id', krId)
    .select('*, owner:profiles!owner_id(id, nickname, position, avatar_color, avatar_url)')
    .single()
  if (error) throw error
  return data
}

export async function deleteKeyResult(supabase, krId) {
  const { error } = await supabase.from('key_results').delete().eq('id', krId)
  if (error) throw error
}

// ===== Calculations =====
// KR % complete: (current - start) / (target - start), clamped 0-100
export function calcKrPercent(kr) {
  if (!kr) return 0
  if (kr.kr_type === 'binary') {
    return (Number(kr.current_value) > 0) ? 100 : 0
  }
  const start = Number(kr.start_value) || 0
  const target = Number(kr.target_value)
  const current = Number(kr.current_value) || 0
  if (!target || target === start) return 0
  const pct = ((current - start) / (target - start)) * 100
  return Math.max(0, Math.min(100, Math.round(pct)))
}

// Objective % = average of KR %
export function calcObjectivePercent(objective) {
  const krs = objective?.key_results || []
  if (krs.length === 0) return 0
  const sum = krs.reduce((s, kr) => s + calcKrPercent(kr), 0)
  return Math.round(sum / krs.length)
}

// KPI % = current_value / target_value * 100
export function calcKpiPercent(kpi) {
  if (!kpi) return 0
  const target = Number(kpi.target_value)
  const current = Number(kpi.current_value) || 0
  if (!target) return 0
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)))
}

// Color for progress %
export function progressColor(pct) {
  if (pct < 40) return '#A32D2D'
  if (pct < 70) return '#BA7517'
  return '#639922'
}

// Year/quarter defaults
export function currentQuarter() {
  const m = new Date().getMonth() + 1
  if (m <= 3) return 1
  if (m <= 6) return 2
  if (m <= 9) return 3
  return 4
}

export function currentYear() {
  return new Date().getFullYear()
}

// Default years to show (current + previous)
export function availableYears(allYears = []) {
  const y = currentYear()
  const set = new Set([y - 1, y, ...allYears])
  return Array.from(set).sort((a, b) => a - b)
}

// ===== Teams, Chapters & Brands =====
export const BRANDS = ['KC', 'onest', 'grubby']

// Chapters (top-level org grouping)
export const CHAPTERS = ['Strategy', 'Marketing', 'Innovation', 'Backbone', 'Factory']

// Teams (mid-level), each belongs to one chapter.
// Source of truth: KC's actual org chart.
export const TEAM_TO_CHAPTER = {
  // Chapter Strategy — CEO/CIO/Brand Strategist/BTL/PO. Members typically don't have a sub-team.
  'Strategy': 'Strategy',
  // Chapter Marketing
  'Marketing': 'Marketing',
  'Design': 'Marketing',
  'Retail': 'Marketing',
  // Chapter Innovation
  'Innovation': 'Innovation',
  'Regulatory': 'Innovation',
  // Chapter Backbone (back-office)
  'People': 'Backbone',
  'Business Technology': 'Backbone',
  'Accounting & Finance': 'Backbone',
  'Sourcing & Procurement': 'Backbone',
  // Chapter Factory
  'Operation': 'Factory',
  'Production': 'Factory',
  'Stock & Warehouse': 'Factory',
  'QMS': 'Factory',
}

// Flat teams list ordered by chapter (for filter pills, dropdowns, etc.)
export const TEAMS = Object.keys(TEAM_TO_CHAPTER)

export function chapterOfTeam(team) {
  return TEAM_TO_CHAPTER[team] || null
}

export function teamsInChapter(chapter) {
  return TEAMS.filter(t => TEAM_TO_CHAPTER[t] === chapter)
}

// Teams that split by brand (each brand has its own lead).
// - Marketing → Pim (onest) / Jomjam (grubby)
// - Innovation → Peem (onest) / Sa (grubby)
// - Accounting & Finance → Atom (onest) / Ying (grubby)
// All others are shared (one lead covers both brands).
export const BRAND_SPECIFIC_TEAMS = ['Marketing', 'Innovation', 'Accounting & Finance']
export function isTeamBrandSpecific(team) {
  return BRAND_SPECIFIC_TEAMS.includes(team)
}

// ===== Brand owners / Team leads =====
export async function fetchBrandOwners(supabase) {
  const { data, error } = await supabase
    .from('brand_owners')
    .select('*, profile:profiles!profile_id(id, nickname, full_name, position, avatar_color, avatar_url)')
    .order('brand')
  if (error) throw error
  return data || []
}

export async function fetchTeamLeads(supabase) {
  const { data, error } = await supabase
    .from('team_leads')
    .select('*, profile:profiles!profile_id(id, nickname, full_name, position, avatar_color, avatar_url)')
    .order('team')
  if (error) throw error
  return data || []
}

export async function addBrandOwner(supabase, { brand, profile_id }) {
  const { data, error } = await supabase.from('brand_owners').insert({ brand, profile_id }).select().single()
  if (error) throw error
  return data
}

export async function removeBrandOwner(supabase, id) {
  const { error } = await supabase.from('brand_owners').delete().eq('id', id)
  if (error) throw error
}

export async function addTeamLead(supabase, { team, profile_id, brand = null }) {
  const payload = { profile_id }
  if (team) payload.team = team
  if (brand) payload.brand = brand
  const { data, error } = await supabase
    .from('team_leads')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removeTeamLead(supabase, id) {
  const { error } = await supabase.from('team_leads').delete().eq('id', id)
  if (error) throw error
}

// Compute the brands/teams a user can write for, by level.
// Returns an object whose properties are arrays/sets of allowed values.
// Admin/super_admin get the special `isUnlimited` flag — UI should show all.
export function getWritableScopes({ profile, brandOwners, teamLeads }) {
  const scopes = {
    isUnlimited: false,                   // admin: write at any level for any scope
    brands: new Set(),                    // brand-level OKRs: which brands?
    teams: new Map(),                     // team-level OKRs: team → Set of allowed brands (null brand means "any" / shared)
    canIndividual: !!profile,             // anyone signed-in can write their own individual OKRs
  }
  if (!profile) return scopes
  if (profile.role === 'admin' || profile.role === 'super_admin') {
    scopes.isUnlimited = true
    return scopes
  }
  // Brand owner → can write brand-level OKRs for that brand
  for (const bo of (brandOwners || [])) {
    if (bo.profile_id === profile.id) scopes.brands.add(bo.brand)
  }
  // Team lead entries
  for (const tl of (teamLeads || [])) {
    if (tl.profile_id !== profile.id) continue
    if (tl.team) {
      if (!scopes.teams.has(tl.team)) scopes.teams.set(tl.team, new Set())
      scopes.teams.get(tl.team).add(tl.brand || null)
    }
  }
  return scopes
}

// Returns the list of OKR/KPI levels the user can create at. Used to filter the Level dropdown.
export function writableLevels(scopes) {
  if (scopes.isUnlimited) return ['brand', 'team', 'individual']
  const levels = []
  if (scopes.brands.size > 0) levels.push('brand')
  if (scopes.teams.size > 0) levels.push('team')
  if (scopes.canIndividual) levels.push('individual')
  return levels
}

// Brands the user can pick for a given level. Empty array = "any brand allowed" (admin or shared scope).
export function writableBrandsForLevel(scopes, level) {
  if (scopes.isUnlimited) return BRANDS // admin: any
  if (level === 'brand') return [...scopes.brands]
  if (level === 'team') {
    const set = new Set()
    for (const brandSet of scopes.teams.values()) {
      for (const b of brandSet) {
        if (b === null) BRANDS.forEach(x => set.add(x))
        else set.add(b)
      }
    }
    return [...set]
  }
  return BRANDS
}

// Teams the user can pick for a given brand. Returns array of team names.
export function writableTeams(scopes, brand) {
  if (scopes.isUnlimited) return TEAMS
  const out = []
  for (const [team, brandSet] of scopes.teams) {
    if (brandSet.has(null) || (brand && brandSet.has(brand))) out.push(team)
  }
  return out
}

export function canWriteAtLevel({ level, brand, team, profile, brandOwners, teamLeads }) {
  if (!profile) return false
  if (profile.role === 'admin' || profile.role === 'super_admin') return true
  if (level === 'brand' && brand) {
    return brandOwners.some(bo => bo.brand === brand && bo.profile_id === profile.id)
  }
  if (level === 'team' && team) {
    return teamLeads.some(tl =>
      tl.team === team
      && tl.profile_id === profile.id
      && (!tl.brand || tl.brand === brand)
    )
  }
  return false
}

// Fetch parent candidates for cascade linking — returns objectives WITH their KRs
// so the picker can show both "Cascade from Objective" and "Cascade from a specific KR".
// For brand OKR: no parents (top of tree).
// For team OKR: candidates are Brand OKRs matching the brand (if set).
// For individual OKR: use fetchIndividualParentCandidates instead.
export async function fetchParentCandidates(supabase, { year, quarter, level, brand }) {
  if (level === 'brand') return []
  const filters = []
  const selectFields = 'id, title, level, brand, team, quarter, is_annual, owner:profiles!owner_id(nickname, position), key_results!objective_id(id, title, kr_type, unit, target_value, display_order)'

  // Brand-level parents (matching brand if specified, else all)
  let bq = supabase.from('objectives').select(selectFields)
    .eq('year', year).eq('level', 'brand')
  if (brand) bq = bq.eq('brand', brand)
  filters.push(bq)

  const results = await Promise.all(filters)
  const combined = []
  results.forEach(r => { if (!r.error && r.data) combined.push(...r.data) })
  // Sort KRs by display_order
  return combined.map(o => ({
    ...o,
    key_results: (o.key_results || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)),
  }))
}

// Fetch all objectives for a year to build cascade tree (across all levels)
export async function fetchAllObjectivesForYear(supabase, year) {
  const { data, error } = await supabase
    .from('objectives')
    .select('*, owner:profiles!owner_id(id, nickname, position, avatar_color), key_results!objective_id(id, title, unit, current_value, start_value, target_value, kr_type, display_order)')
    .eq('year', year)
  if (error) throw error
  return (data || []).map(o => ({
    ...o,
    key_results: (o.key_results || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)),
  }))
}

// Given a root objective id, build a tree of descendants from a flat objective list.
// When a child has parent_kr_id set, we insert a synthetic "KR node" between parent
// and child so the tree visually shows which KR the child rolls up into.
export function buildCascadeTree(flatObjectives, rootId) {
  const byId = new Map(flatObjectives.map(o => [o.id, { ...o, children: [], _krBuckets: {} }]))
  const root = byId.get(rootId)
  if (!root) return null

  flatObjectives.forEach(o => {
    if (!o.parent_objective_id || !byId.has(o.parent_objective_id)) return
    const parent = byId.get(o.parent_objective_id)
    const node = byId.get(o.id)
    if (!parent || !node) return

    if (o.parent_kr_id) {
      // Find the KR on the parent; create or reuse a synthetic KR bucket node
      const kr = (parent.key_results || []).find(k => k.id === o.parent_kr_id)
      if (kr) {
        if (!parent._krBuckets[kr.id]) {
          const krNode = {
            id: `kr:${kr.id}`,
            _isKrNode: true,
            title: kr.title,
            level: 'kr',
            kr_type: kr.kr_type,
            target_value: kr.target_value,
            current_value: kr.current_value,
            start_value: kr.start_value,
            unit: kr.unit,
            children: [],
          }
          parent._krBuckets[kr.id] = krNode
          parent.children.push(krNode)
        }
        parent._krBuckets[kr.id].children.push(node)
        return
      }
    }
    // Fall back: attach directly to parent objective
    parent.children.push(node)
  })
  return root
}

// Walk up from a node to find its root ancestor
export function findRoot(flatObjectives, nodeId) {
  const byId = new Map(flatObjectives.map(o => [o.id, o]))
  let current = byId.get(nodeId)
  const visited = new Set()
  while (current && current.parent_objective_id && !visited.has(current.id)) {
    visited.add(current.id)
    current = byId.get(current.parent_objective_id)
  }
  return current
}

// ===== Phase 3: Individual OKRs + approval flow =====

// Fetch the current user's individual OKRs for a given year/quarter
export async function fetchMyIndividualObjectives(supabase, { ownerId, year, quarter }) {
  let q = supabase
    .from('objectives')
    .select('*, owner:profiles!owner_id(id, nickname, position, avatar_color, avatar_url), key_results!objective_id(*, owner:profiles!owner_id(id, nickname, position))')
    .eq('level', 'individual')
    .eq('owner_id', ownerId)
    .eq('year', year)
    .order('created_at', { ascending: true })
  if (quarter === 'annual') q = q.eq('is_annual', true)
  else if (typeof quarter === 'number') q = q.eq('quarter', quarter).eq('is_annual', false)
  const { data, error } = await q
  if (error) throw error
  return (data || []).map(o => ({ ...o, key_results: (o.key_results || []).sort((a,b) => (a.display_order||0) - (b.display_order||0)) }))
}

// Fetch individual OKRs for all direct reports of the current manager
export async function fetchReportsIndividualObjectives(supabase, { managerId, year, quarter }) {
  // First, find all reports
  const { data: reports, error: repErr } = await supabase
    .from('profiles')
    .select('id, nickname, position, avatar_color, avatar_url, team, squad')
    .eq('manager_id', managerId)
  if (repErr) throw repErr
  const reportIds = (reports || []).map(r => r.id)
  if (reportIds.length === 0) return { reports: [], objectives: [] }

  let q = supabase
    .from('objectives')
    .select('*, owner:profiles!owner_id(id, nickname, position, avatar_color, avatar_url), key_results!objective_id(*)')
    .eq('level', 'individual')
    .in('owner_id', reportIds)
    .eq('year', year)
  if (quarter === 'annual') q = q.eq('is_annual', true)
  else if (typeof quarter === 'number') q = q.eq('quarter', quarter).eq('is_annual', false)

  const { data: objs, error: objErr } = await q
  if (objErr) throw objErr
  return {
    reports: reports || [],
    objectives: (objs || []).map(o => ({ ...o, key_results: (o.key_results || []).sort((a,b) => (a.display_order||0) - (b.display_order||0)) }))
  }
}

// Count direct reports for the current user
export async function countDirectReports(supabase, userId) {
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('manager_id', userId)
  if (error) return 0
  return count || 0
}

// Parent candidates for an individual OKR: team OKRs for user's team, else brand OKRs.
// Includes KRs so the picker can offer KR-level cascade.
export async function fetchIndividualParentCandidates(supabase, { year, quarter, userTeam, userSquad }) {
  const selectFields = 'id, title, level, brand, team, quarter, is_annual, owner:profiles!owner_id(nickname, position), key_results!objective_id(id, title, kr_type, unit, target_value, display_order)'
  const queries = []
  if (userTeam) {
    queries.push(
      supabase.from('objectives').select(selectFields)
        .eq('year', year).eq('level', 'team').eq('team', userTeam)
    )
  }
  if (userSquad && ['onest', 'grubby', 'KC'].includes(userSquad)) {
    queries.push(
      supabase.from('objectives').select(selectFields)
        .eq('year', year).eq('level', 'brand').eq('brand', userSquad)
    )
  }
  const results = await Promise.all(queries)
  const combined = []
  results.forEach(r => { if (!r.error && r.data) combined.push(...r.data) })
  const seen = new Set()
  return combined
    .filter(o => { if (seen.has(o.id)) return false; seen.add(o.id); return true })
    .map(o => ({
      ...o,
      key_results: (o.key_results || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)),
    }))
}

// Request approval — set status and notify manager
export async function requestApproval(supabase, { objectiveId, objectiveTitle, managerId, ownerNickname }) {
  const { data, error } = await supabase
    .from('objectives')
    .update({ approval_status: 'pending_approval', updated_at: new Date().toISOString() })
    .eq('id', objectiveId)
    .select()
    .single()
  if (error) throw error

  if (managerId) {
    await supabase.from('notifications').insert({
      user_id: managerId,
      type: 'okr_approval_request',
      title: 'OKR approval requested',
      message: `${ownerNickname || 'Someone'} requested approval on "${objectiveTitle}"`,
      link: `/okrs?view=team-manage`,
      payload: { objective_id: objectiveId },
    }).then(({ error: nerr }) => { if (nerr) console.error('notify err', nerr) })
  }
  return data
}

// Manager approve
export async function approveObjective(supabase, { objectiveId, objectiveTitle, ownerId, approverNickname }) {
  const { data, error } = await supabase
    .from('objectives')
    .update({
      approval_status: 'approved',
      approved_by: (await supabase.auth.getUser()).data?.user?.id || null,
      approved_at: new Date().toISOString(),
      change_request_note: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', objectiveId)
    .select()
    .single()
  if (error) throw error

  if (ownerId) {
    await supabase.from('notifications').insert({
      user_id: ownerId,
      type: 'okr_approved',
      title: 'OKR approved',
      message: `${approverNickname || 'Your manager'} approved "${objectiveTitle}"`,
      link: `/okrs?view=mine`,
      payload: { objective_id: objectiveId },
    }).then(({ error: nerr }) => { if (nerr) console.error('notify err', nerr) })
  }
  return data
}

// Manager request changes with a note
export async function requestObjectiveChanges(supabase, { objectiveId, objectiveTitle, ownerId, note, approverNickname }) {
  const { data, error } = await supabase
    .from('objectives')
    .update({
      approval_status: 'changes_requested',
      change_request_note: note,
      updated_at: new Date().toISOString(),
    })
    .eq('id', objectiveId)
    .select()
    .single()
  if (error) throw error

  if (ownerId) {
    await supabase.from('notifications').insert({
      user_id: ownerId,
      type: 'okr_changes_requested',
      title: 'Changes requested on your OKR',
      message: `${approverNickname || 'Your manager'} requested changes on "${objectiveTitle}"`,
      link: `/okrs?view=mine`,
      payload: { objective_id: objectiveId },
    }).then(({ error: nerr }) => { if (nerr) console.error('notify err', nerr) })
  }
  return data
}

// ===== Phase 4: Check-ins =====

// Get Monday of the week containing the given date (YYYY-MM-DD string)
export function getMondayOf(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10) // YYYY-MM-DD
}

export function isFriday(date = new Date()) {
  return date.getDay() === 5
}

// Is the given date within the last week of a quarter? (for reflection prompt)
export function isLastWeekOfQuarter(date = new Date()) {
  const m = date.getMonth() + 1 // 1-12
  const d = date.getDate()
  // Last month of each quarter: March (3), June (6), Sept (9), Dec (12)
  const isLastMonthOfQuarter = [3, 6, 9, 12].includes(m)
  if (!isLastMonthOfQuarter) return false
  // Last 7 days of the month
  const lastDayOfMonth = new Date(date.getFullYear(), m, 0).getDate()
  return d >= lastDayOfMonth - 6
}

// Fetch latest check-ins for a set of KR ids (for confidence display)
export async function fetchLatestCheckIns(supabase, krIds) {
  if (!krIds || krIds.length === 0) return {}
  const { data, error } = await supabase
    .from('check_ins')
    .select('*')
    .in('key_result_id', krIds)
    .order('week_of', { ascending: false })
  if (error) throw error
  // Reduce to latest per KR
  const latest = {}
  for (const ci of (data || [])) {
    if (!latest[ci.key_result_id]) latest[ci.key_result_id] = ci
  }
  return latest
}

// Fetch check-ins for a KR for the last N weeks (for history/sparkline)
export async function fetchCheckInsForKr(supabase, keyResultId, limit = 8) {
  const { data, error } = await supabase
    .from('check_ins')
    .select('*')
    .eq('key_result_id', keyResultId)
    .order('week_of', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

// Batch-fetch the last N weeks of check-ins for many KRs at once.
// Returns a map { krId: [checkins...] } with arrays sorted oldest → newest
// so sparkline code can render left-to-right without re-sorting.
export async function fetchCheckInsBatch(supabase, krIds, weeksBack = 8) {
  if (!krIds || krIds.length === 0) return {}
  const { data, error } = await supabase
    .from('check_ins')
    .select('key_result_id, value, confidence, week_of, is_skipped')
    .in('key_result_id', krIds)
    .order('week_of', { ascending: false })
  if (error) throw error
  const map = {}
  for (const ci of (data || [])) {
    const arr = map[ci.key_result_id] || (map[ci.key_result_id] = [])
    if (arr.length < weeksBack) arr.push(ci)
  }
  for (const k of Object.keys(map)) map[k].reverse()
  return map
}

// Save a check-in (upsert on kr+week)
export async function saveCheckIn(supabase, { keyResultId, value, confidence, note, weekOf, createdBy, isSkipped = false }) {
  const payload = {
    key_result_id: keyResultId,
    value: isSkipped ? null : (value === '' || value === null || value === undefined ? null : Number(value)),
    confidence: isSkipped ? null : (confidence || null),
    note: note || null,
    week_of: weekOf,
    is_skipped: isSkipped,
    created_by: createdBy,
    created_at: new Date().toISOString(),
  }
  // Upsert on the unique constraint (key_result_id, week_of)
  const { data, error } = await supabase
    .from('check_ins')
    .upsert(payload, { onConflict: 'key_result_id,week_of' })
    .select()
    .single()
  if (error) throw error

  // If it's not a skip, also update the KR's current_value
  if (!isSkipped && payload.value !== null) {
    await supabase
      .from('key_results')
      .update({ current_value: payload.value })
      .eq('id', keyResultId)
  }
  return data
}

// Count how many of the user's KRs are missing a check-in for the current week
export async function countPendingCheckIns(supabase, userId) {
  const monday = getMondayOf()
  // Find KRs the user owns directly OR owns the parent objective of.
  // Done as separate simple queries to avoid the PostgREST embedded-relationship
  // ambiguity introduced by the parent_kr_id FK on objectives → key_results.
  const [ownedObjs, ownedKrs] = await Promise.all([
    supabase.from('objectives').select('id').eq('owner_id', userId),
    supabase.from('key_results').select('id').eq('owner_id', userId),
  ])
  if (ownedObjs.error) { console.error(ownedObjs.error); return 0 }
  if (ownedKrs.error) { console.error(ownedKrs.error); return 0 }
  const objIds = (ownedObjs.data || []).map(o => o.id)
  let krsViaObj = []
  if (objIds.length > 0) {
    const { data, error } = await supabase
      .from('key_results').select('id').in('objective_id', objIds)
    if (error) { console.error(error); return 0 }
    krsViaObj = data || []
  }
  const krIds = [...new Set([
    ...(ownedKrs.data || []).map(k => k.id),
    ...krsViaObj.map(k => k.id),
  ])]
  if (krIds.length === 0) return 0

  const { data: thisWeek, error: ciErr } = await supabase
    .from('check_ins')
    .select('key_result_id')
    .in('key_result_id', krIds)
    .eq('week_of', monday)
  if (ciErr) { console.error(ciErr); return 0 }
  const doneIds = new Set((thisWeek || []).map(c => c.key_result_id))
  return krIds.filter(id => !doneIds.has(id)).length
}

// Fetch the user's own KRs needing check-in this week (for the drawer)
export async function fetchKrsNeedingCheckIn(supabase, userId) {
  const monday = getMondayOf()
  // Step 1: find objective IDs the user owns + KR IDs the user owns directly.
  const [ownedObjs, ownedKrs] = await Promise.all([
    supabase.from('objectives').select('id, title, owner_id, level, brand, team').eq('owner_id', userId),
    supabase.from('key_results')
      .select('*, objective:objectives!objective_id(id, title, owner_id, level, brand, team)')
      .eq('owner_id', userId),
  ])
  if (ownedObjs.error) throw ownedObjs.error
  if (ownedKrs.error) throw ownedKrs.error

  // Step 2: pull KRs whose parent objective is owned by the user.
  const objIds = (ownedObjs.data || []).map(o => o.id)
  let krsViaObj = []
  if (objIds.length > 0) {
    const { data, error } = await supabase
      .from('key_results')
      .select('*, objective:objectives!objective_id(id, title, owner_id, level, brand, team)')
      .in('objective_id', objIds)
    if (error) throw error
    krsViaObj = data || []
  }

  // Dedupe by id
  const seen = new Set()
  const krs = []
  for (const k of [...(ownedKrs.data || []), ...krsViaObj]) {
    if (!seen.has(k.id)) { seen.add(k.id); krs.push(k) }
  }
  const krIds = krs.map(k => k.id)
  if (krIds.length === 0) return []

  const { data: thisWeek } = await supabase
    .from('check_ins')
    .select('key_result_id')
    .in('key_result_id', krIds)
    .eq('week_of', monday)
  const doneIds = new Set((thisWeek || []).map(c => c.key_result_id))
  return krs.filter(k => !doneIds.has(k.id))
}

// ===== Phase 4: Reflections =====

export async function fetchReflection(supabase, { objectiveId, periodType = 'quarter', year, quarter }) {
  let q = supabase
    .from('reflections')
    .select('*')
    .eq('objective_id', objectiveId)
    .eq('period_type', periodType)
    .eq('year', year)
  if (quarter) q = q.eq('quarter', quarter)
  const { data, error } = await q.maybeSingle()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function fetchReflectionsForObjectives(supabase, objectiveIds, { year, quarter }) {
  if (!objectiveIds || objectiveIds.length === 0) return {}
  const { data, error } = await supabase
    .from('reflections')
    .select('*')
    .in('objective_id', objectiveIds)
    .eq('year', year)
    .eq('quarter', quarter)
  if (error) { console.error(error); return {} }
  const map = {}
  for (const r of (data || [])) map[r.objective_id] = r
  return map
}

export async function saveSelfReflection(supabase, { objectiveId, year, quarter, rating, wentWell, improve, submit = false }) {
  // Upsert reflection, touch self fields
  const payload = {
    objective_id: objectiveId,
    period_type: 'quarter',
    year,
    quarter,
    self_rating: rating || null,
    self_went_well: wentWell || null,
    self_improve: improve || null,
    self_submitted_at: submit ? new Date().toISOString() : null,
  }
  const { data, error } = await supabase
    .from('reflections')
    .upsert(payload, { onConflict: 'objective_id,period_type,year,quarter' })
    .select()
    .single()
  if (error) throw error

  // Auto-finalize if both sides are submitted
  if (submit && data.manager_submitted_at && !data.finalized_at) {
    await supabase.from('reflections').update({ finalized_at: new Date().toISOString() }).eq('id', data.id)
  }
  return data
}

export async function saveManagerReflection(supabase, { objectiveId, year, quarter, rating, notes, managerId, submit = false }) {
  // Find or create the reflection row
  let existing = await fetchReflection(supabase, { objectiveId, year, quarter })
  if (!existing) {
    const { data: created, error: cerr } = await supabase
      .from('reflections')
      .insert({ objective_id: objectiveId, period_type: 'quarter', year, quarter })
      .select()
      .single()
    if (cerr) throw cerr
    existing = created
  }
  const payload = {
    manager_rating: rating || null,
    manager_notes: notes || null,
    manager_id: managerId,
    manager_submitted_at: submit ? new Date().toISOString() : null,
  }
  const { data, error } = await supabase
    .from('reflections')
    .update(payload)
    .eq('id', existing.id)
    .select()
    .single()
  if (error) throw error
  // Auto-finalize if both submitted
  if (submit && data.self_submitted_at && !data.finalized_at) {
    await supabase.from('reflections').update({ finalized_at: new Date().toISOString() }).eq('id', data.id)
  }
  return data
}

// ===== Phase 4: KPI value update (monthly) =====
export async function updateKpiCurrentValue(supabase, kpiId, { value, note, userId }) {
  const { data, error } = await supabase
    .from('kpis')
    .update({
      current_value: value === '' || value === null ? null : Number(value),
      last_updated_at: new Date().toISOString(),
      last_updated_by: userId,
    })
    .eq('id', kpiId)
    .select('*, owner:profiles!owner_id(id, nickname, position, avatar_color, avatar_url)')
    .single()
  if (error) throw error
  return data
}

// ===== Phase 5: Period locks =====
export async function fetchLocks(supabase) {
  const { data, error } = await supabase.from('period_locks').select('*')
  if (error) throw error
  return data || []
}

export function isPeriodLocked(locks, year, quarter) {
  if (quarter === 'annual' || typeof quarter !== 'number') return false
  return !!(locks || []).find(l => l.year === year && l.quarter === quarter)
}

export async function lockPeriod(supabase, { year, quarter, lockedBy }) {
  const { data, error } = await supabase
    .from('period_locks')
    .insert({ year, quarter, locked_by: lockedBy })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function unlockPeriod(supabase, { year, quarter }) {
  const { error } = await supabase.from('period_locks').delete()
    .eq('year', year).eq('quarter', quarter)
  if (error) throw error
}

// ===== Phase 5: Edit requests =====
export async function createEditRequest(supabase, { targetTable, targetId, year, quarter, justification, requestedBy }) {
  const { data, error } = await supabase
    .from('edit_requests')
    .insert({
      target_table: targetTable,
      target_id: targetId,
      year,
      quarter,
      justification,
      requested_by: requestedBy,
      status: 'pending',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchEditRequests(supabase, { status = null } = {}) {
  let q = supabase
    .from('edit_requests')
    .select('*, requester:profiles!requested_by(id, nickname, position, avatar_color), reviewer:profiles!reviewed_by(id, nickname)')
    .order('created_at', { ascending: false })
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function approveEditRequest(supabase, requestId, { reviewerId, reviewerNote, expiresInDays = 7 }) {
  const expiry = new Date(Date.now() + expiresInDays * 86400000).toISOString()
  const { data, error } = await supabase
    .from('edit_requests')
    .update({
      status: 'approved',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      reviewer_note: reviewerNote || null,
      approval_expires_at: expiry,
    })
    .eq('id', requestId)
    .select()
    .single()
  if (error) throw error
  // Notify requester
  if (data.requested_by) {
    await supabase.from('notifications').insert({
      user_id: data.requested_by,
      type: 'edit_request_approved',
      title: 'Edit request approved',
      message: `Your edit request was approved. You have ${expiresInDays} days to make the change.`,
      link: '/okrs',
    }).then(() => {}).catch(() => {})
  }
  return data
}

export async function rejectEditRequest(supabase, requestId, { reviewerId, reviewerNote }) {
  const { data, error } = await supabase
    .from('edit_requests')
    .update({
      status: 'rejected',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      reviewer_note: reviewerNote || null,
    })
    .eq('id', requestId)
    .select()
    .single()
  if (error) throw error
  if (data.requested_by) {
    await supabase.from('notifications').insert({
      user_id: data.requested_by,
      type: 'edit_request_rejected',
      title: 'Edit request declined',
      message: reviewerNote || 'Your edit request was declined.',
      link: '/okrs',
    }).then(() => {}).catch(() => {})
  }
  return data
}

// ===== Phase 5: Snapshots =====
export async function fetchSnapshots(supabase) {
  const { data, error } = await supabase
    .from('snapshots')
    .select('id, period_type, year, quarter, created_at')
    .order('year', { ascending: false })
    .order('quarter', { ascending: false, nullsFirst: false })
  if (error) throw error
  return data || []
}

export async function fetchSnapshotById(supabase, id) {
  const { data, error } = await supabase.from('snapshots').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

// Admin: update profile's manager_id
export async function updateProfileManager(supabase, profileId, managerId) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ manager_id: managerId || null })
    .eq('id', profileId)
    .select('id, nickname, position, manager_id')
    .single()
  if (error) throw error
  return data
}

// Count descendants by level
export function countDescendantsByLevel(treeRoot) {
  const counts = { brand: 0, team: 0, individual: 0 }
  function walk(node) {
    (node.children || []).forEach(c => {
      if (counts[c.level] !== undefined) counts[c.level]++
      walk(c)
    })
  }
  walk(treeRoot)
  return counts
}
