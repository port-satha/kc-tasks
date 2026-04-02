'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase, useMembers } from '../lib/hooks'
import { updateProject, deleteProject, addProjectMember, removeProjectMember, fetchProjectMembers } from '../lib/db'
import AvatarChip from './AvatarChip'

export default function ProjectSettings({ project, onClose, onUpdate }) {
  const supabase = useSupabase()
  const router = useRouter()
  const { members } = useMembers()
  const [name, setName] = useState(project.name)
  const [isPrivate, setIsPrivate] = useState(project.is_private || false)
  const [projectMembers, setProjectMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [addMemberId, setAddMemberId] = useState('')

  useEffect(() => {
    loadProjectMembers()
  }, [project.id])

  const loadProjectMembers = async () => {
    try {
      const data = await fetchProjectMembers(supabase, project.id)
      setProjectMembers(data)
    } catch (err) {
      console.error('Failed to load project members:', err)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      const updated = await updateProject(supabase, project.id, {
        name: name.trim(),
        is_private: isPrivate,
      })
      if (onUpdate) onUpdate(updated)
    } catch (err) {
      alert('Failed to update project: ' + err.message)
    }
    setLoading(false)
  }

  const handleToggleVisibility = async (val) => {
    setIsPrivate(val)
    try {
      const updated = await updateProject(supabase, project.id, { is_private: val })
      if (onUpdate) onUpdate(updated)
    } catch (err) {
      alert('Failed to update visibility: ' + err.message)
      setIsPrivate(!val)
    }
  }

  const handleAddMember = async () => {
    if (!addMemberId) return
    try {
      await addProjectMember(supabase, project.id, addMemberId)
      setAddMemberId('')
      await loadProjectMembers()
    } catch (err) {
      alert('Failed to add member: ' + err.message)
    }
  }

  const handleRemoveMember = async (memberId) => {
    try {
      await removeProjectMember(supabase, project.id, memberId)
      await loadProjectMembers()
    } catch (err) {
      alert('Failed to remove member: ' + err.message)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteProject(supabase, project.id)
      router.push('/')
      router.refresh()
    } catch (err) {
      alert('Failed to delete project: ' + err.message)
    }
    setDeleting(false)
  }

  const handleNameBlur = () => {
    if (name.trim() && name.trim() !== project.name) {
      handleSave()
    }
  }

  // Members not yet added to the project
  const memberIds = new Set(projectMembers.map(pm => pm.member_id))
  const availableMembers = members.filter(m => !memberIds.has(m.id))

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-end p-4 pt-12" onClick={onClose}>
      <div className="bg-white w-[420px] rounded-2xl shadow-xl max-h-[calc(100vh-80px)] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Project settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Project name */}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Project name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={e => { if (e.key === 'Enter') handleNameBlur() }}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>

          {/* Visibility toggle */}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-2">Visibility</label>
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => handleToggleVisibility(false)}
                className={`flex-1 text-xs px-3 py-2 transition-colors flex items-center justify-center gap-1.5 ${
                  !isPrivate ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className="text-sm">🌐</span> Public
              </button>
              <button
                type="button"
                onClick={() => handleToggleVisibility(true)}
                className={`flex-1 text-xs px-3 py-2 transition-colors flex items-center justify-center gap-1.5 ${
                  isPrivate ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className="text-sm">🔒</span> Private
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              {isPrivate ? 'Only selected members can see this project' : 'Visible to all team members'}
            </p>
          </div>

          {/* Members section (shown when private) */}
          {isPrivate && (
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-2">Project members</label>

              {/* Current members */}
              <div className="space-y-1.5 mb-3">
                {projectMembers.length === 0 && (
                  <p className="text-xs text-gray-400 py-2">No members added yet. Add members to give them access.</p>
                )}
                {projectMembers.map(pm => {
                  const member = pm.member
                  const isOwner = member?.profile_id === project.owner_id
                  return (
                    <div key={pm.member_id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <AvatarChip name={member?.name || 'Unknown'} size="sm" />
                        <div className="min-w-0">
                          <span className="text-xs text-gray-800 truncate block">{member?.name || 'Unknown'}</span>
                          {isOwner && <span className="text-[10px] text-indigo-600 font-medium">Owner</span>}
                        </div>
                      </div>
                      {!isOwner && (
                        <button
                          onClick={() => handleRemoveMember(pm.member_id)}
                          className="text-gray-400 hover:text-red-500 text-xs flex-shrink-0 ml-2"
                          title="Remove member"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Add member */}
              {availableMembers.length > 0 && (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select
                      value={addMemberId}
                      onChange={e => setAddMemberId(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800 appearance-none"
                    >
                      <option value="">Select a member...</option>
                      {availableMembers.map(m => (
                        <option key={m.id} value={m.id}>{m.name}{m.email ? ` (${m.email})` : ''}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <button
                    onClick={handleAddMember}
                    disabled={!addMemberId}
                    className="text-xs px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Danger zone */}
          <div className="pt-3 border-t border-gray-100">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                Delete this project...
              </button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs text-red-700 mb-2">This will permanently delete the project and all its tasks. This cannot be undone.</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Yes, delete project'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
