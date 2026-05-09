-- Projects table
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  preferences jsonb not null,
  calendar jsonb not null
);

-- Scripts table
create table if not exists scripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  project_id text,
  day integer,
  title text,
  content text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Plans table
create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  start_date timestamp with time zone not null,
  months integer not null,
  days jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  assignments jsonb
);

-- Enable RLS
alter table projects enable row level security;
alter table scripts enable row level security;
alter table plans enable row level security;

-- Policies (Only if you haven't set them yet)
do $$ 
begin
  if not exists (select 1 from pg_policies where policyname = 'Users can only see their own projects') then
    create policy "Users can only see their own projects" on projects for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can only insert their own projects') then
    create policy "Users can only insert their own projects" on projects for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can only update their own projects') then
    create policy "Users can only update their own projects" on projects for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can only delete their own projects') then
    create policy "Users can only delete their own projects" on projects for delete using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can only see their own scripts') then
    create policy "Users can only see their own scripts" on scripts for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can only insert their own scripts') then
    create policy "Users can only insert their own scripts" on scripts for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can only update their own scripts') then
    create policy "Users can only update their own scripts" on scripts for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can only delete their own scripts') then
    create policy "Users can only delete their own scripts" on scripts for delete using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can only see their own plans') then
    create policy "Users can only see their own plans" on plans for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can only insert their own plans') then
    create policy "Users can only insert their own plans" on plans for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can only update their own plans') then
    create policy "Users can only update their own plans" on plans for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can only delete their own plans') then
    create policy "Users can only delete their own plans" on plans for delete using (auth.uid() = user_id);
  end if;
end $$;
