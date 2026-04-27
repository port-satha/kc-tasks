-- ============================================================
-- Allow 'both' as a squad/brand value
-- ============================================================
-- Section 12 of the brief introduces a "both brands" purple chip for
-- members whose role spans onest and grubby (e.g. Design Director,
-- People Lead). Until now the squad enum only allowed
-- ('KC','onest','grubby'). Widening to include 'both'.

begin;

alter table public.profiles drop constraint if exists profiles_squad_check;
alter table public.profiles add constraint profiles_squad_check
  check (squad is null or squad in ('KC','onest','grubby','both'));

alter table public.members drop constraint if exists members_squad_check;
alter table public.members add constraint members_squad_check
  check (squad is null or squad in ('KC','onest','grubby','both'));

commit;
