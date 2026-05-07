-- FASE 10A - API Keys + API publica SMS Fortuna.
-- Raw API keys are never stored. Only SHA-256 hashes are persisted.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  scopes text[] not null default array['sms:send'],
  is_active boolean not null default true,
  last_used_at timestamptz null,
  expires_at timestamptz null,
  revoked_at timestamptz null,
  rate_limit_per_minute integer not null default 60,
  rate_limit_per_day integer not null default 1000,
  description text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint api_keys_name_check check (btrim(name) <> ''),
  constraint api_keys_key_prefix_check check (btrim(key_prefix) <> ''),
  constraint api_keys_key_hash_check check (btrim(key_hash) <> ''),
  constraint api_keys_rate_limit_minute_check check (rate_limit_per_minute > 0),
  constraint api_keys_rate_limit_day_check check (rate_limit_per_day > 0)
);

create index if not exists api_keys_user_created_idx
on public.api_keys(user_id, created_at desc);

create index if not exists api_keys_active_idx
on public.api_keys(is_active)
where is_active = true and revoked_at is null;

create table if not exists public.api_request_logs (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid references public.api_keys(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  endpoint text not null,
  status text not null,
  error_code text null,
  created_at timestamptz not null default now(),
  constraint api_request_logs_endpoint_check check (btrim(endpoint) <> ''),
  constraint api_request_logs_status_check check (btrim(status) <> '')
);

create index if not exists api_request_logs_key_created_idx
on public.api_request_logs(api_key_id, created_at desc);

create index if not exists api_request_logs_user_created_idx
on public.api_request_logs(user_id, created_at desc);

alter table public.api_keys enable row level security;
alter table public.api_request_logs enable row level security;

revoke all on public.api_keys from public, anon, authenticated;
revoke all on public.api_request_logs from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'api_keys'
      and policyname = 'api_keys_select_own'
  ) then
    create policy api_keys_select_own
    on public.api_keys
    for select
    to authenticated
    using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'api_keys'
      and policyname = 'api_keys_select_admin'
  ) then
    create policy api_keys_select_admin
    on public.api_keys
    for select
    to authenticated
    using (public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'api_request_logs'
      and policyname = 'api_request_logs_select_own'
  ) then
    create policy api_request_logs_select_own
    on public.api_request_logs
    for select
    to authenticated
    using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'api_request_logs'
      and policyname = 'api_request_logs_select_admin'
  ) then
    create policy api_request_logs_select_admin
    on public.api_request_logs
    for select
    to authenticated
    using (public.is_admin());
  end if;
end;
$$;

create or replace view public.api_keys_safe as
select
  k.id,
  k.user_id,
  k.name,
  k.key_prefix,
  k.scopes,
  k.is_active,
  k.last_used_at,
  k.expires_at,
  k.revoked_at,
  k.created_at,
  k.updated_at,
  k.rate_limit_per_minute,
  k.rate_limit_per_day,
  k.description
from public.api_keys k
where k.user_id = auth.uid();

create or replace view public.admin_api_keys_safe as
select
  k.id,
  k.user_id,
  p.email as client_email,
  p.full_name as client_name,
  p.razon_social as client_company,
  k.name,
  k.key_prefix,
  k.scopes,
  k.is_active,
  k.last_used_at,
  k.expires_at,
  k.revoked_at,
  k.created_at,
  k.updated_at,
  k.rate_limit_per_minute,
  k.rate_limit_per_day,
  k.description
from public.api_keys k
join public.profiles p on p.id = k.user_id
where public.is_admin();

revoke all on public.api_keys_safe from public, anon;
revoke all on public.admin_api_keys_safe from public, anon;
grant select on public.api_keys_safe to authenticated;
grant select on public.admin_api_keys_safe to authenticated;

create or replace function public.create_api_key(
  p_name text,
  p_scopes text[] default array['sms:send']
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
  v_scopes text[];
  v_raw_api_key text;
  v_key_hash text;
  v_key_prefix text;
  v_key public.api_keys%rowtype;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select *
    into v_profile
  from public.profiles
  where id = v_user_id;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if coalesce(v_profile.is_active, false) is not true then
    raise exception 'PROFILE_INACTIVE';
  end if;

  if v_name is null then
    raise exception 'API_KEY_NAME_REQUIRED';
  end if;

  if length(v_name) > 80 then
    raise exception 'API_KEY_NAME_TOO_LONG';
  end if;

  select coalesce(array_agg(distinct clean_scope), array['sms:send']::text[])
    into v_scopes
  from (
    select btrim(scope_value) as clean_scope
    from unnest(coalesce(p_scopes, array['sms:send']::text[])) as scope_value
    where btrim(scope_value) <> ''
  ) scoped;

  if coalesce(array_length(v_scopes, 1), 0) = 0 then
    v_scopes := array['sms:send']::text[];
  end if;

  if not (v_scopes <@ array['sms:send']::text[]) then
    raise exception 'INVALID_API_KEY_SCOPE';
  end if;

  loop
    v_raw_api_key := 'fs_live_' || encode(extensions.gen_random_bytes(32), 'hex');
    v_key_hash := encode(extensions.digest(v_raw_api_key, 'sha256'), 'hex');
    v_key_prefix := left(v_raw_api_key, 15);

    exit when not exists (
      select 1
      from public.api_keys
      where key_hash = v_key_hash
    );
  end loop;

  insert into public.api_keys (
    user_id,
    name,
    key_prefix,
    key_hash,
    scopes
  )
  values (
    v_user_id,
    v_name,
    v_key_prefix,
    v_key_hash,
    v_scopes
  )
  returning *
    into v_key;

  return jsonb_build_object(
    'id', v_key.id,
    'name', v_key.name,
    'key_prefix', v_key.key_prefix,
    'api_key', v_raw_api_key,
    'scopes', v_key.scopes,
    'is_active', v_key.is_active,
    'rate_limit_per_minute', v_key.rate_limit_per_minute,
    'rate_limit_per_day', v_key.rate_limit_per_day,
    'created_at', v_key.created_at
  );
end;
$$;

create or replace function public.revoke_api_key(p_key_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_key public.api_keys%rowtype;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHORIZED';
  end if;

  update public.api_keys
     set is_active = false,
         revoked_at = coalesce(revoked_at, now()),
         updated_at = now()
   where id = p_key_id
     and user_id = v_user_id
   returning *
      into v_key;

  if not found then
    raise exception 'API_KEY_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'success', true,
    'id', v_key.id,
    'revoked_at', v_key.revoked_at
  );
end;
$$;

create or replace function public.admin_revoke_api_key(p_key_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_key public.api_keys%rowtype;
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

  update public.api_keys
     set is_active = false,
         revoked_at = coalesce(revoked_at, now()),
         updated_at = now()
   where id = p_key_id
   returning *
      into v_key;

  if not found then
    raise exception 'API_KEY_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'success', true,
    'id', v_key.id,
    'user_id', v_key.user_id,
    'revoked_at', v_key.revoked_at
  );
end;
$$;

revoke all on function public.create_api_key(text, text[]) from public, anon;
revoke all on function public.revoke_api_key(uuid) from public, anon;
revoke all on function public.admin_revoke_api_key(uuid) from public, anon;

grant execute on function public.create_api_key(text, text[]) to authenticated;
grant execute on function public.revoke_api_key(uuid) to authenticated;
grant execute on function public.admin_revoke_api_key(uuid) to authenticated;
