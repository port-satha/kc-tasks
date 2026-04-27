'use client'

// Team-specific colors per design spec
const TEAM_COLORS = {
  'Port': { bg: 'bg-[rgba(216,90,48,0.08)]', text: 'text-[#D85A30]' },
  'Amp': { bg: 'bg-[rgba(29,158,117,0.08)]', text: 'text-[#1D9E75]' },
  'Pim': { bg: 'bg-[rgba(212,83,126,0.08)]', text: 'text-[#D4537E]' },
  'Noon': { bg: 'bg-[rgba(75,120,190,0.08)]', text: 'text-[#4B78BE]' },
  'First': { bg: 'bg-[rgba(168,132,72,0.08)]', text: 'text-[#A88448]' },
  'Sek': { bg: 'bg-[rgba(120,90,160,0.08)]', text: 'text-[#785AA0]' },
  'Sa': { bg: 'bg-[rgba(80,165,155,0.08)]', text: 'text-[#50A59B]' },
  'Pang': { bg: 'bg-[rgba(200,120,60,0.08)]', text: 'text-[#C8783C]' },
  'Som': { bg: 'bg-[rgba(90,140,80,0.08)]', text: 'text-[#5A8C50]' },
  'Jomjam': { bg: 'bg-[rgba(180,80,80,0.08)]', text: 'text-[#B45050]' },
}

const FALLBACK_COLORS = [
  { bg: 'bg-[rgba(168,132,72,0.08)]', text: 'text-[#A88448]' },
  { bg: 'bg-[rgba(75,120,190,0.08)]', text: 'text-[#4B78BE]' },
  { bg: 'bg-[rgba(29,158,117,0.08)]', text: 'text-[#1D9E75]' },
  { bg: 'bg-[rgba(80,165,155,0.08)]', text: 'text-[#50A59B]' },
  { bg: 'bg-[rgba(212,83,126,0.08)]', text: 'text-[#D4537E]' },
  { bg: 'bg-[rgba(216,90,48,0.08)]', text: 'text-[#D85A30]' },
  { bg: 'bg-[rgba(120,90,160,0.08)]', text: 'text-[#785AA0]' },
  { bg: 'bg-[rgba(200,120,60,0.08)]', text: 'text-[#C8783C]' },
  { bg: 'bg-[rgba(90,140,80,0.08)]', text: 'text-[#5A8C50]' },
  { bg: 'bg-[rgba(180,80,80,0.08)]', text: 'text-[#B45050]' },
]

function getColor(name) {
  // Check if first name matches a team member
  const firstName = name.split(' ')[0]
  if (TEAM_COLORS[firstName]) return TEAM_COLORS[firstName]

  // Fallback: hash-based color from warm palette
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length]
}

function getInitials(name) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function AvatarChip({ name, size = 'sm', showName = false, avatarColor = null, avatarUrl = null }) {
  if (!name) return null
  const initials = getInitials(name)

  const sizeClass = size === 'sm' ? 'w-6 h-6 text-[10px]' : size === 'md' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  const imgSize = size === 'sm' ? 'w-6 h-6' : size === 'md' ? 'w-8 h-8' : 'w-10 h-10'

  // If avatar image URL is provided, show photo
  if (avatarUrl) {
    return (
      <div className="flex items-center gap-1.5">
        <img src={avatarUrl} alt={name} className={`${imgSize} rounded-full object-cover flex-shrink-0`} />
        {showName && <span className="text-xs text-[#2C2C2A] truncate">{name}</span>}
      </div>
    )
  }

  // If avatarColor is provided from DB, use solid circle style
  if (avatarColor) {
    return (
      <div className="flex items-center gap-1.5">
        <div className={`${sizeClass} rounded-full flex items-center justify-center font-bold flex-shrink-0 text-white`}
          style={{ backgroundColor: avatarColor }}>
          {initials}
        </div>
        {showName && <span className="text-xs text-[#2C2C2A] truncate">{name}</span>}
      </div>
    )
  }

  // Fallback: name-based color matching
  const color = getColor(name)

  return (
    <div className="flex items-center gap-1.5">
      <div className={`${sizeClass} ${color.bg} ${color.text} rounded-full flex items-center justify-center font-bold flex-shrink-0`}>
        {initials}
      </div>
      {showName && <span className="text-xs text-[#2C2C2A] truncate">{name}</span>}
    </div>
  )
}
