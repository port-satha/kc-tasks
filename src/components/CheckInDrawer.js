'use client'
import { useState, useEffect } from 'react'
import { useSupabase, useUser } from '../lib/hooks'
import { saveCheckIn, getMondayOf } from '../lib/okr'

/**
 * Check-in drawer. Accepts either a single KR or an array of KRs to step through.
 * - Desktop: slides in from right (480px wide)
 * - Mobile: bottom sheet, full-height
 *
 * Props:
 *   krs: array of { id, title, target_value, current_value, unit, objective?: { title } }
 *   onClose()
 *   onSaved(savedCount) — called after each save so parent can refresh
 */
export default function CheckInDrawer({ krs, onClose, onSaved }) {
  const supabase = useSupabase()
  const { user } = useUser()
  const [idx, setIdx] = useState(0)
  const [form, setForm] = useState({ value: '', confidence: 3, note: '' })
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState(0)

  const weekOf = getMondayOf()
  const currentKr = krs?.[idx]
  const isLast = idx === krs.length - 1

  useEffect(() => {
    // Pre-fill form with current KR's current_value
    if (currentKr) {
      setForm({ value: currentKr.current_value ?? '', confidence: 3, note: '' })
    }
  }, [currentKr?.id])

  const goNext = () => {
    if (isLast) onClose()
    else setIdx(i => i + 1)
  }

  const doSave = async ({ skip = false } = {}) => {
    if (!currentKr || !user?.id) return
    setSaving(true)
    try {
      await saveCheckIn(supabase, {
        keyResultId: currentKr.id,
        value: form.value,
        confidence: form.confidence,
        note: form.note,
        weekOf,
        createdBy: user.id,
        isSkipped: skip,
      })
      setSavedCount(c => c + 1)
      onSaved?.(savedCount + 1)
      goNext()
    } catch (err) {
      alert('Failed: ' + err.message)
    }
    setSaving(false)
  }

  if (!currentKr) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-stretch sm:justify-end" onClick={onClose}>
      <div
        className="bg-[#DFDDD9] w-full sm:max-w-[480px] sm:h-full rounded-t-2xl sm:rounded-t-none sm:rounded-l-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.06)] flex items-start justify-between">
          <div>
            <p className="text-[13px] font-medium text-[#2C2C2A]">Weekly check-in</p>
            <p className="text-[10px] text-[#9B8C82] mt-0.5">
              Week of {new Date(weekOf).toLocaleDateString()} · KR {idx + 1} of {krs.length}
            </p>
          </div>
          <button onClick={onClose} className="text-[#9B8C82] hover:text-[#2C2C2A] text-[18px]">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* KR context */}
          <div className="mb-4 bg-[#F5F3EF] border border-[rgba(0,0,0,0.04)] rounded-lg p-3">
            {currentKr.objective?.title && (
              <p className="text-[10px] text-[#9B8C82] truncate mb-1">{currentKr.objective.title}</p>
            )}
            <p className="text-[12.5px] font-medium text-[#2C2C2A] leading-tight">{currentKr.title}</p>
            <p className="text-[10px] text-[#9B8C82] mt-1">
              Last value: {currentKr.current_value ?? '—'}
              {currentKr.target_value != null && <> · Target: {currentKr.target_value}{currentKr.unit ? ` ${currentKr.unit}` : ''}</>}
            </p>
          </div>

          {/* Value */}
          <div className="mb-4">
            <label className="text-[10px] uppercase tracking-wider text-[#9B8C82] block mb-1.5">
              Current value
            </label>
            <div className="relative">
              <input type="number" step="any" value={form.value}
                onChange={e => setForm({ ...form, value: e.target.value })}
                autoFocus
                className="w-full text-[14px] text-[#2C2C2A] bg-[#F5F3EF] border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-2 focus:outline-none focus:border-[#2C2C2A]" />
              {currentKr.unit && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#9B8C82]">{currentKr.unit}</span>
              )}
            </div>
          </div>

          {/* Confidence */}
          <div className="mb-4">
            <label className="text-[10px] uppercase tracking-wider text-[#9B8C82] block mb-1.5">
              Confidence
            </label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map(n => {
                const active = form.confidence === n
                return (
                  <button key={n}
                    type="button"
                    onClick={() => setForm({ ...form, confidence: n })}
                    className={`flex-1 py-2 text-[13px] rounded-md border transition-colors ${
                      active
                        ? 'border-[#2C2C2A] bg-[#F5F3EF] text-[#2C2C2A] font-medium border-2'
                        : 'border-[rgba(0,0,0,0.08)] bg-[#F5F3EF] text-[#9B8C82] hover:text-[#2C2C2A]'
                    }`}>
                    {n}
                  </button>
                )
              })}
            </div>
            <div className="flex justify-between mt-1 text-[9px] text-[#B7A99D]">
              <span>1 = not confident</span>
              <span>5 = very confident</span>
            </div>
          </div>

          {/* Note */}
          <div className="mb-4">
            <label className="text-[10px] uppercase tracking-wider text-[#9B8C82] block mb-1.5">
              Note <span className="text-[#B7A99D] normal-case">(optional)</span>
            </label>
            <textarea value={form.note}
              onChange={e => setForm({ ...form, note: e.target.value })}
              placeholder="What's happening on this KR?"
              rows={3}
              className="w-full text-[12.5px] text-[#2C2C2A] bg-[#F5F3EF] border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-2 focus:outline-none focus:border-[#2C2C2A]" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[rgba(0,0,0,0.06)] flex gap-2">
          <button
            onClick={() => doSave({ skip: true })}
            disabled={saving}
            className="text-[11px] px-3 py-2 border border-[rgba(0,0,0,0.08)] text-[#9B8C82] rounded-md hover:bg-[rgba(0,0,0,0.03)] disabled:opacity-50">
            Skip week
          </button>
          <button
            onClick={() => doSave()}
            disabled={saving || form.value === ''}
            className="flex-1 text-[12px] px-4 py-2 bg-[#2C2C2A] text-[#DFDDD9] rounded-md hover:bg-[#3D3D3A] font-medium disabled:opacity-50">
            {saving ? 'Saving…' : (isLast ? 'Save & finish' : 'Save & next')}
          </button>
        </div>
      </div>
    </div>
  )
}
