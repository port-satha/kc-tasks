'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '../../lib/supabase/client'
import { TEAMS, SQUADS, AVATAR_COLORS, assignAvatarColor, completeOnboarding } from '../../lib/profile'

const KCLogo = () => (
  <div className="w-9 h-9 bg-[#2C2C2A] rounded-lg flex items-center justify-center flex-shrink-0">
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 2v14M3 9l6-7v14l6-7" stroke="#DFDDD9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
)

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowser()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0])

  const [nickname, setNickname] = useState('')
  const [position, setPosition] = useState('')
  const [team, setTeam] = useState('')
  const [squad, setSquad] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      // Check if profile already completed
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile?.profile_completed) {
        router.push('/')
        return
      }

      // Pre-fill from existing data
      if (profile?.nickname) setNickname(profile.nickname)
      if (profile?.full_name && !profile?.nickname) setNickname(profile.full_name)
      if (profile?.position) setPosition(profile.position)
      if (profile?.team) setTeam(profile.team)
      if (profile?.squad) setSquad(profile.squad)

      // Assign a color
      if (profile?.avatar_color) {
        setAvatarColor(profile.avatar_color)
      } else {
        // Get existing colors to pick least used
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('avatar_color')
        const existingColors = (allProfiles || []).map(p => p.avatar_color).filter(Boolean)
        setAvatarColor(assignAvatarColor(existingColors))
      }

      setLoading(false)
    }
    init()
  }, [supabase, router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!nickname.trim()) return setError('Please enter your nickname')
    if (!position.trim()) return setError('Please enter your position')
    if (!team) return setError('Please select your team')
    if (!squad) return setError('Please select your squad')

    setSaving(true)
    try {
      await completeOnboarding(supabase, user.id, {
        nickname: nickname.trim(),
        position: position.trim(),
        team,
        squad,
        avatar_color: avatarColor,
      })
      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#DFDDD9] flex items-center justify-center">
        <p className="text-[13px] text-[#B7A99D]">Loading...</p>
      </div>
    )
  }

  const initial = nickname ? nickname[0].toUpperCase() : '?'

  return (
    <div className="min-h-screen bg-[#DFDDD9] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-3">
            <KCLogo />
          </div>
          <h1 className="text-xl font-medium text-[#2C2C2A] tracking-tight">Welcome to Kindfolks</h1>
          <p className="text-[13px] text-[#9B8C82] mt-1">Complete your profile to get started</p>
        </div>

        <div className="bg-[#F5F3EF] rounded-xl border border-[rgba(0,0,0,0.06)] shadow-sm p-6">
          <form onSubmit={handleSubmit}>
            {/* Avatar preview */}
            <div className="flex items-center justify-center mb-5">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                style={{ backgroundColor: avatarColor }}>
                {initial}
              </div>
            </div>

            {/* Color picker */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {AVATAR_COLORS.map(color => (
                <button key={color} type="button" onClick={() => setAvatarColor(color)}
                  className={`w-6 h-6 rounded-full transition-all ${avatarColor === color ? 'ring-2 ring-offset-2 ring-[#2C2C2A]' : 'hover:scale-110'}`}
                  style={{ backgroundColor: color }} />
              ))}
            </div>

            {/* Nickname */}
            <label className="text-[11px] text-[#9B8C82] font-medium block mb-1">Nickname *</label>
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="e.g. Port, Pim, Sek"
              required
              className="w-full text-[13px] border border-[rgba(0,0,0,0.06)] rounded-lg px-3 py-2.5 mb-3 text-[#2C2C2A] placeholder-[#B7A99D] bg-[#F5F3EF] focus:outline-none focus:border-[#2C2C2A] transition-colors"
            />

            {/* Position */}
            <label className="text-[11px] text-[#9B8C82] font-medium block mb-1">Position *</label>
            <input
              type="text"
              value={position}
              onChange={e => setPosition(e.target.value)}
              placeholder="e.g. CEO, BM, MKT, PO, DD"
              required
              className="w-full text-[13px] border border-[rgba(0,0,0,0.06)] rounded-lg px-3 py-2.5 mb-3 text-[#2C2C2A] placeholder-[#B7A99D] bg-[#F5F3EF] focus:outline-none focus:border-[#2C2C2A] transition-colors"
            />

            {/* Team */}
            <label className="text-[11px] text-[#9B8C82] font-medium block mb-1">Team *</label>
            <select
              value={team}
              onChange={e => setTeam(e.target.value)}
              required
              className={`w-full text-[13px] border border-[rgba(0,0,0,0.06)] rounded-lg px-3 py-2.5 mb-4 bg-[#F5F3EF] focus:outline-none focus:border-[#2C2C2A] transition-colors ${team ? 'text-[#2C2C2A]' : 'text-[#B7A99D]'}`}
            >
              <option value="" disabled>Select your team</option>
              {TEAMS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {/* Brand (stored in `squad` column for legacy reasons) */}
            <label className="text-[11px] text-[#9B8C82] font-medium block mb-2">Brand *</label>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {SQUADS.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSquad(s.value)}
                  className={`rounded-xl border-2 p-3 text-center transition-all ${
                    squad === s.value
                      ? 'border-[#2C2C2A] bg-[rgba(44,44,42,0.03)]'
                      : 'border-[rgba(0,0,0,0.06)] hover:border-[rgba(0,0,0,0.15)]'
                  }`}
                >
                  <span className="text-[13px] font-medium block" style={{ color: s.color }}>{s.label}</span>
                  <span className="text-[10px] text-[#B7A99D] block mt-0.5">{s.subtitle}</span>
                </button>
              ))}
            </div>

            {/* Display preview */}
            <div className="bg-[rgba(0,0,0,0.02)] rounded-lg p-3 mb-4">
              <p className="text-[10px] text-[#B7A99D] uppercase tracking-[1px] mb-2">How you'll appear</p>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: avatarColor }}>
                  {initial}
                </div>
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

            <button
              type="submit"
              disabled={saving}
              className="w-full text-[13px] py-2.5 bg-[#2C2C2A] text-[#DFDDD9] rounded-lg hover:bg-[#3D3D3A] transition-colors font-medium disabled:opacity-50"
            >
              {saving ? 'Setting up...' : 'Join the Collective'}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[#B7A99D] mt-6 italic">
          Designed for one. Built for the all.
        </p>
      </div>
    </div>
  )
}
