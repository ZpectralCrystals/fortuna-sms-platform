-- FASE 5C - Hardening de updates de clientes.
-- Incremental: no crea tablas legacy ni borra datos.

create table if not exists public.profile_audit_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  changed_by uuid references public.admins(id),
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists profile_audit_logs_profile_id_created_at_idx
on public.profile_audit_logs(profile_id, created_at desc);

create index if not exists profile_audit_logs_changed_by_idx
on public.profile_audit_logs(changed_by);

alter table public.profile_audit_logs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profile_audit_logs'
      and policyname = 'profile_audit_logs_select_admin'
  ) then
    create policy "profile_audit_logs_select_admin"
    on public.profile_audit_logs
    for select
    to authenticated
    using (public.is_admin());
  end if;
end;
$$;

create or replace function public.admin_update_client_profile(
  p_profile_id uuid,
  p_full_name text,
  p_razon_social text,
  p_ruc text,
  p_phone text,
  p_is_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile public.profiles%rowtype;
  updated_profile public.profiles%rowtype;
  v_admin_id uuid := auth.uid();
  v_full_name text := nullif(btrim(p_full_name), '');
  v_razon_social text := nullif(btrim(p_razon_social), '');
  v_ruc text := nullif(btrim(p_ruc), '');
  v_phone text := nullif(btrim(p_phone), '');
begin
  if v_admin_id is null or not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if not exists (
    select 1
    from public.admins a
    where a.id = v_admin_id
      and a.is_active = true
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select *
    into target_profile
  from public.profiles p
  where p.id = p_profile_id;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if exists (
    select 1
    from public.admins a
    where a.id = p_profile_id
  ) then
    raise exception 'CANNOT_UPDATE_ADMIN_PROFILE';
  end if;

  if v_ruc is not null and v_ruc !~ '^[0-9]{11}$' then
    raise exception 'INVALID_RUC';
  end if;

  if v_phone is not null and v_phone !~ '^\+51[0-9]{9}$' then
    raise exception 'INVALID_PHONE';
  end if;

  update public.profiles
     set full_name = v_full_name,
         razon_social = v_razon_social,
         ruc = v_ruc,
         phone = v_phone,
         is_active = coalesce(p_is_active, false),
         updated_at = now()
   where id = p_profile_id
   returning *
      into updated_profile;

  insert into public.profile_audit_logs (
    profile_id,
    changed_by,
    action,
    old_data,
    new_data
  )
  values (
    p_profile_id,
    v_admin_id,
    'admin_update_client_profile',
    jsonb_build_object(
      'full_name', target_profile.full_name,
      'razon_social', target_profile.razon_social,
      'ruc', target_profile.ruc,
      'phone', target_profile.phone,
      'is_active', target_profile.is_active
    ),
    jsonb_build_object(
      'full_name', updated_profile.full_name,
      'razon_social', updated_profile.razon_social,
      'ruc', updated_profile.ruc,
      'phone', updated_profile.phone,
      'is_active', updated_profile.is_active
    )
  );

  return jsonb_build_object(
    'success', true,
    'profile_id', p_profile_id,
    'action', 'admin_update_client_profile'
  );
end;
$$;

create or replace function public.admin_set_client_active(
  p_profile_id uuid,
  p_is_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile public.profiles%rowtype;
  updated_profile public.profiles%rowtype;
  v_admin_id uuid := auth.uid();
begin
  if v_admin_id is null or not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if not exists (
    select 1
    from public.admins a
    where a.id = v_admin_id
      and a.is_active = true
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select *
    into target_profile
  from public.profiles p
  where p.id = p_profile_id;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if exists (
    select 1
    from public.admins a
    where a.id = p_profile_id
  ) then
    raise exception 'CANNOT_UPDATE_ADMIN_PROFILE';
  end if;

  update public.profiles
     set is_active = coalesce(p_is_active, false),
         updated_at = now()
   where id = p_profile_id
   returning *
      into updated_profile;

  insert into public.profile_audit_logs (
    profile_id,
    changed_by,
    action,
    old_data,
    new_data
  )
  values (
    p_profile_id,
    v_admin_id,
    'admin_set_client_active',
    jsonb_build_object(
      'is_active', target_profile.is_active
    ),
    jsonb_build_object(
      'is_active', updated_profile.is_active
    )
  );

  return jsonb_build_object(
    'success', true,
    'profile_id', p_profile_id,
    'action', 'admin_set_client_active'
  );
end;
$$;

grant select on public.profile_audit_logs to authenticated;
grant execute on function public.admin_update_client_profile(uuid, text, text, text, text, boolean) to authenticated;
grant execute on function public.admin_set_client_active(uuid, boolean) to authenticated;
