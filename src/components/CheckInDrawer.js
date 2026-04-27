'use client'
// Section 9 of the UX/UI brief — weekly check-in drawer.
// A single drawer that stacks all of the user's pending KRs vertically.
// KR sections beyond the first are dimmed (opacity 0.5) until the
// preceding KR is submitted. Each section has a cascade path, KR label
// + current value/target, sparkline history, confidence tapper, note,
// and Submit/Skip footer.

import { useState, useEffect, useMemo } from 'react'
import { useSupabase, useUser } from '../lib/hooks'
import { saveCheckIn, getMondayOf, fetchCheckInsBatch, currentQuarter } from '../lib/okr'
import ConfidenceTapper from './ConfidenceTapper'
import SparklineRow from './SparklineRow'

// Compute "Week N of 13" for the current quarter.
function currentWeekOfQuarter() {
  const now = new Date()
  const q = currentQuarter()
  const startMonth = (q - 1) * 3
  const start = new Date(now.getFullYear(), startMonth, 1)
  const diffMs = now - start
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 3600 * 1000)) + 1
  return Math.max(1, Math.min(13, diffWeeks))
}

export default function CheckInDrawer({ krs, onClose, onSaved }) {
  const supabase = useSupabase()
  const { user } = useUser()

  // Per-KR form state, keyed by index
  const [forms, setForms] = useState(() =>
    (krs || []).map(kr => ({
      value: kr.current_value ?? '',
      confidence: null,
      note: '',
    }))
  )
  const [submittedFlags, setSubmittedFlags] = useState(() => (krs || []).map(() => false))
  const [submittedMeta, setSubmittedMeta] = useState(() => (krs || []).map(() => null))
  const [historyByKr, setHistoryByKr] = useState({})
  const [savingIdx, setSavingIdx] = useState(-1)

  const weekOf = getMondayOf()
  const weekN = currentWeekOfQuarter()
  const quarter = currentQuarter()

  // Load last 8 weeks of check-ins for each KR — feeds the sparkline.
  useEffect(() => {
    if (!krs || krs.length === 0) return
    fetchCheckInsBatch(supabase, krs.map(k => k.id), 8)
      .then(setHistoryByKr)
      .catch(() => setHistoryByKr({}))
  }, [supabase, krs])

  const totalKrs = krs?.length || 0
  const submittedCount = submittedFlags.filter(Boolean).length
  const allDone = submittedCount === totalKrs

  // Index of the section currently editable. Sections beyond it are dimmed.
  const activeIdx = useMemo(() => submittedFlags.indexOf(false), [submittedFlags])

  const updateForm = (idx, patch) => {
    setForms(prev => prev.map((f, i) => i === idx ? { ...f, ...patch } : f))
  }

  const handleSubmit = async (idx, { skip = false } = {}) => {
    const kr = krs?.[idx]
    if (!kr || !user?.id) return
    const f = forms[idx]
    if (!skip && (!f.confidence || f.value === '' || f.value === null)) return
    setSavingIdx(idx)
    try {
      await saveCheckIn(supabase, {
        keyResultId: kr.id,
        value: f.value,
        confidence: f.confidence,
        note: f.note,
        weekOf,
        createdBy: user.id,
        isSkipped: skip,
      })
      setSubmittedFlags(prev => prev.map((s, i) => i === idx ? true : s))
      setSubmittedMeta(prev => prev.map((m, i) => i === idx ? {
        confidence: skip ? null : f.confidence,
        skipped: skip,
        weekN,
      } : m))
      onSaved?.(submittedCount + 1)
    } catch (err) {
      alert('Failed: ' + err.message)
    } finally {
      setSavingIdx(-1)
    }
  }

  if (!krs || krs.length === 0) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-stretch sm:justify-end" onClick={onClose}>
      <div
        className="bg-ss-page w-full sm:max-w-[520px] sm:h-full rounded-t-2xl sm:rounded-t-none sm:rounded-l-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header + progress bar */}
        <div className="px-5 pt-4 pb-3 border-b border-ss-divider">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[14px] font-medium text-ss-text">Weekly check-in</p>
              <p className="text-[11px] text-ss-muted-text mt-0.5">
                Your {totalKrs} key result{totalKrs !== 1 ? 's' : ''} · Q{quarter} · Week {weekN} of 13
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-ss-muted-text hover:text-ss-text text-[20px] leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="h-1.5 bg-ss-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-[#639922] transition-all duration-300"
              style={{ width: `${(submittedCount / totalKrs) * 100}%` }}
            />
          </div>
          <p className="text-[10px] text-ss-hint mt-1.5">
            {submittedCount} of {totalKrs} submitted
          </p>
        </div>

        {/* Stacked KR sections */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {krs.map((kr, i) => {
            const isActive  = i === activeIdx
            const isLocked  = !isActive && !submittedFlags[i]
            const isSubmitted = submittedFlags[i]
            return (
              <KrSection
                key={kr.id}
                kr={kr}
                form={forms[i]}
                history={historyByKr[kr.id] || []}
                onChange={(patch) => updateForm(i, patch)}
                onSubmit={() => handleSubmit(i)}
                onSkip={() => handleSubmit(i, { skip: true })}
                isActive={isActive}
                isLocked={isLocked}
                isSubmitted={isSubmitted}
                submitted={submittedMeta[i]}
                saving={savingIdx === i}
              />
            )
          })}
          {allDone && (
            <div className="text-center py-2">
              <p className="text-[12.5px] font-medium text-[#3B6D11]">
                ✓ All check-ins logged for week {weekN}
              </p>
              <button
                onClick={onClose}
                className="mt-2 text-[11.5px] px-4 py-1.5 bg-ss-text text-ss-page rounded-md font-medium hover:opacity-90"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Single KR section
// ============================================================
function KrSection({ kr, form, history, onChange, onSubmit, onSkip, isActive, isLocked, isSubmitted, submitted, saving }) {
  if (isSubmitted) {
    // Post-submit confirmation row
    return (
      <div className="bg-[#EAF3DE] border border-[#B8D98A] rounded-lg px-4 py-3 flex items-center gap-2">
        <span className="text-[#3B6D11] text-[16px] leading-none">✓</span>
        <p className="text-[12px] text-[#2D5016] font-medium flex-1 truncate">
          {kr.title}
        </p>
        <p className="text-[10.5px] text-[#3B6D11]">
          Submitted{submitted?.confidence ? ` · confidence ${submitted.confidence}/5` : (submitted?.skipped ? ' · skipped' : '')}
          {submitted?.weekN ? ` · week ${submitted.weekN} logged` : ''}
        </p>
      </div>
    )
  }

  const cascade = [
    kr.objective?.brand && `${kr.objective.brand} brand`,
    kr.objective?.title,
    kr.objective?.team,
  ].filter(Boolean).join(' › ')

  return (
    <div
      className={`bg-ss-card border border-ss-divider rounded-lg p-4 transition-opacity ${
        isLocked ? 'opacity-50 pointer-events-none' : ''
      }`}
      aria-disabled={isLocked}
    >
      {/* Cascade path */}
      {cascade && (
        <p className="text-[9.5px] uppercase tracking-wider text-ss-hint mb-1.5 truncate">
          {cascade}
        </p>
      )}

      {/* KR label + current/target */}
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <p className="text-[12.5px] font-medium text-ss-text leading-tight flex-1 min-w-0">
          {kr.title}
        </p>
        <p className="text-[10.5px] text-ss-muted-text flex-shrink-0 whitespace-nowrap">
          {kr.current_value ?? '—'}
          {kr.target_value != null && <> / {kr.target_value}{kr.unit ? ` ${kr.unit}` : ''}</>}
        </p>
      </div>

      {/* Sparkline history with live preview */}
      <div className="mb-3">
        <SparklineRow history={history} currentConfidence={form.confidence} />
      </div>

      {/* Current value input */}
      <div className="mb-3">
        <label className="text-[10px] uppercase tracking-wider text-ss-muted-text block mb-1">
          Current value
        </label>
        <div className="relative">
          <input
            type="number"
            step="any"
            value={form.value}
            onChange={e => onChange({ value: e.target.value })}
            disabled={isLocked}
            className="w-full text-[14px] text-ss-text bg-ss-page border border-ss-divider rounded-md px-3 py-2 focus:outline-none focus:border-ss-text"
          />
          {kr.unit && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ss-hint">
              {kr.unit}
            </span>
          )}
        </div>
      </div>

      {/* Confidence */}
      <div className="mb-3">
        <label className="text-[10px] uppercase tracking-wider text-ss-muted-text block mb-1.5">
          Confidence
        </label>
        <ConfidenceTapper
          value={form.confidence}
          onChange={(n) => onChange({ confidence: n })}
          disabled={isLocked}
        />
      </div>

      {/* Note */}
      <div className="mb-3">
        <label className="text-[10px] uppercase tracking-wider text-ss-muted-text block mb-1">
          Note <span className="text-ss-hint normal-case">(optional)</span>
        </label>
        <textarea
          value={form.note}
          onChange={e => onChange({ note: e.target.value })}
          disabled={isLocked}
          placeholder="What moved this week? Any blockers?"
          rows={2}
          className="w-full text-[12px] text-ss-text bg-ss-page border border-ss-divider rounded-md px-3 py-2 focus:outline-none focus:border-ss-text"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <button
          onClick={onSkip}
          disabled={isLocked || saving}
          className="text-[11px] text-ss-muted-text hover:text-ss-text disabled:opacity-50">
          Skip this week
        </button>
        <button
          onClick={onSubmit}
          disabled={isLocked || saving || !form.confidence || form.value === '' || form.value === null}
          className={`text-[11.5px] px-4 py-1.5 rounded-md font-medium transition-colors ${
            (form.confidence && form.value !== '' && !saving && !isLocked)
              ? 'bg-ss-text text-ss-page hover:opacity-90'
              : 'bg-ss-muted text-ss-hint cursor-not-allowed'
          }`}
        >
          {saving ? 'Saving…' : 'Submit'}
        </button>
      </div>
    </div>
  )
}
