'use client'
import { useState } from 'react'
import { DEFAULT_SECTIONS, PRIORITIES, VALUES, EFFORT_LEVELS, TASK_PROGRESS, RECURRENCE_TYPES, WEEKDAYS } from '../lib/data'
import MemberPicker from './MemberPicker'

export default function AddTaskModal({ members, sections: customSections, onClose, onAdd, defaultSection }) {
  const sections = customSections && customSections.length > 0 ? customSections : DEFAULT_SECTIONS
  const [form, setForm] = useState({
    title: '', section: defaultSection || sections[0] || 'Recently assigned', priority: '',
    value: '', effort: '', progress: '', due: '', notes: '', assigned_to: null
  })
  const [showRecurrence, setShowRecurrence] = useState(false)
  const [recurrence, setRecurrence] = useState({ type: 'weekly', interval: 1, days: [], dayOfMonth: 1, endDate: '' })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = () => {
    if (!form.title.trim()) return alert('Please enter a task title.')
    const taskData = { ...form }
    // Clean empty strings to null
    if (!taskData.due) taskData.due = null
    if (!taskData.priority) taskData.priority = null
    if (!taskData.value) taskData.value = null
    if (!taskData.effort) taskData.effort = null
    if (!taskData.progress) taskData.progress = null
    if (showRecurrence) {
      taskData.recurrence_rule = { ...recurrence }
      if (!taskData.recurrence_rule.endDate) delete taskData.recurrence_rule.endDate
    }
    onAdd(taskData)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-gray-200 w-[460px] max-h-[90vh] overflow-y-auto shadow-xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">New task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <label className="text-xs text-gray-500 font-medium block mb-1">Task title *</label>
        <input autoFocus value={form.title} onChange={e => set('title', e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="What needs to be done?"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3 text-gray-800 placeholder-gray-400" />

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Section</label>
            <select value={form.section} onChange={e => set('section', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800">
              {sections.map(s => <option key={s} value={s}>{s}</option>)}
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

        {/* Recurrence */}
        <div className="mb-3">
          <button onClick={() => setShowRecurrence(!showRecurrence)}
            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
            <span>{showRecurrence ? '▾' : '▸'}</span>
            {showRecurrence ? 'Remove repeat' : '🔁 Set repeat schedule'}
          </button>
          {showRecurrence && (
            <div className="mt-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-[10px] text-gray-500 font-medium block mb-0.5">Repeat</label>
                  <select value={recurrence.type} onChange={e => setRecurrence(r => ({ ...r, type: e.target.value }))}
                    className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-800">
                    {RECURRENCE_TYPES.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-medium block mb-0.5">Every</label>
                  <div className="flex items-center gap-1">
                    <input type="number" min="1" max="30" value={recurrence.interval}
                      onChange={e => setRecurrence(r => ({ ...r, interval: parseInt(e.target.value) || 1 }))}
                      className="w-14 text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-800" />
                    <span className="text-xs text-gray-500">{recurrence.type === 'daily' ? 'day(s)' : recurrence.type === 'weekly' ? 'week(s)' : recurrence.type === 'monthly' ? 'month(s)' : 'year(s)'}</span>
                  </div>
                </div>
              </div>
              {recurrence.type === 'weekly' && (
                <div className="mb-2">
                  <label className="text-[10px] text-gray-500 font-medium block mb-0.5">On days</label>
                  <div className="flex gap-1">
                    {WEEKDAYS.map((day, i) => (
                      <button key={day} type="button"
                        onClick={() => {
                          const days = recurrence.days.includes(i) ? recurrence.days.filter(d => d !== i) : [...recurrence.days, i]
                          setRecurrence(r => ({ ...r, days }))
                        }}
                        className={`text-[10px] px-2 py-1 rounded border ${recurrence.days.includes(i) ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'border-gray-200 text-gray-500'}`}>
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {recurrence.type === 'monthly' && (
                <div className="mb-2">
                  <label className="text-[10px] text-gray-500 font-medium block mb-0.5">Day of month</label>
                  <input type="number" min="1" max="31" value={recurrence.dayOfMonth}
                    onChange={e => setRecurrence(r => ({ ...r, dayOfMonth: parseInt(e.target.value) || 1 }))}
                    className="w-16 text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-800" />
                </div>
              )}
              <div>
                <label className="text-[10px] text-gray-500 font-medium block mb-0.5">End date (optional)</label>
                <input type="date" value={recurrence.endDate}
                  onChange={e => setRecurrence(r => ({ ...r, endDate: e.target.value }))}
                  className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-800" />
              </div>
            </div>
          )}
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
