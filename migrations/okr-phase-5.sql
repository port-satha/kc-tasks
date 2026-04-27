-- ============================================================
-- OKR/KPI Phase 5 — Locks + Snapshots + Retroactive edits
-- ============================================================
-- Run in Supabase SQL Editor (after Phase 4)

-- ---------- period_locks ----------
create table if not exists public.period_locks (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  quarter int check (quarter between 1 and 4),
  locked_at timestamptz not null default now(),
  locked_by uuid references public.profiles(id),
  unique (year, quarter)
);

alter table public.period_locks enable row level security;

drop policy if exists "period_locks_view_all" on public.period_locks;
create policy "period_locks_view_all"
  on public.period_locks for select
  using (true);

drop policy if exists "period_locks_admin_manage" on public.period_locks;
create policy "period_locks_admin_manage"
  on public.period_locks for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ---------- edit_requests ----------
create table if not exists public.edit_requests (
  id uuid primary key default gen_random_uuid(),
  target_table text not null check (target_table in ('objectives','key_results','check_ins','kpis')),
  target_id uuid not null,
  year int not null,
  quarter int,
  justification text not null,
  status text default 'pending' check (status in ('pending','approved','rejected','expired')),
  approval_expires_at timestamptz,
  requested_by uuid references public.profiles(id) not null,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  reviewer_note text,
  created_at timestamptz default now()
);

create index if not exists edit_requests_target_idx on public.edit_requests(target_table, target_id, status);
create index if not exists edit_requests_pending_idx on public.edit_requests(status) where status = 'pending';

alter table public.edit_requests enable row level security;

drop policy if exists "edit_requests_requester_view" on public.edit_requests;
create policy "edit_requests_requester_view"
  on public.edit_requests for select
  using (requested_by = auth.uid());

drop policy if exists "edit_requests_admin_view" on public.edit_requests;
create policy "edit_requests_admin_view"
  on public.edit_requests for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','people')));

drop policy if exists "edit_requests_user_insert" on public.edit_requests;
create policy "edit_requests_user_insert"
  on public.edit_requests for insert
  with check (requested_by = auth.uid());

drop policy if exists "edit_requests_admin_update" on public.edit_requests;
create policy "edit_requests_admin_update"
  on public.edit_requests for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ---------- snapshots ----------
create table if not exists public.snapshots (
  id uuid primary key default gen_random_uuid(),
  period_type text check (period_type in ('quarter','year')),
  year int not null,
  quarter int,
  snapshot_data jsonb not null,
  created_at timestamptz default now(),
  unique (period_type, year, quarter)
);

alter table public.snapshots enable row level security;

drop policy if exists "snapshots_people_admin_view" on public.snapshots;
create policy "snapshots_people_admin_view"
  on public.snapshots for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','people')));

-- No update/delete policy = immutable once inserted

-- ---------- is_retroactive_edit flags ----------
alter table public.objectives  add column if not exists is_retroactive_edit boolean default false;
alter table public.key_results add column if not exists is_retroactive_edit boolean default false;
alter table public.check_ins   add column if not exists is_retroactive_edit boolean default false;
alter table public.kpis        add column if not exists is_retroactive_edit boolean default false;

-- ---------- Period lock enforcement trigger ----------
create or replace function public.check_period_lock()
returns trigger as $$
declare
  target_year int;
  target_q int;
  is_locked boolean;
  has_approved_edit boolean;
  is_admin boolean;
  rec_id uuid;
begin
  -- Determine year and quarter of the target record
  if TG_TABLE_NAME = 'objectives' then
    target_year := coalesce(NEW.year, OLD.year);
    target_q := coalesce(NEW.quarter, OLD.quarter);
    rec_id := coalesce(NEW.id, OLD.id);
  elsif TG_TABLE_NAME = 'key_results' then
    select o.year, o.quarter into target_year, target_q
    from public.objectives o where o.id = coalesce(NEW.objective_id, OLD.objective_id);
    rec_id := coalesce(NEW.id, OLD.id);
  elsif TG_TABLE_NAME = 'check_ins' then
    select o.year, o.quarter into target_year, target_q
    from public.key_results kr
    join public.objectives o on o.id = kr.objective_id
    where kr.id = coalesce(NEW.key_result_id, OLD.key_result_id);
    rec_id := coalesce(NEW.id, OLD.id);
  elsif TG_TABLE_NAME = 'kpis' then
    target_year := coalesce(NEW.year, OLD.year);
    target_q := null;
    rec_id := coalesce(NEW.id, OLD.id);
  end if;

  if target_q is null then
    return coalesce(NEW, OLD);
  end if;

  select exists(select 1 from public.period_locks where year = target_year and quarter = target_q) into is_locked;
  if not is_locked then
    return coalesce(NEW, OLD);
  end if;

  -- Admin override: always allowed; flag as retroactive
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin') into is_admin;
  if is_admin then
    if TG_OP = 'UPDATE' or TG_OP = 'INSERT' then
      NEW.is_retroactive_edit := true;
    end if;
    return coalesce(NEW, OLD);
  end if;

  -- Check for approved, unexpired edit request
  select exists(
    select 1 from public.edit_requests
    where target_table = TG_TABLE_NAME
      and target_id = rec_id
      and status = 'approved'
      and approval_expires_at > now()
  ) into has_approved_edit;

  if has_approved_edit then
    if TG_OP = 'UPDATE' or TG_OP = 'INSERT' then
      NEW.is_retroactive_edit := true;
    end if;
    return coalesce(NEW, OLD);
  end if;

  raise exception 'Period Q% % is locked. Submit an edit request with justification.', target_q, target_year;
end;
$$ language plpgsql security definer;

drop trigger if exists objectives_lock_check on public.objectives;
create trigger objectives_lock_check
  before update or delete on public.objectives
  for each row execute function public.check_period_lock();

drop trigger if exists key_results_lock_check on public.key_results;
create trigger key_results_lock_check
  before update or delete on public.key_results
  for each row execute function public.check_period_lock();

drop trigger if exists check_ins_lock_check on public.check_ins;
create trigger check_ins_lock_check
  before update or delete on public.check_ins
  for each row execute function public.check_period_lock();

-- Optional: seed Q1 2026 as locked for bootstrap
-- Uncomment to apply:
-- insert into public.period_locks (year, quarter) values (2026, 1) on conflict do nothing;
