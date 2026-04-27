-- ============================================================
-- OKR/KPI Phase 1 — Data model + Admin entry
-- ============================================================
-- Run in Supabase SQL Editor

-- ---------- Clean up any prior tables (Phase 0) ----------
-- Note: old tables use brand_id; we're switching to a text `brand` column + level
-- and adding year/quarter. Preserve old data if you have any before running.
drop table if exists public.kr_updates cascade;
drop table if exists public.kpi_updates cascade;
drop table if exists public.key_results cascade;
drop table if exists public.objectives cascade;
drop table if exists public.kpis cascade;
drop table if exists public.brands cascade;

-- ---------- Profile additions ----------
alter table public.profiles add column if not exists manager_id uuid references public.profiles(id);
alter table public.profiles add column if not exists role text default 'member' check (role in ('member','manager','people','admin'));

-- Seed admin role for Port and Amp (run after profiles exist)
update public.profiles set role = 'admin' where nickname in ('Port','Amp');

-- ---------- kpis ----------
create table public.kpis (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  level text not null check (level in ('company','brand','team','individual')),
  brand text check (brand in ('Backbone','onest','grubby')),
  team text,
  year int not null,
  owner_id uuid references public.profiles(id),
  target_value numeric,
  target_unit text,
  q1_target numeric,
  q2_target numeric,
  q3_target numeric,
  q4_target numeric,
  current_value numeric default 0,
  last_updated_at timestamptz,
  last_updated_by uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create index kpis_year_level_idx on public.kpis(year, level);
create index kpis_owner_idx on public.kpis(owner_id);

-- ---------- objectives ----------
create table public.objectives (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  level text not null check (level in ('company','brand','team','individual')),
  brand text check (brand in ('Backbone','onest','grubby')),
  team text,
  year int not null,
  quarter int check (quarter between 1 and 4),
  is_annual boolean default false,
  owner_id uuid references public.profiles(id) not null,
  parent_objective_id uuid references public.objectives(id),
  tags text[] default '{}',
  status text default 'not_started' check (status in ('not_started','on_track','at_risk','off_track','complete','abandoned')),
  is_private boolean default false,
  approval_status text default 'draft' check (approval_status in ('draft','pending_approval','approved','changes_requested')),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  is_retroactive_edit boolean default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index objectives_year_quarter_level_idx on public.objectives(year, quarter, level);
create index objectives_owner_idx on public.objectives(owner_id);
create index objectives_parent_idx on public.objectives(parent_objective_id);

-- ---------- key_results ----------
create table public.key_results (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid references public.objectives(id) on delete cascade not null,
  title text not null,
  owner_id uuid references public.profiles(id),
  kr_type text not null check (kr_type in ('numeric','percentage','currency','binary','milestone')),
  start_value numeric default 0,
  target_value numeric,
  current_value numeric default 0,
  unit text,
  display_order int default 0,
  is_retroactive_edit boolean default false,
  created_at timestamptz default now()
);

create index key_results_objective_idx on public.key_results(objective_id);

-- ============================================================
-- RLS POLICIES — Phase 1 (basic — admin-only writes for Company)
-- ============================================================

-- ----- kpis -----
alter table public.kpis enable row level security;

drop policy if exists "kpis_view_all" on public.kpis;
create policy "kpis_view_all"
  on public.kpis for select
  using (true);

drop policy if exists "kpis_admin_write" on public.kpis;
create policy "kpis_admin_write"
  on public.kpis for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ----- objectives -----
alter table public.objectives enable row level security;

drop policy if exists "objectives_view_public" on public.objectives;
create policy "objectives_view_public"
  on public.objectives for select
  using (is_private = false);

drop policy if exists "objectives_view_own_private" on public.objectives;
create policy "objectives_view_own_private"
  on public.objectives for select
  using (is_private = true and owner_id = auth.uid());

drop policy if exists "objectives_view_admin" on public.objectives;
create policy "objectives_view_admin"
  on public.objectives for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','people')));

drop policy if exists "objectives_admin_company_write" on public.objectives;
create policy "objectives_admin_company_write"
  on public.objectives for all
  using (
    level = 'company'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    level = 'company'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ----- key_results -----
alter table public.key_results enable row level security;

drop policy if exists "krs_view_via_parent" on public.key_results;
create policy "krs_view_via_parent"
  on public.key_results for select
  using (
    exists (
      select 1 from public.objectives o
      where o.id = key_results.objective_id
        and (
          o.is_private = false
          or o.owner_id = auth.uid()
          or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','people'))
        )
    )
  );

drop policy if exists "krs_admin_write" on public.key_results;
create policy "krs_admin_write"
  on public.key_results for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
