'use client'
import { useState, useEffect } from 'react'
import { DEFAULT_SECTIONS, PRIORITIES, VALUES, EFFORT_LEVELS, TASK_PROGRESS, RECURRENCE_TYPES, WEEKDAYS, PRIORITY_COLORS, VALUE_COLORS, EFFORT_COLORS, PROGRESS_COLORS } from '../lib/data'
import { useSupabase, useUser } from '../lib/hooks'
import { createSubtask, updateSubtask, deleteSubtask, updateTask, deleteTask as deleteTaskDb, fetchProjects, createChildTask, fetchChildTasks, fetchParentTask, duplicateTask } from '../lib/db'
import MemberPicker from './MemberPicker'
import TaskComments from './TaskComments'
import { getCompactName } from '../lib/profile'

export default function TaskModal({ task, members, sections: customSections, onClose, onUpdate, onDelete, onNavigate, readOnly = false }) {
  const sectionList = customSections && customSections.length > 0 ? customSections : DEFAULT_SECTIONS
  const supabase = useSupabase()
  const { user } = useUser()
  const [projects, setProjects] = useState([])
  const currentMember = members?.find(m => m.profile_id === user?.id)
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
  const [title, setTitle] = useState(task.title || '')
  const [editingTitle, setEditingTitle] = useState(false)
  const [aiOutput, setAiOutput] = useState('')

  useEffect(() => {
    fetchProjects(supabase).then(setProjects).catch(() => setProjects([]))
  }, [supabase])

  useEffect(() => {
    fetchChildTasks(supabase, task.id).then(setChildTasks).catch(() => setChildTasks([]))
  }, [supabase, task.id])

  // Resync all form state when the task changes (e.g. navigating to a subtask).
  // Without this, the modal shows the previous task's data.
  useEffect(() => {
    setNotes(task.notes || '')
    setSection(task.section || 'Recently assigned')
    setPriority(task.priority || '')
    setValue(task.value || '')
    setEffort(task.effort || '')
    setProgress(task.progress || '')
    setDue(task.due || '')
    setAssignedTo(task.assigned_to || '')
    setTitle(task.title || '')
    setEditingTitle(false)
    setShowRecurrence(!!task.recurrence_rule)
    setRecurrence(task.recurrence_rule || { type: 'weekly', interval: 1, days: [], dayOfMonth: 1, endDate: '' })
    setParentTaskInfo(task._parentTask || null)
  }, [task.id])

  useEffect(() => {
    if (task.parent_task_id && !parentTaskInfo) {
      fetchParentTask(supabase, task.parent_task_id).then(setParentTaskInfo).catch(() => {})
    }
  }, [supabase, task.parent_task_id, parentTaskInfo])
  const [aiLoading, setAiLoading] = useState(false)
  const [showRecurrence, setShowRecurrence] = useState(!!task.recurrence_rule)
  const [recurrence, setRecurrence] = useState(task.recurrence_rule || { type: 'weekly', interval: 1, days: [], dayOfMonth: 1, endDate: '' })
  const [showProjectPicker, setShowProjectPicker] = useState(false)
  // Inline rename state for subtasks (tracks which row is being edited)
  const [editingSubId, setEditingSubId] = useState(null)  // { kind: 'child'|'legacy', id }
  const [editingSubTitle, setEditingSubTitle] = useState('')

  const startEditSub = (kind, item) => {
    setEditingSubId({ kind, id: item.id })
    setEditingSubTitle(item.title)
  }
  const cancelEditSub = () => { setEditingSubId(null); setEditingSubTitle('') }
  const saveEditSub = async () => {
    if (!editingSubId) return
    const trimmed = editingSubTitle.trim()
    if (!trimmed) { cancelEditSub(); return }
    const { kind, id } = editingSubId
    try {
      if (kind === 'child') {
        setChildTasks(prev => prev.map(c => c.id === id ? { ...c, title: trimmed } : c))
        await updateTask(supabase, id, { title: trimmed })
      } else {
        setLocalSubtasks(prev => prev.map(s => s.id === id ? { ...s, title: trimmed } : s))
        await updateSubtask(supabase, id, { title: trimmed })
      }
    } catch (err) { console.error('Rename failed:', err) }
    cancelEditSub()
  }

  const saveField = (field, val) => {
    if (readOnly || !onUpdate) return
    onUpdate({ ...task, notes, section, priority, value, effort, progress, due, assigned_to: assignedTo, [field]: val })
  }

  const handleToggleSubtask = async (st) => {
    // Optimistic local update
    setLocalSubtasks(prev => prev.map(s => s.id === st.id ? { ...s, done: !st.done } : s))
    try { await updateSubtask(supabase, st.id, { done: !st.done }) }
    catch (err) {
      console.error('Failed:', err)
      // Revert on failure
      setLocalSubtasks(prev => prev.map(s => s.id === st.id ? { ...s, done: st.done } : s))
    }
  }

  const handleUpdateSubtaskField = async (st, field, value) => {
    setLocalSubtasks(prev => prev.map(s => s.id === st.id ? { ...s, [field]: value } : s))
    try { await updateSubtask(supabase, st.id, { [field]: value || null }) }
    catch (err) {
      console.error('Failed:', err)
      setLocalSubtasks(prev => prev.map(s => s.id === st.id ? { ...s, [field]: st[field] } : s))
    }
  }

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return
    try {
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
    setLocalSubtasks(prev => prev.filter(s => s.id !== stId))
    try { await deleteSubtask(supabase, stId) }
    catch (err) { console.error('Failed:', err) }
  }

  // Promote a legacy subtask to a full child task so it can be edited fully
  // and have its own sub-items. Preserves title, due, assignee, and done state.
  const handlePromoteSubtask = async (st) => {
    if (!confirm(`Open "${st.title}" as a full task?\n\nThis lets you edit all fields (priority, notes, etc.) and add sub-items under it.`)) return
    try {
      const newChild = await createChildTask(supabase, task.id, {
        title: st.title,
        created_by: user?.id,
        project_id: task.project_id,
        section: task.section,
      })
      // Copy over the subtask's existing fields
      const fields = {}
      if (st.due) fields.due = st.due
      if (st.assigned_to) fields.assigned_to = st.assigned_to
      if (st.done) fields.progress = 'Done'
      if (Object.keys(fields).length > 0) {
        await updateTask(supabase, newChild.id, fields)
        Object.assign(newChild, fields)
      }
      // Delete the original subtask
      await deleteSubtask(supabase, st.id)
      // Update local state: add child, remove subtask
      setChildTasks(prev => [...prev, newChild])
      setLocalSubtasks(prev => prev.filter(s => s.id !== st.id))
      // Open the new child's detail view
      if (onNavigate) onNavigate({ id: newChild.id })
    } catch (err) {
      alert('Failed to convert: ' + err.message)
    }
  }

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
  // Local subtasks state — so inline edits (due, assignee, done) reflect immediately
  const [localSubtasks, setLocalSubtasks] = useState(task.subtasks || [])
  useEffect(() => { setLocalSubtasks(task.subtasks || []) }, [task.id])
  const subtasks = childTasks.length > 0 ? [] : localSubtasks
  const subtaskDone = subtasks.filter(s => s.done).length
  const totalChildCount = childTasks.length + subtasks.length
  const totalChildDone = childTasks.filter(c => c.progress === 'Done').length + subtaskDone

  const inputClass = "w-full text-[13px] border border-[rgba(0,0,0,0.10)] rounded-lg px-3 py-2 bg-[#F5F3EF] text-[#2C2C2A] focus:outline-none focus:border-[#2C2C2A] transition-colors"
  const labelClass = "text-[11px] text-[#9B8C82] font-medium block mb-1"

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-end p-0 sm:p-4 sm:pt-12" onClick={onClose}>
      <div className="bg-[#F5F3EF] sm:rounded-2xl border border-[rgba(0,0,0,0.04)] w-full sm:w-[420px] h-full sm:h-auto sm:max-h-[85vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <div className="flex items-start justify-between mb-1">
            <div className="pr-4 flex-1 min-w-0">
              {parentTaskInfo && (
                <p className="text-[11px] text-[#9B8C82] mb-0.5">
                  <button onClick={() => onNavigate && onNavigate({ ...parentTaskInfo, id: task.parent_task_id })}
                    className="hover:underline hover:text-[#2C2C2A] transition-colors">
                    {parentTaskInfo.title}
                  </button> ›
                </p>
              )}
              {editingTitle ? (
                <input autoFocus value={title}
                  onChange={e => setTitle(e.target.value)}
                  onBlur={() => { setEditingTitle(false); if (title.trim() && title !== task.title) saveField('title', title.trim()) }}
                  onKeyDown={e => { if (e.key === 'Enter') { setEditingTitle(false); if (title.trim() && title !== task.title) saveField('title', title.trim()) } if (e.key === 'Escape') { setTitle(task.title); setEditingTitle(false) } }}
                  className="text-base font-semibold text-[#2C2C2A] leading-snug w-full border border-[rgba(0,0,0,0.15)] rounded-lg px-2 py-1 bg-[#F5F3EF] focus:outline-none focus:border-[#2C2C2A]" />
              ) : (
                <h2 onClick={() => setEditingTitle(true)}
                  className="text-base font-semibold text-[#2C2C2A] leading-snug cursor-text hover:bg-[rgba(0,0,0,0.03)] rounded px-1 -mx-1 transition-colors">{title}</h2>
              )}
            </div>
            <button onClick={onClose} className="text-[#B7A99D] hover:text-[#2C2C2A] text-xl leading-none flex-shrink-0 transition-colors">×</button>
          </div>
          <p className="text-[11px] text-[#9B8C82] mb-4">Due {dueDate}</p>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {task.priority && <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>{task.priority} priority</span>}
            {task.value && <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${VALUE_COLORS[task.value]}`}>{task.value} value</span>}
            {task.effort && <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${EFFORT_COLORS[task.effort]}`}>{task.effort}</span>}
            {task.progress && <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${PROGRESS_COLORS[task.progress]}`}>{task.progress}</span>}
          </div>

          {/* Assign to */}
          <div className="mb-3">
            <MemberPicker members={members || []} value={assignedTo} onChange={v => { setAssignedTo(v); saveField('assigned_to', v) }} />
          </div>

          <label className={labelClass}>Section</label>
          <select value={section} onChange={e => { setSection(e.target.value); saveField('section', e.target.value) }}
            className={`${inputClass} mb-3`}>
            {sectionList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className={labelClass}>Priority</label>
              <select value={priority} onChange={e => { setPriority(e.target.value); saveField('priority', e.target.value) }}
                className={inputClass}>
                <option value="">—</option>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Value</label>
              <select value={value} onChange={e => { setValue(e.target.value); saveField('value', e.target.value) }}
                className={inputClass}>
                <option value="">—</option>
                {VALUES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className={labelClass}>Effort level</label>
              <select value={effort} onChange={e => { setEffort(e.target.value); saveField('effort', e.target.value) }}
                className={inputClass}>
                <option value="">—</option>
                {EFFORT_LEVELS.map(el => <option key={el} value={el}>{el}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Task Progress</label>
              <select value={progress} onChange={e => { setProgress(e.target.value); saveField('progress', e.target.value) }}
                className={inputClass}>
                <option value="">—</option>
                {TASK_PROGRESS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <label className={labelClass}>Due date</label>
          <input type="date" value={due} onChange={e => { setDue(e.target.value); saveField('due', e.target.value || null) }}
            className={`${inputClass} mb-3`} />

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
              className="text-[11px] text-[#2C2C2A] hover:text-[#9B8C82] flex items-center gap-1 mb-1 transition-colors">
              <span className="text-[10px]">{showRecurrence ? '▾' : '▸'}</span>
              {showRecurrence ? 'Remove repeat' : 'Set repeat schedule'}
            </button>
            {showRecurrence && (
              <div className="bg-[rgba(0,0,0,0.02)] rounded-lg p-3 border border-[rgba(0,0,0,0.04)]">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="text-[10px] text-[#9B8C82] font-medium block mb-0.5">Repeats</label>
                    <select value={recurrence.type} onChange={e => {
                      const r = { ...recurrence, type: e.target.value }
                      setRecurrence(r)
                      saveField('recurrence_rule', r)
                    }} className="w-full text-[11px] border border-[rgba(0,0,0,0.06)] rounded px-2 py-1.5 bg-[#F5F3EF] text-[#2C2C2A]">
                      {RECURRENCE_TYPES.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#9B8C82] font-medium block mb-0.5">Every</label>
                    <div className="flex items-center gap-1">
                      <input type="number" min="1" max="30" value={recurrence.interval}
                        onChange={e => {
                          const r = { ...recurrence, interval: parseInt(e.target.value) || 1 }
                          setRecurrence(r)
                          saveField('recurrence_rule', r)
                        }}
                        className="w-14 text-[11px] border border-[rgba(0,0,0,0.06)] rounded px-2 py-1.5 bg-[#F5F3EF] text-[#2C2C2A]" />
                      <span className="text-[11px] text-[#9B8C82]">{recurrence.type === 'daily' ? 'day(s)' : recurrence.type === 'weekly' ? 'week(s)' : recurrence.type === 'monthly' ? 'month(s)' : 'year(s)'}</span>
                    </div>
                  </div>
                </div>
                {recurrence.type === 'weekly' && (
                  <div className="mb-2">
                    <label className="text-[10px] text-[#9B8C82] font-medium block mb-0.5">On these days</label>
                    <div className="flex gap-1">
                      {WEEKDAYS.map((day, i) => (
                        <button key={day} type="button"
                          onClick={() => {
                            const days = recurrence.days?.includes(i) ? recurrence.days.filter(d => d !== i) : [...(recurrence.days || []), i]
                            const r = { ...recurrence, days }
                            setRecurrence(r)
                            saveField('recurrence_rule', r)
                          }}
                          className={`text-[10px] px-2 py-1 rounded border transition-colors ${recurrence.days?.includes(i) ? 'bg-[rgba(44,44,42,0.08)] border-[rgba(0,0,0,0.15)] text-[#2C2C2A] font-medium' : 'border-[rgba(0,0,0,0.06)] text-[#9B8C82] bg-[#F5F3EF]'}`}>
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
                      onChange={e => {
                        const r = { ...recurrence, dayOfMonth: parseInt(e.target.value) || 1 }
                        setRecurrence(r)
                        saveField('recurrence_rule', r)
                      }}
                      className="w-16 text-[11px] border border-[rgba(0,0,0,0.06)] rounded px-2 py-1.5 bg-[#F5F3EF] text-[#2C2C2A]" />
                  </div>
                )}
                <div>
                  <label className="text-[10px] text-[#9B8C82] font-medium block mb-0.5">End date (optional)</label>
                  <input type="date" value={recurrence.endDate || ''}
                    onChange={e => {
                      const r = { ...recurrence, endDate: e.target.value }
                      setRecurrence(r)
                      const saveRule = { ...r }
                      if (!saveRule.endDate) delete saveRule.endDate
                      saveField('recurrence_rule', saveRule)
                    }}
                    className="w-full text-[11px] border border-[rgba(0,0,0,0.06)] rounded px-2 py-1.5 bg-[#F5F3EF] text-[#2C2C2A]" />
                </div>
              </div>
            )}
          </div>

          {/* Add to project */}
          <div className="mb-3">
            <label className={labelClass}>Project</label>
            {task.project_id ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] bg-[rgba(44,44,42,0.06)] text-[#2C2C2A] rounded-lg px-3 py-1.5 border border-[rgba(0,0,0,0.04)]">
                  {projects.find(p => p.id === task.project_id)?.name || 'Project'}
                </span>
                <button onClick={async () => {
                  try {
                    await updateTask(supabase, task.id, { project_id: null })
                    onUpdate({ ...task, project_id: null })
                  } catch (err) { console.error('Failed:', err) }
                }} className="text-[10px] text-[#B7A99D] hover:text-[#A32D2D] transition-colors">Remove</button>
              </div>
            ) : (
              <>
                {showProjectPicker ? (
                  <div className="flex flex-col gap-1">
                    {projects.length === 0 ? (
                      <p className="text-[11px] text-[#B7A99D] italic">No projects yet</p>
                    ) : (
                      projects.map(p => (
                        <button key={p.id} onClick={async () => {
                          try {
                            await updateTask(supabase, task.id, { project_id: p.id })
                            onUpdate({ ...task, project_id: p.id })
                            setShowProjectPicker(false)
                          } catch (err) { console.error('Failed:', err) }
                        }}
                          className="text-left text-[11px] px-3 py-1.5 border border-[rgba(0,0,0,0.04)] rounded-lg hover:bg-[rgba(0,0,0,0.02)] text-[#2C2C2A] transition-colors flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[rgba(29,158,117,0.5)] flex-shrink-0"></span>
                          {p.name}
                        </button>
                      ))
                    )}
                    <button onClick={() => setShowProjectPicker(false)}
                      className="text-[10px] text-[#B7A99D] hover:text-[#9B8C82] mt-1 transition-colors">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setShowProjectPicker(true)}
                    className="text-[11px] px-3 py-1.5 border border-dashed border-[rgba(0,0,0,0.12)] rounded-lg text-[#9B8C82] hover:bg-[rgba(0,0,0,0.02)] hover:border-[rgba(0,0,0,0.2)] hover:text-[#2C2C2A] transition-colors flex items-center gap-1">
                    <span>+</span> Add to project
                  </button>
                )}
              </>
            )}
          </div>

          {/* Subtasks (Child Tasks) */}
          <div className="mb-3">
            <label className={labelClass}>
              Subtasks {totalChildCount > 0 && <span className="text-[#B7A99D]">({totalChildDone}/{totalChildCount})</span>}
            </label>
            {(childTasks.length > 0 || subtasks.length > 0) && (
              <div className="bg-[rgba(0,0,0,0.02)] rounded-lg border border-[rgba(0,0,0,0.04)] mb-2 overflow-hidden">
                {childTasks.map(child => {
                  const assignedMember = child.assigned_to && members ? members.find(m => m.id === child.assigned_to) : null
                  return (
                    <div key={child.id} className="border-b border-[rgba(0,0,0,0.04)] last:border-0 group">
                      <div className="flex items-center gap-2 px-3 py-2">
                        <button onClick={() => handleToggleChildDone(child)}
                          className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${child.progress === 'Done' ? 'border-[#1D9E75] bg-[#1D9E75] hover:bg-[#179467]' : 'border-[#B7A99D] hover:border-[#1D9E75]'}`}>
                          {child.progress === 'Done' && <span className="text-white text-[9px]">✓</span>}
                        </button>
                        {editingSubId?.kind === 'child' && editingSubId.id === child.id ? (
                          <input
                            autoFocus
                            value={editingSubTitle}
                            onChange={e => setEditingSubTitle(e.target.value)}
                            onBlur={saveEditSub}
                            onKeyDown={e => { if (e.key === 'Enter') saveEditSub(); if (e.key === 'Escape') cancelEditSub() }}
                            className="text-[11px] flex-1 bg-[#F5F3EF] border border-[rgba(0,0,0,0.15)] rounded px-1.5 py-0.5 text-[#2C2C2A] focus:outline-none focus:border-[#2C2C2A]"
                          />
                        ) : (
                          <span onClick={() => startEditSub('child', child)}
                            title="Click to rename"
                            className={`text-[11px] flex-1 cursor-text hover:bg-[rgba(0,0,0,0.03)] rounded px-1 -mx-1 transition-colors ${child.progress === 'Done' ? 'text-[#B7A99D] line-through' : 'text-[#2C2C2A]'}`}>
                            {child.title}
                          </span>
                        )}
                        <button onClick={() => onNavigate && onNavigate(child)}
                          title="Open full detail"
                          className="text-[#B7A99D] hover:text-[#2C2C2A] text-[12px] opacity-0 group-hover:opacity-100 flex-shrink-0 transition-all leading-none">›</button>
                        <button onClick={() => handleDeleteChild(child.id)}
                          className="text-[#B7A99D] hover:text-[#A32D2D] text-[11px] opacity-0 group-hover:opacity-100 flex-shrink-0 transition-all">×</button>
                      </div>
                      <div className="flex items-center gap-2 px-3 pb-2 pl-9">
                        <input type="date" value={child.due || ''}
                          onChange={e => handleUpdateChild(child, 'due', e.target.value)}
                          className="text-[10px] border border-[rgba(0,0,0,0.06)] rounded px-1.5 py-0.5 bg-[#F5F3EF] text-[#9B8C82] w-28" />
                        <select value={child.assigned_to || ''}
                          onChange={e => handleUpdateChild(child, 'assigned_to', e.target.value)}
                          className="text-[10px] border border-[rgba(0,0,0,0.06)] rounded px-1.5 py-0.5 bg-[#F5F3EF] text-[#9B8C82] flex-1 max-w-[140px]">
                          <option value="">No assignee</option>
                          {(members || []).map(m => <option key={m.id} value={m.id}>{getCompactName(m)}</option>)}
                        </select>
                        {assignedMember && (
                          <span className="text-[10px] bg-[rgba(44,44,42,0.06)] text-[#2C2C2A] rounded-full px-1.5 py-0.5 flex-shrink-0">
                            {getCompactName(assignedMember).slice(0,2).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
                {subtasks.map(st => {
                  const assignedMember = st.assigned_to && members ? members.find(m => m.id === st.assigned_to) : null
                  return (
                    <div key={st.id} className="border-b border-[rgba(0,0,0,0.04)] last:border-0 group">
                      <div className="flex items-center gap-2 px-3 py-2">
                        <button onClick={() => handleToggleSubtask(st)}
                          className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${st.done ? 'border-[#1D9E75] bg-[#1D9E75] hover:bg-[#179467]' : 'border-[#B7A99D] hover:border-[#1D9E75]'}`}>
                          {st.done && <span className="text-white text-[9px]">✓</span>}
                        </button>
                        {editingSubId?.kind === 'legacy' && editingSubId.id === st.id ? (
                          <input
                            autoFocus
                            value={editingSubTitle}
                            onChange={e => setEditingSubTitle(e.target.value)}
                            onBlur={saveEditSub}
                            onKeyDown={e => { if (e.key === 'Enter') saveEditSub(); if (e.key === 'Escape') cancelEditSub() }}
                            className="text-[11px] flex-1 bg-[#F5F3EF] border border-[rgba(0,0,0,0.15)] rounded px-1.5 py-0.5 text-[#2C2C2A] focus:outline-none focus:border-[#2C2C2A]"
                          />
                        ) : (
                          <span onClick={() => startEditSub('legacy', st)}
                            title="Click to rename"
                            className={`text-[11px] flex-1 cursor-text hover:bg-[rgba(0,0,0,0.03)] rounded px-1 -mx-1 transition-colors ${st.done ? 'text-[#B7A99D] line-through' : 'text-[#2C2C2A]'}`}>
                            {st.title}
                          </span>
                        )}
                        <button onClick={() => handlePromoteSubtask(st)}
                          title="Open as a full task (convert to a child task with more fields and sub-items)"
                          className="text-[#B7A99D] hover:text-[#2C2C2A] text-[12px] opacity-0 group-hover:opacity-100 flex-shrink-0 transition-all leading-none">›</button>
                        <button onClick={() => handleDeleteSubtask(st.id)}
                          className="text-[#B7A99D] hover:text-[#A32D2D] text-[11px] opacity-0 group-hover:opacity-100 flex-shrink-0 transition-all">×</button>
                      </div>
                      <div className="flex items-center gap-2 px-3 pb-2 pl-9">
                        <input type="date" value={st.due || ''}
                          onChange={e => handleUpdateSubtaskField(st, 'due', e.target.value)}
                          className="text-[10px] border border-[rgba(0,0,0,0.06)] rounded px-1.5 py-0.5 bg-[#F5F3EF] text-[#9B8C82] w-28" />
                        <select value={st.assigned_to || ''}
                          onChange={e => handleUpdateSubtaskField(st, 'assigned_to', e.target.value)}
                          className="text-[10px] border border-[rgba(0,0,0,0.06)] rounded px-1.5 py-0.5 bg-[#F5F3EF] text-[#9B8C82] flex-1 max-w-[140px]">
                          <option value="">No assignee</option>
                          {(members || []).map(m => <option key={m.id} value={m.id}>{getCompactName(m)}</option>)}
                        </select>
                        {assignedMember && (
                          <span className="text-[10px] bg-[rgba(44,44,42,0.06)] text-[#2C2C2A] rounded-full px-1.5 py-0.5 flex-shrink-0">
                            {getCompactName(assignedMember).slice(0,2).toUpperCase()}
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
                placeholder="Add a subtask..." className="flex-1 text-[11px] border border-[rgba(0,0,0,0.10)] rounded-lg px-3 py-1.5 bg-[#F5F3EF] text-[#2C2C2A] placeholder-[#B7A99D] focus:outline-none focus:border-[#2C2C2A]" />
              <button onClick={handleAddSubtask} className="text-[11px] px-3 py-1.5 border border-[rgba(0,0,0,0.06)] rounded-lg text-[#9B8C82] hover:text-[#2C2C2A] hover:bg-[rgba(0,0,0,0.02)] transition-colors">Add</button>
            </div>
          </div>

          <label className={labelClass}>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => saveField('notes', notes)}
            placeholder="Add notes..." rows={3} className={`${inputClass} mb-4 resize-none placeholder-[#B7A99D]`} />

          {/* Comments / Discussion */}
          <div className="bg-[rgba(0,0,0,0.02)] rounded-xl p-3 mb-4 border border-[rgba(0,0,0,0.04)]">
            <TaskComments
              taskId={task.id}
              members={members || []}
              currentMemberId={currentMember?.id}
            />
          </div>

          {/* AI Assist */}
          <div className="bg-[rgba(0,0,0,0.02)] rounded-xl p-3 mb-4 border border-[rgba(0,0,0,0.04)]">
            <p className="text-[10px] font-medium text-[#9B8C82] uppercase tracking-[1px] mb-2">AI assist</p>
            {aiLoading && <p className="text-[11px] text-[#B7A99D] italic mb-2">Thinking...</p>}
            {aiOutput && !aiLoading && <p className="text-[11px] text-[#2C2C2A] leading-relaxed mb-3 whitespace-pre-wrap">{aiOutput}</p>}
            {!aiOutput && !aiLoading && <p className="text-[11px] text-[#B7A99D] mb-2">Pick an action to get AI suggestions.</p>}
            <div className="flex flex-wrap gap-1.5">
              {[['breakdown', 'Break it down'], ['risk', 'Spot risks'], ['draft', 'Draft message']].map(([mode, label]) => (
                <button key={mode} onClick={() => aiAssist(mode)} disabled={aiLoading}
                  className="text-[11px] px-3 py-1.5 border border-[rgba(0,0,0,0.06)] rounded-lg bg-[#F5F3EF] hover:bg-[rgba(0,0,0,0.02)] text-[#2C2C2A] disabled:opacity-50 transition-colors">
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {!readOnly && onDelete && (
                <button onClick={() => { if (confirm('Delete this task?')) onDelete(task.id) }}
                  className="text-[11px] px-3 py-1.5 border border-[rgba(163,45,45,0.2)] text-[#A32D2D] rounded-lg hover:bg-[rgba(163,45,45,0.04)] transition-colors">Delete</button>
              )}
              {!readOnly && (
                <button onClick={async () => {
                  try {
                    await duplicateTask(supabase, task.id, { owner_id: user?.id })
                    onClose()
                  } catch (err) { alert('Failed to duplicate: ' + err.message) }
                }}
                  className="text-[11px] px-3 py-1.5 border border-[rgba(0,0,0,0.08)] text-[#2C2C2A] rounded-lg hover:bg-[rgba(0,0,0,0.04)] transition-colors">Duplicate</button>
              )}
            </div>
            <button onClick={onClose} className="text-[13px] px-5 py-2 bg-[#2C2C2A] text-[#DFDDD9] rounded-lg hover:bg-[#3D3D3A] transition-colors font-medium">Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}
