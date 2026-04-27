'use client'
// Section 8 + Section 17 of the UX/UI brief — approval status pill.
// Four states. Colors match the Section 8 spec table exactly.

const APPROVAL_PILL = {
  draft: {
    bg: '#FAEEDA', fg: '#854F0B',
    label: 'Draft',
  },
  pending_approval: {
    bg: '#FDE8C8', fg: '#7A4008',
    label: 'Pending approval',
  },
  approved: {
    bg: '#D4EDBE', fg: '#2D5016',
    label: '✓ Approved',
  },
  changes_requested: {
    bg: '#FCEBEB', fg: '#791F1F',
    label: 'Changes requested',
  },
}

export default function ApprovalStatusPill({ status, className = '' }) {
  const p = APPROVAL_PILL[status] || APPROVAL_PILL.draft
  return (
    <span
      className={`text-[9.5px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${className}`}
      style={{ background: p.bg, color: p.fg }}
    >
      {p.label}
    </span>
  )
}
