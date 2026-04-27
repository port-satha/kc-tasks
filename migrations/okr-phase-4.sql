-- ============================================================
-- OKR/KPI Phase 4 — Weekly check-ins + Reflections
-- ============================================================
-- Run in Supabase SQL Editor (after Phase 3)

-- ---------- check_ins ----------
create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  key_result_id uuid references public.key_results(id) on delete cascade not null,
  value numeric,
  confidence int check (confidence between 1 and 5),
  note text,
  week_of date not null,
  is_skipped boolean default false,
  created_by uuid references public.profiles(id) not null,
  created_at timestamptz default now()
);

create index if not exists check_ins_kr_week_idx on public.check_ins(key_result_id, week_of desc);
create unique index if not exists check_ins_kr_week_unique on public.check_ins(key_result_id, week_of);

alter table public.check_ins enable row level security;

drop policy if exists "check_ins_view_via_objective" on public.check_ins;
create policy "check_ins_view_via_objective"
  on public.check_ins for select
  using (
    exists (
      select 1 from public.key_results kr
      join public.objectives o on o.id = kr.objective_id
      where kr.id = check_ins.key_result_id
        and (
          o.is_private = false
          or o.owner_id = auth.uid()
          or kr.owner_id = auth.uid()
          or o.owner_id in (select id from public.profiles where manager_id = auth.uid())
          or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','people'))
        )
    )
  );

drop policy if exists "check_ins_owner_insert" on public.check_ins;
create policy "check_ins_owner_insert"
  on public.check_ins for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.key_results kr
      join public.objectives o on o.id = kr.objective_id
      where kr.id = check_ins.key_result_id
        and (
          kr.owner_id = auth.uid()
          or o.owner_id = auth.uid()
          or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
        )
    )
  );

drop policy if exists "check_ins_owner_update_recent" on public.check_ins;
create policy "check_ins_owner_update_recent"
  on public.check_ins for update
  using (
    created_by = auth.uid()
    and created_at > now() - interval '48 hours'
  );

drop policy if exists "check_ins_owner_delete_recent" on public.check_ins;
create policy "check_ins_owner_delete_recent"
  on public.check_ins for delete
  using (
    created_by = auth.uid()
    and created_at > now() - interval '48 hours'
  );

-- ---------- reflections ----------
create table if not exists public.reflections (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid references public.objectives(id) on delete cascade not null,
  period_type text check (period_type in ('quarter','year')),
  quarter int,
  year int not null,

  self_rating int check (self_rating between 1 and 5),
  self_went_well text,
  self_improve text,
  self_submitted_at timestamptz,

  manager_rating int check (manager_rating between 1 and 5),
  manager_notes text,
  manager_id uuid references public.profiles(id),
  manager_submitted_at timestamptz,

  finalized_at timestamptz,
  created_at timestamptz default now(),

  unique (objective_id, period_type, year, quarter)
);

create index if not exists reflections_objective_idx on public.reflections(objective_id);

alter table public.reflections enable row level security;

drop policy if exists "reflections_view" on public.reflections;
create policy "reflections_view"
  on public.reflections for select
  using (
    exists (
      select 1 from public.objectives o
      where o.id = reflections.objective_id
        and (
          o.owner_id = auth.uid()
          or o.owner_id in (select id from public.profiles where manager_id = auth.uid())
          or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','people'))
        )
    )
  );

drop policy if exists "reflections_owner_insert" on public.reflections;
create policy "reflections_owner_insert"
  on public.reflections for insert
  with check (
    exists (
      select 1 from public.objectives
      where id = reflections.objective_id
        and (owner_id = auth.uid()
          or owner_id in (select id from public.profiles where manager_id = auth.uid())
          or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','people'))
        )
    )
  );

drop policy if exists "reflections_owner_update" on public.reflections;
create policy "reflections_owner_update"
  on public.reflections for update
  using (
    finalized_at is null
    and (
      exists (select 1 from public.objectives where id = reflections.objective_id and owner_id = auth.uid())
      or exists (
        select 1 from public.objectives o
        where o.id = reflections.objective_id
          and o.owner_id in (select id from public.profiles where manager_id = auth.uid())
      )
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    )
  );
