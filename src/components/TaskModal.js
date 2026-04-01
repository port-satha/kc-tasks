'use client'
import { useState } from 'react'
import { STATUSES, MEMBERS, BRAND_COLORS, PRIORITY_COLORS, BRAND_LABELS } from '../lib/data'

export default function TaskModal({ task, onClose, onUpdate, onDelete }) {
  const [notes, setNotes] = useState(task.notes || '')
  const [status, setStatus] = useState(task.status)
  const [aiOutput, setAiOutput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const save = (field, val) => {
    onUpdate({ ...task, notes, status, [field]: val })
  }

  const aiAssist = async (mode) => {
    setAiLoading(true)
    setAiOutput('')
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, mode })
      })
      const data = await res.json()
      setAiOutput(data.result || data.error || 'No response.')
    } catch {
      setAiOutput('Could not connect. Please try again.')
    }
    setAiLoading(false)
  }

  const m = MEMBERS[task.assignee]
  const due = task.due ? new Date(task.due).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'No date'

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-end p-4 pt-12" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-gray-200 w-96 max-h-[85vh] overflow-y-auto shadow-xl"
        onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-base font-semibold text-gray-900 leading-snug pr-4">{task.title}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none flex-shrink-0">×</button>
          </div>
          <p className="text-xs text-gray-500 mb-3">{m?.label || task.assignee} · Due {due}</p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BRAND_COLORS[task.brand]}`}>{BRAND_LABELS[task.brand]}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>{task.priority} priority</span>
          </div>

          <label className="text-xs text-gray-500 font-medium block mb-1">Status</label>
          <select value={status} onChange={e => { setStatus(e.target.value); save('status', e.target.value) }}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-4 bg-white text-gray-800">
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>

          <label className="text-xs text-gray-500 font-medium block mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => save('notes', notes)}
            placeholder="Add notes..." rows={3}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-4 resize-none text-gray-800 placeholder-gray-400" />

          {/* AI Assist */}
          <div className="bg-gray-50 rounded-xl p-3 mb-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">AI assist</p>
            {aiLoading && <p className="text-xs text-gray-400 italic mb-2">Thinking...</p>}
            {aiOutput && !aiLoading && (
              <p className="text-xs text-gray-700 leading-relaxed mb-3 whitespace-pre-wrap">{aiOutput}</p>
            )}
            {!aiOutput && !aiLoading && (
              <p className="text-xs text-gray-400 mb-2">Pick an action to get AI suggestions.</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {[['breakdown', 'Break it down'], ['risk', 'Spot risks'], ['draft', 'Draft message']].map(([mode, label]) => (
                <button key={mode} onClick={() => aiAssist(mode)} disabled={aiLoading}
                  className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-100 text-gray-700 disabled:opacity-50 transition-colors">
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => { if (confirm('Delete this task?')) onDelete(task.id) }}
              className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
              Delete
            </button>
            <button onClick={onClose}
              className="text-xs px-4 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
