-- FASE 1B - Diagnostico Supabase limpio
-- SOLO SELECT. No crea, borra, actualiza ni modifica nada.

select
  'table_existence_core' as check_name,
  expected.table_name,
  to_regclass('public.' || expected.table_name) is not null as exists_in_public
from (
  values
    ('profiles'),
    ('admins'),
    ('sms_packages'),
    ('recharges'),
    ('sms_inventory'),
    ('inventory_purchases'),
    ('inventory_transactions'),
    ('sms_messages'),
    ('templates'),
    ('api_keys'),
    ('sms_provider_config')
) as expected(table_name)
order by expected.table_name;

select
  'table_existence_forbidden_users' as check_name,
  to_regclass('public.users') is not null as users_table_exists;

select
  'profiles_columns' as check_name,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name = 'profiles'
order by c.ordinal_position;

select
  'profiles_required_columns' as check_name,
  required.column_name,
  exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'profiles'
      and c.column_name = required.column_name
  ) as exists_in_profiles
from (
  values
    ('id'),
    ('email'),
    ('full_name'),
    ('razon_social'),
    ('ruc'),
    ('phone'),
    ('is_active'),
    ('credits'),
    ('total_spent'),
    ('created_at'),
    ('updated_at')
) as required(column_name)
order by required.column_name;

select
  'admins_columns' as check_name,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name = 'admins'
order by c.ordinal_position;

select
  'admins_required_columns' as check_name,
  required.column_name,
  exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'admins'
      and c.column_name = required.column_name
  ) as exists_in_admins
from (
  values
    ('id'),
    ('email'),
    ('full_name'),
    ('is_active'),
    ('created_at'),
    ('updated_at')
) as required(column_name)
order by required.column_name;

select
  'profiles_has_role' as check_name,
  exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'profiles'
      and c.column_name = 'role'
  ) as profiles_role_exists;

select
  'rls_enabled_profiles_admins' as check_name,
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles', 'admins')
order by c.relname;

select
  'profiles_policies' as check_name,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'profiles'
order by policyname;

select
  'admins_policies' as check_name,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'admins'
order by policyname;

select
  'foreign_keys_related_to_profiles' as check_name,
  tc.constraint_name,
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema as foreign_table_schema,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and (
    (tc.table_schema = 'public' and tc.table_name = 'profiles')
    or (ccu.table_schema = 'public' and ccu.table_name = 'profiles')
  )
order by tc.table_name, kcu.column_name, tc.constraint_name;

select
  'foreign_keys_related_to_users' as check_name,
  tc.constraint_name,
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema as foreign_table_schema,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and (
    (tc.table_schema = 'public' and tc.table_name = 'users')
    or (ccu.table_schema = 'public' and ccu.table_name = 'users')
  )
order by tc.table_name, kcu.column_name, tc.constraint_name;

select
  'functions_using_profiles_role' as check_name,
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (
    p.prosrc ilike '%profiles.role%'
    or p.prosrc ilike '%p.role%'
    or p.prosrc ilike '% role = ''client''%'
    or p.prosrc ilike '% role = ''admin''%'
  )
order by p.proname, args;

select
  'functions_using_users' as check_name,
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (
    p.prosrc ilike '% from users%'
    or p.prosrc ilike '% join users%'
    or p.prosrc ilike '% update users%'
    or p.prosrc ilike '% insert into users%'
    or p.prosrc ilike '% public.users%'
    or p.prosrc ilike '% users %'
  )
order by p.proname, args;

select
  'legacy_tables_present' as check_name,
  legacy.table_name,
  to_regclass('public.' || legacy.table_name) is not null as exists_in_public
from (
  values
    ('provider_config'),
    ('integration_api_keys'),
    ('integration_webhooks'),
    ('platform_sync_config'),
    ('sync_logs'),
    ('external_recharge_mapping'),
    ('external_package_mapping')
) as legacy(table_name)
order by legacy.table_name;

select
  'api_keys_plaintext_columns' as check_name,
  c.table_schema,
  c.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name = 'api_keys'
  and c.column_name in ('key', 'api_key', 'secret', 'api_secret', 'token')
order by c.column_name;

select
  'api_keys_hash_columns' as check_name,
  c.table_schema,
  c.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name = 'api_keys'
  and c.column_name in ('key_hash', 'key_prefix', 'key_suffix')
order by c.column_name;

select
  'sms_provider_config_secret_columns' as check_name,
  c.table_schema,
  c.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name = 'sms_provider_config'
  and c.column_name in ('api_key', 'api_secret', 'secret', 'secret_key', 'webhook_secret', 'token', 'password')
order by c.column_name;

select
  'provider_config_secret_columns' as check_name,
  c.table_schema,
  c.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name in ('provider_config', 'platform_sync_config', 'integration_api_keys', 'integration_webhooks')
  and (
    c.column_name ilike '%key%'
    or c.column_name ilike '%secret%'
    or c.column_name ilike '%token%'
    or c.column_name ilike '%password%'
  )
order by c.table_name, c.column_name;

select
  'recharges_user_id_fk_target' as check_name,
  tc.constraint_name,
  kcu.table_name,
  kcu.column_name,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
  and kcu.table_name = 'recharges'
  and kcu.column_name = 'user_id'
order by tc.constraint_name;

select
  'summary_flags' as check_name,
  to_regclass('public.profiles') is not null as profiles_exists,
  to_regclass('public.admins') is not null as admins_exists,
  to_regclass('public.users') is not null as users_exists,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'role'
  ) as profiles_role_exists,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'api_keys' and column_name in ('key', 'api_key')
  ) as api_keys_plaintext_key_exists,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'sms_provider_config' and column_name in ('api_key', 'api_secret')
  ) as sms_provider_config_secret_columns_exist;
