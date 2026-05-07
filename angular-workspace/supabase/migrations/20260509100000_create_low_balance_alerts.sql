-- FASE 8C - Backoffice low balance alerts.
-- Creates alert config/history tables without sending SMS automatically.

create extension if not exists pgcrypto;

create table if not exists public.low_balance_config (
  id uuid primary key default gen_random_uuid(),
  threshold_credits numeric(12,2) not null default 10 check (threshold_credits >= 0),
  is_active boolean not null default true,
  notify_admin boolean not null default true,
  notify_client boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.low_balance_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  credits_at_alert numeric(12,2) not null default 0,
  threshold_credits numeric(12,2) not null default 10,
  alert_type text not null default 'low_balance',
  status text not null default 'pending',
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint low_balance_alerts_status_check check (status in ('pending', 'sent', 'failed'))
);

create index if not exists low_balance_alerts_user_created_idx
on public.low_balance_alerts(user_id, created_at desc);

create index if not exists low_balance_alerts_status_idx
on public.low_balance_alerts(status);

create index if not exists low_balance_alerts_created_idx
on public.low_balance_alerts(created_at desc);

alter table public.low_balance_config enable row level security;
alter table public.low_balance_alerts enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'low_balance_config'
      and policyname = 'low_balance_config_select_admin'
  ) then
    create policy low_balance_config_select_admin
    on public.low_balance_config
    for select
    to authenticated
    using (public.is_admin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'low_balance_alerts'
      and policyname = 'low_balance_alerts_select_admin'
  ) then
    create policy low_balance_alerts_select_admin
    on public.low_balance_alerts
    for select
    to authenticated
    using (public.is_admin());
  end if;
end;
$$;

insert into public.low_balance_config (
  threshold_credits,
  is_active,
  notify_admin,
  notify_client
)
select 10, true, true, false
where not exists (
  select 1
  from public.low_balance_config
);

create or replace function public.admin_upsert_low_balance_config(
  p_threshold_credits numeric,
  p_is_active boolean,
  p_notify_admin boolean,
  p_notify_client boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_config public.low_balance_config%rowtype;
begin
  if v_admin_id is null or not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if p_threshold_credits is null or p_threshold_credits < 0 then
    raise exception 'INVALID_THRESHOLD';
  end if;

  select *
    into v_config
  from public.low_balance_config
  order by created_at asc
  limit 1
  for update;

  if found then
    update public.low_balance_config
       set threshold_credits = round(p_threshold_credits::numeric, 2),
           is_active = coalesce(p_is_active, true),
           notify_admin = coalesce(p_notify_admin, true),
           notify_client = coalesce(p_notify_client, false),
           updated_at = now()
     where id = v_config.id
     returning *
        into v_config;
  else
    insert into public.low_balance_config (
      threshold_credits,
      is_active,
      notify_admin,
      notify_client
    )
    values (
      round(p_threshold_credits::numeric, 2),
      coalesce(p_is_active, true),
      coalesce(p_notify_admin, true),
      coalesce(p_notify_client, false)
    )
    returning *
       into v_config;
  end if;

  return jsonb_build_object(
    'success', true,
    'config', jsonb_build_object(
      'id', v_config.id,
      'threshold_credits', v_config.threshold_credits,
      'is_active', v_config.is_active,
      'notify_admin', v_config.notify_admin,
      'notify_client', v_config.notify_client,
      'created_at', v_config.created_at,
      'updated_at', v_config.updated_at
    )
  );
end;
$$;

revoke all on public.low_balance_config from anon, authenticated;
revoke all on public.low_balance_alerts from anon, authenticated;
grant select on public.low_balance_config to authenticated;
grant select on public.low_balance_alerts to authenticated;

revoke all on function public.admin_upsert_low_balance_config(numeric, boolean, boolean, boolean) from public, anon, authenticated;
grant execute on function public.admin_upsert_low_balance_config(numeric, boolean, boolean, boolean) to authenticated;
