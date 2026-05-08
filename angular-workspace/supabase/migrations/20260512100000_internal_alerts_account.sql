-- FASE ALERTAS SMS - Internal alerts account + SMS allocations.
-- Adds infrastructure so low_balance_alerts can be paid by an internal sender
-- profile instead of charging the client receiving the alert.

create extension if not exists pgcrypto;

create table if not exists public.internal_accounts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  account_type text not null,
  label text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists internal_accounts_active_type_idx
  on public.internal_accounts(account_type)
  where is_active = true;

create table if not exists public.internal_sms_allocations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  sms_amount integer not null check (sms_amount > 0),
  reason text,
  created_by uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists internal_sms_allocations_profile_idx
  on public.internal_sms_allocations(profile_id, created_at desc);

alter table public.low_balance_config
  add column if not exists internal_sender_profile_id uuid references public.profiles(id) on delete set null;

alter table public.internal_accounts enable row level security;
alter table public.internal_sms_allocations enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'internal_accounts'
      and policyname = 'internal_accounts_select_admin'
  ) then
    create policy internal_accounts_select_admin
    on public.internal_accounts
    for select
    to authenticated
    using (public.is_admin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'internal_sms_allocations'
      and policyname = 'internal_sms_allocations_select_admin'
  ) then
    create policy internal_sms_allocations_select_admin
    on public.internal_sms_allocations
    for select
    to authenticated
    using (public.is_admin());
  end if;
end;
$$;

drop trigger if exists internal_accounts_updated_at on public.internal_accounts;
create trigger internal_accounts_updated_at
before update on public.internal_accounts
for each row execute function public.update_updated_at();

revoke all on public.internal_accounts from anon, authenticated;
revoke all on public.internal_sms_allocations from anon, authenticated;
grant select on public.internal_accounts to authenticated;
grant select on public.internal_sms_allocations to authenticated;

create or replace function public.admin_get_internal_alerts_account()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_account record;
  v_config_internal_id uuid;
begin
  if v_admin_id is null or not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select c.internal_sender_profile_id
    into v_config_internal_id
  from public.low_balance_config c
  order by c.created_at asc
  limit 1;

  select
    ia.profile_id,
    ia.account_type,
    ia.label,
    ia.is_active,
    p.email,
    p.full_name,
    p.credits
    into v_account
  from public.internal_accounts ia
  join public.profiles p on p.id = ia.profile_id
  where ia.account_type = 'low_balance_alerts'
    and ia.is_active = true
  order by ia.created_at asc
  limit 1;

  if not found then
    return jsonb_build_object(
      'success', true,
      'account', null,
      'configured_profile_id', v_config_internal_id
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'account', jsonb_build_object(
      'profile_id', v_account.profile_id,
      'account_type', v_account.account_type,
      'label', v_account.label,
      'is_active', v_account.is_active,
      'email', v_account.email,
      'full_name', v_account.full_name,
      'credits', v_account.credits
    ),
    'configured_profile_id', v_config_internal_id
  );
end;
$$;

create or replace function public.admin_ensure_internal_alerts_account()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_existing record;
  v_profile public.profiles%rowtype;
  v_label constant text := 'SMS Fortuna Alertas';
  v_account_type constant text := 'low_balance_alerts';
  v_email constant text := 'alerts@smsfortuna.internal';
begin
  if v_admin_id is null or not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select ia.profile_id, ia.account_type, ia.label, ia.is_active
    into v_existing
  from public.internal_accounts ia
  where ia.account_type = v_account_type
    and ia.is_active = true
  order by ia.created_at asc
  limit 1;

  if found then
    update public.low_balance_config
       set internal_sender_profile_id = v_existing.profile_id,
           updated_at = now()
     where internal_sender_profile_id is distinct from v_existing.profile_id;

    return jsonb_build_object(
      'success', true,
      'created', false,
      'profile_id', v_existing.profile_id
    );
  end if;

  select *
    into v_profile
  from public.profiles
  where email = v_email
  limit 1;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'INTERNAL_PROFILE_MISSING',
      'message', 'Crea primero un usuario auth con email ' || v_email || ' para asociar la cuenta interna.'
    );
  end if;

  insert into public.internal_accounts (profile_id, account_type, label, is_active)
  values (v_profile.id, v_account_type, v_label, true);

  update public.low_balance_config
     set internal_sender_profile_id = v_profile.id,
         updated_at = now()
   where internal_sender_profile_id is distinct from v_profile.id;

  return jsonb_build_object(
    'success', true,
    'created', true,
    'profile_id', v_profile.id
  );
end;
$$;

create or replace function public.admin_allocate_internal_sms(
  p_profile_id uuid,
  p_sms_amount integer,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_account record;
  v_new_credits bigint;
  v_allocation_id uuid;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_admin_id is null or not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if p_profile_id is null then
    raise exception 'INVALID_PROFILE';
  end if;

  if p_sms_amount is null or p_sms_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  select ia.profile_id, ia.account_type, ia.is_active
    into v_account
  from public.internal_accounts ia
  where ia.profile_id = p_profile_id
    and ia.is_active = true
  limit 1;

  if not found then
    raise exception 'NOT_INTERNAL_ACCOUNT';
  end if;

  update public.profiles
     set credits = credits + p_sms_amount,
         updated_at = now()
   where id = p_profile_id
   returning credits into v_new_credits;

  insert into public.internal_sms_allocations (
    profile_id,
    sms_amount,
    reason,
    created_by
  )
  values (
    p_profile_id,
    p_sms_amount,
    v_reason,
    v_admin_id
  )
  returning id into v_allocation_id;

  return jsonb_build_object(
    'success', true,
    'allocation_id', v_allocation_id,
    'profile_id', p_profile_id,
    'sms_amount', p_sms_amount,
    'new_credits', v_new_credits
  );
end;
$$;

revoke all on function public.admin_get_internal_alerts_account() from public, anon, authenticated;
grant execute on function public.admin_get_internal_alerts_account() to authenticated;

revoke all on function public.admin_ensure_internal_alerts_account() from public, anon, authenticated;
grant execute on function public.admin_ensure_internal_alerts_account() to authenticated;

revoke all on function public.admin_allocate_internal_sms(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.admin_allocate_internal_sms(uuid, integer, text) to authenticated;
