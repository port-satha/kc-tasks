'use client'
import { useState, useEffect } from 'react'
import { STATUSES, MEMBERS, BRAND_COLORS, PRIORITY_COLORS, STATUS_COLORS, BRAND_LABELS, uid, DEFAULT_TASKS } from '../lib/data'
import TaskModal from './TaskModal'
import AddTaskModal from './AddTaskModal'

const STORAGE_KEY = 'kc_tasks_v3'

export default function TaskApp() {
  const [tasks, setTasks] = useState([])
  const [view, setView] = useState('kanban')
  const [brandFilter, setBrandFilter] = useState('all')
  const [prioFilter, setPrioFilter] = useState('all')
  const [activeTask, setActiveTask] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [sortList, setSortList] = useState('due')

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

  const visible = tasks.filter(t => {
    if (brandFilter !== 'all' && t.brand !== brandFilter) return false
    if (prioFilter !== 'all' && t.priority !== prioFilter) return false
    return true
  })

  const sorted = [...visible].sort((a, b) => {
    if (sortList === 'due') return (a.due || 'z') > (b.due || 'z') ? 1 : -1
    if (sortList === 'priority') {
      const ord = { High: 0, Med: 1, Low: 2 }
      return ord[a.priority] - ord[b.priority]
    }
    return a.title.localeCompare(b.title)
  })

  const brandTabs = ['all', 'onest', 'grubby', 'kc']

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 flex items-center gap-3 h-12 sticky top-0 z-10">
        <span className="text-sm font-medium text-gray-900 tracking-wide">Kind Collective</span>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-500">Tasks</span>
        <div className="flex items-center gap-1 ml-2">
          {brandTabs.map(b => (
            <button key={b} onClick={() => setBrandFilter(b)}
              className={`text-xs px-3 py-1 rounded-md transition-colors ${brandFilter === b ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}>
              {b === 'all' ? 'All brands' : b === 'kc' ? 'KC' : b}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-400">{visible.length} tasks</span>
          <button onClick={() => setShowAdd(true)}
            className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors">
            + New task
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3 flex-wrap">
        <div className="flex border border-gray-200 rounded-md overflow-hidden">
          {['kanban', 'list'].map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`text-xs px-3 py-1.5 transition-colors capitalize ${view === v ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}>
              {v}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {['all', 'High', 'Med', 'Low'].map(p => (
            <button key={p} onClick={() => setPrioFilter(p)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${prioFilter === p ? 'border-gray-400 bg-gray-100 text-gray-900' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              {p === 'all' ? 'All priorities' : p}
            </button>
          ))}
        </div>
        {view === 'list' && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-400">Sort by</span>
            <select value={sortList} onChange={e => setSortList(e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-700">
              <option value="due">Due date</option>
              <option value="priority">Priority</option>
              <option value="title">Title</option>
            </select>
          </div>
        )}
      </div>

      {/* Views */}
      {view === 'kanban' ? (
        <KanbanView tasks={visible} onOpen={setActiveTask} />
      ) : (
        <ListView tasks={sorted} onOpen={setActiveTask} />
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

function KanbanView({ tasks, onOpen }) {
  return (
    <div className="flex gap-3 p-4 overflow-x-auto flex-1">
      {STATUSES.map(st => {
        const cols = tasks.filter(t => t.status === st)
        return (
          <div key={st} className="w-56 flex-shrink-0">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{st}</span>
              <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{cols.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {!cols.length && (
                <div className="border border-dashed border-gray-200 rounded-xl p-4 text-center text-xs text-gray-400">Empty</div>
              )}
              {cols.map(t => <TaskCard key={t.id} task={t} onOpen={onOpen} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TaskCard({ task, onOpen }) {
  const due = task.due ? new Date(task.due) : null
  const today = new Date(); today.setHours(0,0,0,0)
  const overdue = due && due < today && task.status !== 'Done'
  const m = MEMBERS[task.assignee]

  return (
    <div onClick={() => onOpen(task)}
      className="bg-white border border-gray-200 rounded-xl p-3 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all">
      <p className="text-sm font-medium text-gray-900 leading-snug mb-2">{task.title}</p>
      <div className="flex flex-wrap items-center gap-1">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BRAND_COLORS[task.brand]}`}>{task.brand === 'kc' ? 'KC' : task.brand}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
        {m && <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${m.color}`}>{m.initials}</span>}
        {due && <span className={`text-xs ml-auto ${overdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>{due.toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</span>}
      </div>
    </div>
  )
}

function ListView({ tasks, onOpen }) {
  return (
    <div className="p-4">
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_80px_80px_90px_80px] gap-2 px-4 py-2 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-wider">
          <span>Task</span><span>Brand</span><span>Priority</span><span>Assignee</span><span>Due</span><span>Status</span>
        </div>
        {!tasks.length && (
          <div className="px-4 py-8 text-center text-sm text-gray-400">No tasks match your filters</div>
        )}
        {tasks.map(t => {
          const due = t.due ? new Date(t.due) : null
          const today = new Date(); today.setHours(0,0,0,0)
          const overdue = due && due < today && t.status !== 'Done'
          const m = MEMBERS[t.assignee]
          return (
            <div key={t.id} onClick={() => onOpen(t)}
              className="grid grid-cols-[1fr_100px_80px_80px_90px_80px] gap-2 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer items-center">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[t.status]}`}></span>
                <span className="text-sm text-gray-900 truncate">{t.title}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${BRAND_COLORS[t.brand]}`}>{t.brand === 'kc' ? 'KC' : t.brand}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
              <span className={`text-xs font-medium ${m ? m.color : ''} px-1.5 py-0.5 rounded-full w-fit`}>{m?.label || t.assignee}</span>
              <span className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>{due ? due.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'}) : '—'}</span>
              <span className="text-xs text-gray-500">{t.status}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
