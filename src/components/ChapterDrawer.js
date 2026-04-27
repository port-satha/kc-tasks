'use client'
// Section 4 of the UX/UI brief — chapter sub-drawer.
// Sits directly beneath the nav pill bar. Background slightly lighter
// than the dark sidebar so it reads as a child surface. Shows the team
// pills for the currently-open chapter; clicking a team filters the
// main view (level=team).

import { teamsInChapter } from '../lib/okr'

export default function ChapterDrawer({
  chapter,        // currently-open chapter name, or null
  activeTeam,     // currently-filtered team name, or null
  onPickTeam,     // (teamName) => void
}) {
  if (!chapter) return null
  const teams = teamsInChapter(chapter)
  if (teams.length === 0) return null

  // Slightly lighter than the #2C2C2A sidebar so the drawer reads as a
  // child surface but stays in the dark band.
  return (
    <div
      className="border-b border-[rgba(0,0,0,0.25)]"
      style={{ background: '#3A3A37' }}
    >
      <div className="px-[18px] py-2 flex items-center gap-1.5 flex-wrap">
        <span className="text-[9.5px] uppercase tracking-[1px] text-[#9F9A8C] font-medium mr-1.5">
          {chapter} teams
        </span>
        {teams.map(team => {
          const active = activeTeam === team
          return (
            <button
              key={team}
              onClick={() => onPickTeam(team)}
              className={`text-[10.5px] px-2.5 py-1 rounded-full transition-colors whitespace-nowrap ${
                active
                  ? 'bg-ss-card text-ss-text font-medium'
                  : 'text-[#C2B39F] hover:bg-[rgba(255,255,255,0.06)]'
              }`}
            >
              {team}
            </button>
          )
        })}
      </div>
    </div>
  )
}
