-- Fase 04-C: admin-safe profile/company RUC update.
-- Local migration only. Do not run without review/backup.

create or replace function public.admin_update_profile_company_ruc(
  p_actor_user_id uuid,
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
  v_profile public.profiles%rowtype;
  v_updated_profile public.profiles%rowtype;
  v_company public.companies%rowtype;
  v_active_company_users integer;
  v_full_name text := nullif(btrim(coalesce(p_full_name, '')), '');
  v_razon_social text := nullif(btrim(coalesce(p_razon_social, '')), '');
  v_ruc text := nullif(btrim(coalesce(p_ruc, '')), '');
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
begin
  if p_actor_user_id is null then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if not exists (
    select 1
    from public.admins a
    where a.id = p_actor_user_id
      and a.is_active = true
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if v_ruc is null or v_ruc !~ '^[0-9]{11}$' then
    raise exception 'INVALID_RUC';
  end if;

  if v_phone is not null and v_phone !~ '^\+51[0-9]{9}$' then
    raise exception 'INVALID_PHONE';
  end if;

  select *
    into v_profile
  from public.profiles p
  where p.id = p_profile_id
  for update;

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

  if v_profile.company_id is null then
    raise exception 'PROFILE_COMPANY_REQUIRED';
  end if;

  select *
    into v_company
  from public.companies c
  where c.id = v_profile.company_id
  for update;

  if not found then
    raise exception 'COMPANY_NOT_FOUND';
  end if;

  select count(*)
    into v_active_company_users
  from public.company_users cu
  where cu.company_id = v_company.id
    and cu.is_active = true;

  if v_active_company_users > 1 then
    raise exception 'COMPANY_HAS_MULTIPLE_ACTIVE_USERS_REQUIRES_MANUAL_REVIEW';
  end if;

  if exists (
    select 1
    from public.companies c
    where c.ruc = v_ruc
      and c.id <> v_company.id
  ) then
    raise exception 'RUC_ALREADY_ASSIGNED_TO_OTHER_COMPANY_REQUIRES_MANUAL_MERGE';
  end if;

  update public.companies
     set ruc = v_ruc,
         razon_social = v_razon_social,
         updated_at = now()
   where id = v_company.id;

  update public.profiles
     set full_name = v_full_name,
         razon_social = v_razon_social,
         ruc = v_ruc,
         phone = v_phone,
         is_active = coalesce(p_is_active, false),
         updated_at = now()
   where id = p_profile_id
   returning *
      into v_updated_profile;

  if to_regclass('public.profile_audit_logs') is not null then
    insert into public.profile_audit_logs (
      profile_id,
      changed_by,
      action,
      old_data,
      new_data
    )
    values (
      p_profile_id,
      p_actor_user_id,
      'admin_update_profile_company_ruc',
      jsonb_build_object(
        'full_name', v_profile.full_name,
        'razon_social', v_profile.razon_social,
        'ruc', v_profile.ruc,
        'phone', v_profile.phone,
        'is_active', v_profile.is_active,
        'company_id', v_company.id,
        'company_ruc', v_company.ruc,
        'company_razon_social', v_company.razon_social
      ),
      jsonb_build_object(
        'full_name', v_updated_profile.full_name,
        'razon_social', v_updated_profile.razon_social,
        'ruc', v_updated_profile.ruc,
        'phone', v_updated_profile.phone,
        'is_active', v_updated_profile.is_active,
        'company_id', v_company.id,
        'company_ruc', v_ruc,
        'company_razon_social', v_razon_social
      )
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'profile_id', p_profile_id,
    'company_id', v_company.id,
    'ruc', v_ruc,
    'action', 'admin_update_profile_company_ruc'
  );
end;
$$;

revoke all on function public.admin_update_profile_company_ruc(uuid, uuid, text, text, text, text, boolean)
from public, anon, authenticated;

grant execute on function public.admin_update_profile_company_ruc(uuid, uuid, text, text, text, text, boolean)
to authenticated;
