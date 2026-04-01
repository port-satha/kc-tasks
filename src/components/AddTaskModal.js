'use client'
import { useState } from 'react'
import { BRANDS, BRAND_LABELS, PRIORITIES, STATUSES, MEMBERS } from '../lib/data'

export default function AddTaskModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    title: '', brand: 'onest', priority: 'Med',
    assignee: 'P', due: '', status: 'To Do', notes: ''
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = () => {
    if (!form.title.trim()) return alert('Please enter a task title.')
    onAdd(form)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-gray-200 w-96 shadow-xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">New task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <label className="text-xs text-gray-500 font-medium block mb-1">Task title *</label>
        <input autoFocus value={form.title} onChange={e => set('title', e.target.value)}
          placeholder="What needs to be done?"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3 text-gray-800 placeholder-gray-400" />

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Brand</label>
            <select value={form.brand} onChange={e => set('brand', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800">
              {BRANDS.map(b => <option key={b} value={b}>{BRAND_LABELS[b]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Priority</label>
            <select value={form.priority} onChange={e => set('priority', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800">
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Assignee</label>
            <select value={form.assignee} onChange={e => set('assignee', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800">
              {Object.entries(MEMBERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Due date</label>
            <input type="date" value={form.due} onChange={e => set('due', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800" />
          </div>
        </div>

        <label className="text-xs text-gray-500 font-medium block mb-1">Status</label>
        <select value={form.status} onChange={e => set('status', e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3 bg-white text-gray-800">
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>

        <label className="text-xs text-gray-500 font-medium block mb-1">Notes</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
          placeholder="Optional..." rows={2}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-4 resize-none text-gray-800 placeholder-gray-400" />

        <div className="flex justify-end gap-2">
          <button onClick={onClose}
            className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={submit}
            className="text-xs px-4 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors">
            Add task
          </button>
        </div>
      </div>
    </div>
  )
}
