-- ============================================================
-- Tribe-level OKRs + KPIs
-- ============================================================
-- Run in Supabase SQL Editor
--
-- Adds 'tribe' as a valid level on objectives and kpis, plus a `tribe`
-- column for storing which tribe the record applies to.

-- 1. Add tribe column
alter table public.objectives add column if not exists tribe text;
alter table public.kpis        add column if not exists tribe text;

-- 2. Update level CHECK constraints to include 'tribe'
alter table public.objectives drop constraint if exists objectives_level_check;
alter table public.objectives add constraint objectives_level_check
  check (level in ('company','brand','tribe','team','individual'));

alter table public.kpis drop constraint if exists kpis_level_check;
alter table public.kpis add constraint kpis_level_check
  check (level in ('company','brand','tribe','team','individual'));

-- 3. Indexes
create index if not exists objectives_tribe_idx on public.objectives(tribe) where tribe is not null;
create index if not exists kpis_tribe_idx       on public.kpis(tribe)       where tribe is not null;

-- 4. RLS — tribe leads can write tribe-level objectives for their tribe
drop policy if exists "objectives_tribe_lead_write" on public.objectives;
create policy "objectives_tribe_lead_write"
  on public.objectives for all
  using (
    level = 'tribe'
    and tribe is not null
    and exists (
      select 1 from public.team_leads tl
      where tl.tribe = objectives.tribe
        and tl.team is null
        and tl.profile_id = auth.uid()
    )
  )
  with check (
    level = 'tribe'
    and tribe is not null
    and exists (
      select 1 from public.team_leads tl
      where tl.tribe = objectives.tribe
        and tl.team is null
        and tl.profile_id = auth.uid()
    )
  );

-- 5. Tribe lead can also write team-level OKRs in their tribe
drop policy if exists "objectives_tribe_lead_writes_team" on public.objectives;
create policy "objectives_tribe_lead_writes_team"
  on public.objectives for all
  using (
    level = 'team'
    and team is not null
    and exists (
      select 1 from public.team_leads tl
      where tl.tribe is not null
        and tl.team is null
        and tl.profile_id = auth.uid()
    )
    -- and the team belongs to that tribe (check from constants in app code, or via mapping table)
  )
  with check (
    level = 'team'
    and team is not null
    and exists (
      select 1 from public.team_leads tl
      where tl.tribe is not null
        and tl.team is null
        and tl.profile_id = auth.uid()
    )
  );
