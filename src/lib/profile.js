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
// 'both' is for members whose role spans onest and grubby (Section 12).
export const SQUADS = [
  { value: 'KC', label: 'KC · Shared', subtitle: 'Shared functions', color: '#5F5E5A' },
  { value: 'onest', label: 'onest', subtitle: 'Brand', color: '#2D5016' },
  { value: 'grubby', label: 'grubby', subtitle: 'Brand', color: '#2D7A3E' },
  { value: 'both', label: 'Both brands', subtitle: 'onest + grubby', color: '#3C3489' },
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

// Display name logic — Section 14 of the brief.
//   Primary display:  nickname        (e.g. "Pim")
//   Compact subtext:  full_name       (e.g. "Patcharin S.")
//   Role subtext:     position_title  (e.g. "Brand Communications Strategist")
//
// Helpers below produce strings tuned for different surfaces (badges,
// directory rows, sidebar). Always prefer nickname for the loud display.

// Loud single-line label — nickname only when present, falls back to
// full_name → name → 'User'. Use for chips and short labels.
export function getDisplayName(profile) {
  return profile?.nickname || profile?.full_name || profile?.name || 'User'
}

// Same as getDisplayName, kept as a separate name for readability at
// call sites that pick the compact form deliberately.
export function getCompactName(profile) {
  return getDisplayName(profile)
}

// "Compact full name" — full_name styled muted next to nickname.
// Returns just the full_name string, ready to be rendered next to the
// nickname with muted formatting. Empty string if same as nickname.
export function getFullNameSubtext(profile) {
  const full = profile?.full_name?.trim() || ''
  const nick = profile?.nickname?.trim() || ''
  if (!full || full === nick) return ''
  return full
}

// Role subtitle — the person's job title (e.g. on member directory cards).
export function getRoleSubtext(profile) {
  return profile?.position_title?.trim() || profile?.position?.trim() || ''
}

// Brand · Team line for sidebars / card footers.
export function getSubline(profile) {
  const parts = []
  if (profile?.squad) parts.push(profile.squad === 'KC' ? 'KC · Shared' : profile.squad)
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
  // Update profile (profiles.position_title, profile_complete is auto-set
  // by the DB trigger when nickname/full_name/position_title are filled).
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .update({
      ...profileData,
      // Map legacy callers that send `position` to the new column name.
      position_title: profileData.position_title || profileData.position,
      // Default full_name to nickname when not supplied so the trigger flips
      // profile_complete=true on this same write.
      full_name: profileData.full_name || profileData.nickname,
    })
    .eq('id', userId)
    .select()
    .single()
  if (profileError) throw profileError

  // Sync the cached members row used by the task UI. members table still
  // uses the legacy `position` column name.
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
        position: profileData.position_title || profileData.position,
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
