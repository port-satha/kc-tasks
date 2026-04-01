'use client'
import AvatarChip from './AvatarChip'

export default function MemberPicker({ members, value, onChange, label = 'Assign to', allowEmpty = true }) {
  return (
    <div>
      {label && <label className="text-xs text-gray-500 font-medium block mb-1">{label}</label>}
      <div className="relative">
        <select
          value={value || ''}
          onChange={e => onChange(e.target.value || null)}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800 appearance-none"
        >
          {allowEmpty && <option value="">Unassigned</option>}
          {members.map(m => (
            <option key={m.id} value={m.id}>{m.name}{m.email ? ` (${m.email})` : ''}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {value && members.find(m => m.id === value) && (
        <div className="mt-1.5">
          <AvatarChip name={members.find(m => m.id === value)?.name} showName />
        </div>
      )}
    </div>
  )
}
