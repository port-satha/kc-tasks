'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '../../../components/AppShell'
import { useSupabase, useUser } from '../../../lib/hooks'
import { createProject } from '../../../lib/db'

export default function NewProjectPage() {
  const supabase = useSupabase()
  const { user } = useUser()
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [loading, setLoading] = useState(false)

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

          <div className="flex items-center gap-3 mb-6">
            <button type="button" onClick={() => setIsPrivate(!isPrivate)}
              className={`w-10 h-6 rounded-full transition-colors relative ${isPrivate ? 'bg-amber-500' : 'bg-gray-200'}`}>
              <span className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${isPrivate ? 'left-5' : 'left-1'}`}></span>
            </button>
            <div>
              <p className="text-sm text-gray-900 font-medium">Private project</p>
              <p className="text-xs text-gray-500">{isPrivate ? 'Only you and invited members can see this' : 'Visible to all team members'}</p>
            </div>
          </div>

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
