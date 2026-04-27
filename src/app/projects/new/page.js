'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '../../../components/AppShell'
import { useSupabase, useUser, useMembers } from '../../../lib/hooks'
import { createProject, addProjectMember } from '../../../lib/db'
import AvatarChip from '../../../components/AvatarChip'

export default function NewProjectPage() {
  const supabase = useSupabase()
  const { user } = useUser()
  const { members } = useMembers()
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState([])
  const [loading, setLoading] = useState(false)

  const toggleMember = (memberId) => {
    setSelectedMembers(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !user) return
    setLoading(true)
    try {
      const project = await createProject(supabase, {
        name: name.trim(),
        description,
        is_private: isPrivate,
        owner_id: user.id,
      })

      // Add selected members if private
      if (isPrivate && selectedMembers.length > 0) {
        await Promise.all(
          selectedMembers.map(memberId => addProjectMember(supabase, project.id, memberId))
        )
      }

      router.push(`/projects/${project.id}`)
    } catch (err) {
      alert('Failed to create project: ' + err.message)
    }
    setLoading(false)
  }

  return (
    <AppShell>
      <div className="max-w-lg mx-auto p-6 pt-12">
        <h1 className="text-xl font-bold text-[#2C2C2A] mb-6">Create new project</h1>
        <form onSubmit={submit} className="bg-[#F5F3EF] rounded-2xl border border-[rgba(0,0,0,0.06)] p-5 shadow-sm">
          <label className="text-xs text-[#9B8C82] font-medium block mb-1">Project name *</label>
          <input autoFocus value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. onest NPD 2026" required
            className="w-full text-sm border border-[rgba(0,0,0,0.06)] rounded-lg px-3 py-2 mb-4 text-[#2C2C2A] placeholder-[#B7A99D]" />

          <label className="text-xs text-[#9B8C82] font-medium block mb-1">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="What is this project about?" rows={3}
            className="w-full text-sm border border-[rgba(0,0,0,0.06)] rounded-lg px-3 py-2 mb-4 resize-none text-[#2C2C2A] placeholder-[#B7A99D]" />

          {/* Visibility */}
          <label className="text-xs text-[#9B8C82] font-medium block mb-2">Visibility</label>
          <div className="flex border border-[rgba(0,0,0,0.06)] rounded-lg overflow-hidden mb-1">
            <button
              type="button"
              onClick={() => setIsPrivate(false)}
              className={`flex-1 text-xs px-3 py-2 transition-colors flex items-center justify-center gap-1.5 ${
                !isPrivate ? 'bg-[rgba(44,44,42,0.06)] text-[#2C2C2A] font-medium' : 'text-[#9B8C82] hover:bg-[rgba(0,0,0,0.02)]'
              }`}
            >
              <span className="text-sm">🌐</span> Public
            </button>
            <button
              type="button"
              onClick={() => setIsPrivate(true)}
              className={`flex-1 text-xs px-3 py-2 transition-colors flex items-center justify-center gap-1.5 ${
                isPrivate ? 'bg-[rgba(44,44,42,0.06)] text-[#2C2C2A] font-medium' : 'text-[#9B8C82] hover:bg-[rgba(0,0,0,0.02)]'
              }`}
            >
              <span className="text-sm">🔒</span> Private
            </button>
          </div>
          <p className="text-xs text-[#B7A99D] mb-4">
            {isPrivate ? 'Only you and selected members can see this project' : 'Visible to all team members'}
          </p>

          {/* Member selection for private projects */}
          {isPrivate && members.length > 0 && (
            <div className="mb-4">
              <label className="text-xs text-[#9B8C82] font-medium block mb-2">Add members</label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {members.map(m => {
                  const isSelected = selectedMembers.includes(m.id)
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMember(m.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                        isSelected ? 'bg-[rgba(44,44,42,0.06)] border border-[#2C2C2A]' : 'bg-[rgba(0,0,0,0.02)] border border-transparent hover:bg-[rgba(0,0,0,0.04)]'
                      }`}
                    >
                      <AvatarChip name={m.name} size="sm" />
                      <span className="text-xs text-[#2C2C2A] flex-1 truncate">{m.name}</span>
                      {isSelected && (
                        <span className="text-[#2C2C2A] text-xs">&#10003;</span>
                      )}
                    </button>
                  )
                })}
              </div>
              {selectedMembers.length > 0 && (
                <p className="text-xs text-[#B7A99D] mt-1.5">{selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected</p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => router.back()}
              className="text-xs px-3 py-1.5 border border-[rgba(0,0,0,0.06)] rounded-lg text-[#6B665C] hover:bg-[rgba(0,0,0,0.02)]">Cancel</button>
            <button type="submit" disabled={loading}
              className="text-xs px-4 py-1.5 bg-[#2C2C2A] text-white rounded-lg hover:bg-[#3D3D3A] disabled:opacity-50">
              {loading ? 'Creating...' : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  )
}
