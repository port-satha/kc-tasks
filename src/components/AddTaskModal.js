'use client'
import { useState } from 'react'
import { SECTIONS, PRIORITIES, VALUES, EFFORT_LEVELS, TASK_PROGRESS } from '../lib/data'
import MemberPicker from './MemberPicker'

export default function AddTaskModal({ members, onClose, onAdd }) {
  const [form, setForm] = useState({
    title: '', section: 'Recently assigned', priority: '',
    value: '', effort: '', progress: '', due: '', notes: '', assigned_to: null
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = () => {
    if (!form.title.trim()) return alert('Please enter a task title.')
    onAdd(form)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-gray-200 w-[420px] shadow-xl p-5" onClick={e => e.stopPropagation()}>
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
            <label className="text-xs text-gray-500 font-medium block mb-1">Section</label>
            <select value={form.section} onChange={e => set('section', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800">
              {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Due date</label>
            <input type="date" value={form.due} onChange={e => set('due', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Priority</label>
            <select value={form.priority} onChange={e => set('priority', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800">
              <option value="">—</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Value</label>
            <select value={form.value} onChange={e => set('value', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800">
              <option value="">—</option>
              {VALUES.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Effort level</label>
            <select value={form.effort} onChange={e => set('effort', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800">
              <option value="">—</option>
              {EFFORT_LEVELS.map(el => <option key={el} value={el}>{el}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Task Progress</label>
            <select value={form.progress} onChange={e => set('progress', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800">
              <option value="">—</option>
              {TASK_PROGRESS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="mb-3">
          <MemberPicker members={members || []} value={form.assigned_to} onChange={v => set('assigned_to', v)} />
        </div>

        <label className="text-xs text-gray-500 font-medium block mb-1">Notes</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
          placeholder="Optional..." rows={2}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-4 resize-none text-gray-800 placeholder-gray-400" />

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={submit} className="text-xs px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Add task</button>
        </div>
      </div>
    </div>
  )
}
