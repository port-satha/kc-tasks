import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

function getServerSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value },
        set() {}, remove() {},
      },
    }
  )
}

function toCsvRow(values) {
  return values.map(v => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"'
    }
    return s
  }).join(',')
}

function calcKrPct(kr) {
  if (!kr) return 0
  if (kr.kr_type === 'binary') return (Number(kr.current_value) > 0) ? 100 : 0
  const start = Number(kr.start_value) || 0
  const target = Number(kr.target_value)
  const current = Number(kr.current_value) || 0
  if (!target || target === start) return 0
  return Math.max(0, Math.min(100, Math.round(((current - start) / (target - start)) * 100)))
}

function avg(arr) {
  if (!arr.length) return 0
  return Math.round(arr.reduce((s, n) => s + n, 0) / arr.length)
}

export async function GET(request) {
  const supabase = getServerSupabase()

  // Authorize — must be people or admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'people'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
  const quarter = searchParams.get('quarter') // '1'-'4' or null for all
  const kind = searchParams.get('kind') || 'objectives' // 'objectives' | 'kpis' | 'aggregate'
  const format = searchParams.get('format') || 'csv'

  if (kind === 'kpis') {
    let q = supabase
      .from('kpis')
      .select('*, owner:profiles!owner_id(nickname)')
      .eq('year', year)
    const { data: kpis, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (format === 'json') return NextResponse.json(kpis)

    const headers = ['year','kpi_name','level','brand','owner_nickname','target_value','target_unit','current_value','final_pct','q1','q2','q3','q4','last_updated_at']
    const rows = [headers.join(',')]
    for (const k of (kpis || [])) {
      const pct = k.target_value ? Math.round((Number(k.current_value || 0) / Number(k.target_value)) * 100) : 0
      rows.push(toCsvRow([
        k.year, k.name, k.level, k.brand || '', k.owner?.nickname || '',
        k.target_value, k.target_unit || '', k.current_value, pct,
        k.q1_target, k.q2_target, k.q3_target, k.q4_target,
        k.last_updated_at || '',
      ]))
    }
    return new NextResponse(rows.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="kindfolks-kpis-${year}.csv"`,
      },
    })
  }

  if (kind === 'aggregate') {
    // Pull all objectives for the year, aggregate by team & brand
    let q = supabase
      .from('objectives')
      .select('*, key_results(*)')
      .eq('year', year)
    if (quarter) q = q.eq('quarter', parseInt(quarter))
    const { data: objs, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const groups = new Map() // key -> { scopeType, scopeName, ... }
    for (const o of (objs || [])) {
      const pct = avg((o.key_results || []).map(calcKrPct))
      // By team
      if (o.team) {
        const key = `team:${o.team}`
        if (!groups.has(key)) groups.set(key, { type: 'team', name: o.team, pcts: [], statuses: [] })
        groups.get(key).pcts.push(pct)
        groups.get(key).statuses.push(o.status || 'not_started')
      }
      // By brand
      if (o.brand) {
        const key = `brand:${o.brand}`
        if (!groups.has(key)) groups.set(key, { type: 'brand', name: o.brand, pcts: [], statuses: [] })
        groups.get(key).pcts.push(pct)
        groups.get(key).statuses.push(o.status || 'not_started')
      }
    }

    const headers = ['year','scope_type','scope_name','total_objectives','avg_pct','completed','at_risk','off_track']
    const rows = [headers.join(',')]
    for (const g of groups.values()) {
      rows.push(toCsvRow([
        year, g.type, g.name, g.pcts.length, avg(g.pcts),
        g.statuses.filter(s => s === 'complete').length,
        g.statuses.filter(s => s === 'at_risk').length,
        g.statuses.filter(s => s === 'off_track').length,
      ]))
    }
    return new NextResponse(rows.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="kindfolks-aggregate-${year}.csv"`,
      },
    })
  }

  // Default: objectives export (one row per objective)
  let q = supabase
    .from('objectives')
    .select('*, owner:profiles!owner_id(id, nickname, position_title, team, squad, manager_id), key_results!objective_id(*, owner:profiles!owner_id(nickname)), parent:objectives!parent_objective_id(id, title)')
    .eq('year', year)
    .order('created_at', { ascending: true })
  if (quarter) q = q.eq('quarter', parseInt(quarter))
  const { data: objectives, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Pull reflections for all objectives
  const objIds = (objectives || []).map(o => o.id)
  let reflectionsByObj = {}
  if (objIds.length > 0) {
    const { data: refs } = await supabase.from('reflections').select('*').in('objective_id', objIds)
    for (const r of (refs || [])) reflectionsByObj[r.objective_id] = r
  }

  // Pull manager nicknames
  const mgrIds = [...new Set((objectives || []).map(o => o.owner?.manager_id).filter(Boolean))]
  const mgrs = {}
  if (mgrIds.length > 0) {
    const { data: mgrProfiles } = await supabase.from('profiles').select('id, nickname').in('id', mgrIds)
    for (const m of (mgrProfiles || [])) mgrs[m.id] = m.nickname
  }

  // Check-in stats
  const krIds = (objectives || []).flatMap(o => (o.key_results || []).map(kr => kr.id))
  let checkInsByKr = {}
  if (krIds.length > 0) {
    const { data: cis } = await supabase.from('check_ins').select('key_result_id, is_skipped').in('key_result_id', krIds)
    for (const ci of (cis || [])) {
      if (!checkInsByKr[ci.key_result_id]) checkInsByKr[ci.key_result_id] = { total: 0, skipped: 0 }
      checkInsByKr[ci.key_result_id].total++
      if (ci.is_skipped) checkInsByKr[ci.key_result_id].skipped++
    }
  }

  if (format === 'json') return NextResponse.json(objectives)

  const maxKrs = 5
  const headers = [
    'year','quarter',
    'owner_id','owner_nickname','owner_position','owner_team','owner_squad',
    'manager_nickname',
    'objective_id','objective_title','objective_level','objective_brand','objective_tags',
    'parent_objective_title',
    'overall_pct','final_status','approval_status',
    ...Array.from({ length: maxKrs }, (_, i) => [`kr${i+1}_title`, `kr${i+1}_final`, `kr${i+1}_target`, `kr${i+1}_pct`, `kr${i+1}_owner`]).flat(),
    'self_rating','self_went_well','self_improve',
    'manager_rating','manager_notes','reflection_finalized_at',
    'check_in_count','check_in_skipped',
    'is_retroactive_edit',
  ]

  const rows = [headers.join(',')]
  for (const o of (objectives || [])) {
    const pct = avg((o.key_results || []).map(calcKrPct))
    const refl = reflectionsByObj[o.id] || {}
    const managerNickname = o.owner?.manager_id ? (mgrs[o.owner.manager_id] || '') : ''
    const row = [
      o.year, o.quarter,
      o.owner?.id, o.owner?.nickname, o.owner?.position_title, o.owner?.team, o.owner?.squad,
      managerNickname,
      o.id, o.title, o.level, o.brand || '', (o.tags || []).join('|'),
      o.parent?.title || '',
      pct, o.status || '', o.approval_status || '',
    ]
    for (let i = 0; i < maxKrs; i++) {
      const kr = (o.key_results || [])[i]
      if (kr) {
        row.push(kr.title, kr.current_value, kr.target_value, calcKrPct(kr), kr.owner?.nickname || '')
      } else {
        row.push('', '', '', '', '')
      }
    }
    row.push(
      refl.self_rating || '', refl.self_went_well || '', refl.self_improve || '',
      refl.manager_rating || '', refl.manager_notes || '', refl.finalized_at || '',
    )
    // Check-in stats aggregated across all KRs
    const krStats = (o.key_results || []).map(kr => checkInsByKr[kr.id] || { total: 0, skipped: 0 })
    const totalCi = krStats.reduce((s, x) => s + x.total, 0)
    const totalSkipped = krStats.reduce((s, x) => s + x.skipped, 0)
    row.push(totalCi, totalSkipped, o.is_retroactive_edit ? 'true' : 'false')
    rows.push(toCsvRow(row))
  }

  return new NextResponse(rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="kindfolks-objectives-${year}${quarter ? `-q${quarter}` : ''}.csv"`,
    },
  })
}
