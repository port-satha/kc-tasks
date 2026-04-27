-- ============================================================
-- Drop the 'tribe' level from the OKR data model
-- ============================================================
-- The schema briefly carried both `brand` and `tribe` as top-level
-- OKR levels, which overlapped (people read "tribe" as their squad)
-- and confused users. Going forward:
--   - Hierarchy: Brand → Team → Individual
--   - Tribes (Strategy / Marketing / Innovation / Backbone / Factory)
--     stay as a UI grouping for teams (used in member filters and as
--     visual section labels), but are NOT their own OKR level.
--
-- This migration:
--   1. Severs parent_objective_id / parent_kr_id pointers to tribe-level rows
--   2. Deletes tribe-level rows from `objectives` and `kpis`
--   3. Tightens the level CHECK constraint to ('brand','team','individual')
-- The `tribe` column itself is left in place (nullable, unused) to keep
-- the migration small. A follow-up can drop it once we're sure nothing
-- in the wild still reads it.

begin;

-- 1) Sever cascade links pointing to tribe-level objectives / KRs.
update public.objectives
   set parent_objective_id = null
 where parent_objective_id in (
   select id from public.objectives where level = 'tribe'
 );

update public.objectives
   set parent_kr_id = null
 where parent_kr_id in (
   select kr.id
     from public.key_results kr
     join public.objectives o on o.id = kr.objective_id
    where o.level = 'tribe'
 );

-- 2) Delete tribe-level rows. Cascade handles dependent KRs, check_ins,
--    reflections.
delete from public.objectives where level = 'tribe';
delete from public.kpis        where level = 'tribe';

-- 3) Update CHECK constraints — only brand / team / individual remain.
alter table public.objectives drop constraint if exists objectives_level_check;
alter table public.objectives add constraint objectives_level_check
  check (level in ('brand','team','individual'));

alter table public.kpis drop constraint if exists kpis_level_check;
alter table public.kpis add constraint kpis_level_check
  check (level in ('brand','team','individual'));

commit;
