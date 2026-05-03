-- SMS Fortuna - Supabase final unificado
-- Nuevo Supabase desde cero.
-- Sin datos viejos, sin inserts de clientes, sin API keys reales, sin secrets.

create extension if not exists pgcrypto;

do $$
begin
  create type public.user_role as enum ('client', 'admin', 'super_admin');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.recharge_status as enum ('pending', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.sms_status as enum ('pending', 'sent', 'delivered', 'failed');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.template_category as enum ('marketing', 'transactional', 'notification');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.inventory_transaction_type as enum ('purchase', 'recharge_approval', 'adjustment', 'refund');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  razon_social text,
  ruc text,
  phone text,
  role public.user_role not null default 'client',
  is_active boolean not null default true,
  credits bigint not null default 0 check (credits >= 0),
  total_spent numeric(12, 2) not null default 0 check (total_spent >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.user_role not null default 'admin' check (role in ('admin', 'super_admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sms_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  quantity integer not null check (quantity > 0),
  total_price numeric(12, 2) not null check (total_price >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recharges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  package_id uuid references public.sms_packages(id) on delete set null,
  quantity integer not null check (quantity > 0),
  sms_credits integer not null check (sms_credits > 0),
  amount numeric(12, 2) not null check (amount >= 0),
  payment_method text,
  status public.recharge_status not null default 'pending',
  operation_code text,
  external_payment_id text,
  approved_at timestamptz,
  approved_by uuid references public.admins(id) on delete set null,
  rejected_at timestamptz,
  rejected_by uuid references public.admins(id) on delete set null,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sms_inventory (
  id boolean primary key default true,
  available_sms bigint not null default 0 check (available_sms >= 0),
  sold_sms bigint not null default 0 check (sold_sms >= 0),
  total_sms bigint not null default 0 check (total_sms >= 0),
  updated_at timestamptz not null default now(),
  constraint sms_inventory_singleton check (id = true)
);

create table if not exists public.inventory_purchases (
  id uuid primary key default gen_random_uuid(),
  quantity bigint not null check (quantity > 0),
  amount numeric(12, 2) not null check (amount >= 0),
  cost_per_sms numeric(12, 6) not null check (cost_per_sms >= 0),
  operation_number text,
  notes text,
  purchased_by uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_type public.inventory_transaction_type not null,
  quantity bigint not null,
  previous_available_sms bigint not null,
  new_available_sms bigint not null,
  reference_table text,
  reference_id uuid,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.sms_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  api_key_id uuid,
  to_phone text not null,
  message text not null,
  status public.sms_status not null default 'pending',
  segments integer not null default 1 check (segments > 0),
  cost numeric(12, 2) not null default 1 check (cost >= 0),
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  content text not null,
  category public.template_category not null default 'marketing',
  variables jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  key_prefix text not null,
  key_suffix text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz
);

create table if not exists public.sms_provider_config (
  id uuid primary key default gen_random_uuid(),
  provider_name text not null,
  base_url text,
  sender_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sms_messages
  drop constraint if exists sms_messages_api_key_id_fkey;

alter table public.sms_messages
  add constraint sms_messages_api_key_id_fkey
  foreign key (api_key_id) references public.api_keys(id) on delete set null;

create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists admins_active_idx on public.admins(is_active);
create index if not exists recharges_user_id_idx on public.recharges(user_id);
create index if not exists recharges_status_idx on public.recharges(status);
create index if not exists recharges_created_at_idx on public.recharges(created_at desc);
create index if not exists sms_messages_user_id_idx on public.sms_messages(user_id);
create index if not exists sms_messages_status_idx on public.sms_messages(status);
create index if not exists sms_messages_created_at_idx on public.sms_messages(created_at desc);
create index if not exists templates_user_id_idx on public.templates(user_id);
create index if not exists api_keys_user_id_idx on public.api_keys(user_id);
create index if not exists api_keys_hash_idx on public.api_keys(key_hash);
create index if not exists inventory_purchases_created_at_idx on public.inventory_purchases(created_at desc);

create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    razon_social,
    ruc,
    phone,
    role
  )
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'razon_social', new.raw_user_meta_data->>'company_name'),
    new.raw_user_meta_data->>'ruc',
    new.raw_user_meta_data->>'phone',
    'client'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        razon_social = coalesce(public.profiles.razon_social, excluded.razon_social),
        ruc = coalesce(public.profiles.ruc, excluded.ruc),
        phone = coalesce(public.profiles.phone, excluded.phone),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at();

drop trigger if exists admins_updated_at on public.admins;
create trigger admins_updated_at
before update on public.admins
for each row execute function public.update_updated_at();

drop trigger if exists sms_packages_updated_at on public.sms_packages;
create trigger sms_packages_updated_at
before update on public.sms_packages
for each row execute function public.update_updated_at();

drop trigger if exists recharges_updated_at on public.recharges;
create trigger recharges_updated_at
before update on public.recharges
for each row execute function public.update_updated_at();

drop trigger if exists sms_messages_updated_at on public.sms_messages;
create trigger sms_messages_updated_at
before update on public.sms_messages
for each row execute function public.update_updated_at();

drop trigger if exists templates_updated_at on public.templates;
create trigger templates_updated_at
before update on public.templates
for each row execute function public.update_updated_at();

drop trigger if exists sms_provider_config_updated_at on public.sms_provider_config;
create trigger sms_provider_config_updated_at
before update on public.sms_provider_config
for each row execute function public.update_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins a
    where a.id = auth.uid()
      and a.is_active = true
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins a
    where a.id = auth.uid()
      and a.role = 'super_admin'
      and a.is_active = true
  );
$$;

create or replace function public.get_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select jsonb_build_object(
    'users', jsonb_build_object(
      'total_users', (select count(*) from public.profiles p where p.role = 'client'),
      'active_users', (select count(*) from public.profiles p where p.role = 'client' and p.is_active = true),
      'total_sms_balance', coalesce((select sum(p.credits) from public.profiles p where p.role = 'client'), 0),
      'total_revenue', coalesce((select sum(p.total_spent) from public.profiles p where p.role = 'client'), 0)
    ),
    'recharges', jsonb_build_object(
      'pending_recharges', (select count(*) from public.recharges r where r.status = 'pending')
    ),
    'inventory', jsonb_build_object(
      'available_sms', coalesce((select i.available_sms from public.sms_inventory i where i.id = true), 0),
      'sold_sms', coalesce((select i.sold_sms from public.sms_inventory i where i.id = true), 0),
      'total_sms', coalesce((select i.total_sms from public.sms_inventory i where i.id = true), 0)
    ),
    'messages', jsonb_build_object(
      'total_messages', (select count(*) from public.sms_messages),
      'sent_messages', (select count(*) from public.sms_messages m where m.status in ('sent', 'delivered')),
      'delivered_messages', (select count(*) from public.sms_messages m where m.status = 'delivered')
    )
  )
  into result;

  return result;
end;
$$;

create or replace function public.add_sms_to_inventory(
  p_quantity bigint,
  p_amount numeric,
  p_admin_id uuid,
  p_notes text default null,
  p_operation_number text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  purchase_id uuid;
  previous_available bigint;
  next_available bigint;
begin
  if not public.is_admin() or p_admin_id <> auth.uid() then
    raise exception 'not authorized';
  end if;

  if p_quantity <= 0 or p_amount < 0 then
    raise exception 'invalid inventory purchase';
  end if;

  insert into public.sms_inventory (id, available_sms, sold_sms, total_sms)
  values (true, 0, 0, 0)
  on conflict (id) do nothing;

  select available_sms
    into previous_available
  from public.sms_inventory
  where id = true
  for update;

  next_available := previous_available + p_quantity;

  insert into public.inventory_purchases (
    quantity,
    amount,
    cost_per_sms,
    operation_number,
    notes,
    purchased_by
  )
  values (
    p_quantity,
    p_amount,
    case when p_quantity > 0 then p_amount / p_quantity else 0 end,
    p_operation_number,
    p_notes,
    p_admin_id
  )
  returning id into purchase_id;

  update public.sms_inventory
     set available_sms = next_available,
         total_sms = total_sms + p_quantity,
         updated_at = now()
   where id = true;

  insert into public.inventory_transactions (
    transaction_type,
    quantity,
    previous_available_sms,
    new_available_sms,
    reference_table,
    reference_id,
    notes,
    created_by
  )
  values (
    'purchase',
    p_quantity,
    previous_available,
    next_available,
    'inventory_purchases',
    purchase_id,
    p_notes,
    p_admin_id
  );

  return purchase_id;
end;
$$;

create or replace function public.approve_recharge(
  p_recharge_id uuid,
  p_operation_code text,
  p_admin_id uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_recharge public.recharges%rowtype;
  previous_available bigint;
  next_available bigint;
begin
  if not public.is_admin() or p_admin_id <> auth.uid() then
    raise exception 'not authorized';
  end if;

  if nullif(trim(coalesce(p_operation_code, '')), '') is null then
    raise exception 'operation code required';
  end if;

  select *
    into target_recharge
  from public.recharges
  where id = p_recharge_id
  for update;

  if not found then
    raise exception 'recharge not found';
  end if;

  if target_recharge.status <> 'pending' then
    raise exception 'recharge already processed';
  end if;

  insert into public.sms_inventory (id, available_sms, sold_sms, total_sms)
  values (true, 0, 0, 0)
  on conflict (id) do nothing;

  select available_sms
    into previous_available
  from public.sms_inventory
  where id = true
  for update;

  if previous_available < target_recharge.quantity then
    raise exception 'insufficient inventory';
  end if;

  next_available := previous_available - target_recharge.quantity;

  update public.recharges
     set status = 'approved',
         operation_code = p_operation_code,
         approved_at = now(),
         approved_by = p_admin_id,
         updated_at = now()
   where id = p_recharge_id;

  update public.profiles
     set credits = credits + target_recharge.sms_credits,
         total_spent = total_spent + target_recharge.amount,
         updated_at = now()
   where id = target_recharge.user_id;

  update public.sms_inventory
     set available_sms = next_available,
         sold_sms = sold_sms + target_recharge.quantity,
         updated_at = now()
   where id = true;

  insert into public.inventory_transactions (
    transaction_type,
    quantity,
    previous_available_sms,
    new_available_sms,
    reference_table,
    reference_id,
    notes,
    created_by
  )
  values (
    'recharge_approval',
    -target_recharge.quantity,
    previous_available,
    next_available,
    'recharges',
    target_recharge.id,
    'Recharge approved',
    p_admin_id
  );
end;
$$;

create or replace function public.reject_recharge(
  p_recharge_id uuid,
  p_reason text default null,
  p_admin_id uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() or p_admin_id <> auth.uid() then
    raise exception 'not authorized';
  end if;

  update public.recharges
     set status = 'rejected',
         rejected_at = now(),
         rejected_by = p_admin_id,
         rejection_reason = p_reason,
         updated_at = now()
   where id = p_recharge_id
     and status = 'pending';

  if not found then
    raise exception 'recharge not found or already processed';
  end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.admins enable row level security;
alter table public.sms_packages enable row level security;
alter table public.recharges enable row level security;
alter table public.sms_inventory enable row level security;
alter table public.inventory_purchases enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.sms_messages enable row level security;
alter table public.templates enable row level security;
alter table public.api_keys enable row level security;
alter table public.sms_provider_config enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "admins_select_self_or_admin" on public.admins;
create policy "admins_select_self_or_admin"
on public.admins
for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "admins_manage_super_admin" on public.admins;
create policy "admins_manage_super_admin"
on public.admins
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "sms_packages_read_authenticated" on public.sms_packages;
create policy "sms_packages_read_authenticated"
on public.sms_packages
for select
to authenticated
using (is_active = true or public.is_admin());

drop policy if exists "sms_packages_manage_admin" on public.sms_packages;
create policy "sms_packages_manage_admin"
on public.sms_packages
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "recharges_select_own_or_admin" on public.recharges;
create policy "recharges_select_own_or_admin"
on public.recharges
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "recharges_insert_own_pending" on public.recharges;
create policy "recharges_insert_own_pending"
on public.recharges
for insert
to authenticated
with check (user_id = auth.uid() and status = 'pending');

drop policy if exists "recharges_admin_update" on public.recharges;
create policy "recharges_admin_update"
on public.recharges
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "sms_inventory_select_admin" on public.sms_inventory;
create policy "sms_inventory_select_admin"
on public.sms_inventory
for select
to authenticated
using (public.is_admin());

drop policy if exists "inventory_purchases_select_admin" on public.inventory_purchases;
create policy "inventory_purchases_select_admin"
on public.inventory_purchases
for select
to authenticated
using (public.is_admin());

drop policy if exists "inventory_transactions_select_admin" on public.inventory_transactions;
create policy "inventory_transactions_select_admin"
on public.inventory_transactions
for select
to authenticated
using (public.is_admin());

drop policy if exists "sms_messages_select_own_or_admin" on public.sms_messages;
create policy "sms_messages_select_own_or_admin"
on public.sms_messages
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "templates_crud_own" on public.templates;
create policy "templates_crud_own"
on public.templates
for all
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "api_keys_select_own_or_admin" on public.api_keys;
create policy "api_keys_select_own_or_admin"
on public.api_keys
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "sms_provider_config_select_admin" on public.sms_provider_config;
create policy "sms_provider_config_select_admin"
on public.sms_provider_config
for select
to authenticated
using (public.is_admin());

drop policy if exists "sms_provider_config_manage_admin" on public.sms_provider_config;
create policy "sms_provider_config_manage_admin"
on public.sms_provider_config
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.get_dashboard_stats() to authenticated;
grant execute on function public.add_sms_to_inventory(bigint, numeric, uuid, text, text) to authenticated;
grant execute on function public.approve_recharge(uuid, text, uuid) to authenticated;
grant execute on function public.reject_recharge(uuid, text, uuid) to authenticated;
