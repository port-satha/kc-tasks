'use client'
import { useState, useEffect } from 'react'
import { DEFAULT_SECTIONS, PRIORITIES, VALUES, EFFORT_LEVELS, TASK_PROGRESS, RECURRENCE_TYPES, WEEKDAYS, PRIORITY_COLORS, VALUE_COLORS, EFFORT_COLORS, PROGRESS_COLORS } from '../lib/data'
import { useSupabase, useUser } from '../lib/hooks'
import { createSubtask, updateSubtask, deleteSubtask, updateTask, deleteTask as deleteTaskDb, fetchProjects, createChildTask, fetchChildTasks, fetchParentTask } from '../lib/db'
import MemberPicker from './MemberPicker'
import TaskComments from './TaskComments'

export default function TaskModal({ task, members, sections: customSections, onClose, onUpdate, onDelete }) {
  const sectionList = customSections && customSections.length > 0 ? customSections : DEFAULT_SECTIONS
  const supabase = useSupabase()
  const { user } = useUser()
  const [projects, setProjects] = useState([])
  const currentMember = members?.find(m => m.profile_id === user?.id)

  useEffect(() => {
    fetchProjects(supabase).then(setProjects).catch(() => setProjects([]))
  }, [supabase])

  // Load child tasks
  useEffect(() => {
    fetchChildTasks(supabase, task.id).then(setChildTasks).catch(() => setChildTasks([]))
  }, [supabase, task.id])

  // Load parent task info if this is a child
  useEffect(() => {
    if (task.parent_task_id && !parentTaskInfo) {
      fetchParentTask(supabase, task.parent_task_id).then(setParentTaskInfo).catch(() => {})
    }
  }, [supabase, task.parent_task_id, parentTaskInfo])
  const [notes, setNotes] = useState(task.notes || '')
  const [section, setSection] = useState(task.section || 'Recently assigned')
  const [priority, setPriority] = useState(task.priority || '')
  const [value, setValue] = useState(task.value || '')
  const [effort, setEffort] = useState(task.effort || '')
  const [progress, setProgress] = useState(task.progress || '')
  const [due, setDue] = useState(task.due || '')
  const [assignedTo, setAssignedTo] = useState(task.assigned_to || '')
  const [newSubtask, setNewSubtask] = useState('')
  const [childTasks, setChildTasks] = useState(task.children || [])
  const [parentTaskInfo, setParentTaskInfo] = useState(task._parentTask || null)
  const [aiOutput, setAiOutput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [showRecurrence, setShowRecurrence] = useState(!!task.recurrence_rule)
  const [recurrence, setRecurrence] = useState(task.recurrence_rule || { type: 'weekly', interval: 1, days: [], dayOfMonth: 1, endDate: '' })
  const [showProjectPicker, setShowProjectPicker] = useState(false)

  const saveField = (field, val) => {
    onUpdate({ ...task, notes, section, priority, value, effort, progress, due, assigned_to: assignedTo, [field]: val })
  }

  const handleToggleSubtask = async (st) => {
    try { await updateSubtask(supabase, st.id, { done: !st.done }) }
    catch (err) { console.error('Failed:', err) }
  }

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return
    try {
      // Create as child task (Asana-style)
      const child = await createChildTask(supabase, task.id, {
        title: newSubtask.trim(),
        created_by: user?.id,
        project_id: task.project_id,
        section: task.section
      })
      setChildTasks(prev => [...prev, child])
      setNewSubtask('')
    } catch (err) { console.error('Failed:', err) }
  }

  const handleDeleteSubtask = async (stId) => {
    try { await deleteSubtask(supabase, stId) }
    catch (err) { console.error('Failed:', err) }
  }

  // Child task handlers
  const handleToggleChildDone = async (child) => {
    const newProgress = child.progress === 'Done' ? '' : 'Done'
    try {
      await updateTask(supabase, child.id, { progress: newProgress })
      setChildTasks(prev => prev.map(c => c.id === child.id ? { ...c, progress: newProgress } : c))
    } catch (err) { console.error('Failed:', err) }
  }

  const handleUpdateChild = async (child, field, value) => {
    try {
      await updateTask(supabase, child.id, { [field]: value || null })
      setChildTasks(prev => prev.map(c => c.id === child.id ? { ...c, [field]: value || null } : c))
    } catch (err) { console.error('Failed:', err) }
  }

  const handleDeleteChild = async (childId) => {
    try {
      await deleteTaskDb(supabase, childId)
      setChildTasks(prev => prev.filter(c => c.id !== childId))
    } catch (err) { console.error('Failed:', err) }
  }

  const aiAssist = async (mode) => {
    setAiLoading(true); setAiOutput('')
    try {
      const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task, mode }) })
      const data = await res.json()
      setAiOutput(data.result || data.error || 'No response.')
    } catch { setAiOutput('Could not connect.') }
    setAiLoading(false)
  }

  const formatSmartDate = (dateStr) => {
    if (!dateStr) return 'No date'
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const date = new Date(dateStr + 'T00:00:00')
    const diffDays = Math.round((date - today) / 86400000)
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'
    if (diffDays > 1 && diffDays <= 6) return date.toLocaleDateString('en-US', { weekday: 'long' })
    if (diffDays < -1 && diffDays >= -6) return `Last ${date.toLocaleDateString('en-US', { weekday: 'long' })}`
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  const dueDate = formatSmartDate(task.due)
  const subtasks = task.subtasks || []
  const subtaskDone = subtasks.filter(s => s.done).length
  const totalChildCount = childTasks.length + subtasks.length
  const totalChildDone = childTasks.filter(c => c.progress === 'Done').length + subtaskDone

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-end p-4 pt-12" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-gray-200 w-[420px] max-h-[85vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <div className="flex items-start justify-between mb-1">
            <div className="pr-4">
              {parentTaskInfo && (
                <p className="text-[11px] text-indigo-500 mb-0.5">{parentTaskInfo.title} ›</p>
              )}
              <h2 className="text-base font-semibold text-gray-900 leading-snug">{task.title}</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none flex-shrink-0">×</button>
          </div>
          <p className="text-xs text-gray-500 mb-4">Due {dueDate}</p>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {task.priority && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>{task.priority} priority</span>}
            {task.value && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${VALUE_COLORS[task.value]}`}>{task.value} value</span>}
            {task.effort && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EFFORT_COLORS[task.effort]}`}>{task.effort}</span>}
            {task.progress && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PROGRESS_COLORS[task.progress]}`}>{task.progress}</span>}
          </div>

          {/* Assign to */}
          <div className="mb-3">
            <MemberPicker members={members || []} value={assignedTo} onChange={v => { setAssignedTo(v); saveField('assigned_to', v) }} />
          </div>

          <label className="text-xs text-gray-500 font-medium block mb-1">Section</label>
          <select value={section} onChange={e => { setSection(e.target.value); saveField('section', e.target.value) }}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3 bg-white text-gray-800">
            {sectionList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

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
          <input type="date" value={due} onChange={e => { setDue(e.target.value); saveField('due', e.target.value || null) }}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3 bg-white text-gray-800" />

          {/* Recurrence setup */}
          <div className="mb-3">
            <button onClick={() => {
              if (showRecurrence) {
                setShowRecurrence(false)
                saveField('recurrence_rule', null)
              } else {
                setShowRecurrence(true)
              }
            }}
              className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mb-1">
              <span>{showRecurrence ? '▾' : '▸'}</span>
              {showRecurrence ? 'Remove repeat' : '🔁 Set repeat schedule'}
            </button>
            {showRecurrence && (
              <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="text-[10px] text-gray-500 font-medium block mb-0.5">Repeats</label>
                    <select value={recurrence.type} onChange={e => {
                      const r = { ...recurrence, type: e.target.value }
                      setRecurrence(r)
                      saveField('recurrence_rule', r)
                    }} className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-800">
                      {RECURRENCE_TYPES.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-medium block mb-0.5">Every</label>
                    <div className="flex items-center gap-1">
                      <input type="number" min="1" max="30" value={recurrence.interval}
                        onChange={e => {
                          const r = { ...recurrence, interval: parseInt(e.target.value) || 1 }
                          setRecurrence(r)
                          saveField('recurrence_rule', r)
                        }}
                        className="w-14 text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-800" />
                      <span className="text-xs text-gray-500">{recurrence.type === 'daily' ? 'day(s)' : recurrence.type === 'weekly' ? 'week(s)' : recurrence.type === 'monthly' ? 'month(s)' : 'year(s)'}</span>
                    </div>
                  </div>
                </div>
                {recurrence.type === 'weekly' && (
                  <div className="mb-2">
                    <label className="text-[10px] text-gray-500 font-medium block mb-0.5">On these days</label>
                    <div className="flex gap-1">
                      {WEEKDAYS.map((day, i) => (
                        <button key={day} type="button"
                          onClick={() => {
                            const days = recurrence.days?.includes(i) ? recurrence.days.filter(d => d !== i) : [...(recurrence.days || []), i]
                            const r = { ...recurrence, days }
                            setRecurrence(r)
                            saveField('recurrence_rule', r)
                          }}
                          className={`text-[10px] px-2 py-1 rounded border ${recurrence.days?.includes(i) ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'border-gray-200 text-gray-500 bg-white'}`}>
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
                      onChange={e => {
                        const r = { ...recurrence, dayOfMonth: parseInt(e.target.value) || 1 }
                        setRecurrence(r)
                        saveField('recurrence_rule', r)
                      }}
                      className="w-16 text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-800" />
                  </div>
                )}
                <div>
                  <label className="text-[10px] text-gray-500 font-medium block mb-0.5">End date (optional)</label>
                  <input type="date" value={recurrence.endDate || ''}
                    onChange={e => {
                      const r = { ...recurrence, endDate: e.target.value }
                      setRecurrence(r)
                      const saveRule = { ...r }
                      if (!saveRule.endDate) delete saveRule.endDate
                      saveField('recurrence_rule', saveRule)
                    }}
                    className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-800" />
                </div>
              </div>
            )}
          </div>

          {/* Add to project */}
          <div className="mb-3">
            <label className="text-xs text-gray-500 font-medium block mb-1">Project</label>
            {task.project_id ? (
              <div className="flex items-center gap-2">
                <span className="text-xs bg-indigo-50 text-indigo-700 rounded-lg px-3 py-1.5 border border-indigo-100">
                  {projects.find(p => p.id === task.project_id)?.name || 'Project'}
                </span>
                <button onClick={async () => {
                  try {
                    await updateTask(supabase, task.id, { project_id: null })
                    onUpdate({ ...task, project_id: null })
                  } catch (err) { console.error('Failed:', err) }
                }} className="text-[10px] text-gray-400 hover:text-red-600">Remove</button>
              </div>
            ) : (
              <>
                {showProjectPicker ? (
                  <div className="flex flex-col gap-1">
                    {projects.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No projects yet</p>
                    ) : (
                      projects.map(p => (
                        <button key={p.id} onClick={async () => {
                          try {
                            await updateTask(supabase, task.id, { project_id: p.id })
                            onUpdate({ ...task, project_id: p.id })
                            setShowProjectPicker(false)
                          } catch (err) { console.error('Failed:', err) }
                        }}
                          className="text-left text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 text-gray-700 transition-colors flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0"></span>
                          {p.name}
                        </button>
                      ))
                    )}
                    <button onClick={() => setShowProjectPicker(false)}
                      className="text-[10px] text-gray-400 hover:text-gray-600 mt-1">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setShowProjectPicker(true)}
                    className="text-xs px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-600 transition-colors flex items-center gap-1">
                    <span>+</span> Add to project
                  </button>
                )}
              </>
            )}
          </div>

          {/* Subtasks (Child Tasks) */}
          <div className="mb-3">
            <label className="text-xs text-gray-500 font-medium block mb-2">
              Subtasks {totalChildCount > 0 && <span className="text-gray-400">({totalChildDone}/{totalChildCount})</span>}
            </label>
            {(childTasks.length > 0 || subtasks.length > 0) && (
              <div className="bg-gray-50 rounded-lg border border-gray-200 mb-2 overflow-hidden">
                {/* Child tasks (Asana-style full tasks) */}
                {childTasks.map(child => {
                  const assignedMember = child.assigned_to && members ? members.find(m => m.id === child.assigned_to) : null
                  return (
                    <div key={child.id} className="border-b border-gray-100 last:border-0 group">
                      <div className="flex items-center gap-2 px-3 py-2">
                        <button onClick={() => handleToggleChildDone(child)}
                          className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${child.progress === 'Done' ? 'border-green-500 bg-green-500 hover:bg-green-400' : 'border-gray-300 hover:border-green-400'}`}>
                          {child.progress === 'Done' && <span className="text-white text-[9px]">✓</span>}
                        </button>
                        <span onClick={() => onClose() || setTimeout(() => onUpdate && onUpdate(child), 100)}
                          className={`text-xs flex-1 cursor-pointer hover:text-indigo-600 ${child.progress === 'Done' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{child.title}</span>
                        <button onClick={() => handleDeleteChild(child.id)}
                          className="text-gray-300 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 flex-shrink-0">×</button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 px-3 pb-2 pl-9">
                        <input type="date" value={child.due || ''}
                          onChange={e => handleUpdateChild(child, 'due', e.target.value)}
                          className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5 bg-white text-gray-600 w-28" />
                        <select value={child.priority || ''}
                          onChange={e => handleUpdateChild(child, 'priority', e.target.value)}
                          className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5 bg-white text-gray-600 w-20">
                          <option value="">Priority</option>
                          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <select value={child.progress || ''}
                          onChange={e => handleUpdateChild(child, 'progress', e.target.value)}
                          className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5 bg-white text-gray-600 w-24">
                          <option value="">Progress</option>
                          {TASK_PROGRESS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <select value={child.assigned_to || ''}
                          onChange={e => handleUpdateChild(child, 'assigned_to', e.target.value)}
                          className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5 bg-white text-gray-600 flex-1 max-w-[140px]">
                          <option value="">No assignee</option>
                          {(members || []).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        {assignedMember && (
                          <span className="text-[10px] bg-indigo-100 text-indigo-700 rounded-full px-1.5 py-0.5 flex-shrink-0">
                            {assignedMember.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
                {/* Legacy subtasks (from old subtasks table) */}
                {subtasks.map(st => {
                  const assignedMember = st.assigned_to && members ? members.find(m => m.id === st.assigned_to) : null
                  return (
                    <div key={st.id} className="border-b border-gray-100 last:border-0 group">
                      <div className="flex items-center gap-2 px-3 py-2">
                        <button onClick={() => handleToggleSubtask(st)}
                          className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${st.done ? 'border-green-500 bg-green-500 hover:bg-green-400' : 'border-gray-300 hover:border-green-400'}`}>
                          {st.done && <span className="text-white text-[9px]">✓</span>}
                        </button>
                        <span className={`text-xs flex-1 ${st.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{st.title}</span>
                        <button onClick={() => handleDeleteSubtask(st.id)}
                          className="text-gray-300 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 flex-shrink-0">×</button>
                      </div>
                      <div className="flex items-center gap-2 px-3 pb-2 pl-9">
                        <input type="date" value={st.due || ''}
                          onChange={e => updateSubtask(supabase, st.id, { due: e.target.value || null })}
                          className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5 bg-white text-gray-600 w-28" />
                        <select value={st.assigned_to || ''}
                          onChange={e => updateSubtask(supabase, st.id, { assigned_to: e.target.value || null })}
                          className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5 bg-white text-gray-600 flex-1 max-w-[140px]">
                          <option value="">No assignee</option>
                          {(members || []).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        {assignedMember && (
                          <span className="text-[10px] bg-indigo-100 text-indigo-700 rounded-full px-1.5 py-0.5 flex-shrink-0">
                            {assignedMember.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="flex gap-2">
              <input type="text" value={newSubtask} onChange={e => setNewSubtask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddSubtask()}
                placeholder="Add a subtask..." className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-800 placeholder-gray-400" />
              <button onClick={handleAddSubtask} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Add</button>
            </div>
          </div>

          <label className="text-xs text-gray-500 font-medium block mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => saveField('notes', notes)}
            placeholder="Add notes..." rows={3} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-4 resize-none text-gray-800 placeholder-gray-400" />

          {/* Comments / Discussion */}
          <div className="bg-gray-50 rounded-xl p-3 mb-4">
            <TaskComments
              taskId={task.id}
              members={members || []}
              currentMemberId={currentMember?.id}
            />
          </div>

          {/* AI Assist */}
          <div className="bg-gray-50 rounded-xl p-3 mb-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">AI assist</p>
            {aiLoading && <p className="text-xs text-gray-400 italic mb-2">Thinking...</p>}
            {aiOutput && !aiLoading && <p className="text-xs text-gray-700 leading-relaxed mb-3 whitespace-pre-wrap">{aiOutput}</p>}
            {!aiOutput && !aiLoading && <p className="text-xs text-gray-400 mb-2">Pick an action to get AI suggestions.</p>}
            <div className="flex flex-wrap gap-1.5">
              {[['breakdown', 'Break it down'], ['risk', 'Spot risks'], ['draft', 'Draft message']].map(([mode, label]) => (
                <button key={mode} onClick={() => aiAssist(mode)} disabled={aiLoading}
                  className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-100 text-gray-700 disabled:opacity-50">
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => { if (confirm('Delete this task?')) onDelete(task.id) }}
              className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">Delete</button>
            <button onClick={onClose} className="text-xs px-4 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700">Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}
