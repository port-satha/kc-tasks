'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '../../../components/AppShell'
import { useSupabase, useUser, useMembers } from '../../../lib/hooks'
import {
  fetchBrandOwners, fetchTeamLeads,
  addBrandOwner, removeBrandOwner,
  addTeamLead, removeTeamLead,
  BRANDS, TEAMS, CHAPTERS, TEAM_TO_CHAPTER, teamsInChapter,
  BRAND_SPECIFIC_TEAMS, isTeamBrandSpecific,
} from '../../../lib/okr'
import { hasAdminAccess, isSuperAdmin } from '../../../lib/profile'

export default function RolesPage() {
  const supabase = useSupabase()
  const router = useRouter()
  const { profile, loading: userLoading } = useUser()
  const { members } = useMembers()
  const [brandOwners, setBrandOwners] = useState([])
  const [teamLeads, setTeamLeads] = useState([])
  const [loading, setLoading] = useState(true)

  // Admin & super_admin can view; only super_admin can modify brand owners / team leads.
  const canView = hasAdminAccess(profile)
  const canEdit = isSuperAdmin(profile)

  useEffect(() => {
    if (userLoading) return
    if (!canView) { router.push('/'); return }
    const load = async () => {
      try {
        const [bo, tl] = await Promise.all([fetchBrandOwners(supabase), fetchTeamLeads(supabase)])
        setBrandOwners(bo); setTeamLeads(tl)
      } catch (err) { console.error(err) }
      setLoading(false)
    }
    load()
  }, [supabase, canView, userLoading, router])

  const profilesWithId = (members || []).filter(m => m.profile_id)

  const handleAddBrandOwner = async (brand, profileId) => {
    try {
      const created = await addBrandOwner(supabase, { brand, profile_id: profileId })
      // Refetch to get joined profile
      const bo = await fetchBrandOwners(supabase)
      setBrandOwners(bo)
    } catch (err) { alert('Failed: ' + err.message) }
  }

  const handleRemoveBrandOwner = async (id) => {
    if (!confirm('Remove this brand owner?')) return
    try {
      await removeBrandOwner(supabase, id)
      setBrandOwners(prev => prev.filter(b => b.id !== id))
    } catch (err) { alert('Failed: ' + err.message) }
  }

  const handleAddTeamLead = async (team, profileId, brand = null, chapter = null) => {
    try {
      // `chapter` is accepted for forward compatibility but addTeamLead currently
      // ignores it — chapters are not an OKR level (Brand → Team → Individual).
      await addTeamLead(supabase, { team, profile_id: profileId, brand, chapter })
      const tl = await fetchTeamLeads(supabase)
      setTeamLeads(tl)
    } catch (err) { alert('Failed: ' + err.message) }
  }

  const handleRemoveTeamLead = async (id) => {
    if (!confirm('Remove this team lead?')) return
    try {
      await removeTeamLead(supabase, id)
      setTeamLeads(prev => prev.filter(t => t.id !== id))
    } catch (err) { alert('Failed: ' + err.message) }
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-[#DFDDD9] p-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-[15px] font-medium text-[#2C2C2A]">Roles &amp; ownership</h1>
          <p className="text-[11px] text-[#9B8C82] mt-0.5">
            {canEdit
              ? 'Super admin · Manage brand owners and team leads who can create OKRs at their level.'
              : 'View only · Only super admin can modify brand owners and team leads.'}
          </p>

          {loading ? (
            <div className="mt-6 animate-pulse space-y-4">
              <div className="h-24 bg-[#F5F3EF] rounded-xl" />
              <div className="h-24 bg-[#F5F3EF] rounded-xl" />
            </div>
          ) : (
            <>
              <Section title="Brand owners">
                {BRANDS.map(brand => {
                  const owners = brandOwners.filter(b => b.brand === brand)
                  return (
                    <div key={brand} className="mb-3 last:mb-0">
                      <p className="text-[11px] font-medium text-[#2C2C2A] mb-1.5">{brand}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {owners.map(o => (
                          <Chip key={o.id} onRemove={canEdit ? () => handleRemoveBrandOwner(o.id) : null}>
                            {displayName(o.profile_id, o.profile, members)}
                          </Chip>
                        ))}
                        {canEdit && (
                          <AddDropdown
                            options={profilesWithId.filter(m => !owners.some(o => o.profile_id === m.profile_id))}
                            onPick={(profileId) => handleAddBrandOwner(brand, profileId)}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </Section>

              <Section title="Chapter leads">
                <p className="text-[10px] text-[#B7A99D] mb-3">
                  A chapter lead has authority over all teams in their chapter. (Marketing &amp; Innovation chapters have no chapter lead per the org chart.)
                </p>
                {CHAPTERS.map(chapter => {
                  const chapterLeadsForThis = teamLeads.filter(t => t.chapter === chapter && !t.team)
                  return (
                    <div key={chapter} className="mb-3 last:mb-0">
                      <p className="text-[11px] font-medium text-[#2C2C2A] mb-1.5">{chapter}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {chapterLeadsForThis.map(l => (
                          <Chip key={l.id} onRemove={canEdit ? () => handleRemoveTeamLead(l.id) : null}>
                            {displayName(l.profile_id, l.profile, members)}
                          </Chip>
                        ))}
                        {canEdit && (
                          <AddDropdown
                            options={profilesWithId.filter(m => !chapterLeadsForThis.some(l => l.profile_id === m.profile_id))}
                            onPick={(profileId) => handleAddTeamLead(null, profileId, null, chapter)}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </Section>

              <Section title="Team leads">
                <p className="text-[10px] text-[#B7A99D] mb-3">
                  Brand-specific teams ({BRAND_SPECIFIC_TEAMS.join(', ')}) have one lead per brand.
                  Shared teams have a single lead covering both brands.
                </p>
                {CHAPTERS.map(chapter => {
                  const chapterTeams = teamsInChapter(chapter)
                  if (chapterTeams.length === 0) return null
                  return (
                    <div key={chapter} className="mb-5 last:mb-0">
                      <p className="text-[10px] uppercase tracking-wider text-[#9B8C82] font-medium mb-2 pb-1 border-b border-[rgba(0,0,0,0.04)]">
                        {chapter}
                      </p>
                      {chapterTeams.map(team => {
                        const isBrandSpecific = isTeamBrandSpecific(team)
                        const teamLeadsForThis = teamLeads.filter(t => t.team === team)
                        return (
                          <div key={team} className="mb-3 last:mb-0">
                            <p className="text-[11px] font-medium text-[#2C2C2A] mb-1.5">
                              {team}
                              {isBrandSpecific && <span className="text-[10px] text-[#B7A99D] ml-2 font-normal">Brand-specific</span>}
                              {!isBrandSpecific && <span className="text-[10px] text-[#B7A99D] ml-2 font-normal">Shared</span>}
                            </p>
                            {isBrandSpecific ? (
                              <div className="space-y-1.5 pl-2">
                                {BRANDS.map(brand => {
                                  const leadsInBrand = teamLeadsForThis.filter(l => l.brand === brand)
                                  return (
                                    <div key={brand} className="flex items-center gap-2">
                                      <span className="text-[10px] text-[#9B8C82] w-16 flex-shrink-0">{brand}</span>
                                      <div className="flex flex-wrap gap-1.5 flex-1">
                                        {leadsInBrand.map(l => (
                                          <Chip key={l.id} onRemove={canEdit ? () => handleRemoveTeamLead(l.id) : null}>
                                            {displayName(l.profile_id, l.profile, members)}
                                          </Chip>
                                        ))}
                                        {canEdit && (
                                          <AddDropdown
                                            options={profilesWithId.filter(m => !leadsInBrand.some(l => l.profile_id === m.profile_id))}
                                            onPick={(profileId) => handleAddTeamLead(team, profileId, brand)}
                                          />
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {teamLeadsForThis.filter(l => !l.brand).map(l => (
                                  <Chip key={l.id} onRemove={canEdit ? () => handleRemoveTeamLead(l.id) : null}>
                                    {displayName(l.profile_id, l.profile, members)}
                                  </Chip>
                                ))}
                                {canEdit && (
                                  <AddDropdown
                                    options={profilesWithId.filter(m => !teamLeadsForThis.some(l => !l.brand && l.profile_id === m.profile_id))}
                                    onPick={(profileId) => handleAddTeamLead(team, profileId, null)}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </Section>
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}

// Display name with cascading fallbacks:
// 1. profile.nickname (from joined profiles table)
// 2. profile.full_name (if nickname is empty)
// 3. matching member.nickname or member.name (from members table)
// 4. 'Unknown' as last resort
function displayName(profileId, profile, members) {
  if (profile?.nickname) return profile.nickname
  if (profile?.full_name) return profile.full_name
  const m = (members || []).find(x => x.profile_id === profileId)
  if (m) return m.nickname || m.name || 'Unknown'
  return 'Unknown'
}

function Section({ title, children }) {
  return (
    <div className="mt-5 bg-[#F5F3EF] border border-[rgba(0,0,0,0.04)] rounded-xl p-4">
      <h2 className="text-[10px] uppercase tracking-wider text-[#9B8C82] font-medium mb-3">{title}</h2>
      {children}
    </div>
  )
}

function Chip({ children, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] bg-[#2C2C2A] text-[#DFDDD9] rounded-full px-2.5 py-1">
      {children}
      {onRemove && (
        <button onClick={onRemove} className="text-[#9F9A8C] hover:text-[#DFDDD9] ml-0.5" title="Remove">×</button>
      )}
    </span>
  )
}

function AddDropdown({ options, onPick }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="text-[11px] border border-[rgba(0,0,0,0.1)] text-[#2C2C2A] rounded-full px-2.5 py-1 hover:bg-[rgba(0,0,0,0.03)]">
        + Add
      </button>
      {open && options.length > 0 && (
        <div className="absolute left-0 top-full mt-1 w-48 bg-[#F5F3EF] border border-[rgba(0,0,0,0.08)] rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
          {options.map(m => (
            <button key={m.profile_id}
              onClick={() => { onPick(m.profile_id); setOpen(false) }}
              className="w-full text-left text-[11px] px-3 py-1.5 hover:bg-[rgba(0,0,0,0.04)] text-[#2C2C2A]">
              {m.nickname || m.name} {m.position && <span className="text-[#9B8C82]">{m.position}</span>}
            </button>
          ))}
        </div>
      )}
      {open && options.length === 0 && (
        <div className="absolute left-0 top-full mt-1 w-40 bg-[#F5F3EF] border border-[rgba(0,0,0,0.08)] rounded-lg shadow-lg z-10 p-2 text-[10px] text-[#9B8C82]">
          No eligible members
        </div>
      )}
    </div>
  )
}
