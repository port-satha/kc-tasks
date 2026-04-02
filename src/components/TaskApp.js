'use client'
import { useState, useCallback } from 'react'
import { SECTIONS, PRIORITIES, TASK_PROGRESS, PRIORITY_COLORS, VALUE_COLORS, EFFORT_COLORS, PROGRESS_COLORS, PROGRESS_DOT } from '../lib/data'
import { useSupabase, useUser, useTasks, useMembers } from '../lib/hooks'
import { createTask, updateTask, deleteTask, updateSubtask } from '../lib/db'
import TaskModal from './TaskModal'
import AddTaskModal from './AddTaskModal'
import AvatarChip from './AvatarChip'

export default function TaskApp({ projectId = null, projectName = null, settingsButton = null }) {
  const supabase = useSupabase()
  const { user } = useUser()
  const { tasks, loading } = useTasks(projectId)
  const { members } = useMembers()
  const [view, setView] = useState('list')
  const [activeTask, setActiveTask] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState({})
  const [expandedTasks, setExpandedTasks] = useState({})
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterAssignee, setFilterAssignee] = useState('all')
  const [filterStatus, setFilterStatus] = useState('active')
  const [searchQuery, setSearchQuery] = useState('')

  const toggleSection = (sec) => setCollapsedSections(prev => ({ ...prev, [sec]: !prev[sec] }))
  const toggleTaskExpand = (taskId) => setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }))

  const handleToggleTaskDone = useCallback(async (task) => {
    try {
      const newProgress = task.progress === 'Done' ? '' : 'Done'
      await updateTask(supabase, task.id, { progress: newProgress })
    } catch (err) { console.error('Failed to toggle task:', err) }
  }, [supabase])

  const handleToggleSubtask = useCallback(async (taskId, subtaskId, currentDone) => {
    try { await updateSubtask(supabase, subtaskId, { done: !currentDone }) }
    catch (err) { console.error('Failed to toggle subtask:', err) }
  }, [supabase])

  const handleAddTask = useCallback(async (taskData) => {
    if (!user) return
    try {
      await createTask(supabase, { ...taskData, project_id: projectId, created_by: user.id })
      setShowAdd(false)
    } catch (err) { alert('Failed to create task: ' + err.message) }
  }, [supabase, user, projectId])

  const handleUpdateTask = useCallback(async (updated) => {
    try {
      const previousAssignedTo = activeTask?.assigned_to || null
      const result = await updateTask(supabase, updated.id, updated, { previousAssignedTo })
      setActiveTask(result)
    } catch (err) { console.error('Failed to update task:', err) }
  }, [supabase, activeTask])

  const handleDeleteTask = useCallback(async (id) => {
    try { await deleteTask(supabase, id); setActiveTask(null) }
    catch (err) { console.error('Failed to delete task:', err) }
  }, [supabase])

  const filtered = tasks.filter(t => {
    if (filterStatus === 'active' && t.progress === 'Done') return false
    if (filterStatus === 'done' && t.progress !== 'Done') return false
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    if (filterAssignee !== 'all' && t.assigned_to !== filterAssignee) return false
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const grouped = {}
  SECTIONS.forEach(s => { grouped[s] = [] })
  filtered.forEach(t => {
    const sec = t.section || 'Recently assigned'
    if (!grouped[sec]) grouped[sec] = []
    grouped[sec].push(t)
  })

  const boardColumns = {}
  TASK_PROGRESS.forEach(p => { boardColumns[p] = [] })
  filtered.forEach(t => {
    const prog = t.progress || 'Not Started'
    if (!boardColumns[prog]) boardColumns[prog] = []
    boardColumns[prog].push(t)
  })

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const isOverdue = (t) => t.due && t.progress !== 'Done' && new Date(t.due) < today

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-400">Loading tasks...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 flex items-center gap-3 h-12 sticky top-0 z-10">
        <span className="text-sm font-semibold text-gray-900">{projectName || 'My tasks'}</span>
        {settingsButton}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-400">{filtered.length} tasks</span>
          <button onClick={() => setShowAdd(true)}
            className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-1">
            <span>+</span> Add task
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3 flex-wrap">
        <div className="flex border border-gray-200 rounded-md overflow-hidden">
          {['list', 'board'].map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`text-xs px-3 py-1.5 transition-colors ${view === v ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}>
              {v === 'list' ? '☰ List' : '▦ Board'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 items-center">
          <span className="text-xs text-gray-400 mr-1">Status:</span>
          {[['all', 'All'], ['active', 'Active'], ['done', 'Done']].map(([key, label]) => (
            <button key={key} onClick={() => setFilterStatus(key)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filterStatus === key ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 items-center">
          <span className="text-xs text-gray-400 mr-1">Priority:</span>
          {['all', ...PRIORITIES].map(p => (
            <button key={p} onClick={() => setFilterPriority(p)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filterPriority === p ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              {p === 'all' ? 'All' : p}
            </button>
          ))}
        </div>
        {members.length > 0 && (
          <div className="flex gap-1 items-center">
            <span className="text-xs text-gray-400 mr-1">Assignee:</span>
            <button onClick={() => setFilterAssignee('all')}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filterAssignee === 'all' ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>All</button>
            {members.slice(0, 5).map(m => (
              <button key={m.id} onClick={() => setFilterAssignee(m.id)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filterAssignee === m.id ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                {m.name.split(' ')[0]}
              </button>
            ))}
          </div>
        )}
        <div className="ml-auto">
          <input type="text" placeholder="Search tasks..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="text-xs border border-gray-200 rounded-md px-3 py-1.5 w-48 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
        </div>
      </div>

      {view === 'list' ? (
        <ListView grouped={grouped} collapsedSections={collapsedSections} toggleSection={toggleSection}
          expandedTasks={expandedTasks} toggleTaskExpand={toggleTaskExpand} toggleSubtask={handleToggleSubtask}
          toggleTaskDone={handleToggleTaskDone} onOpen={setActiveTask} isOverdue={isOverdue} />
      ) : (
        <BoardView columns={boardColumns} onOpen={setActiveTask} isOverdue={isOverdue} />
      )}

      {activeTask && <TaskModal task={activeTask} members={members} onClose={() => setActiveTask(null)} onUpdate={handleUpdateTask} onDelete={handleDeleteTask} />}
      {showAdd && <AddTaskModal members={members} onClose={() => setShowAdd(false)} onAdd={handleAddTask} />}
    </div>
  )
}

function ListView({ grouped, collapsedSections, toggleSection, expandedTasks, toggleTaskExpand, toggleSubtask, toggleTaskDone, onOpen, isOverdue }) {
  return (
    <div className="p-4 flex-1">
      <div className="grid grid-cols-[1fr_100px_80px_80px_100px_100px_80px] gap-2 px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-200 mb-1">
        <span>Name</span><span>Due date</span><span>Priority</span><span>Value</span><span>Effort level</span><span>Task Progress</span><span>Assignee</span>
      </div>
      {Object.entries(grouped).map(([section, tasks]) => {
        if (tasks.length === 0) return null
        const collapsed = collapsedSections[section]
        return (
          <div key={section} className="mb-1">
            <button onClick={() => toggleSection(section)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors">
              <span className={`text-gray-400 text-xs transition-transform ${collapsed ? '' : 'rotate-90'}`}>▶</span>
              <span className="text-sm font-semibold text-gray-900">{section}</span>
              <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{tasks.length}</span>
            </button>
            {!collapsed && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-2">
                {tasks.map(t => (
                  <div key={t.id}>
                    <TaskRow task={t} onOpen={onOpen} isOverdue={isOverdue} onToggleDone={toggleTaskDone}
                      hasSubtasks={t.subtasks && t.subtasks.length > 0}
                      isExpanded={expandedTasks[t.id]} onToggleExpand={() => toggleTaskExpand(t.id)} />
                    {expandedTasks[t.id] && t.subtasks && t.subtasks.length > 0 && (
                      <div className="bg-gray-50 border-t border-gray-100">
                        {t.subtasks.map(st => (
                          <div key={st.id} className="flex items-center gap-2 pl-12 pr-4 py-1.5 border-b border-gray-100 last:border-0 hover:bg-gray-100">
                            <button onClick={() => toggleSubtask(t.id, st.id, st.done)}
                              className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${st.done ? 'border-green-500 bg-green-500' : 'border-gray-300 hover:border-gray-400'}`}>
                              {st.done && <span className="text-white text-[8px]">✓</span>}
                            </button>
                            <span className={`text-xs ${st.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{st.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TaskRow({ task, onOpen, isOverdue, onToggleDone, hasSubtasks, isExpanded, onToggleExpand }) {
  const due = task.due ? new Date(task.due) : null
  const overdue = isOverdue(task)
  const subtaskCount = task.subtasks ? task.subtasks.length : 0
  const subtaskDone = task.subtasks ? task.subtasks.filter(s => s.done).length : 0
  const assignee = task.assigned_member

  return (
    <div className="grid grid-cols-[1fr_100px_80px_80px_100px_100px_80px] gap-2 px-4 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer items-center">
      <div className="flex items-center gap-2 min-w-0">
        {hasSubtasks ? (
          <button onClick={(e) => { e.stopPropagation(); onToggleExpand() }} className="text-gray-400 hover:text-gray-600 text-xs flex-shrink-0 w-4">
            {isExpanded ? '▾' : '▸'}
          </button>
        ) : <span className="w-4 flex-shrink-0"></span>}
        <button onClick={(e) => { e.stopPropagation(); onToggleDone(task) }}
          className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${task.progress === 'Done' ? 'border-green-500 bg-green-500 hover:bg-green-400' : 'border-gray-300 hover:border-green-400'}`}>
          {task.progress === 'Done' && <span className="text-white text-xs">✓</span>}
        </button>
        <span onClick={() => onOpen(task)} className={`text-sm truncate ${task.progress === 'Done' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{task.title}</span>
        {subtaskCount > 0 && <span className="text-xs text-gray-400 flex-shrink-0 ml-1">{subtaskDone}/{subtaskCount}</span>}
      </div>
      <span onClick={() => onOpen(task)} className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
        {due ? due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
      </span>
      {task.priority ? <span onClick={() => onOpen(task)} className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
        : <span onClick={() => onOpen(task)} className="text-xs text-gray-300">—</span>}
      {task.value ? <span onClick={() => onOpen(task)} className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${VALUE_COLORS[task.value]}`}>{task.value}</span>
        : <span onClick={() => onOpen(task)} className="text-xs text-gray-300">—</span>}
      {task.effort ? <span onClick={() => onOpen(task)} className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${EFFORT_COLORS[task.effort]}`}>{task.effort.replace(' effort', '')}</span>
        : <span onClick={() => onOpen(task)} className="text-xs text-gray-300">—</span>}
      {task.progress ? <span onClick={() => onOpen(task)} className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${PROGRESS_COLORS[task.progress]}`}>{task.progress}</span>
        : <span onClick={() => onOpen(task)} className="text-xs text-gray-300">—</span>}
      <div onClick={() => onOpen(task)}>
        {assignee ? <AvatarChip name={assignee.name} size="sm" /> : <span className="text-xs text-gray-300">—</span>}
      </div>
    </div>
  )
}

function BoardView({ columns, onOpen, isOverdue }) {
  return (
    <div className="flex gap-3 p-4 overflow-x-auto flex-1">
      {TASK_PROGRESS.map(status => {
        const tasks = columns[status] || []
        return (
          <div key={status} className="w-64 flex-shrink-0">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${PROGRESS_DOT[status]}`}></span>
                <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">{status}</span>
              </div>
              <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{tasks.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {!tasks.length && <div className="border border-dashed border-gray-200 rounded-xl p-4 text-center text-xs text-gray-400">Empty</div>}
              {tasks.map(t => <BoardCard key={t.id} task={t} onOpen={onOpen} isOverdue={isOverdue} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BoardCard({ task, onOpen, isOverdue }) {
  const due = task.due ? new Date(task.due) : null
  const overdue = isOverdue(task)
  const subtaskCount = task.subtasks ? task.subtasks.length : 0
  const subtaskDone = task.subtasks ? task.subtasks.filter(s => s.done).length : 0

  return (
    <div onClick={() => onOpen(task)} className="bg-white border border-gray-200 rounded-xl p-3 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all">
      <p className={`text-sm font-medium leading-snug mb-2 ${task.progress === 'Done' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{task.title}</p>
      <div className="flex flex-wrap items-center gap-1">
        {task.priority && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>}
        {subtaskCount > 0 && <span className="text-xs text-gray-400">{subtaskDone}/{subtaskCount}</span>}
        {task.assigned_member && <AvatarChip name={task.assigned_member.name} size="sm" />}
        {due && <span className={`text-xs ml-auto ${overdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>{due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
      </div>
    </div>
  )
}
