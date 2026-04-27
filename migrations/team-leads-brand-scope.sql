-- ============================================================
-- team_leads — add brand scope
-- ============================================================
-- Allows brand-specific team leads: e.g. "Marketing lead for onest"
-- vs "Marketing lead for grubby" — both are leads of the Marketing team
-- but scoped to different brands.
-- Shared teams (Management, Production, QMS, Warehouse, Accounting, People)
-- use brand = NULL.

alter table public.team_leads add column if not exists brand text
  check (brand in ('Backbone','onest','grubby'));

-- Drop the old unique constraint (team, profile_id) and replace it with one
-- that includes brand. A person can now be team lead for multiple brands.
alter table public.team_leads drop constraint if exists team_leads_team_profile_id_key;
alter table public.team_leads drop constraint if exists team_leads_team_profile_id_brand_key;

-- Use a unique index instead of a constraint, since NULL values in unique
-- constraints are weird. Treat NULL brand as its own bucket.
drop index if exists team_leads_team_profile_brand_uniq;
create unique index team_leads_team_profile_brand_uniq
  on public.team_leads (team, profile_id, coalesce(brand, ''));

-- Update the objectives RLS so a team lead scoped to a brand can only
-- write team-level OKRs for their team AND that brand (or any brand if
-- the team lead entry has brand = NULL, meaning "shared team lead").
drop policy if exists "objectives_team_lead_write" on public.objectives;
create policy "objectives_team_lead_write"
  on public.objectives for all
  using (
    level = 'team'
    and team is not null
    and exists (
      select 1 from public.team_leads tl
      where tl.team = objectives.team
        and tl.profile_id = auth.uid()
        and (tl.brand is null or tl.brand = objectives.brand)
    )
  )
  with check (
    level = 'team'
    and team is not null
    and exists (
      select 1 from public.team_leads tl
      where tl.team = objectives.team
        and tl.profile_id = auth.uid()
        and (tl.brand is null or tl.brand = objectives.brand)
    )
  );

-- Same for key_results — update the compound policy
drop policy if exists "krs_parent_owner_write" on public.key_results;
create policy "krs_parent_owner_write"
  on public.key_results for all
  using (
    exists (
      select 1 from public.objectives o
      where o.id = key_results.objective_id
        and (
          exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
          or (o.level = 'brand' and exists (select 1 from public.brand_owners where brand = o.brand and profile_id = auth.uid()))
          or (o.level = 'team' and exists (
                select 1 from public.team_leads tl
                where tl.team = o.team and tl.profile_id = auth.uid()
                  and (tl.brand is null or tl.brand = o.brand)
              ))
          or (o.level = 'individual' and o.owner_id = auth.uid() and o.approval_status in ('draft','changes_requested'))
        )
    )
  )
  with check (
    exists (
      select 1 from public.objectives o
      where o.id = key_results.objective_id
        and (
          exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
          or (o.level = 'brand' and exists (select 1 from public.brand_owners where brand = o.brand and profile_id = auth.uid()))
          or (o.level = 'team' and exists (
                select 1 from public.team_leads tl
                where tl.team = o.team and tl.profile_id = auth.uid()
                  and (tl.brand is null or tl.brand = o.brand)
              ))
          or (o.level = 'individual' and o.owner_id = auth.uid() and o.approval_status in ('draft','changes_requested'))
        )
    )
  );
