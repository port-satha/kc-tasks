'use client'
import { useState, useEffect } from 'react'
import { SECTIONS, PRIORITIES, VALUES, EFFORT_LEVELS, TASK_PROGRESS, PRIORITY_COLORS, VALUE_COLORS, EFFORT_COLORS, PROGRESS_COLORS, PROGRESS_DOT, uid, DEFAULT_TASKS } from '../lib/data'
import TaskModal from './TaskModal'
import AddTaskModal from './AddTaskModal'

const STORAGE_KEY = 'kc_tasks_v4'

export default function TaskApp() {
  const [tasks, setTasks] = useState([])
  const [view, setView] = useState('list')
  const [activeTask, setActiveTask] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState({})
  const [filterPriority, setFilterPriority] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setTasks(JSON.parse(raw))
      else setTasks(DEFAULT_TASKS)
    } catch { setTasks(DEFAULT_TASKS) }
  }, [])

  const save = (updated) => {
    setTasks(updated)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch {}
  }

  const toggleSection = (sec) => {
    setCollapsedSections(prev => ({ ...prev, [sec]: !prev[sec] }))
  }

  const filtered = tasks.filter(t => {
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
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

  // Board view groups by Task Progress
  const boardColumns = {}
  TASK_PROGRESS.forEach(p => { boardColumns[p] = [] })
  filtered.forEach(t => {
    const prog = t.progress || 'Not Started'
    if (!boardColumns[prog]) boardColumns[prog] = []
    boardColumns[prog].push(t)
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isOverdue = (t) => {
    if (!t.due || t.progress === 'Done') return false
    return new Date(t.due) < today
  }

  const totalFiltered = filtered.length

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 flex items-center gap-3 h-12 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">P</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">My tasks</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-400">{totalFiltered} tasks</span>
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
              className={`text-xs px-3 py-1.5 transition-colors capitalize ${view === v ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}>
              {v === 'list' ? '☰ List' : '▦ Board'}
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

        <div className="ml-auto relative">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="text-xs border border-gray-200 rounded-md px-3 py-1.5 w-48 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
      </div>

      {/* Views */}
      {view === 'list' ? (
        <ListView
          grouped={grouped}
          collapsedSections={collapsedSections}
          toggleSection={toggleSection}
          onOpen={setActiveTask}
          isOverdue={isOverdue}
        />
      ) : (
        <BoardView
          columns={boardColumns}
          onOpen={setActiveTask}
          isOverdue={isOverdue}
        />
      )}

      {/* Modals */}
      {activeTask && (
        <TaskModal
          task={activeTask}
          onClose={() => setActiveTask(null)}
          onUpdate={(updated) => {
            save(tasks.map(t => t.id === updated.id ? updated : t))
            setActiveTask(updated)
          }}
          onDelete={(id) => {
            save(tasks.filter(t => t.id !== id))
            setActiveTask(null)
          }}
        />
      )}
      {showAdd && (
        <AddTaskModal
          onClose={() => setShowAdd(false)}
          onAdd={(t) => {
            save([{ ...t, id: uid() }, ...tasks])
            setShowAdd(false)
          }}
        />
      )}
    </div>
  )
}

function ListView({ grouped, collapsedSections, toggleSection, onOpen, isOverdue }) {
  return (
    <div className="p-4 flex-1">
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_100px_80px_80px_100px_100px] gap-2 px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-200 mb-1">
        <span>Name</span>
        <span>Due date</span>
        <span>Priority</span>
        <span>Value</span>
        <span>Effort level</span>
        <span>Task Progress</span>
      </div>

      {Object.entries(grouped).map(([section, tasks]) => {
        if (tasks.length === 0) return null
        const collapsed = collapsedSections[section]
        return (
          <div key={section} className="mb-1">
            {/* Section header */}
            <button
              onClick={() => toggleSection(section)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors group"
            >
              <span className={`text-gray-400 text-xs transition-transform ${collapsed ? '' : 'rotate-90'}`}>▶</span>
              <span className="text-sm font-semibold text-gray-900">{section}</span>
              <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{tasks.length}</span>
            </button>

            {/* Tasks */}
            {!collapsed && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-2">
                {tasks.map(t => (
                  <TaskRow key={t.id} task={t} onOpen={onOpen} isOverdue={isOverdue} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TaskRow({ task, onOpen, isOverdue }) {
  const due = task.due ? new Date(task.due) : null
  const overdue = isOverdue(task)

  return (
    <div
      onClick={() => onOpen(task)}
      className="grid grid-cols-[1fr_100px_80px_80px_100px_100px] gap-2 px-4 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer items-center"
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${task.progress === 'Done' ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
          {task.progress === 'Done' && <span className="text-white text-xs">✓</span>}
        </div>
        <span className={`text-sm truncate ${task.progress === 'Done' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{task.title}</span>
      </div>
      <span className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
        {due ? due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
      </span>
      {task.priority ? (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
      ) : <span className="text-xs text-gray-300">—</span>}
      {task.value ? (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${VALUE_COLORS[task.value]}`}>{task.value}</span>
      ) : <span className="text-xs text-gray-300">—</span>}
      {task.effort ? (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${EFFORT_COLORS[task.effort]}`}>{task.effort.replace(' effort', '')}</span>
      ) : <span className="text-xs text-gray-300">—</span>}
      {task.progress ? (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${PROGRESS_COLORS[task.progress]}`}>{task.progress}</span>
      ) : <span className="text-xs text-gray-300">—</span>}
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
              {!tasks.length && (
                <div className="border border-dashed border-gray-200 rounded-xl p-4 text-center text-xs text-gray-400">Empty</div>
              )}
              {tasks.map(t => (
                <BoardCard key={t.id} task={t} onOpen={onOpen} isOverdue={isOverdue} />
              ))}
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

  return (
    <div onClick={() => onOpen(task)}
      className="bg-white border border-gray-200 rounded-xl p-3 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all">
      <p className={`text-sm font-medium leading-snug mb-2 ${task.progress === 'Done' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{task.title}</p>
      <div className="flex flex-wrap items-center gap-1">
        {task.section && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600">{task.section}</span>}
        {task.priority && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>}
        {due && <span className={`text-xs ml-auto ${overdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>{due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
      </div>
    </div>
  )
}
