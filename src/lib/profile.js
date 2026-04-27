// Profile constants and helpers

export const TEAMS = [
  'Management',
  'Marketing',
  'R&D',
  'Production',
  'Accounting',
  'Sourcing',
  'People',
  'Warehouse',
  'QMS',
]

// Brand options for profile assignment. The DB column is still named `squad`
// (legacy) but the UI label now says "Brand". Backbone brand renamed to KC.
export const SQUADS = [
  { value: 'KC', label: 'KC · Shared', subtitle: 'Shared functions', color: '#5F5E5A' },
  { value: 'onest', label: 'onest', subtitle: 'Brand', color: '#2D5016' },
  { value: 'grubby', label: 'grubby', subtitle: 'Brand', color: '#2D7A3E' },
]

// Role helpers — super_admin inherits everything admin can do.
export function isSuperAdmin(profile) {
  return profile?.role === 'super_admin'
}
export function hasAdminAccess(profile) {
  return profile?.role === 'admin' || profile?.role === 'super_admin'
}

export const AVATAR_COLORS = [
  '#D85A30', // coral
  '#1D9E75', // teal
  '#D4537E', // pink
  '#534AB7', // purple
  '#BA7517', // amber
  '#378ADD', // blue
  '#639922', // green
]

export function assignAvatarColor(existingColors = []) {
  // Find least used color
  const counts = {}
  AVATAR_COLORS.forEach(c => { counts[c] = 0 })
  existingColors.forEach(c => { if (counts[c] !== undefined) counts[c]++ })
  const min = Math.min(...Object.values(counts))
  const available = AVATAR_COLORS.filter(c => counts[c] === min)
  return available[Math.floor(Math.random() * available.length)]
}

export function getDisplayName(profile) {
  if (!profile) return 'Unknown'
  const nick = profile.nickname || profile.full_name || profile.name || 'User'
  const pos = profile.position || ''
  return pos ? `${nick} ${pos}` : nick
}

export function getCompactName(profile) {
  return profile?.nickname || profile?.full_name || profile?.name || 'User'
}

export function getSubline(profile) {
  const parts = []
  if (profile?.squad) parts.push(profile.squad)
  if (profile?.team) parts.push(profile.team)
  return parts.join(' · ')
}

export async function fetchProfile(supabase, userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function updateProfile(supabase, userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function completeOnboarding(supabase, userId, profileData) {
  // Update profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .update({
      ...profileData,
      full_name: profileData.nickname, // Keep full_name in sync
      profile_completed: true,
    })
    .eq('id', userId)
    .select()
    .single()
  if (profileError) throw profileError

  // Also update the corresponding member record
  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('profile_id', userId)
    .single()

  if (member) {
    await supabase
      .from('members')
      .update({
        name: profileData.nickname,
        nickname: profileData.nickname,
        position: profileData.position,
        team: profileData.team,
        squad: profileData.squad,
        avatar_color: profileData.avatar_color,
      })
      .eq('id', member.id)
  }

  return profile
}

export async function uploadAvatar(supabase, userId, file) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}.${fileExt}`
  const filePath = `avatars/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true })

  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath)

  // Update profile with avatar URL
  await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', userId)

  return publicUrl
}
