-- KC Tasks Database Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)

-- 1. Profiles (auto-created on signup)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role text default 'member' check (role in ('admin', 'member')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can view all profiles" on public.profiles for select to authenticated using (true);
create policy "Users can update own profile" on public.profiles for update to authenticated using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Members (team members, may or may not have accounts)
create table public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique,
  role text default 'member' check (role in ('admin', 'member')),
  profile_id uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.members enable row level security;
create policy "Authenticated users can view members" on public.members for select to authenticated using (true);
create policy "Admins can manage members" on public.members for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Members can insert" on public.members for insert to authenticated with check (true);

-- 3. Projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  is_private boolean default false,
  owner_id uuid references public.profiles(id) not null,
  created_at timestamptz default now()
);

alter table public.projects enable row level security;
create policy "Users can view public projects" on public.projects for select to authenticated
  using (not is_private or owner_id = auth.uid() or exists (
    select 1 from public.project_members pm
    join public.members m on m.id = pm.member_id
    where pm.project_id = projects.id and m.profile_id = auth.uid()
  ));
create policy "Owner can manage projects" on public.projects for all to authenticated using (owner_id = auth.uid());
create policy "Users can create projects" on public.projects for insert to authenticated with check (owner_id = auth.uid());

-- 4. Project Members (join table)
create table public.project_members (
  project_id uuid references public.projects(id) on delete cascade,
  member_id uuid references public.members(id) on delete cascade,
  role text default 'editor' check (role in ('editor', 'viewer')),
  primary key (project_id, member_id)
);

alter table public.project_members enable row level security;
create policy "View project members" on public.project_members for select to authenticated using (true);
create policy "Project owner manages members" on public.project_members for all to authenticated
  using (exists (select 1 from public.projects where id = project_id and owner_id = auth.uid()));
create policy "Users can add project members" on public.project_members for insert to authenticated with check (true);

-- 5. Tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  section text default 'Recently assigned',
  due date,
  priority text default '' check (priority in ('', 'High', 'Medium', 'Low')),
  value text default '' check (value in ('', 'High', 'Medium', 'Low')),
  effort text default '' check (effort in ('', 'Low effort', 'Medium effort', 'High effort', 'Need to scope')),
  progress text default '' check (progress in ('', 'Not Started', 'In Progress', 'Waiting', 'Deferred', 'Done')),
  notes text default '',
  project_id uuid references public.projects(id) on delete cascade,
  assigned_to uuid references public.members(id),
  created_by uuid references public.profiles(id) not null,
  sort_order integer default 0,
  parent_task_id uuid references public.tasks(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_tasks_parent_task_id on public.tasks(parent_task_id);

alter table public.tasks enable row level security;
-- Personal tasks (no project): only creator can see
create policy "View own personal tasks" on public.tasks for select to authenticated
  using (
    (project_id is null and parent_task_id is null and created_by = auth.uid())
    or
    (project_id is not null and exists (
      select 1 from public.projects p where p.id = project_id
      and (not p.is_private or p.owner_id = auth.uid() or exists (
        select 1 from public.project_members pm
        join public.members m on m.id = pm.member_id
        where pm.project_id = p.id and m.profile_id = auth.uid()
      ))
    ))
    or
    (parent_task_id is not null and exists (
      select 1 from public.tasks parent where parent.id = parent_task_id
    ))
    or
    (assigned_to is not null and exists (
      select 1 from public.members m where m.id = assigned_to and m.profile_id = auth.uid()
    ))
  );
create policy "Users can create tasks" on public.tasks for insert to authenticated with check (created_by = auth.uid());
create policy "Task creator or project owner can update" on public.tasks for update to authenticated
  using (created_by = auth.uid() or exists (
    select 1 from public.projects where id = project_id and owner_id = auth.uid()
  ));
create policy "Task creator or project owner can delete" on public.tasks for delete to authenticated
  using (created_by = auth.uid() or exists (
    select 1 from public.projects where id = project_id and owner_id = auth.uid()
  ));

-- 6. Subtasks
create table public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade not null,
  title text not null,
  done boolean default false,
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table public.subtasks enable row level security;
create policy "Subtasks follow parent task visibility" on public.subtasks for select to authenticated
  using (exists (select 1 from public.tasks where id = task_id));
create policy "Can insert subtasks for accessible tasks" on public.subtasks for insert to authenticated
  with check (exists (select 1 from public.tasks where id = task_id));
create policy "Can update subtasks for accessible tasks" on public.subtasks for update to authenticated
  using (exists (select 1 from public.tasks where id = task_id));
create policy "Can delete subtasks for accessible tasks" on public.subtasks for delete to authenticated
  using (exists (select 1 from public.tasks where id = task_id));

-- Enable realtime for tasks and subtasks
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.subtasks;

-- Updated_at trigger
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.update_updated_at();
