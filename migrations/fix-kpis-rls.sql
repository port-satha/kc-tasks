-- ============================================================
-- Fix KPIs RLS — allow brand owners and team leads to write
-- ============================================================
-- In Phase 2 we expanded the `objectives` write policy beyond admin to
-- include brand owners (brand-level) and team leads (team-level).
-- The `kpis` table was left on the old admin-only policy, so non-admin
-- brand owners / team leads see the "Create KPI" button (UI allows it
-- via canWriteAtLevel) but get a RLS violation on insert.
--
-- This migration mirrors the objectives policy onto kpis.
-- Scope matches team-leads-brand-scope.sql (brand=NULL means shared lead).

alter table public.kpis enable row level security;

-- Drop the legacy admin-only policy
drop policy if exists "kpis_admin_write" on public.kpis;

-- Admin: full write on any KPI
drop policy if exists "kpis_admin_any" on public.kpis;
create policy "kpis_admin_any"
  on public.kpis for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Brand owner: write brand-level KPIs for their brand
drop policy if exists "kpis_brand_owner_write" on public.kpis;
create policy "kpis_brand_owner_write"
  on public.kpis for all
  using (
    level = 'brand'
    and brand is not null
    and exists (
      select 1 from public.brand_owners
      where brand_owners.brand = kpis.brand
        and brand_owners.profile_id = auth.uid()
    )
  )
  with check (
    level = 'brand'
    and brand is not null
    and exists (
      select 1 from public.brand_owners
      where brand_owners.brand = kpis.brand
        and brand_owners.profile_id = auth.uid()
    )
  );

-- Team lead: write team-level KPIs for their team (brand-scoped if the
-- lead entry has a brand; NULL brand = shared lead, can write any brand).
drop policy if exists "kpis_team_lead_write" on public.kpis;
create policy "kpis_team_lead_write"
  on public.kpis for all
  using (
    level = 'team'
    and team is not null
    and exists (
      select 1 from public.team_leads tl
      where tl.team = kpis.team
        and tl.profile_id = auth.uid()
        and (tl.brand is null or tl.brand = kpis.brand)
    )
  )
  with check (
    level = 'team'
    and team is not null
    and exists (
      select 1 from public.team_leads tl
      where tl.team = kpis.team
        and tl.profile_id = auth.uid()
        and (tl.brand is null or tl.brand = kpis.brand)
    )
  );
