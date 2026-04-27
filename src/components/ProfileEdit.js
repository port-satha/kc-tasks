'use client'
import { useState, useEffect, useRef } from 'react'
import { useSupabase, useUser } from '../lib/hooks'
import { TEAMS, SQUADS, AVATAR_COLORS, updateProfile, getDisplayName, getSubline } from '../lib/profile'

export default function ProfileEdit({ onClose, onSave }) {
  const supabase = useSupabase()
  const { user, profile } = useUser()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const [nickname, setNickname] = useState('')
  const [position, setPosition] = useState('')
  const [team, setTeam] = useState('')
  const [squad, setSquad] = useState('')
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0])
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname || profile.full_name || '')
      setPosition(profile.position_title || profile.position || '')
      setTeam(profile.team || '')
      setSquad(profile.squad || '')
      setAvatarColor(profile.avatar_color || AVATAR_COLORS[0])
      setAvatarUrl(profile.avatar_url || null)
    }
  }, [profile])

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2MB')
      return
    }

    setUploading(true)
    setError('')
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setAvatarUrl(publicUrl)
    } catch (err) {
      setError('Upload failed: ' + err.message)
    }
    setUploading(false)
  }

  const handleRemoveAvatar = () => {
    setAvatarUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSave = async () => {
    setError('')
    if (!nickname.trim()) return setError('Nickname is required')
    if (!position.trim()) return setError('Position is required')
    if (!team) return setError('Team is required')
    if (!squad) return setError('Brand is required')

    setSaving(true)
    try {
      const updates = {
        nickname: nickname.trim(),
        position_title: position.trim(),  // profiles column is now position_title
        team,
        squad,
        avatar_color: avatarColor,
        avatar_url: avatarUrl,
        full_name: nickname.trim(),
      }
      await updateProfile(supabase, user.id, updates)

      // Also update member record
      const { data: member } = await supabase
        .from('members')
        .select('id')
        .eq('profile_id', user.id)
        .single()

      if (member) {
        await supabase
          .from('members')
          .update({
            name: nickname.trim(),
            nickname: nickname.trim(),
            position: position.trim(),
            team,
            squad,
            avatar_color: avatarColor,
          })
          .eq('id', member.id)
      }

      if (onSave) onSave()
      if (onClose) onClose()
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  const initial = nickname ? nickname[0].toUpperCase() : '?'

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#F5F3EF] rounded-2xl border border-[rgba(0,0,0,0.06)] w-[420px] max-h-[90vh] overflow-y-auto shadow-xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#2C2C2A]">Edit profile</h2>
          <button onClick={onClose} className="text-[#B7A99D] hover:text-[#2C2C2A] text-xl transition-colors">×</button>
        </div>

        {/* Avatar preview & upload */}
        <div className="flex flex-col items-center mb-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative group cursor-pointer"
            title="Click to upload photo"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-16 h-16 rounded-full object-cover border-2 border-[rgba(0,0,0,0.06)]" />
            ) : (
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
                style={{ backgroundColor: avatarColor }}>
                {initial}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <span className="text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity">📷</span>
            </div>
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <span className="text-white text-[10px]">...</span>
              </div>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
          <div className="flex items-center gap-2 mt-2">
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="text-[10px] text-[#9B8C82] hover:text-[#2C2C2A] transition-colors">
              {avatarUrl ? 'Change photo' : 'Upload photo'}
            </button>
            {avatarUrl && (
              <>
                <span className="text-[10px] text-[#B7A99D]">·</span>
                <button type="button" onClick={handleRemoveAvatar}
                  className="text-[10px] text-[#B7A99D] hover:text-[#A32D2D] transition-colors">
                  Remove
                </button>
              </>
            )}
          </div>
        </div>

        {/* Color picker */}
        <div className="flex items-center justify-center gap-2 mb-5">
          {AVATAR_COLORS.map(color => (
            <button key={color} type="button" onClick={() => setAvatarColor(color)}
              className={`w-5 h-5 rounded-full transition-all ${avatarColor === color ? 'ring-2 ring-offset-2 ring-[#2C2C2A]' : 'hover:scale-110'}`}
              style={{ backgroundColor: color }} />
          ))}
        </div>

        {/* Nickname */}
        <label className="text-[11px] text-[#9B8C82] font-medium block mb-1">Nickname</label>
        <input
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          placeholder="e.g. Port, Pim, Sek"
          className="w-full text-[13px] border border-[rgba(0,0,0,0.06)] rounded-lg px-3 py-2.5 mb-3 text-[#2C2C2A] placeholder-[#B7A99D] bg-[#F5F3EF] focus:outline-none focus:border-[#2C2C2A] transition-colors"
        />

        {/* Position */}
        <label className="text-[11px] text-[#9B8C82] font-medium block mb-1">Position</label>
        <input
          value={position}
          onChange={e => setPosition(e.target.value)}
          placeholder="e.g. CEO, BM, MKT"
          className="w-full text-[13px] border border-[rgba(0,0,0,0.06)] rounded-lg px-3 py-2.5 mb-3 text-[#2C2C2A] placeholder-[#B7A99D] bg-[#F5F3EF] focus:outline-none focus:border-[#2C2C2A] transition-colors"
        />

        {/* Team */}
        <label className="text-[11px] text-[#9B8C82] font-medium block mb-1">Team</label>
        <select
          value={team}
          onChange={e => setTeam(e.target.value)}
          className={`w-full text-[13px] border border-[rgba(0,0,0,0.06)] rounded-lg px-3 py-2.5 mb-3 bg-[#F5F3EF] focus:outline-none focus:border-[#2C2C2A] transition-colors ${team ? 'text-[#2C2C2A]' : 'text-[#B7A99D]'}`}
        >
          <option value="">Select team</option>
          {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Brand (stored in `squad` column for legacy reasons) */}
        <label className="text-[11px] text-[#9B8C82] font-medium block mb-2">Brand</label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {SQUADS.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSquad(s.value)}
              className={`rounded-xl border-2 p-2.5 text-center transition-all ${
                squad === s.value
                  ? 'border-[#2C2C2A] bg-[rgba(44,44,42,0.03)]'
                  : 'border-[rgba(0,0,0,0.06)] hover:border-[rgba(0,0,0,0.15)]'
              }`}
            >
              <span className="text-[12px] font-medium block" style={{ color: s.color }}>{s.label}</span>
              <span className="text-[9px] text-[#B7A99D] block mt-0.5">{s.subtitle}</span>
            </button>
          ))}
        </div>

        {/* Preview */}
        <div className="bg-[rgba(0,0,0,0.02)] rounded-lg p-3 mb-4">
          <p className="text-[10px] text-[#B7A99D] uppercase tracking-[1px] mb-2">Preview</p>
          <div className="flex items-center gap-2.5">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: avatarColor }}>
                {initial}
              </div>
            )}
            <div>
              <p className="text-[13px] font-medium text-[#2C2C2A]">
                {nickname || 'Nickname'} {position || 'Position'}
              </p>
              <p className="text-[11px] text-[#9B8C82]">
                {squad || 'Brand'} · {team || 'Team'}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-[12px] text-[#A32D2D] bg-[rgba(226,75,74,0.06)] rounded-lg px-3 py-2 mb-3">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-[13px] px-4 py-2 border border-[rgba(0,0,0,0.06)] rounded-lg text-[#9B8C82] hover:text-[#2C2C2A] hover:bg-[rgba(0,0,0,0.02)] transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="text-[13px] px-5 py-2 bg-[#2C2C2A] text-[#DFDDD9] rounded-lg hover:bg-[#3D3D3A] transition-colors font-medium disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
