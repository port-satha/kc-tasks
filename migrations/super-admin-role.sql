-- ============================================================
-- Super Admin role + broaden admin write access
-- ============================================================
-- Introduces a super_admin role that sits above admin:
--   - super_admin is the only role that can add/remove members
--     and modify brand_owners / team_leads
--   - admin keeps all existing privileges PLUS gains:
--       * full write on every kc-tasks table (tasks/projects/sections/etc)
--       * bypass on period locks (no edit_request needed)
--   - admin can still change another user's role (promote/demote).
--
-- Strategy: RLS policies are OR'd within the same command. Rather than
-- rewriting every existing admin policy, we layer new policies on top:
--   - *_super_admin_all    -> super_admin inherits every admin grant
--   - *_admin_all          -> on tables that had no admin override yet
--       (kc-tasks: tasks, projects, project_members, sections, comments,
--        subtasks)
-- Existing admin checks (`role = 'admin'`) keep working unchanged.

-- ------------------------------------------------------------
-- 1) Extend profiles.role to accept 'super_admin'
-- ------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('member','manager','people','admin','super_admin'));

-- Promote Port to super_admin (nickname match — adjust if needed)
update public.profiles set role = 'super_admin' where nickname = 'Port';

-- ------------------------------------------------------------
-- 2) Super_admin inherits everything admin can do
--    One parallel policy per table that has an admin write grant.
-- ------------------------------------------------------------
do $$
declare
  t text;
  tbls text[] := array[
    'profiles','objectives','key_results','kpis',
    'check_ins','reflections','period_locks','edit_requests','snapshots'
  ];
begin
  foreach t in array tbls loop
    execute format('drop policy if exists %I on public.%I', t || '_super_admin_all', t);
    execute format(
      'create policy %I on public.%I for all '
      'using (public.current_user_role() = ''super_admin'') '
      'with check (public.current_user_role() = ''super_admin'')',
      t || '_super_admin_all', t
    );
  end loop;
end $$;

-- ------------------------------------------------------------
-- 3) Admin (and super_admin) full write on kc-tasks tables
--    Existing per-table policies stay intact; this adds an override
--    so admins can edit anyone's task/project regardless of ownership.
-- ------------------------------------------------------------
do $$
declare
  t text;
  tbls text[] := array[
    'tasks','projects','project_members','sections','comments','subtasks',
    'notifications'
  ];
begin
  foreach t in array tbls loop
    -- Skip if the table doesn't exist in this schema (e.g. subtasks may be deprecated)
    if exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = t) then
      execute format('drop policy if exists %I on public.%I', t || '_admin_all', t);
      execute format(
        'create policy %I on public.%I for all '
        'using (public.current_user_role() in (''admin'',''super_admin'')) '
        'with check (public.current_user_role() in (''admin'',''super_admin''))',
        t || '_admin_all', t
      );
    end if;
  end loop;
end $$;

-- ------------------------------------------------------------
-- 4) Lock down brand_owners and team_leads to super_admin only
--    (drop the pre-existing admin write grants)
-- ------------------------------------------------------------
drop policy if exists "brand_owners_admin_write" on public.brand_owners;
drop policy if exists "team_leads_admin_write"   on public.team_leads;

drop policy if exists "brand_owners_super_admin_write" on public.brand_owners;
create policy "brand_owners_super_admin_write"
  on public.brand_owners for all
  using (public.current_user_role() = 'super_admin')
  with check (public.current_user_role() = 'super_admin');

drop policy if exists "team_leads_super_admin_write" on public.team_leads;
create policy "team_leads_super_admin_write"
  on public.team_leads for all
  using (public.current_user_role() = 'super_admin')
  with check (public.current_user_role() = 'super_admin');

-- ------------------------------------------------------------
-- 5) Members table — add/remove restricted to super_admin
--    (self-insert still allowed for auto-registration;
--     role changes on members.role stay open to admin as well.)
-- ------------------------------------------------------------
drop policy if exists "Authenticated users can insert members" on public.members;
drop policy if exists "Admins or self can update members"      on public.members;
drop policy if exists "Admins can delete members"              on public.members;

-- INSERT: super_admin for anyone, or self-insert (ensureCurrentUserIsMember)
drop policy if exists "members_super_admin_or_self_insert" on public.members;
create policy "members_super_admin_or_self_insert"
  on public.members for insert to authenticated
  with check (
    public.current_user_role() = 'super_admin'
    or profile_id = auth.uid()
  );

-- UPDATE: self, admin, or super_admin
drop policy if exists "members_self_or_admin_update" on public.members;
create policy "members_self_or_admin_update"
  on public.members for update to authenticated
  using (
    profile_id = auth.uid()
    or public.current_user_role() in ('admin','super_admin')
  );

-- DELETE: super_admin only
drop policy if exists "members_super_admin_delete" on public.members;
create policy "members_super_admin_delete"
  on public.members for delete to authenticated
  using (public.current_user_role() = 'super_admin');

-- ------------------------------------------------------------
-- 6) Period-lock trigger: admin (and super_admin) bypass without
--    needing an approved edit_request. Flag the write as retroactive
--    so we retain an audit trail on post-lock changes.
-- ------------------------------------------------------------
create or replace function public.check_period_lock()
returns trigger as $$
declare
  target_year int;
  target_q int;
  is_locked boolean;
  has_approved_edit boolean;
  can_bypass boolean;
  rec_id uuid;
begin
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

  select exists(select 1 from public.period_locks where year = target_year and quarter = target_q)
    into is_locked;
  if not is_locked then
    return coalesce(NEW, OLD);
  end if;

  -- Admin or super_admin bypass — flag for audit
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin','super_admin')
  ) into can_bypass;
  if can_bypass then
    if TG_OP = 'UPDATE' or TG_OP = 'INSERT' then
      NEW.is_retroactive_edit := true;
    end if;
    return coalesce(NEW, OLD);
  end if;

  -- Otherwise require an approved edit request
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
