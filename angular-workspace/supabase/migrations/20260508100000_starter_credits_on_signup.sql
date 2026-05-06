-- FASE FIX: Starter bonus for new client profiles.
-- profiles.credits stores available SMS count, not monetary value.

alter table public.profiles
  alter column credits set default 10,
  alter column total_spent set default 0;

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
    nullif(coalesce(new.raw_user_meta_data ->> 'razon_social', new.raw_user_meta_data ->> 'company_name'), ''),
    nullif(new.raw_user_meta_data ->> 'ruc', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    true,
    10,
    0,
    now(),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
