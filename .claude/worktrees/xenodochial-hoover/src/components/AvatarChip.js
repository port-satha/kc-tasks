'use client'

const COLORS = [
  'bg-purple-100 text-purple-800',
  'bg-blue-100 text-blue-800',
  'bg-green-100 text-green-800',
  'bg-teal-100 text-teal-800',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-800',
  'bg-indigo-100 text-indigo-800',
  'bg-cyan-100 text-cyan-800',
  'bg-orange-100 text-orange-800',
  'bg-emerald-100 text-emerald-800',
]

function hashColor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}

function getInitials(name) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function AvatarChip({ name, size = 'sm', showName = false }) {
  if (!name) return null
  const color = hashColor(name)
  const initials = getInitials(name)

  const sizeClass = size === 'sm' ? 'w-6 h-6 text-[10px]' : size === 'md' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'

  return (
    <div className="flex items-center gap-1.5">
      <div className={`${sizeClass} ${color} rounded-full flex items-center justify-center font-bold flex-shrink-0`}>
        {initials}
      </div>
      {showName && <span className="text-xs text-gray-700 truncate">{name}</span>}
    </div>
  )
}
