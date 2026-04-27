-- ============================================================
-- Drop the unused 'company' level from the OKR data model
-- ============================================================
-- Kindfolks treats onest and grubby as the companies; Backbone is KC
-- shared. The original 'company' level is unused and confusing.
-- This migration:
--   1. Severs any cascade pointers to legacy company-level rows so
--      the deletes don't trip FK constraints.
--   2. Deletes the company-level rows in objectives and kpis. KRs,
--      check-ins, and reflections drop via ON DELETE CASCADE.
--   3. Tightens the level CHECK constraint to ('brand','tribe','team','individual').
--   4. Removes the obsolete Phase-1 admin-company write policy.

begin;

-- 1) Sever cascade links pointing to company-level objectives / KRs.
update public.objectives
   set parent_objective_id = null
 where parent_objective_id in (
   select id from public.objectives where level = 'company'
 );

update public.objectives
   set parent_kr_id = null
 where parent_kr_id in (
   select kr.id
     from public.key_results kr
     join public.objectives o on o.id = kr.objective_id
    where o.level = 'company'
 );

-- 2) Delete the legacy rows.
delete from public.objectives where level = 'company';
delete from public.kpis        where level = 'company';

-- 3) Update the level enum constraints — keep tribe (it's used) and
--    drop company (no longer valid).
alter table public.objectives drop constraint if exists objectives_level_check;
alter table public.objectives add constraint objectives_level_check
  check (level in ('brand','tribe','team','individual'));

alter table public.kpis drop constraint if exists kpis_level_check;
alter table public.kpis add constraint kpis_level_check
  check (level in ('brand','tribe','team','individual'));

-- 4) Drop the obsolete Phase-1 admin-company policy if it still exists.
drop policy if exists "objectives_admin_company_write" on public.objectives;

commit;
