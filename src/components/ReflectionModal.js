'use client'
import { useState, useEffect } from 'react'
import { useSupabase, useUser } from '../lib/hooks'
import { fetchReflection, saveSelfReflection, saveManagerReflection, calcObjectivePercent } from '../lib/okr'

/**
 * Reflection modal — shows owner section and manager section.
 * Which section is active depends on `mode`:
 *   - 'owner' — current user is the owner, edits self_* fields
 *   - 'manager' — current user is manager, edits manager_* fields (owner fields shown read-only)
 *
 * Props:
 *   objective: { id, title, owner_id, year, quarter, key_results }
 *   year, quarter
 *   mode: 'owner' | 'manager'
 *   onClose()
 *   onSaved()
 */
export default function ReflectionModal({ objective, year, quarter, mode, onClose, onSaved }) {
  const supabase = useSupabase()
  const { user } = useUser()
  const [reflection, setReflection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    self_rating: 3, self_went_well: '', self_improve: '',
    manager_rating: 3, manager_notes: '',
  })

  const pct = calcObjectivePercent(objective)

  useEffect(() => {
    fetchReflection(supabase, {
      objectiveId: objective.id,
      periodType: 'quarter',
      year,
      quarter: quarter === 'annual' ? null : quarter,
    }).then(r => {
      setReflection(r)
      if (r) {
        setForm({
          self_rating: r.self_rating || 3,
          self_went_well: r.self_went_well || '',
          self_improve: r.self_improve || '',
          manager_rating: r.manager_rating || 3,
          manager_notes: r.manager_notes || '',
        })
      }
      setLoading(false)
    }).catch(err => { console.error(err); setLoading(false) })
  }, [supabase, objective.id, year, quarter])

  const isFinalized = !!reflection?.finalized_at
  const selfLocked = !!reflection?.self_submitted_at
  const managerLocked = !!reflection?.manager_submitted_at

  const doSaveSelf = async ({ submit = false } = {}) => {
    setSaving(true)
    try {
      await saveSelfReflection(supabase, {
        objectiveId: objective.id,
        year,
        quarter: quarter === 'annual' ? null : quarter,
        rating: form.self_rating,
        wentWell: form.self_went_well,
        improve: form.self_improve,
        submit,
      })
      onSaved?.()
      if (submit) onClose()
    } catch (err) { alert('Failed: ' + err.message) }
    setSaving(false)
  }

  const doSaveManager = async ({ submit = false } = {}) => {
    setSaving(true)
    try {
      await saveManagerReflection(supabase, {
        objectiveId: objective.id,
        year,
        quarter: quarter === 'annual' ? null : quarter,
        rating: form.manager_rating,
        notes: form.manager_notes,
        managerId: user?.id,
        submit,
      })
      onSaved?.()
      if (submit) onClose()
    } catch (err) { alert('Failed: ' + err.message) }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-[#DFDDD9] rounded-xl shadow-xl w-full max-w-xl my-8">
        <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#9B8C82]">
              {mode === 'manager' ? 'Manager review' : 'Reflection'} · Q{quarter} {year}
            </p>
            <p className="text-[13px] font-medium text-[#2C2C2A] truncate">{objective.title}</p>
          </div>
          <button onClick={onClose} className="text-[#9B8C82] hover:text-[#2C2C2A] text-[18px]">×</button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-[#F5F3EF] rounded" />
              <div className="h-24 bg-[#F5F3EF] rounded" />
            </div>
          ) : (
            <>
              <div className="mb-4 bg-[rgba(0,0,0,0.03)] rounded-lg px-3 py-2 text-[11.5px] text-[#2C2C2A]">
                Final achievement: <strong>{pct}%</strong>
                {isFinalized && <span className="ml-2 text-[#3B6D11]">✓ Finalized on {new Date(reflection.finalized_at).toLocaleDateString()}</span>}
              </div>

              {/* ---------- OWNER SECTION ---------- */}
              {mode === 'owner' && (
                <SectionOwner
                  form={form} setForm={setForm}
                  locked={selfLocked || isFinalized}
                  saving={saving}
                  onDraft={() => doSaveSelf({ submit: false })}
                  onSubmit={() => doSaveSelf({ submit: true })}
                />
              )}

              {/* ---------- MANAGER SECTION ---------- */}
              {mode === 'manager' && (
                <>
                  <OwnerReadOnly reflection={reflection} />
                  <div className="mt-4 pt-4 border-t border-[rgba(0,0,0,0.06)]">
                    <SectionManager
                      form={form} setForm={setForm}
                      locked={managerLocked || isFinalized}
                      saving={saving}
                      onDraft={() => doSaveManager({ submit: false })}
                      onSubmit={() => doSaveManager({ submit: true })}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionOwner({ form, setForm, locked, saving, onDraft, onSubmit }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-[10px] uppercase tracking-wider text-[#9B8C82] block mb-1.5">
          Self-rating (1 = well below, 5 = far exceeded)
        </label>
        <Rating value={form.self_rating} onChange={v => setForm({ ...form, self_rating: v })} disabled={locked} />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-[#9B8C82] block mb-1.5">What went well?</label>
        <textarea value={form.self_went_well}
          onChange={e => setForm({ ...form, self_went_well: e.target.value })}
          rows={3} disabled={locked}
          className="w-full text-[12.5px] text-[#2C2C2A] bg-[#F5F3EF] border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-2 focus:outline-none focus:border-[#2C2C2A] disabled:opacity-70" />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-[#9B8C82] block mb-1.5">What would you do differently?</label>
        <textarea value={form.self_improve}
          onChange={e => setForm({ ...form, self_improve: e.target.value })}
          rows={3} disabled={locked}
          className="w-full text-[12.5px] text-[#2C2C2A] bg-[#F5F3EF] border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-2 focus:outline-none focus:border-[#2C2C2A] disabled:opacity-70" />
      </div>
      {!locked && (
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onDraft} disabled={saving}
            className="text-[12px] px-4 py-1.5 border border-[rgba(0,0,0,0.08)] text-[#9B8C82] rounded-md hover:bg-[rgba(0,0,0,0.03)] disabled:opacity-50">
            Save draft
          </button>
          <button onClick={onSubmit} disabled={saving}
            className="text-[12px] px-4 py-1.5 bg-[#2C2C2A] text-[#DFDDD9] rounded-md hover:bg-[#3D3D3A] font-medium disabled:opacity-50">
            Submit
          </button>
        </div>
      )}
      {locked && <p className="text-[11px] text-[#3B6D11]">✓ Submitted — waiting on manager review to finalize.</p>}
    </div>
  )
}

function OwnerReadOnly({ reflection }) {
  if (!reflection?.self_submitted_at) {
    return <p className="text-[11.5px] text-[#B7A99D] italic">Owner hasn't submitted their reflection yet.</p>
  }
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-wider text-[#9B8C82]">Their self-rating</p>
        <Rating value={reflection.self_rating} disabled readOnly />
      </div>
      {reflection.self_went_well && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#9B8C82] mb-1">What went well</p>
          <p className="text-[12px] text-[#2C2C2A] bg-[rgba(0,0,0,0.03)] rounded-md px-3 py-2">{reflection.self_went_well}</p>
        </div>
      )}
      {reflection.self_improve && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#9B8C82] mb-1">What to improve</p>
          <p className="text-[12px] text-[#2C2C2A] bg-[rgba(0,0,0,0.03)] rounded-md px-3 py-2">{reflection.self_improve}</p>
        </div>
      )}
    </div>
  )
}

function SectionManager({ form, setForm, locked, saving, onDraft, onSubmit }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-[10px] uppercase tracking-wider text-[#9B8C82] block mb-1.5">Your rating</label>
        <Rating value={form.manager_rating} onChange={v => setForm({ ...form, manager_rating: v })} disabled={locked} />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-[#9B8C82] block mb-1.5">Your notes</label>
        <textarea value={form.manager_notes}
          onChange={e => setForm({ ...form, manager_notes: e.target.value })}
          rows={3} disabled={locked}
          className="w-full text-[12.5px] text-[#2C2C2A] bg-[#F5F3EF] border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-2 focus:outline-none focus:border-[#2C2C2A] disabled:opacity-70" />
      </div>
      {!locked && (
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onDraft} disabled={saving}
            className="text-[12px] px-4 py-1.5 border border-[rgba(0,0,0,0.08)] text-[#9B8C82] rounded-md hover:bg-[rgba(0,0,0,0.03)] disabled:opacity-50">
            Save draft
          </button>
          <button onClick={onSubmit} disabled={saving}
            className="text-[12px] px-4 py-1.5 bg-[#2C2C2A] text-[#DFDDD9] rounded-md hover:bg-[#3D3D3A] font-medium disabled:opacity-50">
            Submit
          </button>
        </div>
      )}
      {locked && <p className="text-[11px] text-[#3B6D11]">✓ Your review submitted.</p>}
    </div>
  )
}

function Rating({ value, onChange, disabled, readOnly }) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map(n => {
        const active = value === n
        return (
          <button key={n}
            type="button"
            onClick={() => !disabled && onChange?.(n)}
            disabled={disabled}
            className={`w-10 h-10 text-[14px] rounded-md border transition-colors ${
              active
                ? 'border-[#2C2C2A] bg-[#F5F3EF] text-[#2C2C2A] font-medium border-2'
                : 'border-[rgba(0,0,0,0.08)] bg-[#F5F3EF] text-[#9B8C82]'
            } ${readOnly || disabled ? 'cursor-default' : 'hover:text-[#2C2C2A]'}`}>
            {n}
          </button>
        )
      })}
    </div>
  )
}
