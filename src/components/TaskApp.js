'use client'
import { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react'
import { DEFAULT_SECTIONS, PRIORITIES, VALUES, EFFORT_LEVELS, TASK_PROGRESS, PRIORITY_COLORS, VALUE_COLORS, EFFORT_COLORS, PROGRESS_COLORS, PROGRESS_DOT } from '../lib/data'
import { useSupabase, useUser, useTasks, useMembers, useSections } from '../lib/hooks'
import { createTask, updateTask, deleteTask, updateSubtask, createChildTask, createSection, deleteSection, renameSection, createRecurringFollowUp, fetchTaskById, fetchProjectMembers } from '../lib/db'
import dynamic from 'next/dynamic'
// Lazy-load heavy modals — only fetched when opened
const TaskModal = dynamic(() => import('./TaskModal'), { ssr: false })
const AddTaskModal = dynamic(() => import('./AddTaskModal'), { ssr: false })
import AvatarChip from './AvatarChip'
import { getCompactName } from '../lib/profile'
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter, closestCorners } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function TaskApp({ projectId = null, projectName = null, settingsButton = null }) {
  const supabase = useSupabase()
  const { user } = useUser()
  const { members } = useMembers()
  const currentMember = members?.find(m => m.profile_id === user?.id)
  const { tasks, loading, applyOptimistic, applyBulkOptimistic } = useTasks(projectId, currentMember?.id, user?.id)
  const { sections: customSections, sectionObjects, reload: reloadSections } = useSections(projectId, user?.id)
  // Per-view persisted UI prefs (collapsed sections, filter, etc.)
  // Scoped per project so My Tasks vs Project A vs Project B each have their own state.
  const prefsKey = `kc-task-prefs-${projectId || 'personal'}`
  const loadPrefs = () => {
    if (typeof window === 'undefined') return {}
    try { return JSON.parse(window.localStorage.getItem(prefsKey) || '{}') }
    catch { return {} }
  }
  const initialPrefs = loadPrefs()

  const [view, setView] = useState(initialPrefs.view || 'list')
  const [activeTask, setActiveTask] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState(initialPrefs.collapsedSections || { '__done__': true })
  const [expandedTasks, setExpandedTasks] = useState({})
  const [filterPriority, setFilterPriority] = useState(initialPrefs.filterPriority || 'all')
  const [filterAssignee, setFilterAssignee] = useState(initialPrefs.filterAssignee || 'all')
  const [filterStatus, setFilterStatus] = useState(initialPrefs.filterStatus || 'active')
  // My Tasks source filter — 'all' | 'mine' (created by me) | 'assigned' (assigned to me by others)
  const [filterSource, setFilterSource] = useState(initialPrefs.filterSource || 'all')
  // My Tasks group filter — 'none' | 'date'
  const [filterGroup, setFilterGroup] = useState(initialPrefs.filterGroup || 'none')
  const [showGroupMenu, setShowGroupMenu] = useState(false)
  const groupMenuRef = useRef(null)
  // My Tasks overdue filter — when true only overdue tasks are shown
  const [filterOverdue, setFilterOverdue] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Persist key prefs on change
  useEffect(() => {
    if (typeof window === 'undefined') return
    const prefs = { view, collapsedSections, filterPriority, filterAssignee, filterStatus, filterSource, filterGroup }
    try { window.localStorage.setItem(prefsKey, JSON.stringify(prefs)) } catch {}
  }, [view, collapsedSections, filterPriority, filterAssignee, filterStatus, filterSource, filterGroup, prefsKey])
  const [showAddSection, setShowAddSection] = useState(false)
  const [newSectionName, setNewSectionName] = useState('')
  const [undoToast, setUndoToast] = useState(null)
  const undoTimerRef = useRef(null)
  const [draggedTaskId, setDraggedTaskId] = useState(null)
  const draggedTaskIdRef = useRef(null)
  const [dropTargetId, setDropTargetId] = useState(null)
  const [sectionOrder, setSectionOrder] = useState(null)
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set())
  const [projectRole, setProjectRole] = useState(null) // 'owner' | 'editor' | 'viewer' | null
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const filterMenuRef = useRef(null)

  useEffect(() => {
    if (!showFilterMenu) return
    const handler = (e) => { if (filterMenuRef.current && !filterMenuRef.current.contains(e.target)) setShowFilterMenu(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showFilterMenu])

  useEffect(() => {
    if (!showGroupMenu) return
    const handler = (e) => { if (groupMenuRef.current && !groupMenuRef.current.contains(e.target)) setShowGroupMenu(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showGroupMenu])

  const activeFilterCount =
    (filterPriority !== 'all' ? 1 : 0) +
    (filterAssignee !== 'all' ? 1 : 0)

  // Determine user's role in this project
  useEffect(() => {
    if (!projectId || !currentMember) { setProjectRole(null); return }
    const checkRole = async () => {
      try {
        const pmList = await fetchProjectMembers(supabase, projectId)
        const myMembership = pmList.find(pm => pm.member_id === currentMember.id)
        if (myMembership) {
          setProjectRole(myMembership.role || 'editor')
        } else {
          // Check if owner
          const { data: proj } = await supabase.from('projects').select('owner_id').eq('id', projectId).single()
          setProjectRole(proj?.owner_id === user?.id ? 'owner' : 'editor') // public project default
        }
      } catch { setProjectRole('editor') }
    }
    checkRole()
  }, [supabase, projectId, currentMember, user?.id])

  const canEdit = !projectId || projectRole !== 'viewer'

  const ALL_COLUMNS = [
    { key: 'due', label: 'Due date', width: '100px', mobileWidth: '80px' },
    { key: 'priority', label: 'Priority', width: '80px' },
    { key: 'value', label: 'Value', width: '80px' },
    { key: 'effort', label: 'Effort level', width: '100px' },
    { key: 'progress', label: 'Task Progress', width: '100px' },
    { key: 'assignee', label: 'Assignee', width: '80px' },
  ]
  const colStorageKey = `kc-columns-${projectId || 'my'}`
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem(colStorageKey)
      if (saved) return JSON.parse(saved)
    } catch {}
    return ALL_COLUMNS.map(c => c.key)
  })
  const [showColumnMenu, setShowColumnMenu] = useState(false)
  const columnMenuRef = useRef(null)

  useEffect(() => {
    if (!showColumnMenu) return
    const handler = (e) => { if (columnMenuRef.current && !columnMenuRef.current.contains(e.target)) setShowColumnMenu(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showColumnMenu])

  const toggleColumn = (key) => {
    setVisibleColumns(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
      try { localStorage.setItem(colStorageKey, JSON.stringify(next)) } catch {}
      return next
    })
  }

  const isColVisible = (key) => visibleColumns.includes(key)

  const extraCols = ALL_COLUMNS.filter(c => isColVisible(c.key))
  const smGridCols = `1fr ${extraCols.map(c => c.width).join(' ')}`
  const mobileGridCols = isColVisible('due') ? '1fr 80px' : '1fr'

  // Memoize allSections — referenced by the heavy filter/group pipeline below.
  const allSections = useMemo(() => {
    const base = [...new Set([...DEFAULT_SECTIONS, ...customSections])]
    for (const t of tasks) {
      if (t.section && !base.includes(t.section)) base.push(t.section)
    }
    if (!sectionOrder) return base
    const ordered = sectionOrder.filter(s => base.includes(s))
    for (const s of base) if (!sectionOrder.includes(s)) ordered.push(s)
    return ordered
  }, [tasks, customSections, sectionOrder])

  const storageKey = `sectionOrder-${projectId || 'personal'}`
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) setSectionOrder(JSON.parse(saved))
    } catch {}
  }, [storageKey])

  const handleReorderSections = (draggedSec, targetSec) => {
    if (draggedSec === targetSec) return
    const ordered = [...allSections]
    const fromIdx = ordered.indexOf(draggedSec)
    const toIdx = ordered.indexOf(targetSec)
    if (fromIdx === -1 || toIdx === -1) return
    ordered.splice(fromIdx, 1)
    ordered.splice(toIdx, 0, draggedSec)
    setSectionOrder(ordered)
    try { localStorage.setItem(storageKey, JSON.stringify(ordered)) } catch {}
  }

  const toggleSection = (sec) => setCollapsedSections(prev => ({ ...prev, [sec]: !prev[sec] }))
  const toggleTaskExpand = (taskId) => setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }))

  const handleSelectTask = useCallback((taskId, e) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedTaskIds(prev => {
        const next = new Set(prev)
        if (next.has(taskId)) next.delete(taskId); else next.add(taskId)
        return next
      })
    } else {
      setSelectedTaskIds(new Set())
    }
  }, [])

  const clearSelection = () => setSelectedTaskIds(new Set())

  const bulkUpdate = useCallback(async (field, value) => {
    if (selectedTaskIds.size === 0) return
    // Exclude virtual subtask rows (they don't exist in the tasks table)
    const realIds = [...selectedTaskIds].filter(id => !String(id).startsWith('subtask-'))
    if (realIds.length === 0) return

    // Preserve scroll position so the page doesn't jump after the update
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0

    // Optimistic: update local state immediately
    const updates = {}
    if (field === 'section') {
      // When moving to a section, place tasks at the TOP of the target section
      // by giving them a sort_order lower than any existing task there.
      const topLevel = tasks.filter(t => !t.parent_task_id || t._isAssignedChild)
      const active = topLevel.filter(t => t.progress !== 'Done')
      const targetSection = value
      const minSort = active
        .filter(t => (t.section || 'Recently assigned') === targetSection)
        .reduce((min, t) => Math.min(min, t.sort_order ?? 0), 0)
      // Order moved tasks by their current sort_order so relative order is preserved
      const orderedIds = realIds
        .map(id => active.find(t => t.id === id))
        .filter(Boolean)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map(t => t.id)
      orderedIds.forEach((id, i) => {
        updates[id] = { section: targetSection, sort_order: minSort - (orderedIds.length - i) }
      })
    } else {
      realIds.forEach(id => { updates[id] = { [field]: value || null } })
    }
    applyBulkOptimistic(updates)
    clearSelection()

    // Restore scroll position after React re-renders
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: 'instant' }))
    }

    // Fire DB writes in background
    Promise.all(Object.entries(updates).map(([id, upd]) => updateTask(supabase, id, upd)))
      .catch(err => console.error('Bulk update failed:', err))
  }, [supabase, selectedTaskIds, applyBulkOptimistic, tasks])

  const bulkDelete = useCallback(async () => {
    if (selectedTaskIds.size === 0) return
    if (!confirm(`Delete ${selectedTaskIds.size} task(s)?`)) return
    try {
      await Promise.all([...selectedTaskIds].map(id => deleteTask(supabase, id)))
      clearSelection()
    } catch (err) { console.error('Bulk delete failed:', err) }
  }, [supabase, selectedTaskIds])

  const bulkDone = useCallback(async () => {
    if (selectedTaskIds.size === 0) return
    const realIds = [...selectedTaskIds].filter(id => !String(id).startsWith('subtask-'))
    if (realIds.length === 0) return
    const updates = {}
    realIds.forEach(id => { updates[id] = { progress: 'Done' } })
    applyBulkOptimistic(updates)
    clearSelection()
    try {
      await Promise.all(realIds.map(id => updateTask(supabase, id, { progress: 'Done' })))
    } catch (err) { console.error('Bulk done failed:', err) }
  }, [supabase, selectedTaskIds])

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
    const secObj = sectionObjects.find(s => s.name === oldName)
    if (secObj) {
      try {
        await renameSection(supabase, secObj.id, newName.trim())
        const tasksInSection = tasks.filter(t => t.section === oldName)
        await Promise.all(tasksInSection.map(t => updateTask(supabase, t.id, { section: newName.trim() })))
        reloadSections()
      } catch (err) { alert('Failed to rename section: ' + err.message) }
    } else {
      try {
        const tasksInSection = tasks.filter(t => (t.section || 'Recently assigned') === oldName)
        await Promise.all(tasksInSection.map(t => updateTask(supabase, t.id, { section: newName.trim() })))
      } catch (err) { alert('Failed to rename section: ' + err.message) }
    }
  }

  const handleDeleteSection = async (sectionName) => {
    if (!confirm(`Delete section "${sectionName}"? Tasks will be moved to "Recently assigned".`)) return
    const tasksInSection = tasks.filter(t => t.section === sectionName)
    try {
      await Promise.all(tasksInSection.map(t => updateTask(supabase, t.id, { section: 'Recently assigned' })))
      const secObj = sectionObjects.find(s => s.name === sectionName)
      if (secObj) await deleteSection(supabase, secObj.id)
      reloadSections()
    } catch (err) { alert('Failed to delete section: ' + err.message) }
  }

  const clearUndo = useCallback(() => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setUndoToast(null)
  }, [])

  const handleToggleTaskDone = useCallback(async (task) => {
    try {
      const wasDone = task.progress === 'Done'
      const newProgress = wasDone ? '' : 'Done'
      // Optimistic update — UI responds instantly
      applyOptimistic(task.id, { progress: newProgress })
      updateTask(supabase, task.id, { progress: newProgress }).catch(err => console.error('Failed to toggle task:', err))

      if (!wasDone) {
        clearUndo()
        setUndoToast({ taskId: task.id, title: task.title })
        undoTimerRef.current = setTimeout(() => setUndoToast(null), 3000)

        if (task.recurrence_rule) {
          createRecurringFollowUp(supabase, task).catch(err => console.error('recur err:', err))
        }
      }
    } catch (err) { console.error('Failed to toggle task:', err) }
  }, [supabase, clearUndo, applyOptimistic])

  const handleUndo = useCallback(async () => {
    if (!undoToast) return
    try {
      await updateTask(supabase, undoToast.taskId, { progress: '' })
    } catch (err) { console.error('Failed to undo:', err) }
    clearUndo()
  }, [supabase, undoToast, clearUndo])

  useEffect(() => {
    return () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current) }
  }, [])

  const handleToggleSubtask = useCallback(async (taskId, subtaskId, currentDone) => {
    try { await updateSubtask(supabase, subtaskId, { done: !currentDone }) }
    catch (err) { console.error('Failed to toggle subtask:', err) }
  }, [supabase])

  const handleToggleChildDone = useCallback(async (childTask) => {
    try {
      const wasDone = childTask.progress === 'Done'
      const newProgress = wasDone ? '' : 'Done'
      applyOptimistic(childTask.id, { progress: newProgress })
      updateTask(supabase, childTask.id, { progress: newProgress }).catch(err => console.error('Failed to toggle child task:', err))
      if (!wasDone && childTask.recurrence_rule) {
        createRecurringFollowUp(supabase, childTask).catch(err => console.error('recur err:', err))
      }
    } catch (err) { console.error('Failed to toggle child task:', err) }
  }, [supabase, applyOptimistic])

  const handleInlineUpdateChild = useCallback(async (childTask, field, value) => {
    try {
      const previousAssignedTo = field === 'assigned_to' ? childTask.assigned_to : null
      applyOptimistic(childTask.id, { [field]: value || null })
      updateTask(supabase, childTask.id, { [field]: value || null }, { previousAssignedTo })
        .catch(err => console.error('Failed to update child task:', err))
    } catch (err) { console.error('Failed to update child task:', err) }
  }, [supabase, applyOptimistic])

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

  const handleNavigateToTask = useCallback(async (taskRef) => {
    try {
      const fullTask = await fetchTaskById(supabase, taskRef.id)
      if (fullTask) setActiveTask(fullTask)
    } catch (err) { console.error('Failed to navigate to task:', err) }
  }, [supabase])

  const handleInlineUpdate = useCallback(async (task, field, value) => {
    try {
      const previousAssignedTo = field === 'assigned_to' ? task.assigned_to : null
      // Optimistic: update UI instantly
      applyOptimistic(task.id, { [field]: value || null })
      updateTask(supabase, task.id, { [field]: value || null }, { previousAssignedTo })
        .catch(err => console.error('Failed to update task:', err))
    } catch (err) { console.error('Failed to update task:', err) }
  }, [supabase, applyOptimistic])

  const setDraggedId = useCallback((id) => {
    setDraggedTaskId(id)
    draggedTaskIdRef.current = id
  }, [])

  const handleDropOnSection = useCallback(async (section) => {
    const did = draggedTaskIdRef.current
    if (!did) return
    try {
      await updateTask(supabase, did, { section })
    } catch (err) { console.error('Failed to move task:', err) }
    setDraggedId(null)
    setDropTargetId(null)
  }, [supabase, setDraggedId])

  const handleReorderTask = useCallback(async (section, targetTaskId, position) => {
    const did = draggedTaskIdRef.current
    if (!did || did === targetTaskId) {
      setDraggedId(null)
      setDropTargetId(null)
      return
    }

    // Get the same task list that is rendered on screen
    const topLevel = tasks.filter(t => !t.parent_task_id || t._isAssignedChild)
    const active = topLevel.filter(t => t.progress !== 'Done')
    const sectionTasks = active
      .filter(t => (t.section || 'Recently assigned') === section)
      .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))

    const draggedTask = sectionTasks.find(t => t.id === did)
    if (!draggedTask) { setDraggedId(null); setDropTargetId(null); return }

    const reordered = sectionTasks.filter(t => t.id !== did)
    let targetIndex
    if (targetTaskId === '__end__') {
      targetIndex = reordered.length
    } else {
      targetIndex = reordered.findIndex(t => t.id === targetTaskId)
      if (targetIndex === -1) { setDraggedId(null); setDropTargetId(null); return }
      // If dropping after the target, insert after it
      if (position === 'after') targetIndex++
    }

    reordered.splice(targetIndex, 0, draggedTask)

    // Only update real tasks (skip virtual subtask entries)
    const realTasks = reordered.filter(t => !String(t.id).startsWith('subtask-'))
    try {
      await Promise.all(realTasks.map((t, i) =>
        updateTask(supabase, t.id, { sort_order: i, section })
      ))
    } catch (err) { console.error('Failed to reorder:', err) }
    setDraggedId(null)
    setDropTargetId(null)
  }, [supabase, tasks, setDraggedId])

  // @dnd-kit handler: optimistic + background DB write
  // activeTaskId = id being dragged; overId = id of the task/section being hovered
  const handleDndReorder = useCallback((activeId, overId) => {
    if (!activeId || !overId || activeId === overId) return

    const topLevel = tasks.filter(t => !t.parent_task_id || t._isAssignedChild)
    const active = topLevel.filter(t => t.progress !== 'Done')
    const activeTask = active.find(t => t.id === activeId)
    if (!activeTask) return

    // Multi-select drag: if the dragged task is part of the selection, move ALL selected real tasks together
    const movingIds = selectedTaskIds.has(activeId) && selectedTaskIds.size > 1
      ? [...selectedTaskIds].filter(id => !String(id).startsWith('subtask-'))
      : [activeId]
    const movingIdSet = new Set(movingIds)
    // Preserve their current relative order when moving multiple
    const movingTasks = movingIds
      .map(id => active.find(t => t.id === id))
      .filter(Boolean)
      .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
    if (movingTasks.length === 0) return

    // overId can be a task id OR a section id (prefixed with 'section:')
    let targetSection
    let targetIndex
    if (String(overId).startsWith('section:')) {
      targetSection = String(overId).slice('section:'.length)
      const sectionTasks = active
        .filter(t => (t.section || 'Recently assigned') === targetSection && !movingIdSet.has(t.id))
        .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
      targetIndex = sectionTasks.length
    } else {
      const overTask = active.find(t => t.id === overId)
      if (!overTask) return
      // Don't drop onto a task we're moving
      if (movingIdSet.has(overTask.id)) return
      targetSection = overTask.section || 'Recently assigned'
      const sectionTasks = active
        .filter(t => (t.section || 'Recently assigned') === targetSection && !movingIdSet.has(t.id))
        .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
      targetIndex = sectionTasks.findIndex(t => t.id === overId)
      if (targetIndex === -1) targetIndex = sectionTasks.length
    }

    // Build new order for the target section with all moving tasks inserted at targetIndex
    const currentSectionTasks = active
      .filter(t => (t.section || 'Recently assigned') === targetSection && !movingIdSet.has(t.id))
      .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
    currentSectionTasks.splice(targetIndex, 0, ...movingTasks)

    // Build optimistic updates map (skip virtual subtask rows)
    const updates = {}
    currentSectionTasks.forEach((t, i) => {
      if (!String(t.id).startsWith('subtask-')) {
        updates[t.id] = { sort_order: i, section: targetSection }
      }
    })

    // 1. Apply optimistic UI update IMMEDIATELY
    applyBulkOptimistic(updates)
    // Clear selection so the user gets a clean state after a multi-move
    if (movingIds.length > 1) clearSelection()

    // 2. Fire DB writes in background
    const realUpdates = Object.entries(updates)
    Promise.all(realUpdates.map(([id, upd]) =>
      updateTask(supabase, id, upd)
    )).catch(err => console.error('Reorder DB update failed:', err))
  }, [tasks, applyBulkOptimistic, supabase, selectedTaskIds])

  // Memoize the top-level/active/done split — only re-compute when tasks change.
  const { topLevelTasks, activeTasks, doneTasks } = useMemo(() => {
    const top = tasks.filter(t => !t.parent_task_id || t._isAssignedChild)
    const active = []
    const done = []
    for (const t of top) {
      if (t.progress === 'Done') done.push(t); else active.push(t)
    }
    return { topLevelTasks: top, activeTasks: active, doneTasks: done }
  }, [tasks])

  // Compute "assigned to me by others" count (for the badge on Source pill)
  // Stable "today" timestamp for the render pass — avoid `new Date()` in
  // every loop iteration / sort comparator below.
  const todayMs = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime()
  }, [])
  const isOverdue = useCallback(
    (t) => !!(t.due && t.progress !== 'Done' && new Date(t.due).getTime() < todayMs),
    [todayMs]
  )

  const assignedToMeCount = useMemo(() => {
    if (projectId) return 0
    const myMemberId = currentMember?.id
    const myUserId = user?.id
    if (!myMemberId || !myUserId) return 0
    let n = 0
    for (const t of topLevelTasks) {
      if (t.assigned_to === myMemberId
          && t.created_by && t.created_by !== myUserId
          && t.is_acknowledged === false) n++
    }
    return n
  }, [topLevelTasks, projectId, currentMember?.id, user?.id])

  // Heavy filter+group+virtual-section pipeline. Re-runs only when one of
  // the actual inputs changes — not on every state change in the component.
  const {
    filtered, overdueTasks, recentlyAssignedTasks,
    filteredActive, filteredDone, grouped, sectionOverdueCounts, boardColumns,
  } = useMemo(() => {
    const myMemberId = currentMember?.id
    const myUserId = user?.id
    const search = searchQuery ? searchQuery.toLowerCase() : ''
    const sourceBase =
      filterStatus === 'done' ? doneTasks :
      filterStatus === 'active' ? activeTasks : topLevelTasks

    const filtered = []
    for (const t of sourceBase) {
      if (filterPriority !== 'all' && t.priority !== filterPriority) continue
      if (filterAssignee !== 'all' && t.assigned_to !== filterAssignee) continue
      if (search && !t.title.toLowerCase().includes(search)) continue
      if (!projectId && filterSource !== 'all') {
        const isAssignedToMe = t.assigned_to === myMemberId && t.created_by && t.created_by !== myUserId
        const isCreatedByMe = t.created_by === myUserId
        if (filterSource === 'mine' && !isCreatedByMe) continue
        if (filterSource === 'assigned' && !isAssignedToMe) continue
      }
      filtered.push(t)
    }

    // Compute overdue list for stats + filter pill (tasks stay in their sections — no displacement)
    const overdueTasks = []
    // Compute recently assigned virtual section (still floats to top)
    const recentlyAssignedTasks = []
    if (!projectId) {
      for (const t of filtered) {
        if (t.progress === 'Done') continue
        if (t.due && new Date(t.due).getTime() < todayMs) {
          overdueTasks.push(t)
        }
        if (t.assigned_to === myMemberId) {
          if (t._isLegacySubtask) { recentlyAssignedTasks.push(t); continue }
          if (t.created_by && t.created_by !== myUserId && t.is_acknowledged === false) {
            recentlyAssignedTasks.push(t)
          }
        }
      }
    }
    const filteredActive = []
    const filteredDone = []
    for (const t of filtered) {
      if (t.progress === 'Done') filteredDone.push(t); else filteredActive.push(t)
    }

    // Group active tasks by section — all tasks stay in their original sections
    // Recently assigned tasks also appear in the virtual section above, but are NOT excluded here
    const grouped = {}
    for (const s of allSections) grouped[s] = []
    for (const t of filteredActive) {
      // When overdue filter is active, skip non-overdue tasks
      if (filterOverdue && !projectId) {
        if (!(t.due && t.progress !== 'Done' && new Date(t.due).getTime() < todayMs)) continue
      }
      const sec = t.section || 'No section'
      if (!grouped[sec]) grouped[sec] = []
      grouped[sec].push(t)
    }
    // Sort within sections: by due date when filterGroup==='date', otherwise by sort_order
    const dueSortVal = (t) => t.due ? new Date(t.due).getTime() : 9_999_999_999_999
    for (const sec in grouped) {
      if (filterGroup === 'date') {
        grouped[sec].sort((a, b) => dueSortVal(a) - dueSortVal(b))
      } else {
        grouped[sec].sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
      }
    }

    // Per-section overdue counts (computed before filterOverdue narrows the view)
    const sectionOverdueCounts = {}
    for (const sec in grouped) {
      sectionOverdueCounts[sec] = grouped[sec].filter(
        t => t.due && t.progress !== 'Done' && new Date(t.due).getTime() < todayMs
      ).length
    }

    const boardColumns = {}
    for (const p of TASK_PROGRESS) boardColumns[p] = []
    for (const t of filtered) {
      const prog = t.progress || 'Not Started'
      if (!boardColumns[prog]) boardColumns[prog] = []
      boardColumns[prog].push(t)
    }

    return { filtered, overdueTasks, recentlyAssignedTasks, filteredActive, filteredDone, grouped, sectionOverdueCounts, boardColumns }
  }, [
    topLevelTasks, activeTasks, doneTasks,
    filterStatus, filterPriority, filterAssignee, filterSource, filterGroup, filterOverdue, searchQuery,
    projectId, currentMember?.id, user?.id, allSections, todayMs,
  ])

  if (loading) return (
    <div className="min-h-screen bg-[#DFDDD9] flex flex-col">
      {/* Skeleton header */}
      <div className="bg-[#D1CBC5] h-12 border-b border-[rgba(0,0,0,0.04)]" />
      <div className="bg-[#D1CBC5] h-11 border-b border-[rgba(0,0,0,0.04)]" />
      {/* Skeleton task rows */}
      <div className="p-4 space-y-1">
        <div className="h-8 w-32 bg-[#F5F3EF] rounded mb-2 animate-pulse" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-[#F5F3EF] border border-[rgba(0,0,0,0.04)] rounded-xl p-3 flex items-center gap-3 animate-pulse">
            <div className="w-4 h-4 bg-[#DFDDD9] rounded border border-[#D1CBC5]" />
            <div className="h-3 bg-[#DFDDD9] rounded flex-1" style={{ maxWidth: `${40 + (i * 7) % 40}%` }} />
            <div className="h-3 w-16 bg-[#DFDDD9] rounded" />
            <div className="h-3 w-16 bg-[#DFDDD9] rounded" />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#DFDDD9]">
      {/* Sticky header group: title + toolbar + bulk actions stick together */}
      <div className="sticky top-0 z-30 bg-[#D1CBC5]" style={{ position: 'sticky', top: 0 }}>
      {/* Top bar */}
      <div className="bg-[#D1CBC5] border-b border-[rgba(0,0,0,0.04)] px-4 pl-14 md:pl-4 flex items-center gap-3 h-12">
        {projectName && <BrandChip projectName={projectName} />}
        <span className="text-[13px] font-semibold text-[#2C2C2A] truncate">{projectName || 'My tasks'}</span>
        {settingsButton}
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] text-[#B7A99D] hidden sm:inline">
            {!projectId ? (
              <>
                {filteredActive.length} active
                {overdueTasks.length > 0 && <> · <span className="text-[#A32D2D] font-medium">{overdueTasks.length} overdue</span></>}
                {recentlyAssignedTasks.length > 0 && <> · <span className="text-[#185FA5] font-medium">{recentlyAssignedTasks.length} newly assigned</span></>}
              </>
            ) : (
              <>{filtered.length} tasks</>
            )}
          </span>
          {canEdit && (
            <button onClick={() => setShowAdd(true)}
              className="text-[11px] px-3 py-1.5 bg-[#2C2C2A] text-[#DFDDD9] rounded-lg hover:bg-[#3D3D3A] transition-colors flex items-center gap-1 font-medium">
              <span>+</span> <span className="hidden sm:inline">Add task</span>
            </button>
          )}
          {!canEdit && projectRole === 'viewer' && (
            <span className="text-[10px] text-[#B7A99D] bg-[rgba(0,0,0,0.04)] px-2.5 py-1.5 rounded-full">View only</span>
          )}
        </div>
      </div>

      {/* Toolbar — single row: view toggle · source pills · divider · status pills · filter ▾ · group ▾ · search */}
      <div className="bg-[#D1CBC5] border-b border-[rgba(0,0,0,0.04)] px-4 py-2 flex items-center gap-2 sm:gap-2.5 flex-wrap">
        {/* View toggle */}
        <div className="flex border border-[rgba(0,0,0,0.06)] rounded-lg overflow-hidden flex-shrink-0">
          {['list', 'board'].map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`text-[11px] px-3 py-1.5 transition-colors ${view === v ? 'bg-[#2C2C2A] text-[#DFDDD9] font-medium' : 'text-[#9B8C82] hover:bg-[rgba(0,0,0,0.03)]'}`}>
              {v === 'list' ? '☰ List' : '▦ Board'}
            </button>
          ))}
        </div>

        {/* Source pills — My Tasks only */}
        {!projectId && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => setFilterSource('all')}
              className={`text-[11px] px-2.5 py-1 rounded-full transition-colors font-medium ${filterSource === 'all' ? 'bg-[#2C2C2A] text-[#DFDDD9]' : 'bg-[rgba(0,0,0,0.04)] text-[#9B8C82] hover:bg-[rgba(0,0,0,0.07)]'}`}>
              All
            </button>
            <button onClick={() => setFilterSource('mine')}
              className={`text-[11px] px-2.5 py-1 rounded-full transition-colors flex items-center gap-1 ${filterSource === 'mine' ? 'bg-[#2C2C2A] text-[#DFDDD9] font-medium' : 'bg-[rgba(0,0,0,0.04)] text-[#9B8C82] hover:bg-[rgba(0,0,0,0.07)]'}`}>
              <span style={{ color: filterSource === 'mine' ? '#DFDDD9' : '#9B8C82' }}>+</span>
              <span className="hidden sm:inline">Created by me</span>
            </button>
            <button onClick={() => setFilterSource('assigned')}
              className={`text-[11px] px-2.5 py-1 rounded-full transition-colors flex items-center gap-1 ${filterSource === 'assigned' ? 'font-medium' : 'bg-[rgba(0,0,0,0.04)] text-[#9B8C82] hover:bg-[rgba(0,0,0,0.07)]'}`}
              style={filterSource === 'assigned' ? { background: 'rgba(55,138,221,0.15)', color: '#185FA5' } : {}}>
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6h7m0 0L6 3m3 3L6 9" stroke={filterSource === 'assigned' ? '#185FA5' : '#9B8C82'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span className="hidden sm:inline">Assigned to me</span>
              {assignedToMeCount > 0 && (
                <span className="text-[9.5px] px-1.5 rounded-full font-semibold"
                  style={{ background: filterSource === 'assigned' ? 'rgba(24,95,165,0.15)' : 'rgba(55,138,221,0.15)', color: '#185FA5' }}>
                  {assignedToMeCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Divider between source and status pills — My Tasks only */}
        {!projectId && <div className="w-px h-4 bg-[rgba(0,0,0,0.1)] flex-shrink-0 hidden sm:block" />}

        {/* Status pills — My Tasks inline; inside filter dropdown on project views */}
        {!projectId ? (
          <div className="flex items-center gap-1 flex-shrink-0">
            {[['active', 'Active'], ['all', 'All'], ['done', 'Done']].map(([key, label]) => (
              <button key={key} onClick={() => setFilterStatus(key)}
                className={`text-[11px] px-2.5 py-1 rounded-full transition-colors font-medium ${filterStatus === key ? 'bg-[#2C2C2A] text-[#DFDDD9]' : 'bg-[rgba(0,0,0,0.04)] text-[#9B8C82] hover:bg-[rgba(0,0,0,0.07)]'}`}>
                {label}
              </button>
            ))}
          </div>
        ) : null}

        {/* Spacer — pushes right-side actions to the far right */}
        <div className="flex-1 min-w-0" />

        {/* Divider before right-side actions — My Tasks only */}
        {!projectId && <div className="w-px h-4 bg-[rgba(0,0,0,0.1)] flex-shrink-0 hidden sm:block" />}

        {/* Overdue filter pill — My Tasks only, only when there are overdue tasks */}
        {!projectId && overdueTasks.length > 0 && (
          <button onClick={() => setFilterOverdue(v => !v)}
            className="text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1 font-medium flex-shrink-0 transition-colors"
            style={{
              background: filterOverdue ? 'rgba(226,74,74,0.15)' : 'rgba(226,74,74,0.10)',
              color: '#A32D2D',
              border: '0.5px solid rgba(226,74,74,0.2)',
            }}>
            ⚠ Overdue · {overdueTasks.length}
            {filterOverdue && <span className="ml-0.5 opacity-70">✕</span>}
          </button>
        )}

        {/* Filter dropdown */}
        <div className="relative flex-shrink-0" ref={filterMenuRef}>
          <button onClick={() => setShowFilterMenu(v => !v)}
            className={`text-[11px] px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors ${activeFilterCount > 0 ? 'border-[#2C2C2A] bg-[#2C2C2A] text-[#DFDDD9]' : 'border-[rgba(0,0,0,0.08)] text-[#2C2C2A] hover:bg-[rgba(0,0,0,0.03)]'}`}>
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M2 3h10M4 7h6M6 11h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            Filter{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
          </button>
          {showFilterMenu && (
            <div className="absolute left-0 top-full mt-1 w-64 bg-[#F5F3EF] border border-[rgba(0,0,0,0.06)] rounded-xl shadow-lg z-50 p-3 space-y-3">
              {/* Status — shown in dropdown only on project views; on My Tasks it's inline above */}
              {projectId && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#B7A99D] mb-1.5">Status</p>
                  <div className="flex flex-wrap gap-1">
                    {[['all', 'All'], ['active', 'Active'], ['done', 'Done']].map(([key, label]) => (
                      <button key={key} onClick={() => setFilterStatus(key)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${filterStatus === key ? 'border-[#2C2C2A] bg-[#2C2C2A] text-[#DFDDD9] font-medium' : 'border-transparent bg-[rgba(0,0,0,0.04)] text-[#9B8C82] hover:bg-[rgba(0,0,0,0.06)]'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#B7A99D] mb-1.5">Priority</p>
                <div className="flex flex-wrap gap-1">
                  {['all', ...PRIORITIES].map(p => (
                    <button key={p} onClick={() => setFilterPriority(p)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${filterPriority === p ? 'border-[#2C2C2A] bg-[#2C2C2A] text-[#DFDDD9] font-medium' : 'border-transparent bg-[rgba(0,0,0,0.04)] text-[#9B8C82] hover:bg-[rgba(0,0,0,0.06)]'}`}>
                      {p === 'all' ? 'All' : p}
                    </button>
                  ))}
                </div>
              </div>
              {members.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#B7A99D] mb-1.5">Assignee</p>
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                    <button onClick={() => setFilterAssignee('all')}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${filterAssignee === 'all' ? 'border-[#2C2C2A] bg-[#2C2C2A] text-[#DFDDD9] font-medium' : 'border-transparent bg-[rgba(0,0,0,0.04)] text-[#9B8C82] hover:bg-[rgba(0,0,0,0.06)]'}`}>All</button>
                    {members.map(m => (
                      <button key={m.id} onClick={() => setFilterAssignee(m.id)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${filterAssignee === m.id ? 'border-[#2C2C2A] bg-[#2C2C2A] text-[#DFDDD9] font-medium' : 'border-transparent bg-[rgba(0,0,0,0.04)] text-[#9B8C82] hover:bg-[rgba(0,0,0,0.06)]'}`}>
                        {getCompactName(m)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {activeFilterCount > 0 && (
                <button onClick={() => { setFilterPriority('all'); setFilterAssignee('all') }}
                  className="text-[10px] text-[#9B8C82] hover:text-[#2C2C2A] underline">Clear all filters</button>
              )}
            </div>
          )}
        </div>

        {/* Group: by date ▾ — My Tasks only */}
        {!projectId && (
          <div className="relative flex-shrink-0" ref={groupMenuRef}>
            <button onClick={() => setShowGroupMenu(v => !v)}
              className={`text-[11px] px-3 py-1.5 rounded-lg border flex items-center gap-1 transition-colors ${filterGroup !== 'none' ? 'border-[#2C2C2A] bg-[#2C2C2A] text-[#DFDDD9]' : 'border-[rgba(0,0,0,0.08)] text-[#2C2C2A] hover:bg-[rgba(0,0,0,0.03)]'}`}>
              Group: {filterGroup === 'date' ? 'by date' : 'none'}
              <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            {showGroupMenu && (
              <div className="absolute left-0 top-full mt-1 w-40 bg-[#F5F3EF] border border-[rgba(0,0,0,0.06)] rounded-xl shadow-lg z-50 py-1">
                <p className="text-[10px] uppercase tracking-wider text-[#B7A99D] px-3 py-1.5">Group by</p>
                {[['none', 'None'], ['date', 'Due date']].map(([key, label]) => (
                  <button key={key} onClick={() => { setFilterGroup(key); setShowGroupMenu(false) }}
                    className={`w-full text-left text-[11px] px-3 py-1.5 hover:bg-[rgba(0,0,0,0.03)] transition-colors flex items-center gap-2 ${filterGroup === key ? 'text-[#2C2C2A] font-medium' : 'text-[#9B8C82]'}`}>
                    {filterGroup === key && <span className="text-[10px]">✓</span>}
                    {filterGroup !== key && <span className="w-[10px]" />}
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-shrink-0">
          <input type="text" placeholder="Search tasks..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="text-[11px] border border-[rgba(0,0,0,0.06)] rounded-lg px-3 py-1.5 w-32 sm:w-48 bg-[#F5F3EF] text-[#2C2C2A] placeholder-[#B7A99D] focus:outline-none focus:border-[#2C2C2A] transition-colors" />
        </div>
      </div>

      {/* Bulk actions bar (part of sticky header group) */}
      {view === 'list' && selectedTaskIds.size > 0 && (
        <div className="bg-[#2C2C2A] text-[#DFDDD9] px-4 py-2 flex items-center gap-3">
          <span className="text-[11px] font-medium">{selectedTaskIds.size} selected</span>
          <div className="flex gap-1 items-center ml-2">
            <select onChange={e => { if (e.target.value) bulkUpdate('priority', e.target.value); e.target.value = '' }}
              className="text-[11px] bg-[#3D3D3A] text-[#DFDDD9] border border-[rgba(247,245,240,0.15)] rounded px-2 py-1 cursor-pointer">
              <option value="">Priority</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select onChange={e => { if (e.target.value) bulkUpdate('progress', e.target.value); e.target.value = '' }}
              className="text-[11px] bg-[#3D3D3A] text-[#DFDDD9] border border-[rgba(247,245,240,0.15)] rounded px-2 py-1 cursor-pointer">
              <option value="">Progress</option>
              {TASK_PROGRESS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select onChange={e => { if (e.target.value) bulkUpdate('section', e.target.value); e.target.value = '' }}
              className="text-[11px] bg-[#3D3D3A] text-[#DFDDD9] border border-[rgba(247,245,240,0.15)] rounded px-2 py-1 cursor-pointer">
              <option value="">Move to...</option>
              {allSections.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {members.length > 0 && (
              <select onChange={e => { if (e.target.value) bulkUpdate('assigned_to', e.target.value === '__none__' ? '' : e.target.value); e.target.value = '' }}
                className="text-[11px] bg-[#3D3D3A] text-[#DFDDD9] border border-[rgba(247,245,240,0.15)] rounded px-2 py-1 cursor-pointer">
                <option value="">Assign to...</option>
                <option value="__none__">Unassign</option>
                {(members || []).map(m => <option key={m.id} value={m.id}>{getCompactName(m)}</option>)}
              </select>
            )}
            <input type="date" onChange={e => { if (e.target.value) { bulkUpdate('due', e.target.value); e.target.value = '' } }}
              className="text-[11px] bg-[#3D3D3A] text-[#DFDDD9] border border-[rgba(247,245,240,0.15)] rounded px-2 py-1 cursor-pointer [color-scheme:dark]"
              title="Set due date" />
            <button onClick={bulkDone} className="text-[11px] bg-[#1D9E75] hover:bg-[#179467] text-white rounded px-2 py-1">✓ Done</button>
            <button onClick={bulkDelete} className="text-[11px] bg-[#A32D2D] hover:bg-[#8A2525] text-white rounded px-2 py-1">Delete</button>
          </div>
          <button onClick={clearSelection} className="text-[11px] text-[rgba(247,245,240,0.5)] hover:text-[#DFDDD9] ml-auto transition-colors">✕ Clear</button>
        </div>
      )}
      </div>
      {/* end sticky header group */}

      {view === 'list' ? (
        <>
          {/* Shared column header — covers virtual + regular sections */}
          <div className="px-4 pt-4">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-[rgba(0,0,0,0.04)] mb-1 bg-[#DFDDD9]">
              <span className="text-[10px] font-medium text-[#B7A99D] uppercase tracking-[1px] flex-1">Name</span>
              {isColVisible('due') && <span className="text-[10px] font-medium text-[#B7A99D] uppercase tracking-[1px] w-[80px] sm:w-[100px] flex-shrink-0">Due date</span>}
              {isColVisible('priority') && <span className="hidden sm:block text-[10px] font-medium text-[#B7A99D] uppercase tracking-[1px] w-[80px] flex-shrink-0">Priority</span>}
              {isColVisible('value') && <span className="hidden sm:block text-[10px] font-medium text-[#B7A99D] uppercase tracking-[1px] w-[80px] flex-shrink-0">Value</span>}
              {isColVisible('effort') && <span className="hidden sm:block text-[10px] font-medium text-[#B7A99D] uppercase tracking-[1px] w-[100px] flex-shrink-0">Effort level</span>}
              {isColVisible('progress') && <span className="hidden sm:block text-[10px] font-medium text-[#B7A99D] uppercase tracking-[1px] w-[100px] flex-shrink-0">Task Progress</span>}
              {isColVisible('assignee') && <span className="hidden sm:block text-[10px] font-medium text-[#B7A99D] uppercase tracking-[1px] w-[80px] flex-shrink-0">Assignee</span>}
              <div className="relative flex-shrink-0" ref={columnMenuRef}>
                <button onClick={() => setShowColumnMenu(!showColumnMenu)}
                  className="text-[#B7A99D] hover:text-[#9B8C82] text-[11px] px-1.5 py-1 rounded hover:bg-[rgba(0,0,0,0.04)] transition-colors" title="Customize columns">
                  <span className="text-[13px]">⚙</span>
                </button>
                {showColumnMenu && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-[#F5F3EF] border border-[rgba(0,0,0,0.04)] rounded-lg shadow-lg z-50 py-1">
                    <p className="text-[10px] text-[#B7A99D] px-3 py-1 uppercase tracking-[1px]">Show columns</p>
                    {ALL_COLUMNS.map(col => (
                      <label key={col.key} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[rgba(0,0,0,0.03)] cursor-pointer text-[11px] text-[#2C2C2A]">
                        <input type="checkbox" checked={isColVisible(col.key)} onChange={() => toggleColumn(col.key)}
                          className="rounded border-[rgba(0,0,0,0.15)] text-[#2C2C2A] focus:ring-[#2C2C2A]" />
                        {col.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recently assigned virtual section — floats to top of My Tasks only */}
          {!projectId && recentlyAssignedTasks.length > 0 && (
            <VirtualSections
              recentlyAssignedTasks={recentlyAssignedTasks}
              members={members}
              currentMember={currentMember}
              isOverdue={isOverdue}
              onOpen={setActiveTask}
              onToggleDone={handleToggleTaskDone}
              onAcknowledge={async (ids) => {
                if (!ids?.length) return
                applyBulkOptimistic(Object.fromEntries(ids.map(id => [id, { is_acknowledged: true }])))
                try {
                  const { acknowledgeTasks } = await import('../lib/db')
                  await acknowledgeTasks(supabase, ids)
                } catch (err) { console.error('Failed to acknowledge:', err) }
              }}
            />
          )}

          <ListView grouped={grouped} sectionOverdueCounts={sectionOverdueCounts} collapsedSections={collapsedSections} toggleSection={toggleSection}
            expandedTasks={expandedTasks} toggleTaskExpand={toggleTaskExpand} toggleSubtask={handleToggleSubtask}
            toggleTaskDone={handleToggleTaskDone} onOpen={setActiveTask} isOverdue={isOverdue}
            members={members} onInlineUpdate={handleInlineUpdate}
            onDndReorder={handleDndReorder}
            allSections={allSections} onMoveToSection={(taskId, section) => {
              const scrollY = typeof window !== 'undefined' ? window.scrollY : 0
              // Put the moved task at the TOP of the target section
              const topLevel = tasks.filter(t => !t.parent_task_id || t._isAssignedChild)
              const active = topLevel.filter(t => t.progress !== 'Done')
              const minSort = active
                .filter(t => (t.section || 'Recently assigned') === section)
                .reduce((min, t) => Math.min(min, t.sort_order ?? 0), 0)
              const newSortOrder = minSort - 1
              applyOptimistic(taskId, { section, sort_order: newSortOrder })
              if (typeof window !== 'undefined') {
                requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: 'instant' }))
              }
              updateTask(supabase, taskId, { section, sort_order: newSortOrder }).catch(err => console.error(err))
            }}
            onRenameSection={handleRenameSection} onDeleteSection={handleDeleteSection}
            onReorderSections={handleReorderSections}
            selectedTaskIds={selectedTaskIds} onSelectTask={handleSelectTask}
            onToggleChildDone={handleToggleChildDone} onInlineUpdateChild={handleInlineUpdateChild}
            onAddToSection={(section) => setShowAdd(section)}
            columnConfig={{ ALL_COLUMNS, isColVisible, visibleColumns, toggleColumn, showColumnMenu, setShowColumnMenu, columnMenuRef, smGridCols, mobileGridCols }} />

          {/* Done section */}
          {filteredDone.length > 0 && (
            <div className="px-4 pb-2">
              <button onClick={() => toggleSection('__done__')}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[rgba(0,0,0,0.03)] rounded-lg transition-colors">
                <span className={`text-[#B7A99D] text-[10px] transition-transform ${collapsedSections['__done__'] ? '' : 'rotate-90'}`}>▶</span>
                <span className="text-[13px] font-semibold text-[#1D9E75]">Done</span>
                <span className="text-[10px] bg-[rgba(29,158,117,0.08)] text-[#1D9E75] rounded-full px-2 py-0.5">{filteredDone.length}</span>
              </button>
              {!collapsedSections['__done__'] && (
                <div className="relative rounded-xl overflow-hidden mb-2">
                  <div className="absolute inset-0 bg-gradient-to-b from-[rgba(29,158,117,0.06)] to-[rgba(29,158,117,0.02)] pointer-events-none z-[1] rounded-xl" />
                  <div className="bg-[#F5F3EF] border border-[rgba(29,158,117,0.12)] rounded-xl overflow-hidden">
                    {filteredDone.map(t => (
                      <div key={t.id}>
                        <TaskRow task={t} onOpen={setActiveTask} isOverdue={isOverdue} onToggleDone={handleToggleTaskDone}
                          hasSubtasks={t.subtasks && t.subtasks.length > 0}
                          isExpanded={expandedTasks[t.id]} onToggleExpand={() => toggleTaskExpand(t.id)}
                          members={members} onInlineUpdate={handleInlineUpdate}
                          columnConfig={{ ALL_COLUMNS, isColVisible, visibleColumns, toggleColumn, showColumnMenu, setShowColumnMenu, columnMenuRef, smGridCols, mobileGridCols }} />
                      </div>
                    ))}
                  </div>
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
                  className="text-[13px] border border-[rgba(0,0,0,0.06)] rounded-lg px-3 py-1.5 w-56 text-[#2C2C2A] placeholder-[#B7A99D] focus:outline-none focus:border-[#2C2C2A]" />
                <button onClick={handleAddSection} className="text-[11px] px-3 py-1.5 bg-[#2C2C2A] text-[#DFDDD9] rounded-lg hover:bg-[#3D3D3A]">Add</button>
                <button onClick={() => { setShowAddSection(false); setNewSectionName('') }} className="text-[11px] px-3 py-1.5 border border-[rgba(0,0,0,0.06)] text-[#9B8C82] rounded-lg hover:bg-[rgba(0,0,0,0.02)]">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setShowAddSection(true)}
                className="text-[11px] text-[#B7A99D] hover:text-[#2C2C2A] flex items-center gap-1 py-2 transition-colors">
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
          <div className="bg-[#2C2C2A] text-[#DFDDD9] rounded-xl px-4 py-3 shadow-xl flex items-center gap-3 text-[13px]">
            <span className="text-[#1D9E75]">✓</span>
            <span className="truncate max-w-[200px]">&quot;{undoToast.title}&quot; done</span>
            <button onClick={handleUndo}
              className="text-[rgba(247,245,240,0.6)] hover:text-[#DFDDD9] font-medium ml-2 flex-shrink-0 transition-colors">
              Undo
            </button>
          </div>
        </div>
      )}

      {activeTask && <TaskModal task={activeTask} members={members} sections={allSections} onClose={() => setActiveTask(null)} onUpdate={canEdit ? handleUpdateTask : undefined} onDelete={canEdit ? handleDeleteTask : undefined} onNavigate={handleNavigateToTask} readOnly={!canEdit} />}
      {showAdd && <AddTaskModal members={members} sections={allSections} onClose={() => setShowAdd(false)} onAdd={handleAddTask} defaultSection={typeof showAdd === 'string' ? showAdd : undefined} />}
    </div>
  )
}

const ChildTaskRow = memo(function ChildTaskRow({ task, parentTask, onOpen, isOverdue, onToggleDone, members, onInlineUpdate, isSelected, onSelect, columnConfig }) {
  const overdue = isOverdue(task)
  const { isColVisible } = columnConfig
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(task.title)
  const selectClass = "text-[11px] bg-transparent border border-transparent hover:border-[rgba(0,0,0,0.1)] hover:bg-[rgba(0,0,0,0.02)] rounded px-1 py-0.5 cursor-pointer focus:outline-none focus:border-[#2C2C2A] w-full transition-colors"
  // Fade the "—" placeholder when empty, show full on hover/focus
  const emptySelectClass = "opacity-0 group-hover/row:opacity-60 focus:opacity-100 transition-opacity"
  const stopDrag = { onMouseDown: e => e.stopPropagation(), onDragStart: e => e.stopPropagation(), draggable: false }

  return (
    <div onClick={e => onSelect?.(task.id, e)}
      className={`flex gap-2 pl-6 sm:pl-10 pr-4 py-1.5 border-b border-[rgba(0,0,0,0.04)] last:border-0 hover:bg-[rgba(0,0,0,0.02)] items-center group/row ${isSelected ? 'bg-[rgba(44,44,42,0.04)] border-l-2 border-l-[#2C2C2A]' : ''}`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="w-4 flex-shrink-0 text-[#B7A99D] text-[10px]">↳</span>
        <button onClick={(e) => { e.stopPropagation(); onToggleDone(task) }}
          className={`w-3.5 h-3.5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${task.progress === 'Done' ? 'border-[#1D9E75] bg-[#1D9E75] hover:bg-[#179467]' : 'border-[#B7A99D] hover:border-[#1D9E75]'}`}>
          {task.progress === 'Done' && <span className="text-white text-[8px]">✓</span>}
        </button>
        {editingTitle ? (
          <input autoFocus value={titleValue}
            onChange={e => setTitleValue(e.target.value)}
            onBlur={() => { setEditingTitle(false); if (titleValue.trim() && titleValue !== task.title) onInlineUpdate(task, 'title', titleValue.trim()) }}
            onKeyDown={e => { if (e.key === 'Enter') { setEditingTitle(false); if (titleValue.trim() && titleValue !== task.title) onInlineUpdate(task, 'title', titleValue.trim()) } if (e.key === 'Escape') { setTitleValue(task.title); setEditingTitle(false) } }}
            onClick={e => e.stopPropagation()}
            {...stopDrag}
            className="text-[11px] text-[#2C2C2A] border border-[rgba(0,0,0,0.15)] rounded px-1 py-0 bg-[#F5F3EF] focus:outline-none focus:border-[#2C2C2A] w-full" />
        ) : (
          <span onClick={(e) => { e.stopPropagation(); setEditingTitle(true); setTitleValue(task.title) }}
            className={`text-[11px] truncate cursor-text hover:bg-[rgba(0,0,0,0.03)] rounded px-1 py-0 transition-colors ${task.progress === 'Done' ? 'text-[#B7A99D] line-through' : 'text-[#2C2C2A]'}`}>{task.title}</span>
        )}
        <button onClick={(e) => { e.stopPropagation(); onOpen(task) }}
          className="text-[#B7A99D] hover:text-[#2C2C2A] flex-shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity ml-1"
          title="Open task details">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 4l4 4-4 4"/></svg>
        </button>
      </div>
      {isColVisible('due') && <div className="w-[80px] sm:w-[100px] flex-shrink-0"><DatePicker value={task.due || ''} onChange={v => onInlineUpdate(task, 'due', v)} /></div>}
      {isColVisible('priority') && <div className="hidden sm:block w-[80px] flex-shrink-0"><select {...stopDrag}
        value={task.priority || ''} onChange={e => onInlineUpdate(task, 'priority', e.target.value)}
        className={`${selectClass} ${task.priority ? PRIORITY_COLORS[task.priority] : `text-[#B7A99D] ${emptySelectClass}`}`}>
        <option value="">—</option>{PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
      </select></div>}
      {isColVisible('value') && <div className="hidden sm:block w-[80px] flex-shrink-0"><select {...stopDrag}
        value={task.value || ''} onChange={e => onInlineUpdate(task, 'value', e.target.value)}
        className={`${selectClass} ${task.value ? VALUE_COLORS[task.value] : `text-[#B7A99D] ${emptySelectClass}`}`}>
        <option value="">—</option>{VALUES.map(v => <option key={v} value={v}>{v}</option>)}
      </select></div>}
      {isColVisible('effort') && <div className="hidden sm:block w-[100px] flex-shrink-0"><select {...stopDrag}
        value={task.effort || ''} onChange={e => onInlineUpdate(task, 'effort', e.target.value)}
        className={`${selectClass} ${task.effort ? EFFORT_COLORS[task.effort] : `text-[#B7A99D] ${emptySelectClass}`}`}>
        <option value="">—</option>{EFFORT_LEVELS.map(el => <option key={el} value={el}>{el}</option>)}
      </select></div>}
      {isColVisible('progress') && <div className="hidden sm:block w-[100px] flex-shrink-0"><select {...stopDrag}
        value={task.progress || ''} onChange={e => onInlineUpdate(task, 'progress', e.target.value)}
        className={`${selectClass} ${task.progress ? PROGRESS_COLORS[task.progress] : `text-[#B7A99D] ${emptySelectClass}`}`}>
        <option value="">—</option>{TASK_PROGRESS.map(p => <option key={p} value={p}>{p}</option>)}
      </select></div>}
      {isColVisible('assignee') && <div className="hidden sm:block w-[80px] flex-shrink-0"><select {...stopDrag}
        value={task.assigned_to || ''} onChange={e => onInlineUpdate(task, 'assigned_to', e.target.value)}
        className={`${selectClass} ${task.assigned_to ? 'text-[#2C2C2A]' : `text-[#B7A99D] ${emptySelectClass}`}`}>
        <option value="">—</option>{(members || []).map(m => <option key={m.id} value={m.id}>{getCompactName(m)}</option>)}
      </select></div>}
    </div>
  )
})

function SectionHeader({ section, taskCount, overdueCount, collapsed, onToggle, onRename, onDelete, onAddToSection, isDragOver, onSectionDragStart, onSectionDragOver, onSectionDrop, onSectionDragEnd }) {
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
    <div className={`flex items-center gap-1 group/sec ${isDragOver ? 'border-t-2 border-[#2C2C2A]' : ''}`}
      draggable={!editing}
      onDragStart={e => { e.dataTransfer.setData('section', section); onSectionDragStart(section) }}
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); onSectionDragOver(section) }}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); onSectionDrop(section) }}
      onDragEnd={onSectionDragEnd}>
      <div className="flex items-center gap-2 px-3 py-2 hover:bg-[rgba(0,0,0,0.03)] rounded-lg transition-colors flex-1 min-w-0">
        <span className="cursor-grab text-[#B7A99D] hover:text-[#9B8C82] text-[10px] select-none mr-1" title="Drag to reorder">⠿</span>
        <button onClick={onToggle} className="flex-shrink-0">
          <span className={`text-[#B7A99D] text-[10px] transition-transform ${collapsed ? '' : 'rotate-90'}`}>▶</span>
        </button>
        {editing ? (
          <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(false) }}
            onBlur={handleRename}
            onClick={e => e.stopPropagation()}
            onDragStart={e => e.stopPropagation()}
            draggable={false}
            className="text-[13px] font-semibold text-[#2C2C2A] border border-[rgba(0,0,0,0.15)] rounded px-1 py-0 bg-[#F5F3EF] w-48 focus:outline-none focus:border-[#2C2C2A]" />
        ) : (
          <span onClick={(e) => { e.stopPropagation(); setEditing(true); setEditName(section) }}
            className="text-[13px] font-semibold text-[#6B665C] cursor-text hover:bg-[rgba(0,0,0,0.03)] rounded px-1 py-0 transition-colors"
            title="Click to rename">{section}</span>
        )}
        <span className="text-[10px] bg-[rgba(0,0,0,0.04)] text-[#B7A99D] rounded-full px-2 py-0.5 cursor-pointer" onClick={onToggle}>{taskCount}</span>
        {overdueCount > 0 && (
          <span className="text-[9px] font-medium rounded-[8px] cursor-pointer" style={{ background: 'rgba(226,74,74,0.1)', color: '#A32D2D', padding: '1px 6px' }} onClick={onToggle}>{overdueCount} overdue</span>
        )}
      </div>
      <button onClick={(e) => { e.stopPropagation(); onAddToSection(section) }}
        className="text-[#B7A99D] hover:text-[#2C2C2A] text-[13px] px-1 py-0.5 rounded hover:bg-[rgba(0,0,0,0.03)] sm:opacity-0 sm:group-hover/sec:opacity-100 transition-all"
        title="Add a task to this section">
        +
      </button>
      <div className="relative" ref={menuRef}>
        <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
          className="text-[#B7A99D] hover:text-[#9B8C82] text-[13px] px-1.5 py-1 rounded hover:bg-[rgba(0,0,0,0.03)] sm:opacity-0 sm:group-hover/sec:opacity-100 transition-all">
          ⋯
        </button>
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 w-36 bg-[#F5F3EF] border border-[rgba(0,0,0,0.04)] rounded-lg shadow-lg z-50 py-1">
            <button onClick={() => { setShowMenu(false); setEditing(true); setEditName(section) }}
              className="w-full text-left text-[11px] px-3 py-1.5 hover:bg-[rgba(0,0,0,0.03)] text-[#2C2C2A] flex items-center gap-2">
              Rename
            </button>
            <button onClick={() => { setShowMenu(false); onDelete(section) }}
              className="w-full text-left text-[11px] px-3 py-1.5 hover:bg-[rgba(163,45,45,0.04)] text-[#A32D2D] flex items-center gap-2">
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ListView({ grouped, sectionOverdueCounts, collapsedSections, toggleSection, expandedTasks, toggleTaskExpand, toggleSubtask, toggleTaskDone, onOpen, isOverdue, members, onInlineUpdate, onDndReorder, allSections, onMoveToSection, onRenameSection, onDeleteSection, onReorderSections, selectedTaskIds, onSelectTask, onToggleChildDone, onInlineUpdateChild, onAddToSection, columnConfig }) {
  const [draggedSection, setDraggedSection] = useState(null)
  const [dropTargetSection, setDropTargetSection] = useState(null)

  // @dnd-kit active drag state
  const [activeDragId, setActiveDragId] = useState(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  // Legacy refs (for SectionHeader's HTML5 DnD — still used for section reorder)
  const dropInfoRef = useRef({ targetId: null, position: 'before' })
  const [, forceUpdate] = useState(0)
  const rafRef = useRef(null)

  const handleDragOverTask = (e, taskId) => {
    e.preventDefault()
    e.stopPropagation()
    const currentDragId = null // legacy - unused
    if (currentDragId && currentDragId !== taskId) {
      const rect = e.currentTarget.getBoundingClientRect()
      const midY = rect.top + rect.height / 2
      const pos = e.clientY < midY ? 'before' : 'after'
      const changed = dropInfoRef.current.targetId !== taskId || dropInfoRef.current.position !== pos
      dropInfoRef.current = { targetId: taskId, position: pos }
      // Throttle visual updates to avoid DOM churn that breaks DnD
      if (changed && !rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null
          forceUpdate(n => n + 1)
        })
      }
    }
  }

  const { ALL_COLUMNS, isColVisible, visibleColumns, toggleColumn, showColumnMenu, setShowColumnMenu, columnMenuRef, smGridCols, mobileGridCols } = columnConfig

  return (
    <div className="px-4 pb-4 flex-1">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e) => setActiveDragId(e.active.id)}
        onDragEnd={(e) => {
          setActiveDragId(null)
          if (e.over && e.active.id !== e.over.id) onDndReorder(e.active.id, e.over.id)
        }}
        onDragCancel={() => setActiveDragId(null)}
      >
        {Object.entries(grouped).map(([section, sectionTasks]) => {
          if (sectionTasks.length === 0 && !activeDragId) return null
          const collapsed = collapsedSections[section]
          return (
            <div key={section} className="mb-1">
              <div className="sticky top-[88px] z-[10] bg-[#DFDDD9] pt-1">
                <SectionHeader section={section} taskCount={sectionTasks.length} overdueCount={sectionOverdueCounts?.[section] ?? 0} collapsed={collapsed}
                  onToggle={() => toggleSection(section)} onRename={onRenameSection} onDelete={onDeleteSection} onAddToSection={onAddToSection}
                  isDragOver={dropTargetSection === section && draggedSection !== section}
                  onSectionDragStart={() => setDraggedSection(section)}
                  onSectionDragOver={() => { if (draggedSection && draggedSection !== section) setDropTargetSection(section) }}
                  onSectionDrop={() => { if (draggedSection) { onReorderSections(draggedSection, section); setDraggedSection(null); setDropTargetSection(null) } }}
                  onSectionDragEnd={() => { setDraggedSection(null); setDropTargetSection(null) }} />
              </div>
              {!collapsed && (
                <SectionDroppable section={section} tasks={sectionTasks} activeDragId={activeDragId}
                  onOpen={onOpen} isOverdue={isOverdue} toggleTaskDone={toggleTaskDone}
                  expandedTasks={expandedTasks} toggleTaskExpand={toggleTaskExpand}
                  members={members} onInlineUpdate={onInlineUpdate}
                  allSections={allSections} onMoveToSection={onMoveToSection}
                  selectedTaskIds={selectedTaskIds} onSelectTask={onSelectTask}
                  onToggleChildDone={onToggleChildDone} onInlineUpdateChild={onInlineUpdateChild}
                  toggleSubtask={toggleSubtask} columnConfig={columnConfig} />
              )}
            </div>
          )
        })}
        <DragOverlay>
          {activeDragId ? (
            <div className="bg-[#F5F3EF] border border-[rgba(0,0,0,0.08)] rounded-lg shadow-lg px-4 py-2 opacity-95">
              <span className="text-[12.5px] text-[#2C2C2A] font-medium">
                {(() => {
                  for (const ts of Object.values(grouped)) {
                    const t = ts.find(x => x.id === activeDragId)
                    if (t) return t.title
                  }
                  return 'Moving task…'
                })()}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

function SectionDroppable({ section, tasks, activeDragId, onOpen, isOverdue, toggleTaskDone, expandedTasks, toggleTaskExpand, members, onInlineUpdate, allSections, onMoveToSection, selectedTaskIds, onSelectTask, onToggleChildDone, onInlineUpdateChild, toggleSubtask, columnConfig }) {
  const ids = tasks.map(t => t.id)
  // Use a sentinel id for empty section drop target
  const dropIds = tasks.length === 0 ? [`section:${section}`] : ids
  return (
    <SortableContext items={dropIds} strategy={verticalListSortingStrategy}>
      <div className="bg-[#F5F3EF] border border-[rgba(0,0,0,0.04)] rounded-xl overflow-hidden mb-2 min-h-[4px]">
        {tasks.length === 0 && activeDragId && (
          <EmptySectionDropZone section={section} />
        )}
        {tasks.map((t) => (
          <SortableTaskRow key={t.id} task={t} activeDragId={activeDragId}
            onOpen={onOpen} isOverdue={isOverdue} toggleTaskDone={toggleTaskDone}
            hasSubtasks={(t.children && t.children.length > 0) || (t.subtasks && t.subtasks.length > 0)}
            isExpanded={expandedTasks[t.id]} onToggleExpand={() => toggleTaskExpand(t.id)}
            members={members} onInlineUpdate={onInlineUpdate}
            allSections={allSections} currentSection={section} onMoveToSection={onMoveToSection}
            isSelected={selectedTaskIds?.has(t.id)} onSelect={onSelectTask}
            parentTask={t._parentTask} columnConfig={columnConfig}
            onToggleChildDone={onToggleChildDone} onInlineUpdateChild={onInlineUpdateChild}
            toggleSubtask={toggleSubtask} />
        ))}
      </div>
    </SortableContext>
  )
}

function EmptySectionDropZone({ section }) {
  const { setNodeRef, isOver } = useSortable({ id: `section:${section}` })
  return (
    <div ref={setNodeRef}
      className={`px-4 py-3 text-[11px] text-center border-dashed border-2 m-1 rounded-lg transition-colors ${isOver ? 'border-[#2C2C2A] bg-[rgba(44,44,42,0.04)] text-[#2C2C2A]' : 'border-[rgba(0,0,0,0.06)] text-[#B7A99D]'}`}>
      Drop here to move to &quot;{section}&quot;
    </div>
  )
}

function SortableTaskRow({ task, activeDragId, onOpen, isOverdue, toggleTaskDone, hasSubtasks, isExpanded, onToggleExpand, members, onInlineUpdate, allSections, currentSection, onMoveToSection, isSelected, onSelect, parentTask, columnConfig, onToggleChildDone, onInlineUpdateChild, toggleSubtask }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: task.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} className="relative">
      {isOver && activeDragId && activeDragId !== task.id && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#2C2C2A] mx-4 rounded-full z-[1]" />
      )}
      <TaskRow task={task} onOpen={onOpen} isOverdue={isOverdue} onToggleDone={toggleTaskDone}
        hasSubtasks={hasSubtasks} isExpanded={isExpanded} onToggleExpand={onToggleExpand}
        members={members} onInlineUpdate={onInlineUpdate} isDragging={isDragging}
        allSections={allSections} currentSection={currentSection} onMoveToSection={onMoveToSection}
        isSelected={isSelected} onSelect={onSelect}
        parentTask={parentTask} columnConfig={columnConfig}
        dragHandleProps={{ ...attributes, ...listeners }} />
      {isExpanded && task.children && task.children.length > 0 && (
        <div className="bg-[rgba(0,0,0,0.015)] border-t border-[rgba(0,0,0,0.04)]">
          {task.children.map(child => (
            <ChildTaskRow key={child.id} task={child} parentTask={task} onOpen={onOpen} isOverdue={isOverdue}
              onToggleDone={onToggleChildDone} members={members} onInlineUpdate={onInlineUpdateChild} columnConfig={columnConfig}
              isSelected={false} onSelect={onSelect} />
          ))}
        </div>
      )}
      {isExpanded && (!task.children || task.children.length === 0) && task.subtasks && task.subtasks.length > 0 && (
        <div className="bg-[rgba(0,0,0,0.015)] border-t border-[rgba(0,0,0,0.04)]">
          {task.subtasks.map(st => (
            <div key={st.id} className="flex items-center gap-2 pl-12 pr-4 py-1.5 border-b border-[rgba(0,0,0,0.04)] last:border-0 hover:bg-[rgba(0,0,0,0.02)]">
              <button onClick={() => toggleSubtask(task.id, st.id, st.done)}
                className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${st.done ? 'border-[#1D9E75] bg-[#1D9E75]' : 'border-[#B7A99D] hover:border-[#9B8C82]'}`}>
                {st.done && <span className="text-white text-[8px]">✓</span>}
              </button>
              <span className={`text-[11px] ${st.done ? 'text-[#B7A99D] line-through' : 'text-[#2C2C2A]'}`}>{st.title}</span>
            </div>
          ))}
        </div>
      )}
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

  const firstDay = new Date(year, month, 1)
  const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
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
  const isToday = value && !open && selected && selected.getTime() === today.getTime()

  return (
    <div className="relative" ref={ref} onMouseDown={e => e.stopPropagation()} onDragStart={e => e.stopPropagation()} draggable={false}>
      <button type="button" onClick={() => { setOpen(!open); if (value) setViewDate(new Date(value + 'T00:00:00')) }}
        className={`text-[11px] border border-transparent hover:border-[rgba(0,0,0,0.1)] hover:bg-[rgba(0,0,0,0.02)] rounded px-1 py-0.5 cursor-pointer w-full text-left transition-colors ${isOverdue ? 'text-[#A32D2D] font-semibold' : isToday ? 'text-[#639922] font-semibold' : value ? 'text-[#B7A99D]' : 'text-[#B7A99D]'}`}>
        {value ? formatSmartDate(value) : '—'}
      </button>
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-56 bg-[#F5F3EF] border border-[rgba(0,0,0,0.04)] rounded-xl shadow-xl z-50 p-3">
          {/* Quick picks */}
          <div className="flex gap-1 mb-2">
            {[
              ['Today', 0], ['Tomorrow', 1],
            ].map(([label, offset]) => {
              const d = new Date(); d.setDate(d.getDate() + offset)
              const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
              return <button key={label} onClick={() => { onChange(iso); setOpen(false) }}
                className="text-[10px] px-2 py-1 rounded-full border border-[rgba(0,0,0,0.06)] text-[#9B8C82] hover:bg-[rgba(0,0,0,0.03)] hover:border-[rgba(0,0,0,0.15)] hover:text-[#2C2C2A] transition-colors">{label}</button>
            })}
            {value && <button onClick={() => { onChange(''); setOpen(false) }}
              className="text-[10px] px-2 py-1 rounded-full border border-[rgba(0,0,0,0.06)] text-[#A32D2D] hover:bg-[rgba(163,45,45,0.04)] ml-auto">Clear</button>}
          </div>
          {/* Month nav */}
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="text-[#B7A99D] hover:text-[#2C2C2A] text-[13px] px-1 transition-colors">&lt;</button>
            <span className="text-[11px] font-semibold text-[#2C2C2A]">{monthNames[month]} {year}</span>
            <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="text-[#B7A99D] hover:text-[#2C2C2A] text-[13px] px-1 transition-colors">&gt;</button>
          </div>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-0 mb-1">
            {dayNames.map((d, i) => <span key={i} className="text-[10px] text-[#B7A99D] text-center font-medium">{d}</span>)}
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
                      ${!inMonth ? 'text-[#B7A99D] opacity-40' : 'text-[#2C2C2A] hover:bg-[rgba(0,0,0,0.04)]'}
                      ${isToday ? 'font-bold ring-1 ring-[#2C2C2A]' : ''}
                      ${isSel ? 'bg-[#2C2C2A] text-[#DFDDD9] hover:bg-[#3D3D3A]' : ''}`}>
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

// Brand detection from project name
const BRAND_COLORS = {
  onest: { bg: 'rgba(29,122,95,0.10)', text: '#1D7A5F', label: 'onest' },
  grubby: { bg: 'rgba(45,90,61,0.10)', text: '#2D5A3D', label: 'grubby' },
  kc: { bg: 'rgba(155,140,130,0.10)', text: '#9B8C82', label: 'KC' },
}

function detectBrand(projectName) {
  if (!projectName) return null
  const lower = projectName.toLowerCase()
  if (lower.includes('onest')) return BRAND_COLORS.onest
  if (lower.includes('grubby')) return BRAND_COLORS.grubby
  return BRAND_COLORS.kc
}

function BrandChip({ projectName }) {
  const brand = detectBrand(projectName)
  if (!brand) return null
  return (
    <span
      className="inline-flex items-center px-1.5 py-0 rounded text-[9px] font-medium flex-shrink-0 leading-[16px]"
      style={{ backgroundColor: brand.bg, color: brand.text }}
    >
      {brand.label}
    </span>
  )
}

const TaskRow = memo(function TaskRow({ task, onOpen, isOverdue, onToggleDone, hasSubtasks, isExpanded, onToggleExpand, members, onInlineUpdate, isDragging, allSections, currentSection, onMoveToSection, isSelected, onSelect, parentTask, columnConfig, dragHandleProps }) {
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(task.title)
  const moveRef = useRef(null)
  const { isColVisible, smGridCols, mobileGridCols } = columnConfig
  const overdue = isOverdue(task)
  const childCount = task.children ? task.children.length : 0
  const childDone = task.children ? task.children.filter(c => c.progress === 'Done').length : 0
  const subtaskCount = childCount > 0 ? childCount : (task.subtasks ? task.subtasks.length : 0)
  const subtaskDone = childCount > 0 ? childDone : (task.subtasks ? task.subtasks.filter(s => s.done).length : 0)

  useEffect(() => {
    if (!showMoveMenu) return
    const handler = (e) => { if (moveRef.current && !moveRef.current.contains(e.target)) setShowMoveMenu(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMoveMenu])

  const otherSections = (allSections || []).filter(s => s !== currentSection)

  const selectClass = "text-[11px] bg-transparent border border-transparent hover:border-[rgba(0,0,0,0.1)] hover:bg-[rgba(0,0,0,0.02)] rounded px-1 py-0.5 cursor-pointer focus:outline-none focus:border-[#2C2C2A] w-full transition-colors"
  // Fade the "—" placeholder when empty, show full on hover/focus
  const emptySelectClass = "opacity-0 group-hover/row:opacity-60 focus:opacity-100 transition-opacity"

  const stopDrag = { onMouseDown: e => e.stopPropagation(), onDragStart: e => e.stopPropagation(), draggable: false }

  return (
    <div onClick={e => onSelect?.(task.id, e)}
      className={`flex gap-2 px-4 py-2 border-b border-[rgba(0,0,0,0.04)] last:border-0 hover:bg-[rgba(0,0,0,0.015)] items-center group/row transition-colors ${isDragging ? 'opacity-40 bg-[rgba(44,44,42,0.04)]' : ''} ${isSelected ? 'bg-[rgba(44,44,42,0.04)] border-l-[3px] border-l-[#2C2C2A]' : overdue ? 'border-l-[3px] border-l-[#A32D2D]' : ''}`}
      style={overdue && !isSelected ? { background: 'rgba(226,74,74,0.03)' } : undefined}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="relative flex-shrink-0" ref={moveRef}>
          {/* Drag handle — mobile: always visible 24x24px, desktop: visible on hover */}
          <button
            {...(dragHandleProps || {})}
            onClick={(e) => { e.stopPropagation(); if (otherSections.length > 0) setShowMoveMenu(!showMoveMenu) }}
            className="w-6 h-6 sm:w-4 sm:h-4 flex items-center justify-center text-[#B7A99D] hover:text-[#9B8C82] text-[12px] sm:text-[10px] select-none touch-none cursor-grab active:cursor-grabbing sm:opacity-40 sm:group-hover/row:opacity-100 transition-opacity"
            title="Drag to reorder · Tap to move">
            ⠿
          </button>
          {showMoveMenu && otherSections.length > 0 && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-[#F5F3EF] border border-[rgba(0,0,0,0.04)] rounded-lg shadow-lg z-50 py-1 max-h-48 overflow-y-auto">
              <p className="text-[10px] text-[#B7A99D] px-3 py-1 uppercase tracking-[1px]">Move to section</p>
              {otherSections.map(s => (
                <button key={s} onClick={(e) => { e.stopPropagation(); onMoveToSection(task.id, s); setShowMoveMenu(false) }}
                  className="w-full text-left text-[11px] px-3 py-1.5 hover:bg-[rgba(0,0,0,0.03)] text-[#2C2C2A] transition-colors">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        {hasSubtasks ? (
          <button onClick={(e) => { e.stopPropagation(); onToggleExpand() }} className="text-[#B7A99D] hover:text-[#9B8C82] text-[10px] flex-shrink-0 w-4">
            {isExpanded ? '▾' : '▸'}
          </button>
        ) : <span className="w-4 flex-shrink-0"></span>}
        <button onClick={(e) => { e.stopPropagation(); onToggleDone(task) }}
          className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${task.progress === 'Done' ? 'border-[#1D9E75] bg-[#1D9E75] hover:bg-[#179467]' : overdue ? 'border-[#A32D2D] hover:border-[#1D9E75]' : 'border-[#B7A99D] hover:border-[#1D9E75]'}`}>
          {task.progress === 'Done' && <span className="text-white text-[10px]">✓</span>}
        </button>
        <div className="flex flex-col min-w-0">
          {(task._parentTask || task._project) && (
            <span className="text-[10px] text-[#B7A99D] truncate flex items-center gap-1">
              {task._project && <BrandChip projectName={task._project.name} />}
              {task._project && <span className="text-[#9B8C82]">{task._project.name}</span>}
              {task._project && task._parentTask && <span>·</span>}
              {task._parentTask && <span>{task._parentTask.title} ›</span>}
            </span>
          )}
          {editingTitle ? (
            <input autoFocus value={titleValue}
              onChange={e => setTitleValue(e.target.value)}
              onBlur={() => { setEditingTitle(false); if (titleValue.trim() && titleValue !== task.title) onInlineUpdate(task, 'title', titleValue.trim()) }}
              onKeyDown={e => { if (e.key === 'Enter') { setEditingTitle(false); if (titleValue.trim() && titleValue !== task.title) onInlineUpdate(task, 'title', titleValue.trim()) } if (e.key === 'Escape') { setTitleValue(task.title); setEditingTitle(false) } }}
              onClick={e => e.stopPropagation()}
              {...{ onMouseDown: e => e.stopPropagation(), onDragStart: e => e.stopPropagation(), draggable: false }}
              className="text-[13px] text-[#2C2C2A] border border-[rgba(0,0,0,0.15)] rounded px-1 py-0 bg-[#F5F3EF] focus:outline-none focus:border-[#2C2C2A] w-full" />
          ) : (
            <span onClick={(e) => { e.stopPropagation(); setEditingTitle(true); setTitleValue(task.title) }}
              className={`text-[13px] truncate cursor-text hover:bg-[rgba(0,0,0,0.03)] rounded px-1 py-0 transition-colors ${task.progress === 'Done' ? 'text-[#B7A99D] line-through' : 'text-[#2C2C2A]'}`}>{task.title}</span>
          )}
          <button onClick={(e) => { e.stopPropagation(); onOpen(task) }}
            className="text-[#B7A99D] hover:text-[#2C2C2A] flex-shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity ml-1"
            title="Open task details">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 4l4 4-4 4"/></svg>
          </button>
        </div>
        {subtaskCount > 0 && <span className="text-[10px] text-[#B7A99D] flex-shrink-0 ml-1">{subtaskDone}/{subtaskCount}</span>}
      </div>
      {isColVisible('due') && <div className="w-[80px] sm:w-[100px] flex-shrink-0"><DatePicker value={task.due || ''} onChange={v => onInlineUpdate(task, 'due', v)} /></div>}
      {isColVisible('priority') && <div className="hidden sm:block w-[80px] flex-shrink-0"><select {...stopDrag}
        value={task.priority || ''} onChange={e => onInlineUpdate(task, 'priority', e.target.value)}
        className={`${selectClass} ${task.priority ? PRIORITY_COLORS[task.priority] : `text-[#B7A99D] ${emptySelectClass}`}`}>
        <option value="">—</option>{PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
      </select></div>}
      {isColVisible('value') && <div className="hidden sm:block w-[80px] flex-shrink-0"><select {...stopDrag}
        value={task.value || ''} onChange={e => onInlineUpdate(task, 'value', e.target.value)}
        className={`${selectClass} ${task.value ? VALUE_COLORS[task.value] : `text-[#B7A99D] ${emptySelectClass}`}`}>
        <option value="">—</option>{VALUES.map(v => <option key={v} value={v}>{v}</option>)}
      </select></div>}
      {isColVisible('effort') && <div className="hidden sm:block w-[100px] flex-shrink-0"><select {...stopDrag}
        value={task.effort || ''} onChange={e => onInlineUpdate(task, 'effort', e.target.value)}
        className={`${selectClass} ${task.effort ? EFFORT_COLORS[task.effort] : `text-[#B7A99D] ${emptySelectClass}`}`}>
        <option value="">—</option>{EFFORT_LEVELS.map(el => <option key={el} value={el}>{el}</option>)}
      </select></div>}
      {isColVisible('progress') && <div className="hidden sm:block w-[100px] flex-shrink-0"><select {...stopDrag}
        value={task.progress || ''} onChange={e => onInlineUpdate(task, 'progress', e.target.value)}
        className={`${selectClass} ${task.progress ? PROGRESS_COLORS[task.progress] : `text-[#B7A99D] ${emptySelectClass}`}`}>
        <option value="">—</option>{TASK_PROGRESS.map(p => <option key={p} value={p}>{p}</option>)}
      </select></div>}
      {isColVisible('assignee') && <div className="hidden sm:block w-[80px] flex-shrink-0"><select {...stopDrag}
        value={task.assigned_to || ''} onChange={e => onInlineUpdate(task, 'assigned_to', e.target.value)}
        className={`${selectClass} ${task.assigned_to ? 'text-[#2C2C2A]' : `text-[#B7A99D] ${emptySelectClass}`}`}>
        <option value="">—</option>{(members || []).map(m => <option key={m.id} value={m.id}>{getCompactName(m)}</option>)}
      </select></div>}
    </div>
  )
})

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
                <span className="text-[10px] font-medium text-[#6B665C] uppercase tracking-[1px]">{status}</span>
              </div>
              <span className="text-[10px] bg-[rgba(0,0,0,0.04)] text-[#B7A99D] rounded-full px-2 py-0.5">{tasks.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {!tasks.length && <div className="border border-dashed border-[rgba(0,0,0,0.06)] rounded-xl p-4 text-center text-[11px] text-[#B7A99D]">Empty</div>}
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
  const childCount = task.children ? task.children.length : 0
  const childDone = task.children ? task.children.filter(c => c.progress === 'Done').length : 0
  const subtaskCount = childCount > 0 ? childCount : (task.subtasks ? task.subtasks.length : 0)
  const subtaskDone = childCount > 0 ? childDone : (task.subtasks ? task.subtasks.filter(s => s.done).length : 0)

  return (
    <div onClick={() => onOpen(task)} className={`bg-[#F5F3EF] border border-[rgba(0,0,0,0.04)] rounded-[10px] p-3 cursor-pointer hover:border-[rgba(0,0,0,0.12)] hover:shadow-sm transition-all ${task.progress === 'Done' ? 'bg-gradient-to-br from-[rgba(99,153,34,0.03)] to-[rgba(99,153,34,0.07)]' : ''}`}>
      <p className={`text-[13px] font-medium leading-snug mb-2 ${task.progress === 'Done' ? 'text-[#B7A99D] line-through' : 'text-[#2C2C2A]'}`}>{task.title}</p>
      <div className="flex flex-wrap items-center gap-1">
        {task.priority && <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>}
        {subtaskCount > 0 && <span className="text-[10px] text-[#B7A99D]">{subtaskDone}/{subtaskCount}</span>}
        {task.assigned_member && <AvatarChip name={getCompactName(task.assigned_member)} size="sm" avatarColor={task.assigned_member.avatar_color} avatarUrl={task.assigned_member.avatar_url} />}
        {task.due && <span className={`text-[10px] ml-auto ${overdue ? 'text-[#A32D2D] font-medium' : 'text-[#B7A99D]'}`}>{formatSmartDate(task.due)}</span>}
      </div>
    </div>
  )
}

// =====================================================
// Virtual sections for My Tasks: Recently assigned only
// Overdue tasks are shown inline in their original sections (with red stripe).
// Flat layout matching the rest of the task list — shared columns,
// inline section header, no card wrapper.
// =====================================================
function VirtualSections({ recentlyAssignedTasks, members, currentMember, isOverdue, onOpen, onToggleDone, onAcknowledge }) {
  // Auto-acknowledge "Recently assigned" tasks 2s after they appear (debounced)
  useEffect(() => {
    if (!recentlyAssignedTasks?.length) return
    const ids = recentlyAssignedTasks.map(t => t.id)
    const timer = setTimeout(() => onAcknowledge?.(ids), 2000)
    return () => clearTimeout(timer)
  }, [recentlyAssignedTasks?.map(t => t.id).join(','), onAcknowledge])

  return (
    <div className="px-4 pt-3">
      {recentlyAssignedTasks.length > 0 && (
        <VirtualSection
          title="Recently assigned"
          caption="Others put these on your plate"
          count={recentlyAssignedTasks.length}
          accent="#185FA5"
          countBg="rgba(55,138,221,0.10)"
          tasks={recentlyAssignedTasks}
          members={members}
          isOverdue={isOverdue}
          onOpen={onOpen}
          onToggleDone={onToggleDone}
          showAssignedBy
        />
      )}
    </div>
  )
}

function VirtualSection({ title, caption, count, accent, countBg, tasks, members, isOverdue, onOpen, onToggleDone, showAssignedBy }) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="mb-1">
      {/* Section header — flat, inline */}
      <button onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center gap-2 px-1 py-2 hover:bg-[rgba(0,0,0,0.02)] rounded transition-colors">
        <span className={`text-[10px] transition-transform ${collapsed ? '' : 'rotate-90'}`} style={{ color: '#6B665C' }}>▶</span>
        <span className="text-[11px] uppercase tracking-[0.5px] font-semibold" style={{ color: accent }}>{title}</span>
        <span className="text-[9px] rounded-full px-2 py-0.5 font-medium" style={{ background: countBg, color: accent }}>{count}</span>
        {caption && (
          <span className="text-[9.5px] text-[#9B8C82] font-normal normal-case ml-1.5">{caption}</span>
        )}
      </button>
      {/* Task rows — match the column layout of ListView */}
      {!collapsed && (
        <div>
          {tasks.map(t => (
            <VirtualTaskRow key={t.id} task={t} members={members} isOverdue={isOverdue}
              onOpen={onOpen} onToggleDone={onToggleDone} showAssignedBy={showAssignedBy} />
          ))}
        </div>
      )}
    </div>
  )
}

function VirtualTaskRow({ task, members, isOverdue, onOpen, onToggleDone, showAssignedBy }) {
  const overdue = isOverdue?.(task)
  const assignedBy = showAssignedBy && task.created_by
    ? members?.find(m => m.profile_id === task.created_by)
    : null
  const assignee = task.assigned_to ? members?.find(m => m.id === task.assigned_to) : null
  return (
    <div onClick={() => onOpen?.(task)}
      className="flex items-start gap-2 px-1 py-2 border-b border-[rgba(0,0,0,0.04)] hover:bg-[rgba(44,44,42,0.02)] cursor-pointer transition-colors">
      {/* Checkbox */}
      <button onClick={(e) => { e.stopPropagation(); onToggleDone?.(task) }}
        className={`w-3.5 h-3.5 rounded border-[1.5px] flex-shrink-0 mt-0.5 transition-colors ${overdue ? 'border-[#A32D2D]' : 'border-[#9B8C82] hover:border-[#1D9E75]'}`}>
      </button>
      {/* Task content (title + meta line) — flex-1 */}
      <div className="flex-1 min-w-0">
        {/* Subtask parent breadcrumb */}
        {task._parentTask && (
          <p className="text-[9.5px] text-[#B7A99D] truncate leading-tight">{task._parentTask.title} ›</p>
        )}
        {/* Assigned-by inline badge for "Recently assigned" section */}
        {showAssignedBy && assignedBy && (
          <span className="text-[9px] inline-block mr-1.5 mb-0.5 px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(55,138,221,0.08)', color: '#185FA5' }}>
            → Assigned by {assignedBy.nickname || assignedBy.name} {assignedBy.position_title || assignedBy.position || ''}
          </span>
        )}
        <p className="text-[12.5px] text-[#2C2C2A] truncate leading-tight">{task.title}</p>
        {/* Meta line: brand chip + project name */}
        {(task._project || task.brand) && (
          <div className="flex items-center gap-1.5 mt-0.5">
            {task._project && <BrandChip projectName={task._project.name} />}
            {task._project && <span className="text-[10px] text-[#9B8C82] truncate">{task._project.name}</span>}
          </div>
        )}
      </div>
      {/* Due column */}
      <div className={`text-[11px] text-right flex-shrink-0 hidden sm:block ${overdue ? 'text-[#A32D2D] font-medium' : 'text-[#9B8C82]'}`} style={{ width: 80 }}>
        {task.due ? formatSmartDate(task.due) : ''}
      </div>
      {/* Priority column */}
      <div className="hidden sm:flex items-center justify-end flex-shrink-0" style={{ width: 70 }}>
        {task.priority && (
          <span className={`text-[9px] px-2 py-0.5 rounded-full ${PRIORITY_COLORS[task.priority] || ''}`}>
            {task.priority}
          </span>
        )}
      </div>
      {/* Assignee column */}
      <div className="hidden sm:block text-[10.5px] text-[#9B8C82] text-right flex-shrink-0 truncate" style={{ width: 90 }}>
        {assignee ? `${assignee.nickname || assignee.name} ${assignee.position_title || assignee.position || ''}`.trim() : ''}
      </div>
    </div>
  )
}
