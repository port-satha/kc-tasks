-- ============================================================
-- Tribes + team rename — match KC's actual org structure
-- ============================================================
-- Run in Supabase SQL Editor

-- ---------- Rename existing team values to the canonical org-chart names ----------
-- Old name → new canonical name
update public.profiles set team = 'Strategy'                where team = 'Management';
update public.profiles set team = 'Innovation'              where team = 'R&D';
update public.profiles set team = 'Sourcing & Procurement'  where team = 'Sourcing';
update public.profiles set team = 'Accounting & Finance'    where team = 'Accounting';
update public.profiles set team = 'Stock & Warehouse'       where team = 'Warehouse';

update public.team_leads set team = 'Strategy'              where team = 'Management';
update public.team_leads set team = 'Innovation'            where team = 'R&D';
update public.team_leads set team = 'Sourcing & Procurement' where team = 'Sourcing';
update public.team_leads set team = 'Accounting & Finance'  where team = 'Accounting';
update public.team_leads set team = 'Stock & Warehouse'     where team = 'Warehouse';

-- Same for objectives + kpis (in case anyone created OKRs / KPIs at team level with old names)
update public.objectives set team = 'Strategy'              where team = 'Management';
update public.objectives set team = 'Innovation'            where team = 'R&D';
update public.objectives set team = 'Sourcing & Procurement' where team = 'Sourcing';
update public.objectives set team = 'Accounting & Finance'  where team = 'Accounting';
update public.objectives set team = 'Stock & Warehouse'     where team = 'Warehouse';

update public.kpis set team = 'Strategy'                    where team = 'Management';
update public.kpis set team = 'Innovation'                  where team = 'R&D';
update public.kpis set team = 'Sourcing & Procurement'      where team = 'Sourcing';
update public.kpis set team = 'Accounting & Finance'        where team = 'Accounting';
update public.kpis set team = 'Stock & Warehouse'           where team = 'Warehouse';

-- ---------- Add tribe column to team_leads (nullable; non-null = tribe lead) ----------
alter table public.team_leads add column if not exists tribe text;

-- A "tribe lead" entry has tribe set and team = null (covers all teams in that tribe).
-- Allow null team if tribe is set, otherwise team must be present.
-- (PG won't enforce this at column level cleanly; rely on app logic.)

-- ---------- Seed tribe leads from the org chart ----------
-- Strategy tribe: Port + Amp (Management already covered via team_leads team='Strategy')
-- Backbone tribe: Noon
-- Factory tribe: Sa
-- Marketing & Innovation tribes: no tribe lead per the org chart
insert into public.team_leads (tribe, profile_id)
  select 'Backbone', id from public.profiles where nickname = 'Noon'
  on conflict do nothing;

insert into public.team_leads (tribe, profile_id)
  select 'Factory', id from public.profiles where nickname = 'Sa'
  on conflict do nothing;

-- ---------- Seed any new team leads referenced in the org chart ----------
-- Design (shared) — Ping
insert into public.team_leads (team, profile_id, brand)
  select 'Design', id, null from public.profiles where nickname = 'Ping'
  on conflict do nothing;

-- Innovation team leads (per brand)
insert into public.team_leads (team, profile_id, brand)
  select 'Innovation', id, 'onest' from public.profiles where nickname = 'Peem'
  on conflict do nothing;

insert into public.team_leads (team, profile_id, brand)
  select 'Innovation', id, 'grubby' from public.profiles where nickname = 'Sa'
  on conflict do nothing;

-- Accounting & Finance (per brand)
insert into public.team_leads (team, profile_id, brand)
  select 'Accounting & Finance', id, 'onest' from public.profiles where nickname = 'Atom'
  on conflict do nothing;

insert into public.team_leads (team, profile_id, brand)
  select 'Accounting & Finance', id, 'grubby' from public.profiles where nickname = 'Ying'
  on conflict do nothing;

-- People (shared) — First
insert into public.team_leads (team, profile_id, brand)
  select 'People', id, null from public.profiles where nickname = 'First'
  on conflict do nothing;

-- Production (shared) — Kwang Siri
insert into public.team_leads (team, profile_id, brand)
  select 'Production', id, null from public.profiles where nickname ilike 'Kwang%Siri%' or nickname = 'Kwang Siri'
  on conflict do nothing;

-- Stock & Warehouse (shared) — Kwang Chamai (กวาง ชไม)
insert into public.team_leads (team, profile_id, brand)
  select 'Stock & Warehouse', id, null from public.profiles where nickname ilike 'Kwang%Chamai%' or nickname ilike '%ชไม%'
  on conflict do nothing;

-- QMS (shared) — Big
insert into public.team_leads (team, profile_id, brand)
  select 'QMS', id, null from public.profiles where nickname = 'Big'
  on conflict do nothing;

-- Sourcing & Procurement (shared) — Miw
insert into public.team_leads (team, profile_id, brand)
  select 'Sourcing & Procurement', id, null from public.profiles where nickname = 'Miw'
  on conflict do nothing;
