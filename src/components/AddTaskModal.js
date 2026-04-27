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

  const inputClass = "w-full text-[13px] border border-[rgba(0,0,0,0.10)] rounded-lg px-3 py-2.5 bg-[#F5F3EF] text-[#2C2C2A] placeholder-[#B7A99D] focus:outline-none focus:border-[#2C2C2A] transition-colors"
  const selectClass = "w-full text-[13px] border border-[rgba(0,0,0,0.10)] rounded-lg px-3 py-2.5 bg-[#F5F3EF] text-[#2C2C2A] focus:outline-none focus:border-[#2C2C2A] transition-colors"
  const labelClass = "text-[11px] text-[#9B8C82] font-medium block mb-1"

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#F5F3EF] rounded-2xl border border-[rgba(0,0,0,0.04)] w-[460px] max-h-[90vh] overflow-y-auto shadow-xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#2C2C2A]">New task</h2>
          <button onClick={onClose} className="text-[#B7A99D] hover:text-[#2C2C2A] text-xl transition-colors">×</button>
        </div>

        <label className={labelClass}>Task title *</label>
        <input autoFocus value={form.title} onChange={e => set('title', e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="What needs to be done?"
          className={`${inputClass} mb-3`} />

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className={labelClass}>Section</label>
            <select value={form.section} onChange={e => set('section', e.target.value)} className={selectClass}>
              {sections.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Due date</label>
            <input type="date" value={form.due} onChange={e => set('due', e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className={labelClass}>Priority</label>
            <select value={form.priority} onChange={e => set('priority', e.target.value)} className={selectClass}>
              <option value="">—</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Value</label>
            <select value={form.value} onChange={e => set('value', e.target.value)} className={selectClass}>
              <option value="">—</option>
              {VALUES.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className={labelClass}>Effort level</label>
            <select value={form.effort} onChange={e => set('effort', e.target.value)} className={selectClass}>
              <option value="">—</option>
              {EFFORT_LEVELS.map(el => <option key={el} value={el}>{el}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Task Progress</label>
            <select value={form.progress} onChange={e => set('progress', e.target.value)} className={selectClass}>
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
            className="text-[11px] text-[#2C2C2A] hover:text-[#9B8C82] flex items-center gap-1 transition-colors">
            <span className="text-[10px]">{showRecurrence ? '▾' : '▸'}</span>
            {showRecurrence ? 'Remove repeat' : 'Set repeat schedule'}
          </button>
          {showRecurrence && (
            <div className="mt-2 bg-[rgba(0,0,0,0.02)] rounded-lg p-3 border border-[rgba(0,0,0,0.04)]">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-[10px] text-[#9B8C82] font-medium block mb-0.5">Repeat</label>
                  <select value={recurrence.type} onChange={e => setRecurrence(r => ({ ...r, type: e.target.value }))}
                    className="w-full text-[11px] border border-[rgba(0,0,0,0.06)] rounded px-2 py-1.5 bg-[#F5F3EF] text-[#2C2C2A]">
                    {RECURRENCE_TYPES.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[#9B8C82] font-medium block mb-0.5">Every</label>
                  <div className="flex items-center gap-1">
                    <input type="number" min="1" max="30" value={recurrence.interval}
                      onChange={e => setRecurrence(r => ({ ...r, interval: parseInt(e.target.value) || 1 }))}
                      className="w-14 text-[11px] border border-[rgba(0,0,0,0.06)] rounded px-2 py-1.5 bg-[#F5F3EF] text-[#2C2C2A]" />
                    <span className="text-[11px] text-[#9B8C82]">{recurrence.type === 'daily' ? 'day(s)' : recurrence.type === 'weekly' ? 'week(s)' : recurrence.type === 'monthly' ? 'month(s)' : 'year(s)'}</span>
                  </div>
                </div>
              </div>
              {recurrence.type === 'weekly' && (
                <div className="mb-2">
                  <label className="text-[10px] text-[#9B8C82] font-medium block mb-0.5">On days</label>
                  <div className="flex gap-1">
                    {WEEKDAYS.map((day, i) => (
                      <button key={day} type="button"
                        onClick={() => {
                          const days = recurrence.days.includes(i) ? recurrence.days.filter(d => d !== i) : [...recurrence.days, i]
                          setRecurrence(r => ({ ...r, days }))
                        }}
                        className={`text-[10px] px-2 py-1 rounded border transition-colors ${recurrence.days.includes(i) ? 'bg-[rgba(44,44,42,0.08)] border-[rgba(0,0,0,0.15)] text-[#2C2C2A] font-medium' : 'border-[rgba(0,0,0,0.06)] text-[#9B8C82]'}`}>
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {recurrence.type === 'monthly' && (
                <div className="mb-2">
                  <label className="text-[10px] text-[#9B8C82] font-medium block mb-0.5">Day of month</label>
                  <input type="number" min="1" max="31" value={recurrence.dayOfMonth}
                    onChange={e => setRecurrence(r => ({ ...r, dayOfMonth: parseInt(e.target.value) || 1 }))}
                    className="w-16 text-[11px] border border-[rgba(0,0,0,0.06)] rounded px-2 py-1.5 bg-[#F5F3EF] text-[#2C2C2A]" />
                </div>
              )}
              <div>
                <label className="text-[10px] text-[#9B8C82] font-medium block mb-0.5">End date (optional)</label>
                <input type="date" value={recurrence.endDate}
                  onChange={e => setRecurrence(r => ({ ...r, endDate: e.target.value }))}
                  className="w-full text-[11px] border border-[rgba(0,0,0,0.06)] rounded px-2 py-1.5 bg-[#F5F3EF] text-[#2C2C2A]" />
              </div>
            </div>
          )}
        </div>

        <label className={labelClass}>Notes</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
          placeholder="Optional..." rows={2}
          className={`${inputClass} mb-4 resize-none`} />

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-[13px] px-4 py-2 border border-[rgba(0,0,0,0.06)] rounded-lg text-[#9B8C82] hover:text-[#2C2C2A] hover:bg-[rgba(0,0,0,0.02)] transition-colors">Cancel</button>
          <button onClick={submit} className="text-[13px] px-5 py-2 bg-[#2C2C2A] text-[#DFDDD9] rounded-lg hover:bg-[#3D3D3A] transition-colors font-medium">Add task</button>
        </div>
      </div>
    </div>
  )
}
