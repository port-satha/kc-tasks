'use client'
import AvatarChip from './AvatarChip'
import { getDisplayName, getCompactName } from '../lib/profile'

export default function MemberPicker({ members, value, onChange, label = 'Assign to', allowEmpty = true }) {
  return (
    <div>
      {label && <label className="text-[11px] text-[#9B8C82] font-medium block mb-1">{label}</label>}
      <div className="relative">
        <select
          value={value || ''}
          onChange={e => onChange(e.target.value || null)}
          className="w-full text-[13px] border border-[rgba(0,0,0,0.10)] rounded-lg px-3 py-2 bg-[#F5F3EF] text-[#2C2C2A] appearance-none focus:outline-none focus:border-[#2C2C2A] transition-colors"
        >
          {allowEmpty && <option value="">Unassigned</option>}
          {members.map(m => (
            <option key={m.id} value={m.id}>{getDisplayName(m)}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#B7A99D]">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {value && members.find(m => m.id === value) && (
        <div className="mt-1.5">
          <AvatarChip name={getCompactName(members.find(m => m.id === value))} showName avatarColor={members.find(m => m.id === value)?.avatar_color} avatarUrl={members.find(m => m.id === value)?.avatar_url} />
        </div>
      )}
    </div>
  )
}
