-- ============================================================
-- Section 14 alignment — rename profiles columns + add a trigger
-- ============================================================
-- Brings the schema in line with Section 14 of the UX/UI brief:
--   profiles.position             → position_title
--   profiles.profile_completed    → profile_complete
-- Plus a BEFORE-INSERT/UPDATE trigger that auto-sets
-- profile_complete based on whether the three required self-completed
-- fields (nickname, full_name, position_title) are all non-empty.
--
-- Backfill at the end re-evaluates the flag on every existing row so it
-- reflects current data.

begin;

-- 1) Rename columns
alter table public.profiles rename column position          to position_title;
alter table public.profiles rename column profile_completed to profile_complete;

-- 2) Trigger function — single source of truth for profile_complete
create or replace function public.update_profile_complete()
returns trigger
language plpgsql
as $$
begin
  new.profile_complete := (
    new.nickname       is not null and length(trim(new.nickname))       > 0
    and new.full_name      is not null and length(trim(new.full_name))      > 0
    and new.position_title is not null and length(trim(new.position_title)) > 0
  );
  return new;
end;
$$;

-- 3) Wire the trigger
drop trigger if exists profiles_complete_check on public.profiles;
create trigger profiles_complete_check
  before insert or update on public.profiles
  for each row execute function public.update_profile_complete();

-- 4) Backfill — touching every row fires the BEFORE UPDATE trigger,
--    which recomputes profile_complete from the three required fields.
update public.profiles set id = id;

commit;
