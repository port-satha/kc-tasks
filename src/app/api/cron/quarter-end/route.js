import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Runs via Vercel cron at 17:00 UTC on last day of each quarter month (=00:00 BKK next day).
 * See vercel.json. The endpoint is a belt-and-suspenders check: only executes
 * when today is actually the last day of a quarter month (BKK time).
 *
 * Authorization: checks a bearer token in the Authorization header matches CRON_SECRET.
 */
export async function GET(request) {
  const auth = request.headers.get('authorization')
  const expected = process.env.CRON_SECRET
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Determine the just-ended quarter. At 00:00 BKK of day 1 of the new quarter,
  // UTC is 17:00 of the last day of the old quarter.
  const now = new Date()
  const bkkOffsetMs = 7 * 60 * 60 * 1000
  const bkk = new Date(now.getTime() + bkkOffsetMs)
  // We consider the day to be the one that has just ended at BKK midnight.
  // If we ran at 17:00 UTC on Mar 31, BKK time is 00:00 Apr 1.
  // The just-ended quarter was Q1 (months 1-3 of the current year).
  // Easier: compute previous day in BKK.
  const yesterdayBkk = new Date(bkk.getTime() - 86400000)
  const endYear = yesterdayBkk.getUTCFullYear()
  const endMonth = yesterdayBkk.getUTCMonth() + 1 // 1-12
  // Is this the last day of a quarter month?
  if (![3, 6, 9, 12].includes(endMonth)) {
    return NextResponse.json({ skipped: true, reason: 'Not a quarter-end day', endMonth })
  }
  const endQuarter = endMonth / 3 // 1, 2, 3, 4

  // Use service role for server-side writes
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )

  // Insert lock (idempotent via unique constraint)
  const { error: lockErr } = await supabase
    .from('period_locks')
    .insert({ year: endYear, quarter: endQuarter })
  if (lockErr && !lockErr.message.includes('duplicate')) {
    return NextResponse.json({ error: 'Lock failed: ' + lockErr.message }, { status: 500 })
  }

  // Build snapshot
  const [{ data: objectives }, { data: kpis }, { data: profiles }, { data: reflections }, { data: checkIns }] = await Promise.all([
    supabase.from('objectives').select('*, key_results(*)').eq('year', endYear).eq('quarter', endQuarter),
    supabase.from('kpis').select('*').eq('year', endYear),
    supabase.from('profiles').select('id, nickname, position, team, squad, role, manager_id'),
    supabase.from('reflections').select('*').eq('year', endYear).eq('quarter', endQuarter),
    supabase.from('check_ins').select('key_result_id, value, confidence, week_of, is_skipped, created_by'),
  ])

  const snapshotData = {
    period_type: 'quarter',
    year: endYear,
    quarter: endQuarter,
    locked_at: new Date().toISOString(),
    objectives: objectives || [],
    kpis: kpis || [],
    profiles_snapshot: profiles || [],
    reflections: reflections || [],
    check_ins: checkIns || [],
  }

  const { error: snapErr } = await supabase
    .from('snapshots')
    .insert({ period_type: 'quarter', year: endYear, quarter: endQuarter, snapshot_data: snapshotData })
  if (snapErr && !snapErr.message.includes('duplicate')) {
    return NextResponse.json({ error: 'Snapshot failed: ' + snapErr.message }, { status: 500 })
  }

  // Notify admins
  const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')
  const objCount = (objectives || []).length
  const reflCount = (reflections || []).filter(r => r.finalized_at).length
  if (admins && admins.length > 0) {
    await supabase.from('notifications').insert(admins.map(a => ({
      user_id: a.id,
      type: 'quarter_locked',
      title: `Q${endQuarter} ${endYear} locked`,
      message: `${objCount} objectives, ${reflCount} reflections finalized.`,
      link: '/okrs/snapshots',
    })))
  }

  return NextResponse.json({ success: true, year: endYear, quarter: endQuarter, objectives: objCount, reflections: reflCount })
}
