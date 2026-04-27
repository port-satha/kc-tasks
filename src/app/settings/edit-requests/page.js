'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '../../../components/AppShell'
import { useSupabase, useUser } from '../../../lib/hooks'
import { fetchEditRequests, approveEditRequest, rejectEditRequest } from '../../../lib/okr'

export default function EditRequestsPage() {
  const supabase = useSupabase()
  const router = useRouter()
  const { user, profile, loading: userLoading } = useUser()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [reviewNote, setReviewNote] = useState({})

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  useEffect(() => {
    if (userLoading) return
    if (!isAdmin) { router.push('/'); return }
    fetchEditRequests(supabase).then(setRequests).catch(console.error).finally(() => setLoading(false))
  }, [supabase, isAdmin, userLoading, router])

  const handleApprove = async (req) => {
    try {
      await approveEditRequest(supabase, req.id, {
        reviewerId: user.id,
        reviewerNote: reviewNote[req.id] || null,
        expiresInDays: 7,
      })
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved' } : r))
    } catch (err) { alert('Failed: ' + err.message) }
  }

  const handleReject = async (req) => {
    try {
      await rejectEditRequest(supabase, req.id, {
        reviewerId: user.id,
        reviewerNote: reviewNote[req.id] || null,
      })
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'rejected' } : r))
    } catch (err) { alert('Failed: ' + err.message) }
  }

  const pending = requests.filter(r => r.status === 'pending')
  const past = requests.filter(r => r.status !== 'pending')

  return (
    <AppShell>
      <div className="min-h-screen bg-[#DFDDD9] p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-[15px] font-medium text-[#2C2C2A]">Edit requests</h1>
          <p className="text-[11px] text-[#9B8C82] mt-0.5">Admin only · Approve retroactive edits to locked quarters.</p>

          {loading ? (
            <div className="mt-6 animate-pulse space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 bg-[#F5F3EF] rounded-xl" />)}
            </div>
          ) : (
            <>
              <Section title="Pending" count={pending.length}>
                {pending.length === 0 ? (
                  <p className="text-[11px] text-[#B7A99D] italic">Nothing pending.</p>
                ) : pending.map(req => (
                  <RequestCard key={req.id} req={req}
                    note={reviewNote[req.id] || ''}
                    onNoteChange={(v) => setReviewNote(prev => ({ ...prev, [req.id]: v }))}
                    onApprove={() => handleApprove(req)}
                    onReject={() => handleReject(req)}
                  />
                ))}
              </Section>

              <Section title="Past" count={past.length}>
                {past.length === 0 ? (
                  <p className="text-[11px] text-[#B7A99D] italic">No history yet.</p>
                ) : past.map(req => (
                  <RequestCard key={req.id} req={req} />
                ))}
              </Section>
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}

function Section({ title, count, children }) {
  return (
    <div className="mt-5">
      <h2 className="text-[10px] uppercase tracking-wider text-[#9B8C82] font-medium mb-2">{title} · {count}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

const STATUS_BADGE = {
  pending:  { bg: 'rgba(186,117,23,0.08)', fg: '#854F0B' },
  approved: { bg: 'rgba(99,153,34,0.10)',  fg: '#3B6D11' },
  rejected: { bg: 'rgba(226,75,74,0.08)',  fg: '#A32D2D' },
  expired:  { bg: 'rgba(44,44,42,0.08)',   fg: '#5F5E5A' },
}

function RequestCard({ req, note, onNoteChange, onApprove, onReject }) {
  const s = STATUS_BADGE[req.status] || STATUS_BADGE.pending
  const canAct = req.status === 'pending' && onApprove
  const expiresAt = req.approval_expires_at ? new Date(req.approval_expires_at) : null
  return (
    <div className="bg-[#F5F3EF] border border-[rgba(0,0,0,0.04)] rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12.5px] font-medium text-[#2C2C2A]">
              {req.requester?.nickname || 'Someone'}
            </span>
            <span className="text-[10px] text-[#9B8C82]">wants to edit</span>
            <span className="text-[10px] font-mono bg-[rgba(0,0,0,0.04)] px-1.5 py-0.5 rounded">{req.target_table}</span>
            <span className="text-[10px] text-[#B7A99D]">Q{req.quarter} {req.year}</span>
            <span className="ml-auto text-[9.5px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider" style={{ background: s.bg, color: s.fg }}>
              {req.status}
            </span>
          </div>
          <p className="text-[11.5px] text-[#2C2C2A] mt-2 whitespace-pre-wrap">{req.justification}</p>
          {req.reviewer_note && (
            <p className="text-[10.5px] text-[#9B8C82] mt-2 italic">
              Reviewer note: {req.reviewer_note}
            </p>
          )}
          {req.status === 'approved' && expiresAt && (
            <p className="text-[10px] text-[#3B6D11] mt-1">
              Approved — edits allowed until {expiresAt.toLocaleString()}
            </p>
          )}
          <p className="text-[10px] text-[#B7A99D] mt-2">
            Requested {new Date(req.created_at).toLocaleString()}
            {req.reviewed_at && <> · Reviewed {new Date(req.reviewed_at).toLocaleString()}{req.reviewer?.nickname ? ` by ${req.reviewer.nickname}` : ''}</>}
          </p>
        </div>
      </div>
      {canAct && (
        <div className="mt-3 border-t border-[rgba(0,0,0,0.04)] pt-3 space-y-2">
          <input type="text" value={note}
            onChange={e => onNoteChange(e.target.value)}
            placeholder="Optional reviewer note"
            className="w-full text-[11px] bg-[#DFDDD9] border border-[rgba(0,0,0,0.08)] rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#2C2C2A]" />
          <div className="flex gap-2 justify-end">
            <button onClick={onReject}
              className="text-[11px] px-3 py-1.5 border border-[rgba(163,45,45,0.3)] text-[#A32D2D] rounded-md hover:bg-[rgba(163,45,45,0.06)]">
              Reject
            </button>
            <button onClick={onApprove}
              className="text-[11px] px-3 py-1.5 bg-[#2C2C2A] text-[#DFDDD9] rounded-md hover:bg-[#3D3D3A] font-medium">
              Approve (7-day window)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
