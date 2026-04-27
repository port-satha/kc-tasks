-- ============================================================
-- KR-level cascade
-- ============================================================
-- Allows a Team/Individual OKR to cascade from a specific Key Result
-- of a parent Objective, not just from the Objective itself.
-- parent_objective_id still exists (objective-level cascade, backward compatible).
-- parent_kr_id is optional; if set, it implies parent_objective_id = KR's objective.

alter table public.objectives add column if not exists parent_kr_id uuid references public.key_results(id);

create index if not exists objectives_parent_kr_idx on public.objectives(parent_kr_id);

-- Optional helper: when parent_kr_id is set, auto-populate parent_objective_id
-- so existing tree queries keep working.
create or replace function public.sync_parent_objective_from_kr()
returns trigger as $$
begin
  if NEW.parent_kr_id is not null and NEW.parent_objective_id is null then
    select objective_id into NEW.parent_objective_id
    from public.key_results
    where id = NEW.parent_kr_id;
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists objectives_sync_parent_from_kr on public.objectives;
create trigger objectives_sync_parent_from_kr
  before insert or update on public.objectives
  for each row
  when (NEW.parent_kr_id is not null)
  execute function public.sync_parent_objective_from_kr();

-- Backfill parent_objective_id for any existing rows with a parent_kr_id (should be 0)
update public.objectives o
  set parent_objective_id = kr.objective_id
  from public.key_results kr
  where o.parent_kr_id = kr.id
    and o.parent_objective_id is null;
