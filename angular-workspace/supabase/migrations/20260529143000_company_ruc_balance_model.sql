-- Fase 03-A: company/RUC balance model.
-- Additive only. Do not run against remote without human review and backup.

create extension if not exists pgcrypto with schema extensions;

do $$
declare
  v_missing text[];
begin
  select array_agg(t)
    into v_missing
  from unnest(array[
    'profiles',
    'recharges',
    'sms_messages',
    'sms_send_attempts',
    'sms_packages',
    'admins'
  ]) as t
  where to_regclass('public.' || t) is null;

  if coalesce(array_length(v_missing, 1), 0) > 0 then
    raise exception 'COMPANY_RUC_PREFLIGHT_MISSING_BASE_TABLES: %', array_to_string(v_missing, ', ');
  end if;
end;
$$;

do $$
declare
  v_missing text[];
begin
  with required_columns(table_name, column_name) as (
    values
      ('profiles', 'id'),
      ('profiles', 'ruc'),
      ('profiles', 'razon_social'),
      ('profiles', 'credits'),
      ('profiles', 'updated_at'),
      ('recharges', 'id'),
      ('recharges', 'status'),
      ('recharges', 'approved_at'),
      ('recharges', 'updated_at'),
      ('sms_messages', 'id'),
      ('sms_messages', 'provider_response'),
      ('sms_messages', 'sent_at'),
      ('sms_send_attempts', 'id'),
      ('sms_send_attempts', 'idempotency_key'),
      ('sms_packages', 'id'),
      ('sms_packages', 'total_price'),
      ('sms_packages', 'sms_credits'),
      ('admins', 'id'),
      ('admins', 'is_active')
  )
  select array_agg(format('public.%I.%I', rc.table_name, rc.column_name) order by rc.table_name, rc.column_name)
    into v_missing
  from required_columns rc
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = rc.table_name
      and c.column_name = rc.column_name
  );

  if coalesce(array_length(v_missing, 1), 0) > 0 then
    raise exception 'COMPANY_RUC_PREFLIGHT_MISSING_COLUMNS: %', array_to_string(v_missing, ', ');
  end if;
end;
$$;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  ruc text not null,
  razon_social text,
  status text not null default 'active',
  is_active boolean not null default true,
  starter_bonus_granted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companies_ruc_unique unique (ruc),
  constraint companies_ruc_check check (ruc ~ '^[0-9]{11}$'),
  constraint companies_status_check check (status in ('active', 'inactive', 'blocked'))
);

create table if not exists public.company_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint company_users_role_check check (role in ('owner', 'admin', 'member')),
  constraint company_users_company_user_unique unique (company_id, user_id)
);

create table if not exists public.company_balance_transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  type text not null,
  sms_delta integer not null,
  balance_after integer not null,
  amount_money numeric(12,2),
  unit_price numeric(10,4) not null default 0.08,
  reference_table text,
  reference_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint company_balance_type_check check (
    type in (
      'starter_bonus',
      'admin_recharge',
      'client_recharge',
      'sms_send',
      'sms_refund',
      'legacy_migration',
      'adjustment'
    )
  ),
  constraint company_balance_after_check check (balance_after >= 0),
  constraint company_balance_unit_price_check check (unit_price >= 0)
);

create table if not exists public.provider_balance_transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  sms_delta integer not null,
  external_code text,
  external_message text,
  external_response_sanitized jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint provider_balance_type_check check (
    type in ('provider_recharge', 'provider_adjustment', 'provider_sync')
  )
);

create table if not exists public.provider_balance_snapshots (
  id uuid primary key default gen_random_uuid(),
  external_balance integer,
  external_response_sanitized jsonb not null default '{}'::jsonb,
  checked_by uuid references public.profiles(id) on delete set null,
  checked_at timestamptz not null default now(),
  constraint provider_balance_nonnegative_check check (external_balance is null or external_balance >= 0)
);

alter table public.profiles
  add column if not exists company_id uuid references public.companies(id) on delete set null;

alter table public.recharges
  add column if not exists company_id uuid references public.companies(id) on delete set null,
  add column if not exists requested_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists external_sync_status text not null default 'not_synced',
  add column if not exists external_response_sanitized jsonb not null default '{}'::jsonb;

alter table public.sms_messages
  add column if not exists company_id uuid references public.companies(id) on delete set null,
  add column if not exists ruc text,
  add column if not exists provider_response_sanitized jsonb not null default '{}'::jsonb,
  add column if not exists provider_message_id text;

alter table public.sms_send_attempts
  add column if not exists company_id uuid references public.companies(id) on delete set null,
  add column if not exists ruc text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'recharges_external_sync_status_check'
      and conrelid = 'public.recharges'::regclass
  ) then
    alter table public.recharges
      add constraint recharges_external_sync_status_check
      check (external_sync_status in ('not_synced', 'pending', 'synced', 'failed'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'sms_messages_ruc_check'
      and conrelid = 'public.sms_messages'::regclass
  ) then
    alter table public.sms_messages
      add constraint sms_messages_ruc_check
      check (ruc is null or ruc ~ '^[0-9]{11}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'sms_send_attempts_ruc_check'
      and conrelid = 'public.sms_send_attempts'::regclass
  ) then
    alter table public.sms_send_attempts
      add constraint sms_send_attempts_ruc_check
      check (ruc is null or ruc ~ '^[0-9]{11}$');
  end if;
end;
$$;

create index if not exists companies_ruc_idx on public.companies (ruc);
create index if not exists companies_active_idx on public.companies (is_active, status);
create index if not exists company_users_user_id_idx on public.company_users (user_id);
create index if not exists company_users_company_id_idx on public.company_users (company_id);
create index if not exists profiles_company_id_idx on public.profiles (company_id);
create index if not exists recharges_company_created_idx on public.recharges (company_id, created_at desc);
create index if not exists sms_messages_company_created_idx on public.sms_messages (company_id, created_at desc);
create index if not exists sms_messages_ruc_created_idx on public.sms_messages (ruc, created_at desc);
create index if not exists sms_send_attempts_company_created_idx on public.sms_send_attempts (company_id, created_at desc);
create unique index if not exists sms_send_attempts_company_idempotency_key_unique
  on public.sms_send_attempts (company_id, idempotency_key)
  where company_id is not null;
create index if not exists company_balance_transactions_company_created_idx
  on public.company_balance_transactions (company_id, created_at desc);
create index if not exists provider_balance_transactions_created_idx
  on public.provider_balance_transactions (created_at desc);
create index if not exists provider_balance_snapshots_checked_at_idx
  on public.provider_balance_snapshots (checked_at desc);

alter table public.companies enable row level security;
alter table public.company_users enable row level security;
alter table public.company_balance_transactions enable row level security;
alter table public.provider_balance_transactions enable row level security;
alter table public.provider_balance_snapshots enable row level security;

revoke all on public.companies from public, anon, authenticated;
revoke all on public.company_users from public, anon, authenticated;
revoke all on public.company_balance_transactions from public, anon, authenticated;
revoke all on public.provider_balance_transactions from public, anon, authenticated;
revoke all on public.provider_balance_snapshots from public, anon, authenticated;

grant select on public.companies to authenticated;
grant select on public.company_users to authenticated;
grant select on public.company_balance_transactions to authenticated;
grant select on public.provider_balance_transactions to authenticated;
grant select on public.provider_balance_snapshots to authenticated;

create or replace function public.internal_is_admin_actor(p_actor_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_actor_user_id is null then
    return false;
  end if;

  return exists (
    select 1
    from public.admins a
    where a.user_id = p_actor_user_id
      and a.is_active = true
  );
end;
$$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'companies' and policyname = 'companies_select_member_or_admin') then
    create policy companies_select_member_or_admin
      on public.companies
      for select
      to authenticated
      using (
        public.internal_is_admin_actor(auth.uid())
        or exists (
          select 1
          from public.company_users cu
          where cu.company_id = companies.id
            and cu.user_id = auth.uid()
            and cu.is_active = true
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'company_users' and policyname = 'company_users_select_self_or_admin') then
    create policy company_users_select_self_or_admin
      on public.company_users
      for select
      to authenticated
      using (public.internal_is_admin_actor(auth.uid()) or user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'company_balance_transactions' and policyname = 'company_balance_select_member_or_admin') then
    create policy company_balance_select_member_or_admin
      on public.company_balance_transactions
      for select
      to authenticated
      using (
        public.internal_is_admin_actor(auth.uid())
        or exists (
          select 1
          from public.company_users cu
          where cu.company_id = company_balance_transactions.company_id
            and cu.user_id = auth.uid()
            and cu.is_active = true
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'provider_balance_transactions' and policyname = 'provider_balance_select_admin') then
    create policy provider_balance_select_admin
      on public.provider_balance_transactions
      for select
      to authenticated
      using (public.internal_is_admin_actor(auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'provider_balance_snapshots' and policyname = 'provider_snapshots_select_admin') then
    create policy provider_snapshots_select_admin
      on public.provider_balance_snapshots
      for select
      to authenticated
      using (public.internal_is_admin_actor(auth.uid()));
  end if;
end;
$$;

create or replace function public.calculate_sms_segments(p_message text)
returns integer
language sql
immutable
as $$
  select greatest(1, ceil(char_length(coalesce(p_message, ''))::numeric / 160)::integer);
$$;

create or replace function public.internal_sanitize_provider_response(p_value jsonb)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_key text;
  v_item jsonb;
  v_result jsonb := '{}'::jsonb;
begin
  if p_value is null then
    return '{}'::jsonb;
  end if;

  if jsonb_typeof(p_value) = 'array' then
    select coalesce(jsonb_agg(public.internal_sanitize_provider_response(value)), '[]'::jsonb)
      into v_result
    from jsonb_array_elements(p_value);
    return v_result;
  end if;

  if jsonb_typeof(p_value) <> 'object' then
    return p_value;
  end if;

  for v_key, v_item in
    select key, value from jsonb_each(p_value)
  loop
    if lower(v_key) in (
      'authorization',
      'token',
      'bearer',
      'password',
      'apikey',
      'api_key',
      'x-api-key',
      'service_role',
      'access_token',
      'refresh_token',
      'secret'
    )
    or lower(v_key) like '%token%'
    or lower(v_key) like '%password%'
    or lower(v_key) like '%secret%' then
      v_result := v_result || jsonb_build_object(v_key, '[redacted]');
    else
      v_result := v_result || jsonb_build_object(v_key, public.internal_sanitize_provider_response(v_item));
    end if;
  end loop;

  return v_result;
end;
$$;

create or replace function public.internal_company_balance(p_company_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce((
    select cbt.balance_after
    from public.company_balance_transactions cbt
    where cbt.company_id = p_company_id
    order by cbt.created_at desc, cbt.id desc
    limit 1
  ), 0);
$$;

create or replace function public.internal_sync_company_legacy_credits(p_company_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  v_balance := public.internal_company_balance(p_company_id);

  update public.profiles p
     set credits = v_balance,
         updated_at = now()
   where p.company_id = p_company_id
      or exists (
        select 1
        from public.company_users cu
        where cu.company_id = p_company_id
          and cu.user_id = p.id
      );
end;
$$;

create or replace function public.internal_get_user_company(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company public.companies%rowtype;
  v_company_id uuid;
  v_role text;
begin
  if p_user_id is null then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select p.company_id
    into v_company_id
  from public.profiles p
  where p.id = p_user_id;

  if v_company_id is null then
    select cu.company_id, cu.role
      into v_company_id, v_role
    from public.company_users cu
    where cu.user_id = p_user_id
      and cu.is_active = true
    order by case cu.role when 'owner' then 1 when 'admin' then 2 else 3 end, cu.created_at
    limit 1;
  end if;

  if v_company_id is null then
    raise exception 'COMPANY_NOT_FOUND';
  end if;

  select *
    into v_company
  from public.companies c
  where c.id = v_company_id
    and c.is_active = true
    and c.status = 'active';

  if not found then
    raise exception 'COMPANY_INACTIVE';
  end if;

  if v_role is null then
    select cu.role
      into v_role
    from public.company_users cu
    where cu.company_id = v_company.id
      and cu.user_id = p_user_id
      and cu.is_active = true
    limit 1;
  end if;

  return jsonb_build_object(
    'company_id', v_company.id,
    'ruc', v_company.ruc,
    'razon_social', v_company.razon_social,
    'role', coalesce(v_role, 'member'),
    'balance', public.internal_company_balance(v_company.id),
    'starter_bonus_granted_at', v_company.starter_bonus_granted_at
  );
end;
$$;

create or replace function public.internal_grant_starter_bonus_for_company(
  p_company_id uuid,
  p_created_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company public.companies%rowtype;
  v_balance integer;
  v_new_balance integer;
begin
  if p_company_id is null then
    raise exception 'COMPANY_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_company_id::text), 1001);

  select *
    into v_company
  from public.companies
  where id = p_company_id
  for update;

  if not found then
    raise exception 'COMPANY_NOT_FOUND';
  end if;

  if v_company.starter_bonus_granted_at is not null then
    return jsonb_build_object(
      'success', true,
      'already_granted', true,
      'company_id', v_company.id,
      'ruc', v_company.ruc,
      'balance', public.internal_company_balance(v_company.id)
    );
  end if;

  v_balance := public.internal_company_balance(v_company.id);
  v_new_balance := v_balance + 10;

  insert into public.company_balance_transactions (
    company_id,
    type,
    sms_delta,
    balance_after,
    amount_money,
    unit_price,
    reference_table,
    metadata,
    created_by
  )
  values (
    v_company.id,
    'starter_bonus',
    10,
    v_new_balance,
    0.80,
    0.08,
    'companies',
    jsonb_build_object('reason', 'starter_bonus_10_sms_once_per_ruc'),
    p_created_by
  );

  update public.companies
     set starter_bonus_granted_at = now(),
         updated_at = now()
   where id = v_company.id;

  perform public.internal_sync_company_legacy_credits(v_company.id);

  return jsonb_build_object(
    'success', true,
    'already_granted', false,
    'company_id', v_company.id,
    'ruc', v_company.ruc,
    'balance', v_new_balance
  );
end;
$$;

create or replace function public.internal_attach_profile_to_company_from_ruc(
  p_user_id uuid,
  p_ruc text,
  p_razon_social text default null,
  p_role text default 'owner',
  p_grant_starter_bonus boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ruc text := regexp_replace(btrim(coalesce(p_ruc, '')), '\D', '', 'g');
  v_razon_social text := nullif(btrim(coalesce(p_razon_social, '')), '');
  v_company_id uuid;
  v_bonus jsonb := '{}'::jsonb;
begin
  if p_user_id is null then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if v_ruc !~ '^[0-9]{11}$' then
    return jsonb_build_object('success', false, 'error', 'INVALID_RUC');
  end if;

  if p_role not in ('owner', 'admin', 'member') then
    raise exception 'INVALID_COMPANY_ROLE';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_ruc), 4001);

  insert into public.companies (
    ruc,
    razon_social,
    status,
    is_active,
    created_at,
    updated_at
  )
  values (
    v_ruc,
    v_razon_social,
    'active',
    true,
    now(),
    now()
  )
  on conflict (ruc) do update
     set razon_social = coalesce(companies.razon_social, excluded.razon_social),
         updated_at = now()
  returning id into v_company_id;

  insert into public.company_users (
    company_id,
    user_id,
    role,
    is_active,
    created_at
  )
  values (
    v_company_id,
    p_user_id,
    p_role,
    true,
    now()
  )
  on conflict (company_id, user_id) do update
     set is_active = true,
         role = case
           when company_users.role = 'owner' then company_users.role
           else excluded.role
         end;

  update public.profiles p
     set company_id = v_company_id,
         ruc = v_ruc,
         razon_social = coalesce(p.razon_social, v_razon_social),
         updated_at = now()
   where id = p_user_id;

  if p_grant_starter_bonus then
    v_bonus := public.internal_grant_starter_bonus_for_company(v_company_id, p_user_id);
  end if;

  return jsonb_build_object(
    'success', true,
    'company_id', v_company_id,
    'ruc', v_ruc,
    'starter_bonus', v_bonus
  );
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ruc text := nullif(new.raw_user_meta_data ->> 'ruc', '');
  v_razon_social text := nullif(coalesce(new.raw_user_meta_data ->> 'razon_social', new.raw_user_meta_data ->> 'company_name'), '');
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    razon_social,
    ruc,
    phone,
    is_active,
    credits,
    total_spent,
    created_at,
    updated_at
  )
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    v_razon_social,
    v_ruc,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    true,
    0,
    0,
    now(),
    now()
  )
  on conflict (id) do update
     set email = coalesce(profiles.email, excluded.email),
         full_name = coalesce(profiles.full_name, excluded.full_name),
         razon_social = coalesce(profiles.razon_social, excluded.razon_social),
         ruc = coalesce(profiles.ruc, excluded.ruc),
         phone = coalesce(profiles.phone, excluded.phone),
         updated_at = now();

  if regexp_replace(btrim(coalesce(v_ruc, '')), '\D', '', 'g') ~ '^[0-9]{11}$' then
    perform public.internal_attach_profile_to_company_from_ruc(
      new.id,
      v_ruc,
      v_razon_social,
      'owner',
      true
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.internal_begin_company_sms_send_attempt(
  p_user_id uuid,
  p_idempotency_key text,
  p_recipient text,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_data jsonb;
  v_company public.companies%rowtype;
  v_existing public.sms_send_attempts%rowtype;
  v_message_row public.sms_messages%rowtype;
  v_attempt_id uuid;
  v_key text;
  v_message text;
  v_phone text;
  v_recipient text;
  v_provider_recipient text;
  v_segments integer;
  v_cost numeric(10,4);
  v_balance integer;
  v_reserved_segments integer;
  v_recent_attempts integer;
  v_message_hash text;
begin
  if p_user_id is null then
    raise exception 'NOT_AUTHORIZED';
  end if;

  v_key := btrim(coalesce(p_idempotency_key, ''));
  if v_key = '' or v_key !~ '^[A-Za-z0-9_.-]{8,120}$' then
    raise exception 'INVALID_IDEMPOTENCY_KEY';
  end if;

  v_message := btrim(coalesce(p_message, ''));
  if v_message = '' then
    raise exception 'EMPTY_MESSAGE';
  end if;

  v_phone := regexp_replace(btrim(coalesce(p_recipient, '')), '\s+', '', 'g');
  if v_phone ~ '^\+51[0-9]{9}$' then
    v_recipient := v_phone;
  elsif v_phone ~ '^51[0-9]{9}$' then
    v_recipient := '+' || v_phone;
  elsif v_phone ~ '^9[0-9]{8}$' then
    v_recipient := '+51' || v_phone;
  else
    raise exception 'INVALID_PHONE';
  end if;

  v_company_data := public.internal_get_user_company(p_user_id);

  select *
    into v_company
  from public.companies c
  where c.id = (v_company_data ->> 'company_id')::uuid
  for update;

  if not found then
    raise exception 'COMPANY_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_company.id::text), 2001);

  select *
    into v_existing
  from public.sms_send_attempts
  where company_id = v_company.id
    and idempotency_key = v_key;

  if found then
    if v_existing.status = 'sent' then
      if v_existing.sms_message_id is not null then
        select *
          into v_message_row
        from public.sms_messages
        where id = v_existing.sms_message_id;
      end if;

      return jsonb_build_object(
        'success', true,
        'already_processed', true,
        'attempt_id', v_existing.id,
        'message_id', v_existing.sms_message_id,
        'company_id', v_company.id,
        'ruc', v_company.ruc,
        'recipient', coalesce(v_message_row.recipient, v_existing.recipient),
        'provider_recipient', v_existing.provider_recipient,
        'segments', coalesce(v_message_row.segments, v_existing.segments),
        'cost', coalesce(v_message_row.cost, v_existing.cost),
        'status', 'sent'
      );
    end if;

    if v_existing.status = 'processing' and v_existing.expires_at > now() then
      raise exception 'SMS_SEND_ALREADY_PROCESSING';
    end if;

    raise exception 'SMS_SEND_ALREADY_FAILED_USE_NEW_KEY';
  end if;

  v_segments := public.calculate_sms_segments(v_message);
  v_cost := round((v_segments * 0.08)::numeric, 4);

  select coalesce(sum(a.segments), 0)
    into v_reserved_segments
  from public.sms_send_attempts a
  where a.company_id = v_company.id
    and a.status = 'processing'
    and a.expires_at > now();

  v_balance := public.internal_company_balance(v_company.id);
  if v_balance - coalesce(v_reserved_segments, 0) < v_segments then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  select count(*)
    into v_recent_attempts
  from public.sms_send_attempts a
  where a.company_id = v_company.id
    and a.status in ('processing', 'sent')
    and a.created_at >= now() - interval '60 seconds';

  if v_recent_attempts >= 30 then
    raise exception 'RATE_LIMIT_EXCEEDED';
  end if;

  v_provider_recipient := replace(v_recipient, '+', '');
  v_message_hash := encode(extensions.digest(v_message, 'sha256'), 'hex');

  insert into public.sms_send_attempts (
    user_id,
    company_id,
    ruc,
    idempotency_key,
    recipient,
    provider_recipient,
    message,
    message_hash,
    segments,
    cost,
    status
  )
  values (
    p_user_id,
    v_company.id,
    v_company.ruc,
    v_key,
    v_recipient,
    v_provider_recipient,
    v_message,
    v_message_hash,
    v_segments,
    v_cost,
    'processing'
  )
  returning id into v_attempt_id;

  return jsonb_build_object(
    'success', true,
    'attempt_id', v_attempt_id,
    'company_id', v_company.id,
    'ruc', v_company.ruc,
    'recipient', v_recipient,
    'provider_recipient', v_provider_recipient,
    'segments', v_segments,
    'cost', v_cost,
    'balance_before', v_balance,
    'reserved_segments', coalesce(v_reserved_segments, 0)
  );
exception
  when unique_violation then
    raise exception 'SMS_SEND_ALREADY_PROCESSING';
end;
$$;

create or replace function public.internal_complete_company_sms_send_success(
  p_attempt_id uuid,
  p_provider text,
  p_provider_message_id text,
  p_provider_response jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.sms_send_attempts%rowtype;
  v_existing_message public.sms_messages%rowtype;
  v_company public.companies%rowtype;
  v_message_id uuid;
  v_provider text;
  v_provider_response jsonb;
  v_balance integer;
  v_new_balance integer;
begin
  select *
    into v_attempt
  from public.sms_send_attempts
  where id = p_attempt_id
  for update;

  if not found then
    raise exception 'SMS_SEND_ATTEMPT_NOT_FOUND';
  end if;

  if v_attempt.status = 'sent' then
    if v_attempt.sms_message_id is not null then
      select *
        into v_existing_message
      from public.sms_messages
      where id = v_attempt.sms_message_id;
    end if;

    return jsonb_build_object(
      'success', true,
      'already_processed', true,
      'message_id', v_attempt.sms_message_id,
      'recipient', coalesce(v_existing_message.recipient, v_attempt.recipient),
      'segments', coalesce(v_existing_message.segments, v_attempt.segments),
      'cost', coalesce(v_existing_message.cost, v_attempt.cost),
      'status', 'sent'
    );
  end if;

  if v_attempt.status <> 'processing' then
    raise exception 'SMS_SEND_ALREADY_FAILED_USE_NEW_KEY';
  end if;

  if v_attempt.company_id is null or v_attempt.ruc is null then
    raise exception 'COMPANY_NOT_FOUND';
  end if;

  select *
    into v_company
  from public.companies
  where id = v_attempt.company_id
  for update;

  if not found then
    raise exception 'COMPANY_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_company.id::text), 2002);

  v_balance := public.internal_company_balance(v_company.id);
  if v_balance < v_attempt.segments then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  v_new_balance := v_balance - v_attempt.segments;
  v_provider := coalesce(nullif(btrim(coalesce(p_provider, '')), ''), 'fortuna_services');
  v_provider_response := public.internal_sanitize_provider_response(
    coalesce(p_provider_response, '{}'::jsonb)
    || jsonb_build_object('provider', v_provider, 'attempt_id', v_attempt.id)
  );

  insert into public.company_balance_transactions (
    company_id,
    type,
    sms_delta,
    balance_after,
    amount_money,
    unit_price,
    reference_table,
    reference_id,
    metadata,
    created_by
  )
  values (
    v_company.id,
    'sms_send',
    -v_attempt.segments,
    v_new_balance,
    round((v_attempt.segments * 0.08)::numeric, 2),
    0.08,
    'sms_send_attempts',
    v_attempt.id,
    jsonb_build_object('ruc', v_company.ruc, 'recipient', v_attempt.recipient),
    v_attempt.user_id
  );

  insert into public.sms_messages (
    user_id,
    company_id,
    ruc,
    recipient,
    message,
    segments,
    cost,
    status,
    provider_message_id,
    provider_response,
    provider_response_sanitized,
    sent_at
  )
  values (
    v_attempt.user_id,
    v_company.id,
    v_company.ruc,
    v_attempt.recipient,
    v_attempt.message,
    v_attempt.segments,
    v_attempt.cost,
    'sent',
    nullif(btrim(coalesce(p_provider_message_id, '')), ''),
    v_provider_response,
    v_provider_response,
    now()
  )
  returning id into v_message_id;

  update public.sms_send_attempts
     set status = 'sent',
         sms_message_id = v_message_id,
         provider = v_provider,
         provider_response = v_provider_response,
         completed_at = now(),
         updated_at = now()
   where id = v_attempt.id;

  perform public.internal_sync_company_legacy_credits(v_company.id);

  return jsonb_build_object(
    'success', true,
    'message_id', v_message_id,
    'company_id', v_company.id,
    'ruc', v_company.ruc,
    'recipient', v_attempt.recipient,
    'segments', v_attempt.segments,
    'cost', v_attempt.cost,
    'balance_after', v_new_balance,
    'status', 'sent'
  );
end;
$$;

create or replace function public.internal_complete_company_sms_send_failed(
  p_attempt_id uuid,
  p_provider text,
  p_provider_response jsonb,
  p_error_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.sms_send_attempts%rowtype;
  v_existing_message public.sms_messages%rowtype;
  v_message_id uuid;
  v_provider text;
  v_error_message text;
  v_provider_response jsonb;
begin
  select *
    into v_attempt
  from public.sms_send_attempts
  where id = p_attempt_id
  for update;

  if not found then
    raise exception 'SMS_SEND_ATTEMPT_NOT_FOUND';
  end if;

  if v_attempt.status = 'sent' then
    if v_attempt.sms_message_id is not null then
      select *
        into v_existing_message
      from public.sms_messages
      where id = v_attempt.sms_message_id;
    end if;

    return jsonb_build_object(
      'success', true,
      'already_processed', true,
      'message_id', v_attempt.sms_message_id,
      'recipient', coalesce(v_existing_message.recipient, v_attempt.recipient),
      'segments', coalesce(v_existing_message.segments, v_attempt.segments),
      'cost', coalesce(v_existing_message.cost, v_attempt.cost),
      'status', 'sent'
    );
  end if;

  if v_attempt.status = 'failed' then
    return jsonb_build_object(
      'success', false,
      'message_id', v_attempt.sms_message_id,
      'status', 'failed',
      'error_message', coalesce(v_attempt.error_message, p_error_message)
    );
  end if;

  v_provider := coalesce(nullif(btrim(coalesce(p_provider, '')), ''), 'fortuna_services');
  v_error_message := nullif(btrim(coalesce(p_error_message, '')), '');
  v_provider_response := public.internal_sanitize_provider_response(
    coalesce(p_provider_response, '{}'::jsonb)
    || jsonb_build_object('provider', v_provider, 'attempt_id', v_attempt.id)
  );

  insert into public.sms_messages (
    user_id,
    company_id,
    ruc,
    recipient,
    message,
    segments,
    cost,
    status,
    provider_response,
    provider_response_sanitized,
    error_message
  )
  values (
    v_attempt.user_id,
    v_attempt.company_id,
    v_attempt.ruc,
    v_attempt.recipient,
    v_attempt.message,
    v_attempt.segments,
    v_attempt.cost,
    'failed',
    v_provider_response,
    v_provider_response,
    v_error_message
  )
  returning id into v_message_id;

  update public.sms_send_attempts
     set status = 'failed',
         sms_message_id = v_message_id,
         provider = v_provider,
         provider_response = v_provider_response,
         error_message = v_error_message,
         completed_at = now(),
         updated_at = now()
   where id = v_attempt.id;

  return jsonb_build_object(
    'success', false,
    'message_id', v_message_id,
    'status', 'failed',
    'error_message', v_error_message
  );
end;
$$;

create or replace function public.admin_register_provider_balance_local(
  p_actor_user_id uuid,
  p_sms_delta integer,
  p_external_code text default null,
  p_external_message text default null,
  p_external_response jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.internal_is_admin_actor(p_actor_user_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if coalesce(p_sms_delta, 0) <= 0 then
    raise exception 'INVALID_PROVIDER_RECHARGE';
  end if;

  insert into public.provider_balance_transactions (
    type,
    sms_delta,
    external_code,
    external_message,
    external_response_sanitized,
    created_by
  )
  values (
    'provider_recharge',
    p_sms_delta,
    nullif(btrim(coalesce(p_external_code, '')), ''),
    nullif(btrim(coalesce(p_external_message, '')), ''),
    public.internal_sanitize_provider_response(coalesce(p_external_response, '{}'::jsonb)),
    p_actor_user_id
  )
  returning id into v_id;

  return jsonb_build_object('success', true, 'transaction_id', v_id);
end;
$$;

create or replace function public.admin_save_provider_balance_snapshot(
  p_actor_user_id uuid,
  p_external_balance integer,
  p_external_response jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.internal_is_admin_actor(p_actor_user_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if p_external_balance is null then
    raise exception 'PROVIDER_BALANCE_UNKNOWN';
  end if;

  if p_external_balance < 0 then
    raise exception 'INVALID_PROVIDER_BALANCE';
  end if;

  insert into public.provider_balance_snapshots (
    external_balance,
    external_response_sanitized,
    checked_by
  )
  values (
    p_external_balance,
    public.internal_sanitize_provider_response(coalesce(p_external_response, '{}'::jsonb)),
    p_actor_user_id
  )
  returning id into v_id;

  return jsonb_build_object('success', true, 'snapshot_id', v_id, 'external_balance', p_external_balance);
end;
$$;

create or replace function public.admin_register_company_recharge(
  p_actor_user_id uuid,
  p_company_id uuid,
  p_package_id uuid,
  p_payment_method text,
  p_operation_code text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company public.companies%rowtype;
  v_package public.sms_packages%rowtype;
  v_recharge_id uuid;
  v_requested_by uuid;
  v_payment_method text := lower(nullif(btrim(coalesce(p_payment_method, '')), ''));
  v_operation_code text := nullif(btrim(coalesce(p_operation_code, '')), '');
begin
  if not public.internal_is_admin_actor(p_actor_user_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if p_company_id is null then
    raise exception 'COMPANY_NOT_FOUND';
  end if;

  if p_package_id is null then
    raise exception 'PACKAGE_NOT_FOUND';
  end if;

  if v_payment_method not in ('yape', 'plin', 'transferencia', 'efectivo', 'otro') then
    raise exception 'INVALID_PAYMENT_METHOD';
  end if;

  if v_operation_code is null then
    raise exception 'OPERATION_CODE_REQUIRED';
  end if;

  if exists (select 1 from public.recharges r where r.operation_code = v_operation_code) then
    raise exception 'OPERATION_CODE_ALREADY_EXISTS';
  end if;

  select *
    into v_company
  from public.companies
  where id = p_company_id
    and is_active = true
    and status = 'active';

  if not found then
    raise exception 'COMPANY_NOT_FOUND';
  end if;

  select *
    into v_package
  from public.sms_packages
  where id = p_package_id
    and coalesce(is_active, false) = true;

  if not found then
    raise exception 'PACKAGE_NOT_FOUND';
  end if;

  if coalesce(v_package.sms_credits, 0) <= 0 or coalesce(v_package.total_price, 0) < 0 then
    raise exception 'INVALID_PACKAGE_VALUES';
  end if;

  select cu.user_id
    into v_requested_by
  from public.company_users cu
  where cu.company_id = v_company.id
    and cu.is_active = true
  order by case cu.role when 'owner' then 1 when 'admin' then 2 else 3 end, cu.created_at
  limit 1;

  if v_requested_by is null then
    select p.id
      into v_requested_by
    from public.profiles p
    where p.company_id = v_company.id
    limit 1;
  end if;

  if v_requested_by is null then
    raise exception 'COMPANY_USER_NOT_FOUND';
  end if;

  insert into public.recharges (
    user_id,
    package_id,
    sms_credits,
    amount,
    payment_method,
    operation_code,
    status,
    company_id,
    requested_by_user_id,
    external_sync_status,
    external_response_sanitized,
    created_at
  )
  values (
    v_requested_by,
    p_package_id,
    v_package.sms_credits,
    v_package.total_price,
    v_payment_method,
    v_operation_code,
    'pending',
    v_company.id,
    p_actor_user_id,
    'pending',
    jsonb_build_object('provider_sync', 'not_started'),
    now()
  )
  returning id into v_recharge_id;

  return jsonb_build_object(
    'success', true,
    'recharge_id', v_recharge_id,
    'company_id', v_company.id,
    'ruc', v_company.ruc,
    'sms_credits', v_package.sms_credits,
    'amount_money', v_package.total_price
  );
end;
$$;

create or replace function public.admin_complete_company_recharge_external_sync(
  p_actor_user_id uuid,
  p_recharge_id uuid,
  p_external_response jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recharge public.recharges%rowtype;
  v_company public.companies%rowtype;
  v_sms_delta integer;
  v_balance integer;
  v_new_balance integer;
  v_safe_response jsonb;
begin
  if not public.internal_is_admin_actor(p_actor_user_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select *
    into v_recharge
  from public.recharges
  where id = p_recharge_id
  for update;

  if not found then
    raise exception 'RECHARGE_NOT_FOUND';
  end if;

  if v_recharge.company_id is null then
    raise exception 'COMPANY_NOT_FOUND';
  end if;

  select *
    into v_company
  from public.companies
  where id = v_recharge.company_id
  for update;

  if not found then
    raise exception 'COMPANY_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_company.id::text), 3001);

  if v_recharge.external_sync_status = 'synced' then
    return jsonb_build_object(
      'success', true,
      'already_synced', true,
      'recharge_id', v_recharge.id,
      'balance_after', public.internal_company_balance(v_company.id)
    );
  end if;

  v_sms_delta := coalesce(v_recharge.sms_credits, 0)::integer;
  if v_sms_delta <= 0 then
    raise exception 'INVALID_RECHARGE_CREDITS';
  end if;

  v_balance := public.internal_company_balance(v_company.id);
  v_new_balance := v_balance + v_sms_delta;
  v_safe_response := public.internal_sanitize_provider_response(coalesce(p_external_response, '{}'::jsonb));

  update public.recharges
     set external_sync_status = 'synced',
         external_response_sanitized = v_safe_response,
         status = 'approved',
         approved_at = coalesce(approved_at, now()),
         updated_at = now()
   where id = v_recharge.id;

  insert into public.company_balance_transactions (
    company_id,
    type,
    sms_delta,
    balance_after,
    amount_money,
    unit_price,
    reference_table,
    reference_id,
    metadata,
    created_by
  )
  values (
    v_company.id,
    'client_recharge',
    v_sms_delta,
    v_new_balance,
    v_recharge.amount,
    0.08,
    'recharges',
    v_recharge.id,
    jsonb_build_object('ruc', v_company.ruc, 'external_sync_status', 'synced'),
    p_actor_user_id
  );

  perform public.internal_sync_company_legacy_credits(v_company.id);

  return jsonb_build_object(
    'success', true,
    'already_synced', false,
    'recharge_id', v_recharge.id,
    'company_id', v_company.id,
    'ruc', v_company.ruc,
    'sms_delta', v_sms_delta,
    'balance_after', v_new_balance
  );
end;
$$;

create or replace function public.admin_fail_company_recharge_external_sync(
  p_actor_user_id uuid,
  p_recharge_id uuid,
  p_external_response jsonb default '{}'::jsonb,
  p_error_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_safe_response jsonb;
begin
  if not public.internal_is_admin_actor(p_actor_user_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if not exists (select 1 from public.recharges where id = p_recharge_id) then
    raise exception 'RECHARGE_NOT_FOUND';
  end if;

  v_safe_response := public.internal_sanitize_provider_response(
    coalesce(p_external_response, '{}'::jsonb)
    || jsonb_build_object('error_message', nullif(btrim(coalesce(p_error_message, '')), ''))
  );

  update public.recharges
     set external_sync_status = 'failed',
         external_response_sanitized = v_safe_response,
         updated_at = now()
   where id = p_recharge_id;

  return jsonb_build_object('success', false, 'recharge_id', p_recharge_id, 'external_sync_status', 'failed');
end;
$$;

revoke all on function public.internal_is_admin_actor(uuid) from public, anon, authenticated;
revoke all on function public.internal_sanitize_provider_response(jsonb) from public, anon, authenticated;
revoke all on function public.internal_company_balance(uuid) from public, anon, authenticated;
revoke all on function public.internal_sync_company_legacy_credits(uuid) from public, anon, authenticated;
revoke all on function public.internal_get_user_company(uuid) from public, anon, authenticated;
revoke all on function public.internal_grant_starter_bonus_for_company(uuid, uuid) from public, anon, authenticated;
revoke all on function public.internal_attach_profile_to_company_from_ruc(uuid, text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.internal_begin_company_sms_send_attempt(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.internal_complete_company_sms_send_success(uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.internal_complete_company_sms_send_failed(uuid, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.admin_register_provider_balance_local(uuid, integer, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.admin_save_provider_balance_snapshot(uuid, integer, jsonb) from public, anon, authenticated;
revoke all on function public.admin_register_company_recharge(uuid, uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.admin_complete_company_recharge_external_sync(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.admin_fail_company_recharge_external_sync(uuid, uuid, jsonb, text) from public, anon, authenticated;

grant execute on function public.internal_is_admin_actor(uuid) to authenticated, service_role;
grant execute on function public.internal_get_user_company(uuid) to authenticated, service_role;
grant execute on function public.internal_grant_starter_bonus_for_company(uuid, uuid) to service_role;
grant execute on function public.internal_attach_profile_to_company_from_ruc(uuid, text, text, text, boolean) to service_role;
grant execute on function public.internal_begin_company_sms_send_attempt(uuid, text, text, text) to service_role;
grant execute on function public.internal_complete_company_sms_send_success(uuid, text, text, jsonb) to service_role;
grant execute on function public.internal_complete_company_sms_send_failed(uuid, text, jsonb, text) to service_role;
grant execute on function public.admin_register_provider_balance_local(uuid, integer, text, text, jsonb) to service_role;
grant execute on function public.admin_save_provider_balance_snapshot(uuid, integer, jsonb) to service_role;
grant execute on function public.admin_register_company_recharge(uuid, uuid, uuid, text, text, text) to service_role;
grant execute on function public.admin_complete_company_recharge_external_sync(uuid, uuid, jsonb) to service_role;
grant execute on function public.admin_fail_company_recharge_external_sync(uuid, uuid, jsonb, text) to service_role;
