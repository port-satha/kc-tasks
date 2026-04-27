-- ============================================================
-- Rename brand value 'Backbone' → 'KC' across the system
-- ============================================================
-- Per Section 1 of the UX/UI brief:
--   Brand "Backbone" → "KC" (the holding-level / shared brand).
--   The Chapter named "Backbone" (back-office function group) is unaffected
--   and stays as "Backbone" — that lives only in code, not in the DB.
--
-- This migration touches every table that stores a brand value. Section 1
-- listed only the three tables that hold OKR/KPI rows — but the brand is
-- ALSO referenced in profiles.squad, members.squad, and team_leads.brand.
-- Skipping any of those would leave users on the "Backbone" squad orphaned
-- from KC-brand OKRs, so this migration covers the full set.
--
-- Order matters: drop the old CHECK constraints BEFORE updating data, since
-- the existing constraints forbid 'KC' and would block the UPDATE.

begin;

-- 1) Drop the old CHECK constraints so the UPDATE statements can succeed.
alter table public.objectives    drop constraint if exists objectives_brand_check;
alter table public.kpis           drop constraint if exists kpis_brand_check;
alter table public.brand_owners   drop constraint if exists brand_owners_brand_check;
alter table public.team_leads     drop constraint if exists team_leads_brand_check;
alter table public.profiles       drop constraint if exists profiles_squad_check;
alter table public.members        drop constraint if exists members_squad_check;

-- 2) Data migration — rename every 'Backbone' brand reference to 'KC'.
update public.objectives    set brand = 'KC' where brand = 'Backbone';
update public.kpis           set brand = 'KC' where brand = 'Backbone';
update public.brand_owners   set brand = 'KC' where brand = 'Backbone';
update public.team_leads     set brand = 'KC' where brand = 'Backbone';
update public.profiles       set squad = 'KC' where squad = 'Backbone';
update public.members        set squad = 'KC' where squad = 'Backbone';

-- 3) Re-add CHECK constraints with the new ('KC','onest','grubby') set.
alter table public.objectives add constraint objectives_brand_check
  check (brand is null or brand in ('KC','onest','grubby'));

alter table public.kpis add constraint kpis_brand_check
  check (brand is null or brand in ('KC','onest','grubby'));

alter table public.brand_owners add constraint brand_owners_brand_check
  check (brand in ('KC','onest','grubby'));

alter table public.team_leads add constraint team_leads_brand_check
  check (brand is null or brand in ('KC','onest','grubby'));

alter table public.profiles add constraint profiles_squad_check
  check (squad is null or squad in ('KC','onest','grubby'));

alter table public.members add constraint members_squad_check
  check (squad is null or squad in ('KC','onest','grubby'));

commit;
