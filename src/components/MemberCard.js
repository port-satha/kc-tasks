'use client'
// Section 12 + Section 17 of the UX/UI brief — the redesigned directory row
// extracted into its own component.
//
// Renders a single member with avatar, nickname + full_name (muted),
// position_title subtitle, brand + team chips, role pill, brand select,
// and contextual edit / remind / remove actions. Members whose profile
// hasn't been completed (per the DB-trigger-maintained profile_complete
// flag) get an amber left border, an "incomplete" chip, and a "Remind"
// button instead of "Remove".

const BRAND_BADGE = {
  onest:  { bg: '#D4EDBE', fg: '#2D5016', label: 'onest' },
  grubby: { bg: '#C8E0D0', fg: '#1B4D2A', label: 'grubby' },
  KC:     { bg: '#E8E5DF', fg: '#5F5E5A', label: 'KC · Shared' },
  both:   { bg: '#EEEDFE', fg: '#3C3489', label: 'Both brands' },
}

const AVATAR_BG = {
  onest:  '#EAF3DE',
  grubby: '#C8E0D0',
  KC:     '#E8E5DF',
  both:   '#EEEDFE',
}

const ROLE_PILL = {
  super_admin: { bg: '#2C2C2A', fg: '#F5F3EF', label: 'Super admin' },
  admin:       { bg: '#3A3A37', fg: '#D4CFC9', label: 'Admin' },
  people:      { bg: '#3A3A37', fg: '#D4CFC9', label: 'People' },
  manager:     { bg: '#D4EDBE', fg: '#2D5016', label: 'Manager' },
  member:      { bg: '#E8E5DF', fg: '#5F5E5A', label: 'Member' },
}

export default function MemberCard({
  member: m,
  isLast,
  onRoleChange,
  onSquadChange,
  onDelete,
  onRemind,
  onEdit,                 // optional — shows the pencil/edit button when provided
  canEditRoles,           // admin or super_admin
  canAddRemove,           // super_admin only
  isOwnRow,               // current user's own row → show Edit
  isIncomplete,
}) {
  const profile     = m.profile || {}
  const nickname    = profile.nickname || m.nickname || m.name || 'User'
  const fullName    = profile.full_name || ''
  const position    = profile.position_title || profile.position || m.position || ''
  const squad       = profile.squad || m.squad || ''
  const team        = profile.team || m.team || ''
  const profileRole = profile.role || null

  const isSuperAdminRow = profileRole === 'super_admin'
  const canEditThisRow  = canEditRoles && profile.id && (!isSuperAdminRow || canAddRemove)
  const rolePill        = ROLE_PILL[profileRole || 'member'] || ROLE_PILL.member
  const brandStyles     = BRAND_BADGE[squad] || { bg: '#E8E5DF', fg: '#9B8C82', label: '—' }
  const avatarBg        = AVATAR_BG[squad] || '#E8E5DF'

  // Suppress muted full_name when it's identical to nickname (avoids
  // redundant "Pim Pim" rows for members who haven't filled in a separate
  // formal name yet).
  const showFullName = fullName && fullName !== nickname

  return (
    <div
      className={[
        'flex items-start gap-3 px-4 py-3 transition-colors',
        isLast ? '' : 'border-b border-ss-divider',
        isIncomplete ? 'border-l-2 border-l-[#EF9F27]' : '',
        'hover:bg-ss-hover',
      ].join(' ').trim()}
    >
      {/* Avatar with brand-colored background */}
      <div className="flex-shrink-0 mt-0.5">
        <div
          className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[13px] font-medium overflow-hidden"
          style={{ backgroundColor: avatarBg, color: m.avatar_color || '#5F5E5A' }}
        >
          {m.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.avatar_url} alt={nickname} className="w-full h-full object-cover" />
          ) : (
            nickname.charAt(0).toUpperCase()
          )}
        </div>
      </div>

      {/* Name + position + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-medium text-ss-text truncate">
            {nickname}
            {showFullName && (
              <span className="text-ss-muted-text font-normal ml-1.5 text-[12px]">{fullName}</span>
            )}
          </p>
          {isIncomplete && (
            <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-[#FAEEDA] text-[#854F0B] font-medium">
              profile incomplete
            </span>
          )}
        </div>
        {position && (
          <p className="text-[11.5px] text-ss-muted-text truncate mt-0.5">{position}</p>
        )}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          {squad && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: brandStyles.bg, color: brandStyles.fg }}>
              {brandStyles.label}
            </span>
          )}
          {team && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-ss-muted text-ss-muted-text">
              {team}
            </span>
          )}
        </div>
      </div>

      {/* Email — desktop only */}
      <span className="text-[11px] text-ss-hint truncate hidden md:block max-w-[160px] mt-1">
        {m.email || ''}
      </span>

      {/* Action column */}
      <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
        {/* Brand select (admin+) */}
        {canEditRoles && (
          <select
            value={squad}
            onChange={e => onSquadChange(m.id, profile.id || null, e.target.value)}
            className="hidden lg:block text-[11px] border border-ss-divider rounded-lg px-2 py-1 bg-ss-card text-ss-muted-text focus:outline-none focus:border-ss-text transition-colors">
            <option value="">— Brand</option>
            <option value="KC">KC · Shared</option>
            <option value="onest">onest</option>
            <option value="grubby">grubby</option>
            <option value="both">Both brands</option>
          </select>
        )}

        {/* Role pill — read-only for non-admins, dropdown for admins */}
        {canEditThisRow ? (
          <select
            value={profileRole || 'member'}
            onChange={e => onRoleChange(profile.id, e.target.value)}
            style={{ backgroundColor: rolePill.bg, color: rolePill.fg }}
            className="text-[10.5px] rounded-full px-2.5 py-1 font-medium border-none focus:outline-none focus:ring-2 focus:ring-ss-text/20">
            <option value="member">Member</option>
            <option value="manager">Manager</option>
            <option value="people">People</option>
            <option value="admin">Admin</option>
            {isSuperAdminRow && <option value="super_admin">Super admin</option>}
          </select>
        ) : (
          <span
            className="text-[10.5px] px-2.5 py-1 rounded-full font-medium"
            style={{ backgroundColor: rolePill.bg, color: rolePill.fg }}>
            {rolePill.label}
          </span>
        )}

        {/* Edit button — shown when caller passes onEdit (typically own row) */}
        {onEdit && (isOwnRow || canEditRoles) && !isIncomplete && (
          <button
            onClick={() => onEdit(m)}
            title="Edit profile"
            className="text-[10.5px] px-2 py-1 rounded-full text-ss-muted-text hover:bg-ss-muted hover:text-ss-text transition-colors inline-flex items-center gap-1">
            <PencilIcon />
            Edit
          </button>
        )}

        {/* Remind (incomplete) or Remove (super_admin) */}
        {isIncomplete ? (
          canEditRoles && (
            <button
              onClick={() => onRemind(m)}
              className="text-[10.5px] px-2.5 py-1 rounded-full bg-ss-muted text-ss-muted-text hover:bg-ss-hover transition-colors">
              Remind
            </button>
          )
        ) : (
          canAddRemove && !isOwnRow && (
            <button
              onClick={() => onDelete(m.id, m.name || m.nickname)}
              className="text-[10.5px] text-ss-hint hover:text-ss-red transition-colors">
              Remove
            </button>
          )
        )}
      </div>
    </div>
  )
}

function PencilIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M2 10h2.5l5.5-5.5-2.5-2.5L2 7.5V10ZM7.5 3l1.5-1.5 2.5 2.5L10 5.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
