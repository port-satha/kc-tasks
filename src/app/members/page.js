'use client'
import { useState } from 'react'
import AppShell from '../../components/AppShell'
import { useSupabase, useMembers } from '../../lib/hooks'
import { createMember, updateMember, deleteMember } from '../../lib/db'
import AvatarChip from '../../components/AvatarChip'

export default function MembersPage() {
  const supabase = useSupabase()
  const { members, loading, reload } = useMembers()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState('member')

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      await createMember(supabase, { name: newName.trim(), email: newEmail.trim() || null, role: newRole })
      setNewName(''); setNewEmail(''); setNewRole('member'); setShowAdd(false)
      reload()
    } catch (err) { alert('Failed: ' + err.message) }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Remove ${name} from the team?`)) return
    try { await deleteMember(supabase, id); reload() }
    catch (err) { alert('Failed: ' + err.message) }
  }

  const handleRoleChange = async (id, role) => {
    try { await updateMember(supabase, id, { role }); reload() }
    catch (err) { alert('Failed: ' + err.message) }
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto p-6 pt-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Team Members</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your Kind Collective team</p>
          </div>
          <button onClick={() => setShowAdd(!showAdd)}
            className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            + Add member
          </button>
        </div>

        {/* Add member form */}
        {showAdd && (
          <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 shadow-sm">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Name *</label>
                <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} required
                  placeholder="e.g. Port" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-800 placeholder-gray-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Email</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  placeholder="optional" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-800 placeholder-gray-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Role</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800">
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="submit" className="text-xs px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Add</button>
            </div>
          </form>
        )}

        {/* Members list */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="grid grid-cols-[1fr_1fr_100px_60px] gap-3 px-4 py-2 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-wider">
            <span>Name</span><span>Email</span><span>Role</span><span></span>
          </div>
          {loading && <div className="px-4 py-8 text-center text-sm text-gray-400">Loading...</div>}
          {!loading && members.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No members yet. Add your team!</div>
          )}
          {members.map(m => (
            <div key={m.id} className="grid grid-cols-[1fr_1fr_100px_60px] gap-3 px-4 py-3 border-b border-gray-50 last:border-0 items-center hover:bg-gray-50">
              <div className="flex items-center gap-2">
                <AvatarChip name={m.name} size="sm" />
                <span className="text-sm text-gray-900">{m.name}</span>
              </div>
              <span className="text-sm text-gray-500 truncate">{m.email || '—'}</span>
              <select value={m.role} onChange={e => handleRoleChange(m.id, e.target.value)}
                className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-700">
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button onClick={() => handleDelete(m.id, m.name)}
                className="text-xs text-gray-400 hover:text-red-600">Remove</button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
