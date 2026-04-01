'use client'
import { useState } from 'react'
import { SECTIONS, PRIORITIES, VALUES, EFFORT_LEVELS, TASK_PROGRESS, PRIORITY_COLORS, VALUE_COLORS, EFFORT_COLORS, PROGRESS_COLORS, uid } from '../lib/data'

export default function TaskModal({ task, onClose, onUpdate, onDelete }) {
  const [notes, setNotes] = useState(task.notes || '')
  const [section, setSection] = useState(task.section || 'Recently assigned')
  const [priority, setPriority] = useState(task.priority || '')
  const [value, setValue] = useState(task.value || '')
  const [effort, setEffort] = useState(task.effort || '')
  const [progress, setProgress] = useState(task.progress || '')
  const [due, setDue] = useState(task.due || '')
  const [subtasks, setSubtasks] = useState(task.subtasks || [])
  const [newSubtask, setNewSubtask] = useState('')
  const [aiOutput, setAiOutput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const saveField = (field, val) => {
    onUpdate({ ...task, notes, section, priority, value, effort, progress, due, subtasks, [field]: val })
  }

  const toggleSubtask = (stId) => {
    const updated = subtasks.map(st =>
      st.id === stId ? { ...st, done: !st.done } : st
    )
    setSubtasks(updated)
    onUpdate({ ...task, notes, section, priority, value, effort, progress, due, subtasks: updated })
  }

  const addSubtask = () => {
    if (!newSubtask.trim()) return
    const updated = [...subtasks, { id: uid(), title: newSubtask.trim(), done: false }]
    setSubtasks(updated)
    setNewSubtask('')
    onUpdate({ ...task, notes, section, priority, value, effort, progress, due, subtasks: updated })
  }

  const removeSubtask = (stId) => {
    const updated = subtasks.filter(st => st.id !== stId)
    setSubtasks(updated)
    onUpdate({ ...task, notes, section, priority, value, effort, progress, due, subtasks: updated })
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

  const dueDate = task.due ? new Date(task.due).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'No date'
  const subtaskDone = subtasks.filter(s => s.done).length

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-end p-4 pt-12" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-gray-200 w-[420px] max-h-[85vh] overflow-y-auto shadow-xl"
        onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-base font-semibold text-gray-900 leading-snug pr-4">{task.title}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none flex-shrink-0">×</button>
          </div>
          <p className="text-xs text-gray-500 mb-4">Due {dueDate}</p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {task.priority && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>{task.priority} priority</span>}
            {task.value && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${VALUE_COLORS[task.value]}`}>{task.value} value</span>}
            {task.effort && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EFFORT_COLORS[task.effort]}`}>{task.effort}</span>}
            {task.progress && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PROGRESS_COLORS[task.progress]}`}>{task.progress}</span>}
          </div>

          {/* Section */}
          <label className="text-xs text-gray-500 font-medium block mb-1">Section</label>
          <select value={section} onChange={e => { setSection(e.target.value); saveField('section', e.target.value) }}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3 bg-white text-gray-800">
            {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Fields grid */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Priority</label>
              <select value={priority} onChange={e => { setPriority(e.target.value); saveField('priority', e.target.value) }}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800">
                <option value="">—</option>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Value</label>
              <select value={value} onChange={e => { setValue(e.target.value); saveField('value', e.target.value) }}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800">
                <option value="">—</option>
                {VALUES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Effort level</label>
              <select value={effort} onChange={e => { setEffort(e.target.value); saveField('effort', e.target.value) }}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800">
                <option value="">—</option>
                {EFFORT_LEVELS.map(el => <option key={el} value={el}>{el}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Task Progress</label>
              <select value={progress} onChange={e => { setProgress(e.target.value); saveField('progress', e.target.value) }}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800">
                <option value="">—</option>
                {TASK_PROGRESS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <label className="text-xs text-gray-500 font-medium block mb-1">Due date</label>
          <input type="date" value={due} onChange={e => { setDue(e.target.value); saveField('due', e.target.value) }}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3 bg-white text-gray-800" />

          {/* Subtasks */}
          <div className="mb-3">
            <label className="text-xs text-gray-500 font-medium block mb-2">
              Subtasks {subtasks.length > 0 && <span className="text-gray-400">({subtaskDone}/{subtasks.length})</span>}
            </label>
            {subtasks.length > 0 && (
              <div className="bg-gray-50 rounded-lg border border-gray-200 mb-2 overflow-hidden">
                {subtasks.map(st => (
                  <div key={st.id} className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-0 group">
                    <button
                      onClick={() => toggleSubtask(st.id)}
                      className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${st.done ? 'border-green-500 bg-green-500' : 'border-gray-300 hover:border-gray-400'}`}
                    >
                      {st.done && <span className="text-white text-[9px]">✓</span>}
                    </button>
                    <span className={`text-xs flex-1 ${st.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{st.title}</span>
                    <button
                      onClick={() => removeSubtask(st.id)}
                      className="text-gray-300 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSubtask()}
                placeholder="Add a subtask..."
                className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-800 placeholder-gray-400"
              />
              <button onClick={addSubtask}
                className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                Add
              </button>
            </div>
          </div>

          <label className="text-xs text-gray-500 font-medium block mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => saveField('notes', notes)}
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
