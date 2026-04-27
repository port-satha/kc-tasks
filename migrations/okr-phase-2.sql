-- ============================================================
-- OKR/KPI Phase 2 — Cascade + Brand/Team Levels
-- ============================================================
-- Run in Supabase SQL Editor (after Phase 1 is applied)

-- ---------- brand_owners ----------
create table if not exists public.brand_owners (
  id uuid primary key default gen_random_uuid(),
  brand text not null check (brand in ('Backbone','onest','grubby')),
  profile_id uuid references public.profiles(id) not null,
  created_at timestamptz default now(),
  unique (brand, profile_id)
);

create index if not exists brand_owners_brand_idx on public.brand_owners(brand);
create index if not exists brand_owners_profile_idx on public.brand_owners(profile_id);

alter table public.brand_owners enable row level security;

drop policy if exists "brand_owners_view_all" on public.brand_owners;
create policy "brand_owners_view_all"
  on public.brand_owners for select
  using (true);

drop policy if exists "brand_owners_admin_write" on public.brand_owners;
create policy "brand_owners_admin_write"
  on public.brand_owners for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Seed (ignore conflicts — safe to re-run)
insert into public.brand_owners (brand, profile_id)
  select 'onest', id from public.profiles where nickname = 'Pim'
  on conflict do nothing;

insert into public.brand_owners (brand, profile_id)
  select 'grubby', id from public.profiles where nickname in ('Port','Sek')
  on conflict do nothing;

insert into public.brand_owners (brand, profile_id)
  select 'Backbone', id from public.profiles where nickname in ('Port','Amp')
  on conflict do nothing;

-- ---------- team_leads ----------
create table if not exists public.team_leads (
  id uuid primary key default gen_random_uuid(),
  team text not null,
  profile_id uuid references public.profiles(id) not null,
  created_at timestamptz default now(),
  unique (team, profile_id)
);

create index if not exists team_leads_team_idx on public.team_leads(team);
create index if not exists team_leads_profile_idx on public.team_leads(profile_id);

alter table public.team_leads enable row level security;

drop policy if exists "team_leads_view_all" on public.team_leads;
create policy "team_leads_view_all"
  on public.team_leads for select
  using (true);

drop policy if exists "team_leads_admin_write" on public.team_leads;
create policy "team_leads_admin_write"
  on public.team_leads for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Seed
insert into public.team_leads (team, profile_id)
  select 'Marketing', id from public.profiles where nickname = 'Jomjam'
  on conflict do nothing;

insert into public.team_leads (team, profile_id)
  select 'Management', id from public.profiles where nickname in ('Port','Amp')
  on conflict do nothing;

-- ============================================================
-- Replace Phase-1 admin-only policies with cascade-aware ones
-- ============================================================

-- ----- objectives -----
drop policy if exists "objectives_admin_company_write" on public.objectives;

drop policy if exists "objectives_admin_any" on public.objectives;
create policy "objectives_admin_any"
  on public.objectives for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "objectives_brand_owner_write" on public.objectives;
create policy "objectives_brand_owner_write"
  on public.objectives for all
  using (
    level = 'brand'
    and brand is not null
    and exists (
      select 1 from public.brand_owners
      where brand_owners.brand = objectives.brand
        and brand_owners.profile_id = auth.uid()
    )
  )
  with check (
    level = 'brand'
    and brand is not null
    and exists (
      select 1 from public.brand_owners
      where brand_owners.brand = objectives.brand
        and brand_owners.profile_id = auth.uid()
    )
  );

drop policy if exists "objectives_team_lead_write" on public.objectives;
create policy "objectives_team_lead_write"
  on public.objectives for all
  using (
    level = 'team'
    and team is not null
    and exists (
      select 1 from public.team_leads
      where team_leads.team = objectives.team
        and team_leads.profile_id = auth.uid()
    )
  )
  with check (
    level = 'team'
    and team is not null
    and exists (
      select 1 from public.team_leads
      where team_leads.team = objectives.team
        and team_leads.profile_id = auth.uid()
    )
  );

-- ----- key_results -----
drop policy if exists "krs_admin_write" on public.key_results;

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
          or (o.level = 'team' and exists (select 1 from public.team_leads where team = o.team and profile_id = auth.uid()))
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
          or (o.level = 'team' and exists (select 1 from public.team_leads where team = o.team and profile_id = auth.uid()))
        )
    )
  );
