'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '../../../components/AppShell'
import { useSupabase, useUser } from '../../../lib/hooks'
import { fetchSnapshots, fetchSnapshotById } from '../../../lib/okr'

export default function SnapshotsPage() {
  const supabase = useSupabase()
  const router = useRouter()
  const { profile, loading: userLoading } = useUser()
  const [snapshots, setSnapshots] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState(null)

  const canView = profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'people'

  useEffect(() => {
    if (userLoading) return
    if (!canView) { router.push('/'); return }
    fetchSnapshots(supabase).then(setSnapshots).catch(console.error).finally(() => setLoading(false))
  }, [supabase, canView, userLoading, router])

  const openSnapshot = async (id) => {
    try {
      const full = await fetchSnapshotById(supabase, id)
      setViewing(full)
    } catch (err) { alert('Failed: ' + err.message) }
  }

  const downloadJson = (snap) => {
    const blob = new Blob([JSON.stringify(snap.snapshot_data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kindfolks-snapshot-${snap.period_type}-${snap.year}${snap.quarter ? `-q${snap.quarter}` : ''}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-[#DFDDD9] p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-[15px] font-medium text-[#2C2C2A]">Snapshots</h1>
          <p className="text-[11px] text-[#9B8C82] mt-0.5">People &amp; admin only · Immutable records of each locked period.</p>

          {loading ? (
            <div className="mt-6 animate-pulse space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 bg-[#F5F3EF] rounded-lg" />)}
            </div>
          ) : snapshots.length === 0 ? (
            <div className="mt-6 bg-[#F5F3EF] border border-[rgba(0,0,0,0.04)] rounded-xl p-6 text-center">
              <p className="text-[12px] text-[#9B8C82] italic">No snapshots yet. They are created automatically on quarter-end.</p>
            </div>
          ) : (
            <div className="mt-5 bg-[#F5F3EF] border border-[rgba(0,0,0,0.04)] rounded-xl divide-y divide-[rgba(0,0,0,0.04)]">
              {snapshots.map(s => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-medium text-[#2C2C2A]">
                      {s.period_type === 'year' ? `${s.year} — full year` : `Q${s.quarter} ${s.year}`}
                    </p>
                    <p className="text-[10px] text-[#9B8C82]">Locked {new Date(s.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openSnapshot(s.id)}
                      className="text-[11px] px-3 py-1.5 border border-[rgba(0,0,0,0.08)] text-[#2C2C2A] rounded-md hover:bg-[rgba(0,0,0,0.03)]">
                      View JSON
                    </button>
                    <a href={`/api/okrs/export?year=${s.year}${s.quarter ? `&quarter=${s.quarter}` : ''}&kind=objectives&format=csv`}
                      className="text-[11px] px-3 py-1.5 bg-[#2C2C2A] text-[#DFDDD9] rounded-md hover:bg-[#3D3D3A] font-medium">
                      Export CSV
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Raw JSON viewer */}
      {viewing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4" onClick={() => setViewing(null)}>
          <div className="bg-[#DFDDD9] rounded-xl shadow-xl w-full max-w-3xl my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(0,0,0,0.06)]">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#9B8C82]">Raw snapshot</p>
                <p className="text-[13px] font-medium text-[#2C2C2A]">
                  {viewing.period_type === 'year' ? `${viewing.year}` : `Q${viewing.quarter} ${viewing.year}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => downloadJson(viewing)}
                  className="text-[11px] px-3 py-1.5 bg-[#2C2C2A] text-[#DFDDD9] rounded-md hover:bg-[#3D3D3A]">
                  Download JSON
                </button>
                <button onClick={() => setViewing(null)} className="text-[#9B8C82] hover:text-[#2C2C2A] text-[18px] px-2">×</button>
              </div>
            </div>
            <pre className="p-4 text-[10.5px] text-[#2C2C2A] bg-[#F5F3EF] overflow-auto max-h-[70vh] rounded-b-xl">
              {JSON.stringify(viewing.snapshot_data, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </AppShell>
  )
}
