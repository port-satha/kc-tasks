-- ============================================================
-- Section 5 — Member transparency
-- ============================================================
-- Loosen SELECT on objectives + key_results so any signed-in user can
-- read rows whose brand matches their own (profiles.squad). KPIs are
-- already public-readable via kpis_view_all.
--
-- Privacy model:
--   - Public OKRs (is_private = false) — already visible to everyone.
--   - Private/individual OKRs (is_private = true) — previously visible
--     only to owner / manager / admin / people. Now also visible to
--     anyone whose squad matches the OKR's brand, plus all KC rows are
--     visible to everyone, and 'both' users see all brands.
--
-- Write policies are NOT modified — those still scope by role rules.

begin;

-- objectives — peer read by brand
drop policy if exists "objectives_view_brand_peer" on public.objectives;
create policy "objectives_view_brand_peer"
  on public.objectives for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and (
          p.squad = 'both'
          or objectives.brand = p.squad
          or objectives.brand = 'KC'
        )
    )
  );

-- key_results — same peer read, scoped via the parent objective's brand
drop policy if exists "krs_view_brand_peer" on public.key_results;
create policy "krs_view_brand_peer"
  on public.key_results for select
  using (
    exists (
      select 1
      from public.objectives o
      join public.profiles p on p.id = auth.uid()
      where o.id = key_results.objective_id
        and (
          p.squad = 'both'
          or o.brand = p.squad
          or o.brand = 'KC'
        )
    )
  );

commit;
