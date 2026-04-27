'use client'
// Section 7 of the UX/UI brief — 3-step OKR creation wizard.
//
//   Step 1  Objective    — title + quarter
//   Step 2  Cascade link  — brand selector + CascadePicker + LineOfSight
//   Step 3  Key results   — 2–4 KR rows + LineOfSight (locked) + save/submit
//
// Followed by a post-submission status screen (not a toast).
//
// The legacy OkrFormModal is still used for EDIT mode; the wizard is
// strictly a NEW-OKR experience driven from the dashboard's "+ Add
// objective" button. Brand-level OKRs skip the cascade picker (Step 2
// shows just the brand confirmation since brand OKRs are top of tree).

import { useEffect, useMemo, useState } from 'react'
import {
  fetchParentCandidates, fetchIndividualParentCandidates,
  currentQuarter, currentYear,
} from '../lib/okr'
import LineOfSight from './LineOfSight'
import CascadePicker from './CascadePicker'

const QUARTERS = [
  { value: 1, label: 'Q1' },
  { value: 2, label: 'Q2' },
  { value: 3, label: 'Q3' },
  { value: 4, label: 'Q4' },
  { value: 'annual', label: 'Annual' },
]

const KR_TYPES = [
  { value: 'numeric',    label: 'Number' },
  { value: 'percentage', label: 'Percent' },
  { value: 'currency',   label: 'Currency' },
  { value: 'binary',     label: 'Yes / No' },
  { value: 'milestone',  label: 'Milestone' },
]

function newBlankKr() {
  return {
    title: '',
    kr_type: 'numeric',
    start_value: 0,
    target_value: '',
    current_value: 0,
    unit: '',
    owner_id: '',
  }
}

export default function OkrCreateWizard({
  // Context (from the dashboard at the time "+ Add objective" was clicked).
  level,                 // 'brand' | 'team' | 'individual'
  defaultBrand,          // pre-fills the brand selector in Step 2
  defaultTeam,           // pre-fills team for team-level
  defaultYear,
  defaultQuarter,
  currentProfile,
  members,
  supabase,

  // Save callbacks. The wizard handles the orchestration; the parent
  // performs the actual DB write via these props.
  onSaveDraft,           // ({objective, keyResults}) => Promise<saved>
  onSubmitForApproval,   // ({objective, keyResults}) => Promise<saved> — only meaningful for individual
  onClose,
}) {
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(null)  // { mode: 'draft'|'submitted', data }

  // ===== Form state =====
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [quarter, setQuarter] = useState(
    defaultQuarter === 'annual' ? 'annual' : (defaultQuarter || currentQuarter())
  )
  const [year] = useState(defaultYear || currentYear())
  const [brand, setBrand] = useState(defaultBrand || currentProfile?.squad || 'KC')
  const [team] = useState(defaultTeam || currentProfile?.team || '')
  const [parentSelection, setParentSelection] = useState(null) // 'kr:UUID' | 'o:UUID' | null
  const [parentObjectiveId, setParentObjectiveId] = useState(null)
  const [krs, setKrs] = useState([newBlankKr(), newBlankKr()])

  // ===== Cascade candidates =====
  const [candidates, setCandidates] = useState([])

  useEffect(() => {
    if (!supabase) return
    if (level === 'brand') { setCandidates([]); return }
    if (level === 'individual') {
      fetchIndividualParentCandidates(supabase, {
        year, quarter,
        userTeam: currentProfile?.team,
        userSquad: currentProfile?.squad,
      }).then(setCandidates).catch(() => setCandidates([]))
    } else {
      fetchParentCandidates(supabase, { year, quarter, level, brand })
        .then(setCandidates).catch(() => setCandidates([]))
    }
  }, [supabase, level, brand, year, quarter, currentProfile?.team, currentProfile?.squad])

  // ===== Derived values for the line-of-sight badge =====
  const parentLabel = useMemo(() => {
    if (!parentSelection) return ''
    if (parentSelection.startsWith('kr:')) {
      const krId = parentSelection.slice(3)
      for (const p of candidates) {
        const k = (p.key_results || []).find(x => x.id === krId)
        if (k) return k.title
      }
    }
    if (parentSelection.startsWith('o:')) {
      const oid = parentSelection.slice(2)
      const o = candidates.find(p => p.id === oid)
      if (o) return o.title + ' (whole objective)'
    }
    return ''
  }, [parentSelection, candidates])

  // ===== Step navigation guards =====
  const step1Valid = title.trim().length >= 5
  const step2Valid = level === 'brand'
    ? !!brand
    : !!parentSelection || candidates.length === 0  // allow standalone if no candidates exist
  const validKrs = krs.filter(k => k.title.trim() && k.target_value !== '')
  const step3Valid = validKrs.length >= 2

  // ===== Submit =====
  const buildPayload = () => {
    const isAnnual = quarter === 'annual'
    return {
      objective: {
        title: title.trim(),
        description: description || null,
        level,
        brand: (level === 'team' || level === 'individual') && !brand ? null : brand,
        team: (level === 'team' || level === 'individual') ? (team || null) : null,
        year: Number(year),
        quarter: isAnnual ? null : Number(quarter),
        is_annual: isAnnual,
        owner_id: currentProfile?.id || null,
        parent_objective_id:
          parentSelection?.startsWith('o:')
            ? parentSelection.slice(2)
            : (parentObjectiveId || null),
        parent_kr_id:
          parentSelection?.startsWith('kr:')
            ? parentSelection.slice(3)
            : null,
        tags: [],
        is_private: level === 'individual',
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
    }
  }

  const handleSaveDraft = async () => {
    try {
      const payload = buildPayload()
      await onSaveDraft(payload)
      setSubmitted({ mode: 'draft', payload })
    } catch (e) { alert('Failed: ' + e.message) }
  }

  const handleSubmit = async () => {
    try {
      const payload = buildPayload()
      // For individual OKRs, the dashboard's onSubmitForApproval flips
      // approval_status → 'pending_approval' after the objective is created.
      if (level === 'individual' && onSubmitForApproval) {
        await onSubmitForApproval(payload)
        setSubmitted({ mode: 'submitted', payload })
      } else {
        await onSaveDraft(payload)
        setSubmitted({ mode: 'submitted', payload })
      }
    } catch (e) { alert('Failed: ' + e.message) }
  }

  // ===== Post-submission screen =====
  if (submitted) {
    return (
      <ModalShell title="" onClose={onClose} wide>
        <SubmittedScreen
          mode={submitted.mode}
          level={level}
          brand={brand}
          parentLabel={parentLabel}
          ownLabel={title}
          onCreateAnother={() => {
            setSubmitted(null); setStep(1)
            setTitle(''); setDescription(''); setParentSelection(null); setParentObjectiveId(null)
            setKrs([newBlankKr(), newBlankKr()])
          }}
          onClose={onClose}
        />
      </ModalShell>
    )
  }

  return (
    <ModalShell title={`New objective · Step ${step} of 3`} onClose={onClose} wide>
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3].map(s => (
          <span
            key={s}
            className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-ss-text' : 'bg-ss-muted'}`}
          />
        ))}
      </div>

      {/* ============================================================ */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] text-ss-muted-text font-medium block mb-1.5">
              What do you want to achieve this quarter?
            </label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={140}
              placeholder="e.g. Establish onest as Thailand's leading premium home-care brand"
              className="w-full text-[14px] border border-ss-divider rounded-lg px-3 py-2.5 text-ss-text placeholder-ss-hint bg-ss-card focus:outline-none focus:border-ss-text"
            />
            <p className="text-[10.5px] text-ss-hint mt-1.5">
              Write as an ambitious outcome, not a task. Minimum 5 characters.
            </p>
          </div>

          <div>
            <label className="text-[11px] text-ss-muted-text font-medium block mb-1.5">
              When?
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUARTERS.map(q => {
                const active = quarter === q.value
                return (
                  <button
                    key={q.value}
                    type="button"
                    onClick={() => setQuarter(q.value)}
                    className={`text-[11.5px] px-3 py-1.5 rounded-full transition-colors font-medium ${
                      active ? 'bg-ss-text text-ss-page' : 'bg-ss-muted text-ss-muted-text hover:bg-ss-hover'
                    }`}>
                    {q.label} {year}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="text-[11px] text-ss-muted-text font-medium block mb-1.5">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Context, rationale, or links"
              className="w-full text-[12.5px] border border-ss-divider rounded-lg px-3 py-2 text-ss-text placeholder-ss-hint bg-ss-card focus:outline-none focus:border-ss-text"
            />
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Brand selector */}
          <div>
            <label className="text-[11px] text-ss-muted-text font-medium block mb-1.5">
              Which brand does this OKR belong to?
            </label>
            <div className="flex flex-wrap gap-1.5">
              {['onest', 'grubby', 'KC'].map(b => {
                const active = brand === b
                const colors = {
                  onest:  { bg: '#D4EDBE', fg: '#2D5016' },
                  grubby: { bg: '#C8E0D0', fg: '#1B4D2A' },
                  KC:     { bg: '#E8E5DF', fg: '#5F5E5A' },
                }[b]
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBrand(b)}
                    style={active ? { background: colors.bg, color: colors.fg } : undefined}
                    className={`text-[11.5px] px-3 py-1.5 rounded-full transition-colors font-medium ${
                      active ? '' : 'bg-ss-muted text-ss-muted-text hover:bg-ss-hover'
                    }`}>
                    {b === 'KC' ? 'KC · Shared' : b}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Cascade picker — hidden for brand-level OKRs (top of tree) */}
          {level === 'brand' ? (
            <div className="bg-ss-muted rounded-md p-3 text-[12px] text-ss-muted-text">
              Brand-level OKRs sit at the top of the cascade — no parent needed.
              Click <strong>Next</strong> to add key results.
            </div>
          ) : (
            <div>
              <label className="text-[11px] text-ss-muted-text font-medium block mb-1.5">
                Cascade up to a parent KR
              </label>
              <CascadePicker
                candidates={candidates}
                value={parentSelection}
                onChange={(sel, parentId) => {
                  setParentSelection(sel)
                  setParentObjectiveId(parentId)
                }}
              />
              <p className="text-[10.5px] text-ss-hint mt-1.5">
                Tip: cascade to a specific <strong>KR</strong> for sharper line of sight.
                "Whole Objective" is fine for strategic support OKRs.
              </p>
            </div>
          )}

          {/* Live LineOfSight preview */}
          {(level === 'brand' || parentSelection) && (
            <LineOfSight
              brand={brand}
              parentLabel={level === 'brand' ? '— Top of cascade —' : parentLabel}
              ownLabel={title}
            />
          )}
        </div>
      )}

      {/* ============================================================ */}
      {step === 3 && (
        <div className="space-y-4">
          <LineOfSight
            brand={brand}
            parentLabel={level === 'brand' ? '— Top of cascade —' : parentLabel}
            ownLabel={title}
            locked
          />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] text-ss-muted-text font-medium">
                Key results · {validKrs.length} of {krs.length} ready
              </label>
              {krs.length < 4 && (
                <button
                  type="button"
                  onClick={() => setKrs(prev => [...prev, newBlankKr()])}
                  className="text-[10.5px] text-ss-text hover:underline"
                >
                  + Add another
                </button>
              )}
            </div>
            <p className="text-[10.5px] text-ss-hint mb-2">
              2–4 measurable outcomes. Title + target are required.
            </p>

            <div className="space-y-2">
              {krs.map((kr, idx) => (
                <KrRow
                  key={idx}
                  idx={idx}
                  kr={kr}
                  members={members}
                  canRemove={krs.length > 2}
                  onChange={patch => setKrs(prev => prev.map((k, i) => i === idx ? { ...k, ...patch } : k))}
                  onRemove={() => setKrs(prev => prev.filter((_, i) => i !== idx))}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-5 pt-3 border-t border-ss-divider">
        <button
          type="button"
          onClick={() => step === 1 ? onClose() : setStep(s => s - 1)}
          className="text-[11.5px] px-3.5 py-2 text-ss-muted-text hover:text-ss-text transition-colors"
        >
          {step === 1 ? 'Cancel' : '← Back'}
        </button>
        <div className="flex items-center gap-2">
          {step === 3 && (
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={!step3Valid}
              className={`text-[11.5px] px-3.5 py-2 border border-ss-divider rounded-lg transition-colors ${
                step3Valid ? 'text-ss-text hover:bg-ss-hover' : 'text-ss-hint cursor-not-allowed'
              }`}
            >
              Save as draft
            </button>
          )}
          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
              className={`text-[11.5px] px-4 py-2 rounded-lg font-medium transition-colors ${
                ((step === 1 && step1Valid) || (step === 2 && step2Valid))
                  ? 'bg-ss-text text-ss-page hover:opacity-90'
                  : 'bg-ss-muted text-ss-hint cursor-not-allowed'
              }`}
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!step3Valid}
              className={`text-[11.5px] px-4 py-2 rounded-lg font-medium transition-colors ${
                step3Valid ? 'bg-ss-text text-ss-page hover:opacity-90'
                  : 'bg-ss-muted text-ss-hint cursor-not-allowed'
              }`}
            >
              {level === 'individual' ? 'Submit for approval →' : 'Save objective →'}
            </button>
          )}
        </div>
      </div>
    </ModalShell>
  )
}

// ============================================================
// KR row — used by Step 3
// ============================================================
function KrRow({ idx, kr, onChange, onRemove, canRemove, members }) {
  const inputCls = 'w-full text-[12px] border border-ss-divider rounded-md px-2 py-1.5 text-ss-text placeholder-ss-hint bg-ss-page focus:outline-none focus:border-ss-text'
  return (
    <div className="bg-ss-card border border-ss-divider rounded-md px-3 py-2.5">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10.5px] font-medium text-ss-muted-text w-8">KR{idx + 1}</span>
        <input
          type="text"
          value={kr.title}
          onChange={e => onChange({ title: e.target.value })}
          placeholder="Measurable outcome statement"
          maxLength={140}
          className={inputCls}
        />
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-ss-hint hover:text-ss-red text-[14px] flex-shrink-0"
            title="Remove this KR"
          >
            ✕
          </button>
        )}
      </div>
      <div className="grid grid-cols-5 gap-1.5 ml-10">
        <select
          value={kr.kr_type}
          onChange={e => onChange({ kr_type: e.target.value })}
          className={inputCls}
        >
          {KR_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input
          type="number"
          step="any"
          value={kr.start_value}
          onChange={e => onChange({ start_value: e.target.value })}
          placeholder="Start"
          className={inputCls}
        />
        <input
          type="number"
          step="any"
          value={kr.target_value}
          onChange={e => onChange({ target_value: e.target.value })}
          placeholder="Target *"
          className={inputCls}
        />
        <input
          type="text"
          value={kr.unit}
          onChange={e => onChange({ unit: e.target.value })}
          placeholder="Unit"
          className={inputCls}
        />
        <select
          value={kr.owner_id}
          onChange={e => onChange({ owner_id: e.target.value })}
          className={inputCls}
        >
          <option value="">— Owner</option>
          {(members || []).filter(m => m.profile_id).map(m => (
            <option key={m.profile_id} value={m.profile_id}>{m.nickname || m.name}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

// ============================================================
// Submitted / draft confirmation screen
// ============================================================
function SubmittedScreen({ mode, level, brand, parentLabel, ownLabel, onCreateAnother, onClose }) {
  const isApprovalFlow = level === 'individual' && mode === 'submitted'
  return (
    <div className="text-center py-3">
      {/* Success icon */}
      <div className="w-12 h-12 mx-auto rounded-full bg-[#D4EDBE] flex items-center justify-center mb-3">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M5 12l5 5L20 7" stroke="#2D5016" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <h2 className="text-[15px] font-medium text-ss-text">
        {isApprovalFlow ? 'OKR submitted for approval' : 'OKR saved'}
      </h2>
      <p className="text-[11.5px] text-ss-muted-text mt-1">
        {isApprovalFlow
          ? 'Your manager will review and approve, or request changes.'
          : 'You can edit, request approval, or add KRs later.'}
      </p>

      {/* Cascade chain */}
      <div className="mt-4 flex justify-center">
        <LineOfSight brand={brand} parentLabel={parentLabel || '— Top of cascade —'} ownLabel={ownLabel} locked />
      </div>

      {/* Status trail */}
      {isApprovalFlow && (
        <div className="mt-4 flex items-center justify-center gap-2 text-[10.5px]">
          {[
            { label: 'Drafted',         done: true },
            { label: 'Submitted',       done: true },
            { label: 'Pending review',  done: false, current: true },
            { label: 'Approved',        done: false },
          ].map((s, i, arr) => (
            <span key={s.label} className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  s.done ? 'bg-[#639922]' : s.current ? 'bg-[#BA7517]' : 'bg-ss-muted'
                }`}
              />
              <span className={s.done || s.current ? 'text-ss-text font-medium' : 'text-ss-hint'}>
                {s.label}
              </span>
              {i < arr.length - 1 && <span className="text-ss-hint">→</span>}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-center gap-2 mt-5">
        <button
          type="button"
          onClick={onClose}
          className="text-[11.5px] px-4 py-2 border border-ss-divider rounded-lg text-ss-muted-text hover:text-ss-text hover:bg-ss-hover transition-colors"
        >
          Done
        </button>
        <button
          type="button"
          onClick={onCreateAnother}
          className="text-[11.5px] px-4 py-2 bg-ss-text text-ss-page rounded-lg font-medium hover:opacity-90 transition-colors"
        >
          + Create another OKR
        </button>
      </div>
    </div>
  )
}

// ============================================================
// Modal shell — replicates the legacy ModalShell with simpler API
// ============================================================
function ModalShell({ title, children, onClose, wide }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-2 sm:p-4">
      <div className={`bg-ss-page rounded-xl shadow-xl w-full ${wide ? 'max-w-[640px]' : 'max-w-[480px]'} my-4`}>
        {title && (
          <div className="bg-ss-sidebar rounded-t-xl px-4 py-3 flex items-center justify-between">
            <p className="text-[13px] text-ss-page font-medium">{title}</p>
            <button onClick={onClose} className="text-[#9F9A8C] hover:text-ss-page text-[18px]">×</button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
