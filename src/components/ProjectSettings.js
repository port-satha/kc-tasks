'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase, useMembers, useUser } from '../lib/hooks'
import { updateProject, deleteProject, addProjectMember, removeProjectMember, updateProjectMemberRole, fetchProjectMembers, duplicateProject } from '../lib/db'
import { getDisplayName } from '../lib/profile'
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

  const handleMemberRoleChange = async (memberId, role) => {
    try {
      await updateProjectMemberRole(supabase, project.id, memberId, role)
      await loadProjectMembers()
    } catch (err) {
      alert('Failed to update role: ' + err.message)
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

  const [duplicating, setDuplicating] = useState(false)
  const { user } = useUser()

  const handleDuplicate = async () => {
    setDuplicating(true)
    try {
      const newProject = await duplicateProject(supabase, project.id, { owner_id: user?.id })
      router.push(`/projects/${newProject.id}`)
      router.refresh()
    } catch (err) {
      alert('Failed to duplicate project: ' + err.message)
      setDuplicating(false)
    }
  }

  const handleNameBlur = () => {
    if (name.trim() && name.trim() !== project.name) {
      handleSave()
    }
  }

  const memberIds = new Set(projectMembers.map(pm => pm.member_id))
  const availableMembers = members.filter(m => !memberIds.has(m.id))

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-end p-4 pt-12" onClick={onClose}>
      <div className="bg-[#F5F3EF] w-[420px] rounded-2xl shadow-xl max-h-[calc(100vh-80px)] overflow-y-auto border border-[rgba(0,0,0,0.04)]"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(0,0,0,0.04)]">
          <h2 className="text-[13px] font-semibold text-[#2C2C2A]">Project settings</h2>
          <button onClick={onClose} className="text-[#B7A99D] hover:text-[#2C2C2A] text-lg leading-none transition-colors">&times;</button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Project name */}
          <div>
            <label className="text-[11px] text-[#9B8C82] font-medium block mb-1">Project name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={e => { if (e.key === 'Enter') handleNameBlur() }}
              className="w-full text-[13px] border border-[rgba(0,0,0,0.10)] rounded-lg px-3 py-2 bg-[#F5F3EF] text-[#2C2C2A] focus:outline-none focus:border-[#2C2C2A] transition-colors"
            />
          </div>

          {/* Visibility toggle */}
          <div>
            <label className="text-[11px] text-[#9B8C82] font-medium block mb-2">Visibility</label>
            <div className="flex border border-[rgba(0,0,0,0.06)] rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => handleToggleVisibility(false)}
                className={`flex-1 text-[11px] px-3 py-2 transition-colors flex items-center justify-center gap-1.5 ${
                  !isPrivate ? 'bg-[rgba(44,44,42,0.06)] text-[#2C2C2A] font-medium' : 'text-[#9B8C82] hover:bg-[rgba(0,0,0,0.02)]'
                }`}
              >
                Public
              </button>
              <button
                type="button"
                onClick={() => handleToggleVisibility(true)}
                className={`flex-1 text-[11px] px-3 py-2 transition-colors flex items-center justify-center gap-1.5 ${
                  isPrivate ? 'bg-[rgba(44,44,42,0.06)] text-[#2C2C2A] font-medium' : 'text-[#9B8C82] hover:bg-[rgba(0,0,0,0.02)]'
                }`}
              >
                Private
              </button>
            </div>
            <p className="text-[10px] text-[#B7A99D] mt-1.5">
              {isPrivate ? 'Only selected members can see this project' : 'Visible to all team members'}
            </p>
          </div>

          {/* Members section */}
          {isPrivate && (
            <div>
              <label className="text-[11px] text-[#9B8C82] font-medium block mb-2">Project members</label>

              <div className="space-y-1.5 mb-3">
                {projectMembers.length === 0 && (
                  <p className="text-[11px] text-[#B7A99D] py-2">No members added yet. Add members to give them access.</p>
                )}
                {projectMembers.map(pm => {
                  const member = pm.member
                  const isOwner = member?.profile_id === project.owner_id
                  return (
                    <div key={pm.member_id} className="flex items-center justify-between bg-[rgba(0,0,0,0.02)] rounded-lg px-3 py-2.5">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <AvatarChip name={member ? getDisplayName(member) : 'Unknown'} size="sm" avatarColor={member?.avatar_color} avatarUrl={member?.avatar_url} />
                        <div className="min-w-0 flex-1">
                          <span className="text-[11px] text-[#2C2C2A] truncate block">{member ? getDisplayName(member) : 'Unknown'}</span>
                          {isOwner && <span className="text-[10px] text-[#9B8C82] font-medium">Owner — full access</span>}
                        </div>
                      </div>
                      {!isOwner && (
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <select
                            value={pm.role || 'editor'}
                            onChange={e => handleMemberRoleChange(pm.member_id, e.target.value)}
                            className="text-[10px] border border-[rgba(0,0,0,0.06)] rounded-lg px-2 py-1 bg-[#F5F3EF] text-[#6B665C] focus:outline-none focus:border-[#2C2C2A] transition-colors"
                          >
                            <option value="editor">Can edit</option>
                            <option value="viewer">View only</option>
                          </select>
                          <button
                            onClick={() => handleRemoveMember(pm.member_id)}
                            className="text-[#B7A99D] hover:text-[#A32D2D] text-[11px] transition-colors"
                            title="Remove member"
                          >
                            &times;
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {availableMembers.length > 0 && (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select
                      value={addMemberId}
                      onChange={e => setAddMemberId(e.target.value)}
                      className="w-full text-[11px] border border-[rgba(0,0,0,0.06)] rounded-lg px-3 py-2 bg-[#F5F3EF] text-[#2C2C2A] appearance-none focus:outline-none focus:border-[#2C2C2A]"
                    >
                      <option value="">Select a member...</option>
                      {availableMembers.map(m => (
                        <option key={m.id} value={m.id}>{getDisplayName(m)}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#B7A99D]">
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <button
                    onClick={handleAddMember}
                    disabled={!addMemberId}
                    className="text-[11px] px-3 py-2 bg-[#2C2C2A] text-[#DFDDD9] rounded-lg hover:bg-[#3D3D3A] disabled:opacity-40 transition-colors"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Duplicate */}
          <div className="pt-3 border-t border-[rgba(0,0,0,0.04)]">
            <button
              onClick={handleDuplicate}
              disabled={duplicating}
              className="text-[11px] px-3 py-1.5 border border-[rgba(0,0,0,0.08)] text-[#2C2C2A] rounded-lg hover:bg-[rgba(0,0,0,0.04)] transition-colors disabled:opacity-50"
            >
              {duplicating ? 'Duplicating...' : 'Duplicate this project'}
            </button>
            <p className="text-[10px] text-[#B7A99D] mt-1">Creates a copy with all tasks, subtasks, and members.</p>
          </div>

          {/* Danger zone */}
          <div className="pt-3 border-t border-[rgba(0,0,0,0.04)]">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-[11px] text-[#A32D2D] hover:text-[#8A2525] transition-colors"
              >
                Delete this project...
              </button>
            ) : (
              <div className="bg-[rgba(163,45,45,0.04)] border border-[rgba(163,45,45,0.15)] rounded-lg p-3">
                <p className="text-[11px] text-[#A32D2D] mb-2">This will permanently delete the project and all its tasks. This cannot be undone.</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-[11px] px-3 py-1.5 bg-[#A32D2D] text-white rounded-lg hover:bg-[#8A2525] disabled:opacity-50 transition-colors"
                  >
                    {deleting ? 'Deleting...' : 'Yes, delete project'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-[11px] px-3 py-1.5 border border-[rgba(0,0,0,0.06)] rounded-lg text-[#9B8C82] hover:bg-[rgba(0,0,0,0.02)] transition-colors"
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
