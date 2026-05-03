create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  content text not null,
  category text not null default 'general',
  variables jsonb default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.templates
  add column if not exists variables jsonb default '[]'::jsonb;

alter table public.templates
  add column if not exists is_active boolean not null default true;

alter table public.templates
  add column if not exists updated_at timestamptz not null default now();

alter table public.templates
  alter column category type text using category::text,
  alter column category set default 'general';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'templates_name_not_empty'
      and conrelid = 'public.templates'::regclass
  ) then
    alter table public.templates
      add constraint templates_name_not_empty
      check (btrim(name) <> '') not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'templates_content_not_empty'
      and conrelid = 'public.templates'::regclass
  ) then
    alter table public.templates
      add constraint templates_content_not_empty
      check (btrim(content) <> '') not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'templates_category_allowed'
      and conrelid = 'public.templates'::regclass
  ) then
    alter table public.templates
      add constraint templates_category_allowed
      check (category in ('general', 'marketing', 'cobranza', 'recordatorio', 'soporte', 'otro')) not valid;
  end if;
end $$;

create index if not exists templates_user_id_idx
  on public.templates (user_id);

create index if not exists templates_category_idx
  on public.templates (category);

create index if not exists templates_is_active_idx
  on public.templates (is_active);

create index if not exists templates_created_at_idx
  on public.templates (created_at desc);

create or replace function public.update_templates_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'templates_set_updated_at'
      and tgrelid = 'public.templates'::regclass
  ) then
    create trigger templates_set_updated_at
      before update on public.templates
      for each row
      execute function public.update_templates_updated_at();
  end if;
end $$;

alter table public.templates enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'templates'
      and policyname = 'templates_select_own_or_admin'
  ) then
    create policy templates_select_own_or_admin
      on public.templates
      for select
      to authenticated
      using (user_id = auth.uid() or public.is_admin());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'templates'
      and policyname = 'templates_insert_own'
  ) then
    create policy templates_insert_own
      on public.templates
      for insert
      to authenticated
      with check (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'templates'
      and policyname = 'templates_update_own'
  ) then
    create policy templates_update_own
      on public.templates
      for update
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'templates'
      and policyname = 'templates_delete_own'
  ) then
    create policy templates_delete_own
      on public.templates
      for delete
      to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

grant select, insert, update, delete on public.templates to authenticated;
