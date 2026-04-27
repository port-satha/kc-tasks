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
        <h1 className="text-xl font-bold text-gray-900 mb-6">Create new project</h1>
        <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <label className="text-xs text-gray-500 font-medium block mb-1">Project name *</label>
          <input autoFocus value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. onest NPD 2026" required
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-4 text-gray-800 placeholder-gray-400" />

          <label className="text-xs text-gray-500 font-medium block mb-1">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="What is this project about?" rows={3}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-4 resize-none text-gray-800 placeholder-gray-400" />

          {/* Visibility */}
          <label className="text-xs text-gray-500 font-medium block mb-2">Visibility</label>
          <div className="flex border border-gray-200 rounded-lg overflow-hidden mb-1">
            <button
              type="button"
              onClick={() => setIsPrivate(false)}
              className={`flex-1 text-xs px-3 py-2 transition-colors flex items-center justify-center gap-1.5 ${
                !isPrivate ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <span className="text-sm">🌐</span> Public
            </button>
            <button
              type="button"
              onClick={() => setIsPrivate(true)}
              className={`flex-1 text-xs px-3 py-2 transition-colors flex items-center justify-center gap-1.5 ${
                isPrivate ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <span className="text-sm">🔒</span> Private
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            {isPrivate ? 'Only you and selected members can see this project' : 'Visible to all team members'}
          </p>

          {/* Member selection for private projects */}
          {isPrivate && members.length > 0 && (
            <div className="mb-4">
              <label className="text-xs text-gray-500 font-medium block mb-2">Add members</label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {members.map(m => {
                  const isSelected = selectedMembers.includes(m.id)
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMember(m.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                        isSelected ? 'bg-indigo-50 border border-indigo-200' : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <AvatarChip name={m.name} size="sm" />
                      <span className="text-xs text-gray-800 flex-1 truncate">{m.name}</span>
                      {isSelected && (
                        <span className="text-indigo-600 text-xs">&#10003;</span>
                      )}
                    </button>
                  )
                })}
              </div>
              {selectedMembers.length > 0 && (
                <p className="text-xs text-gray-400 mt-1.5">{selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected</p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => router.back()}
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading}
              className="text-xs px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Creating...' : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  )
}
