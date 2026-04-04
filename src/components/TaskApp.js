'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { DEFAULT_SECTIONS, PRIORITIES, VALUES, EFFORT_LEVELS, TASK_PROGRESS, PRIORITY_COLORS, VALUE_COLORS, EFFORT_COLORS, PROGRESS_COLORS, PROGRESS_DOT } from '../lib/data'
import { useSupabase, useUser, useTasks, useMembers, useSections } from '../lib/hooks'
import { createTask, updateTask, deleteTask, updateSubtask, createSection, deleteSection, renameSection, createRecurringFollowUp } from '../lib/db'
import TaskModal from './TaskModal'
import AddTaskModal from './AddTaskModal'
import AvatarChip from './AvatarChip'

export default function TaskApp({ projectId = null, projectName = null, settingsButton = null }) {
  const supabase = useSupabase()
  const { user } = useUser()
  const { tasks, loading } = useTasks(projectId)
  const { members } = useMembers()
  const { sections: customSections, sectionObjects, reload: reloadSections } = useSections(projectId, user?.id)
  const [view, setView] = useState('list')
  const [activeTask, setActiveTask] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState({ '__done__': true })
  const [expandedTasks, setExpandedTasks] = useState({})
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterAssignee, setFilterAssignee] = useState('all')
  const [filterStatus, setFilterStatus] = useState('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddSection, setShowAddSection] = useState(false)
  const [newSectionName, setNewSectionName] = useState('')
  const [undoToast, setUndoToast] = useState(null)
  const undoTimerRef = useRef(null)
  const [draggedTaskId, setDraggedTaskId] = useState(null)
  const [dropTargetId, setDropTargetId] = useState(null) // task id to drop before

  // Merge default sections with any custom ones
  const allSections = [...new Set([...DEFAULT_SECTIONS, ...customSections])]
  tasks.forEach(t => { if (t.section && !allSections.includes(t.section)) allSections.push(t.section) })

  const toggleSection = (sec) => setCollapsedSections(prev => ({ ...prev, [sec]: !prev[sec] }))
  const toggleTaskExpand = (taskId) => setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }))

  const handleAddSection = async () => {
    if (!newSectionName.trim()) return
    try {
      await createSection(supabase, { name: newSectionName.trim(), projectId, ownerId: user?.id })
      setNewSectionName('')
      setShowAddSection(false)
      reloadSections()
    } catch (err) { alert('Failed to add section: ' + err.message) }
  }

  const handleRenameSection = async (oldName, newName) => {
    if (!newName.trim() || newName === oldName) return
    // Find section object by name
    const secObj = sectionObjects.find(s => s.name === oldName)
    if (secObj) {
      try {
        await renameSection(supabase, secObj.id, newName.trim())
        // Update tasks in this section to the new name
        const tasksInSection = tasks.filter(t => t.section === oldName)
        await Promise.all(tasksInSection.map(t => updateTask(supabase, t.id, { section: newName.trim() })))
        reloadSections()
      } catch (err) { alert('Failed to rename section: ' + err.message) }
    } else {
      // It's a default section — just rename all tasks in it
      try {
        const tasksInSection = tasks.filter(t => (t.section || 'Recently assigned') === oldName)
        await Promise.all(tasksInSection.map(t => updateTask(supabase, t.id, { section: newName.trim() })))
      } catch (err) { alert('Failed to rename section: ' + err.message) }
    }
  }

  const handleDeleteSection = async (sectionName) => {
    if (!confirm(`Delete section "${sectionName}"? Tasks will be moved to "Recently assigned".`)) return
    // Move tasks to Recently assigned
    const tasksInSection = tasks.filter(t => t.section === sectionName)
    try {
      await Promise.all(tasksInSection.map(t => updateTask(supabase, t.id, { section: 'Recently assigned' })))
      const secObj = sectionObjects.find(s => s.name === sectionName)
      if (secObj) await deleteSection(supabase, secObj.id)
      reloadSections()
    } catch (err) { alert('Failed to delete section: ' + err.message) }
  }

  // Undo logic
  const clearUndo = useCallback(() => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setUndoToast(null)
  }, [])

  const handleToggleTaskDone = useCallback(async (task) => {
    try {
      const wasDone = task.progress === 'Done'
      const newProgress = wasDone ? '' : 'Done'
      await updateTask(supabase, task.id, { progress: newProgress })

      // Show undo toast only when marking as Done
      if (!wasDone) {
        clearUndo()
        setUndoToast({ taskId: task.id, title: task.title })
        undoTimerRef.current = setTimeout(() => setUndoToast(null), 3000)

        // Auto-create next recurring task
        if (task.recurrence_rule) {
          await createRecurringFollowUp(supabase, task)
        }
      }
    } catch (err) { console.error('Failed to toggle task:', err) }
  }, [supabase, clearUndo])

  const handleUndo = useCallback(async () => {
    if (!undoToast) return
    try {
      await updateTask(supabase, undoToast.taskId, { progress: '' })
    } catch (err) { console.error('Failed to undo:', err) }
    clearUndo()
  }, [supabase, undoToast, clearUndo])

  // Clean up timer on unmount
  useEffect(() => {
    return () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current) }
  }, [])

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

  const handleInlineUpdate = useCallback(async (task, field, value) => {
    try {
      const previousAssignedTo = field === 'assigned_to' ? task.assigned_to : null
      await updateTask(supabase, task.id, { [field]: value || null }, { previousAssignedTo })
    } catch (err) { console.error('Failed to update task:', err) }
  }, [supabase])

  // Drag & drop: move task to a different section
  const handleDropOnSection = useCallback(async (section) => {
    if (!draggedTaskId) return
    try {
      await updateTask(supabase, draggedTaskId, { section })
    } catch (err) { console.error('Failed to move task:', err) }
    setDraggedTaskId(null)
    setDropTargetId(null)
  }, [supabase, draggedTaskId])

  // Drag & drop: reorder within same section
  const handleReorderTask = useCallback(async (section, targetTaskId) => {
    if (!draggedTaskId || draggedTaskId === targetTaskId) {
      setDraggedTaskId(null)
      setDropTargetId(null)
      return
    }
    // Get tasks in this section in current order
    const sectionTasks = tasks
      .filter(t => (t.section || 'Recently assigned') === section && t.progress !== 'Done')
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

    // Remove dragged task and insert before target
    const reordered = sectionTasks.filter(t => t.id !== draggedTaskId)
    const draggedTask = sectionTasks.find(t => t.id === draggedTaskId)
    if (!draggedTask) { setDraggedTaskId(null); setDropTargetId(null); return }

    const targetIndex = targetTaskId === '__end__'
      ? reordered.length
      : reordered.findIndex(t => t.id === targetTaskId)
    if (targetIndex === -1) { setDraggedTaskId(null); setDropTargetId(null); return }

    reordered.splice(targetIndex, 0, draggedTask)

    // Update sort_order for all reordered tasks, also ensure same section
    try {
      await Promise.all(reordered.map((t, i) =>
        updateTask(supabase, t.id, { sort_order: i, section })
      ))
    } catch (err) { console.error('Failed to reorder:', err) }
    setDraggedTaskId(null)
    setDropTargetId(null)
  }, [supabase, draggedTaskId, tasks])

  // Separate done tasks from active tasks
  const activeTasks = tasks.filter(t => t.progress !== 'Done')
  const doneTasks = tasks.filter(t => t.progress === 'Done')

  const filtered = (filterStatus === 'done' ? doneTasks : filterStatus === 'active' ? activeTasks : tasks).filter(t => {
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    if (filterAssignee !== 'all' && t.assigned_to !== filterAssignee) return false
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  // Group non-done tasks into sections
  const filteredActive = filtered.filter(t => t.progress !== 'Done')
  const filteredDone = filtered.filter(t => t.progress === 'Done')

  const grouped = {}
  allSections.forEach(s => { grouped[s] = [] })
  filteredActive.forEach(t => {
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
        <>
          <ListView grouped={grouped} collapsedSections={collapsedSections} toggleSection={toggleSection}
            expandedTasks={expandedTasks} toggleTaskExpand={toggleTaskExpand} toggleSubtask={handleToggleSubtask}
            toggleTaskDone={handleToggleTaskDone} onOpen={setActiveTask} isOverdue={isOverdue}
            members={members} onInlineUpdate={handleInlineUpdate}
            draggedTaskId={draggedTaskId} setDraggedTaskId={setDraggedTaskId} onDropOnSection={handleDropOnSection}
            dropTargetId={dropTargetId} setDropTargetId={setDropTargetId} onReorderTask={handleReorderTask}
            allSections={allSections} onMoveToSection={(taskId, section) => updateTask(supabase, taskId, { section })}
            onRenameSection={handleRenameSection} onDeleteSection={handleDeleteSection} />

          {/* Done section — collapsed by default */}
          {filteredDone.length > 0 && (
            <div className="px-4 pb-2">
              <button onClick={() => toggleSection('__done__')}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors">
                <span className={`text-gray-400 text-xs transition-transform ${collapsedSections['__done__'] ? '' : 'rotate-90'}`}>▶</span>
                <span className="text-sm font-semibold text-green-700">Done</span>
                <span className="text-xs bg-green-100 text-green-600 rounded-full px-2 py-0.5">{filteredDone.length}</span>
              </button>
              {!collapsedSections['__done__'] && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-2 opacity-70">
                  {filteredDone.map(t => (
                    <div key={t.id}>
                      <TaskRow task={t} onOpen={setActiveTask} isOverdue={isOverdue} onToggleDone={handleToggleTaskDone}
                        hasSubtasks={t.subtasks && t.subtasks.length > 0}
                        isExpanded={expandedTasks[t.id]} onToggleExpand={() => toggleTaskExpand(t.id)}
                        members={members} onInlineUpdate={handleInlineUpdate} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="px-4 pb-4">
            {showAddSection ? (
              <div className="flex items-center gap-2">
                <input autoFocus value={newSectionName} onChange={e => setNewSectionName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddSection()}
                  placeholder="Section name..."
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-56 text-gray-800 placeholder-gray-400" />
                <button onClick={handleAddSection} className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Add</button>
                <button onClick={() => { setShowAddSection(false); setNewSectionName('') }} className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setShowAddSection(true)}
                className="text-xs text-gray-400 hover:text-indigo-600 flex items-center gap-1 py-2">
                <span>+</span> Add section
              </button>
            )}
          </div>
        </>
      ) : (
        <BoardView columns={boardColumns} onOpen={setActiveTask} isOverdue={isOverdue} />
      )}

      {/* Undo toast */}
      {undoToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-gray-900 text-white rounded-xl px-4 py-3 shadow-xl flex items-center gap-3 text-sm">
            <span className="text-green-400">✓</span>
            <span className="truncate max-w-[200px]">&quot;{undoToast.title}&quot; done</span>
            <button onClick={handleUndo}
              className="text-indigo-300 hover:text-white font-medium ml-2 flex-shrink-0">
              Undo
            </button>
          </div>
        </div>
      )}

      {activeTask && <TaskModal task={activeTask} members={members} sections={allSections} onClose={() => setActiveTask(null)} onUpdate={handleUpdateTask} onDelete={handleDeleteTask} />}
      {showAdd && <AddTaskModal members={members} sections={allSections} onClose={() => setShowAdd(false)} onAdd={handleAddTask} />}
    </div>
  )
}

function SectionHeader({ section, taskCount, collapsed, onToggle, onRename, onDelete }) {
  const [showMenu, setShowMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(section)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!showMenu) return
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMenu])

  const handleRename = () => {
    if (editName.trim() && editName !== section) {
      onRename(section, editName.trim())
    }
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-1 group/sec">
      <button onClick={onToggle}
        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors flex-1 min-w-0">
        <span className={`text-gray-400 text-xs transition-transform ${collapsed ? '' : 'rotate-90'}`}>▶</span>
        {editing ? (
          <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(false) }}
            onBlur={handleRename}
            onClick={e => e.stopPropagation()}
            className="text-sm font-semibold text-gray-900 border border-indigo-300 rounded px-1 py-0 bg-white w-48" />
        ) : (
          <span className="text-sm font-semibold text-gray-900">{section}</span>
        )}
        <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{taskCount}</span>
      </button>
      <div className="relative" ref={menuRef}>
        <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
          className="text-gray-300 hover:text-gray-500 text-sm px-1.5 py-1 rounded hover:bg-gray-100 opacity-0 group-hover/sec:opacity-100 transition-opacity">
          ⋯
        </button>
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
            <button onClick={() => { setShowMenu(false); setEditing(true); setEditName(section) }}
              className="w-full text-left text-xs px-3 py-1.5 hover:bg-gray-50 text-gray-700 flex items-center gap-2">
              ✏️ Rename
            </button>
            <button onClick={() => { setShowMenu(false); onDelete(section) }}
              className="w-full text-left text-xs px-3 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-2">
              🗑 Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ListView({ grouped, collapsedSections, toggleSection, expandedTasks, toggleTaskExpand, toggleSubtask, toggleTaskDone, onOpen, isOverdue, members, onInlineUpdate, draggedTaskId, setDraggedTaskId, onDropOnSection, dropTargetId, setDropTargetId, onReorderTask, allSections, onMoveToSection, onRenameSection, onDeleteSection }) {

  const handleDragOverTask = (e, taskId) => {
    e.preventDefault()
    e.stopPropagation()
    if (draggedTaskId && draggedTaskId !== taskId) {
      setDropTargetId(taskId)
    }
  }

  return (
    <div className="p-4 flex-1">
      <div className="grid grid-cols-[1fr_100px_80px_80px_100px_100px_80px] gap-2 px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-200 mb-1 bg-gray-50 sticky top-12 z-[5]">
        <span>Name</span><span>Due date</span><span>Priority</span><span>Value</span><span>Effort level</span><span>Task Progress</span><span>Assignee</span>
      </div>
      {Object.entries(grouped).map(([section, sectionTasks]) => {
        if (sectionTasks.length === 0 && !draggedTaskId) return null
        const collapsed = collapsedSections[section]
        return (
          <div key={section} className="mb-1"
            onDragOver={e => { e.preventDefault() }}
            onDrop={e => { e.preventDefault(); onDropOnSection(section) }}>
            <SectionHeader section={section} taskCount={sectionTasks.length} collapsed={collapsed}
              onToggle={() => toggleSection(section)} onRename={onRenameSection} onDelete={onDeleteSection} />
            {!collapsed && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-2">
                {sectionTasks.length === 0 && draggedTaskId && (
                  <div className="px-4 py-3 text-xs text-gray-400 text-center border-dashed border-2 border-gray-200 m-1 rounded-lg"
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); e.stopPropagation(); onDropOnSection(section) }}>
                    Drop here to move to &quot;{section}&quot;
                  </div>
                )}
                {sectionTasks.map((t, idx) => (
                  <div key={t.id}
                    draggable
                    onDragStart={() => setDraggedTaskId(t.id)}
                    onDragEnd={() => { setDraggedTaskId(null); setDropTargetId(null) }}
                    onDragOver={e => handleDragOverTask(e, t.id)}
                    onDrop={e => { e.preventDefault(); e.stopPropagation(); onReorderTask(section, t.id) }}>
                    {/* Drop indicator line */}
                    {dropTargetId === t.id && draggedTaskId !== t.id && (
                      <div className="h-0.5 bg-indigo-500 mx-4 rounded-full" />
                    )}
                    <TaskRow task={t} onOpen={onOpen} isOverdue={isOverdue} onToggleDone={toggleTaskDone}
                      hasSubtasks={t.subtasks && t.subtasks.length > 0}
                      isExpanded={expandedTasks[t.id]} onToggleExpand={() => toggleTaskExpand(t.id)}
                      members={members} onInlineUpdate={onInlineUpdate}
                      isDragging={draggedTaskId === t.id}
                      allSections={allSections} currentSection={section} onMoveToSection={onMoveToSection} />
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
                {/* Drop zone at end of section */}
                {draggedTaskId && sectionTasks.length > 0 && (
                  <div className="h-6"
                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDropTargetId('__end__') }}
                    onDrop={e => { e.preventDefault(); e.stopPropagation(); onReorderTask(section, '__end__') }}>
                    {dropTargetId === '__end__' && <div className="h-0.5 bg-indigo-500 mx-4 rounded-full mt-3" />}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function formatSmartDate(dateStr) {
  if (!dateStr) return ''
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const date = new Date(dateStr + 'T00:00:00')
  const diffDays = Math.round((date - today) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays > 1 && diffDays <= 6) {
    return date.toLocaleDateString('en-US', { weekday: 'long' })
  }
  if (diffDays < -1 && diffDays >= -6) {
    return `Last ${date.toLocaleDateString('en-US', { weekday: 'long' })}`
  }
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function DatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => {
    if (value) return new Date(value + 'T00:00:00')
    return new Date()
  })
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const selected = value ? new Date(value + 'T00:00:00') : null

  // Build calendar grid
  const firstDay = new Date(year, month, 1)
  const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1 // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const weeks = []
  let day = 1 - startDay
  for (let w = 0; w < 6; w++) {
    const week = []
    for (let d = 0; d < 7; d++, day++) {
      week.push(new Date(year, month, day))
    }
    weeks.push(week)
    if (day > daysInMonth) break
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  const selectDate = (d) => {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    onChange(iso)
    setOpen(false)
  }

  const isOverdue = value && !open && selected && selected < today

  return (
    <div className="relative" ref={ref} onMouseDown={e => e.stopPropagation()} onDragStart={e => e.stopPropagation()} draggable={false}>
      <button type="button" onClick={() => { setOpen(!open); if (value) setViewDate(new Date(value + 'T00:00:00')) }}
        className={`text-[11px] border border-transparent hover:border-gray-300 hover:bg-gray-50 rounded px-1 py-0.5 cursor-pointer w-full text-left ${isOverdue ? 'text-red-600 font-medium' : value ? 'text-gray-600' : 'text-gray-400'}`}>
        {value ? formatSmartDate(value) : '—'}
      </button>
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-3">
          {/* Quick picks */}
          <div className="flex gap-1 mb-2">
            {[
              ['Today', 0], ['Tomorrow', 1],
            ].map(([label, offset]) => {
              const d = new Date(); d.setDate(d.getDate() + offset)
              const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
              return <button key={label} onClick={() => { onChange(iso); setOpen(false) }}
                className="text-[10px] px-2 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700">{label}</button>
            })}
            {value && <button onClick={() => { onChange(''); setOpen(false) }}
              className="text-[10px] px-2 py-1 rounded-full border border-gray-200 text-red-500 hover:bg-red-50 ml-auto">Clear</button>}
          </div>
          {/* Month nav */}
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="text-gray-400 hover:text-gray-700 text-sm px-1">&lt;</button>
            <span className="text-xs font-semibold text-gray-800">{monthNames[month]} {year}</span>
            <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="text-gray-400 hover:text-gray-700 text-sm px-1">&gt;</button>
          </div>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-0 mb-1">
            {dayNames.map((d, i) => <span key={i} className="text-[10px] text-gray-400 text-center font-medium">{d}</span>)}
          </div>
          {/* Calendar grid */}
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-0">
              {week.map((d, di) => {
                const inMonth = d.getMonth() === month
                const isToday = d.getTime() === today.getTime()
                const isSel = selected && d.toDateString() === selected.toDateString()
                return (
                  <button key={di} onClick={() => selectDate(d)}
                    className={`text-[11px] w-7 h-7 rounded-full flex items-center justify-center transition-colors
                      ${!inMonth ? 'text-gray-300' : 'text-gray-700 hover:bg-indigo-50'}
                      ${isToday ? 'font-bold ring-1 ring-indigo-400' : ''}
                      ${isSel ? 'bg-indigo-600 text-white hover:bg-indigo-700' : ''}`}>
                    {d.getDate()}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TaskRow({ task, onOpen, isOverdue, onToggleDone, hasSubtasks, isExpanded, onToggleExpand, members, onInlineUpdate, isDragging, allSections, currentSection, onMoveToSection }) {
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const moveRef = useRef(null)
  const overdue = isOverdue(task)
  const subtaskCount = task.subtasks ? task.subtasks.length : 0
  const subtaskDone = task.subtasks ? task.subtasks.filter(s => s.done).length : 0

  useEffect(() => {
    if (!showMoveMenu) return
    const handler = (e) => { if (moveRef.current && !moveRef.current.contains(e.target)) setShowMoveMenu(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMoveMenu])

  const otherSections = (allSections || []).filter(s => s !== currentSection)

  const selectClass = "text-[11px] bg-transparent border border-transparent hover:border-gray-300 hover:bg-gray-50 rounded px-1 py-0.5 cursor-pointer focus:outline-none focus:border-indigo-300 w-full"

  // Prevent draggable parent from stealing clicks on form elements
  const stopDrag = { onMouseDown: e => e.stopPropagation(), onDragStart: e => e.stopPropagation(), draggable: false }

  return (
    <div className={`grid grid-cols-[1fr_100px_80px_80px_100px_100px_80px] gap-2 px-4 py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 items-center group/row ${isDragging ? 'opacity-40 bg-indigo-50' : ''}`}>
      <div className="flex items-center gap-2 min-w-0">
        <div className="relative flex-shrink-0" ref={moveRef}>
          <span className="cursor-grab text-gray-300 hover:text-gray-500 text-xs select-none" title="Drag to move"
            onClick={(e) => { e.stopPropagation(); if (otherSections.length > 0) setShowMoveMenu(!showMoveMenu) }}>⠿</span>
          {showMoveMenu && otherSections.length > 0 && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 max-h-48 overflow-y-auto">
              <p className="text-[10px] text-gray-400 px-3 py-1 uppercase tracking-wider">Move to section</p>
              {otherSections.map(s => (
                <button key={s} onClick={(e) => { e.stopPropagation(); onMoveToSection(task.id, s); setShowMoveMenu(false) }}
                  className="w-full text-left text-xs px-3 py-1.5 hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        {hasSubtasks ? (
          <button onClick={(e) => { e.stopPropagation(); onToggleExpand() }} className="text-gray-400 hover:text-gray-600 text-xs flex-shrink-0 w-4">
            {isExpanded ? '▾' : '▸'}
          </button>
        ) : <span className="w-4 flex-shrink-0"></span>}
        <button onClick={(e) => { e.stopPropagation(); onToggleDone(task) }}
          className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${task.progress === 'Done' ? 'border-green-500 bg-green-500 hover:bg-green-400' : 'border-gray-300 hover:border-green-400'}`}>
          {task.progress === 'Done' && <span className="text-white text-xs">✓</span>}
        </button>
        <span onClick={() => onOpen(task)} className={`text-sm truncate cursor-pointer ${task.progress === 'Done' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{task.title}</span>
        {subtaskCount > 0 && <span className="text-xs text-gray-400 flex-shrink-0 ml-1">{subtaskDone}/{subtaskCount}</span>}
      </div>
      <DatePicker value={task.due || ''} onChange={v => onInlineUpdate(task, 'due', v)} />
      <select {...stopDrag}
        value={task.priority || ''}
        onChange={e => onInlineUpdate(task, 'priority', e.target.value)}
        className={`${selectClass} ${task.priority ? PRIORITY_COLORS[task.priority] : 'text-gray-400'}`}
      >
        <option value="">—</option>
        {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
      <select {...stopDrag}
        value={task.value || ''}
        onChange={e => onInlineUpdate(task, 'value', e.target.value)}
        className={`${selectClass} ${task.value ? VALUE_COLORS[task.value] : 'text-gray-400'}`}
      >
        <option value="">—</option>
        {VALUES.map(v => <option key={v} value={v}>{v}</option>)}
      </select>
      <select {...stopDrag}
        value={task.effort || ''}
        onChange={e => onInlineUpdate(task, 'effort', e.target.value)}
        className={`${selectClass} ${task.effort ? EFFORT_COLORS[task.effort] : 'text-gray-400'}`}
      >
        <option value="">—</option>
        {EFFORT_LEVELS.map(el => <option key={el} value={el}>{el}</option>)}
      </select>
      <select {...stopDrag}
        value={task.progress || ''}
        onChange={e => onInlineUpdate(task, 'progress', e.target.value)}
        className={`${selectClass} ${task.progress ? PROGRESS_COLORS[task.progress] : 'text-gray-400'}`}
      >
        <option value="">—</option>
        {TASK_PROGRESS.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
      <select {...stopDrag}
        value={task.assigned_to || ''}
        onChange={e => onInlineUpdate(task, 'assigned_to', e.target.value)}
        className={`${selectClass} ${task.assigned_to ? 'text-indigo-700' : 'text-gray-400'}`}
      >
        <option value="">—</option>
        {(members || []).map(m => <option key={m.id} value={m.id}>{m.name.split(' ')[0]}</option>)}
      </select>
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
        {task.due && <span className={`text-xs ml-auto ${overdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>{formatSmartDate(task.due)}</span>}
      </div>
    </div>
  )
}
