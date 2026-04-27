-- ============================================================
-- OKR/KPI Phase 3 — Individual OKRs + Approval Flow
-- ============================================================
-- Run in Supabase SQL Editor (after Phase 2)

-- ---------- Schema additions ----------
alter table public.objectives add column if not exists change_request_note text;

-- Ensure notifications table exists (created in Phase 1 notification work but idempotent)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  type text not null,
  title text,
  message text,
  payload jsonb,
  link text,
  read boolean default false,
  created_at timestamptz default now()
);

create index if not exists notifications_user_unread_idx on public.notifications(user_id, read) where read = false;

alter table public.notifications enable row level security;

drop policy if exists "notifications_own_select" on public.notifications;
create policy "notifications_own_select"
  on public.notifications for select
  using (user_id = auth.uid());

drop policy if exists "notifications_own_update" on public.notifications;
create policy "notifications_own_update"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "notifications_authed_insert" on public.notifications;
create policy "notifications_authed_insert"
  on public.notifications for insert
  with check (auth.uid() is not null);

-- ---------- Individual OKR policies ----------
drop policy if exists "objectives_owner_insert_individual" on public.objectives;
create policy "objectives_owner_insert_individual"
  on public.objectives for insert
  with check (
    level = 'individual'
    and owner_id = auth.uid()
    and is_private = true
  );

drop policy if exists "objectives_owner_edit_draft_individual" on public.objectives;
create policy "objectives_owner_edit_draft_individual"
  on public.objectives for update
  using (
    level = 'individual'
    and owner_id = auth.uid()
    and approval_status in ('draft','changes_requested')
  )
  with check (
    level = 'individual'
    and owner_id = auth.uid()
  );

drop policy if exists "objectives_owner_delete_draft_individual" on public.objectives;
create policy "objectives_owner_delete_draft_individual"
  on public.objectives for delete
  using (
    level = 'individual'
    and owner_id = auth.uid()
    and approval_status in ('draft','changes_requested')
  );

-- Manager visibility
drop policy if exists "objectives_manager_view_reports" on public.objectives;
create policy "objectives_manager_view_reports"
  on public.objectives for select
  using (
    level = 'individual'
    and owner_id in (select id from public.profiles where manager_id = auth.uid())
  );

drop policy if exists "objectives_manager_approve_reports" on public.objectives;
create policy "objectives_manager_approve_reports"
  on public.objectives for update
  using (
    level = 'individual'
    and owner_id in (select id from public.profiles where manager_id = auth.uid())
    and approval_status = 'pending_approval'
  )
  with check (
    level = 'individual'
    and owner_id in (select id from public.profiles where manager_id = auth.uid())
    and approval_status in ('approved','changes_requested')
  );

-- People team sees all individual OKRs
drop policy if exists "objectives_people_view_all_individual" on public.objectives;
create policy "objectives_people_view_all_individual"
  on public.objectives for select
  using (
    level = 'individual'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'people')
  );

-- ---------- Update key_results write to include individual level ----------
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
          or (o.level = 'individual' and o.owner_id = auth.uid() and o.approval_status in ('draft','changes_requested'))
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
          or (o.level = 'individual' and o.owner_id = auth.uid() and o.approval_status in ('draft','changes_requested'))
        )
    )
  );

-- ---------- Seed some default reporting lines ----------
-- Port is CEO — most report to him. Admin should adjust via /settings/org.
update public.profiles
  set manager_id = (select id from public.profiles where nickname = 'Port' limit 1)
  where nickname in ('Amp','Noon','Pim','Sek','Jomjam','Ping','First','Nut')
    and manager_id is null;

-- Nid reports to Ping (example — adjust as needed)
update public.profiles
  set manager_id = (select id from public.profiles where nickname = 'Ping' limit 1)
  where nickname = 'Nid'
    and manager_id is null;
