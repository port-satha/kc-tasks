-- ============================================================
-- Allow team_leads.team to be NULL when tribe is set (tribe leads)
-- ============================================================
-- Run in Supabase SQL Editor

alter table public.team_leads alter column team drop not null;

-- Add a check constraint: either team OR tribe must be set (or both — although both isn't expected, allowing it is harmless).
alter table public.team_leads drop constraint if exists team_leads_team_or_tribe_check;
alter table public.team_leads add constraint team_leads_team_or_tribe_check
  check (team is not null or tribe is not null);
