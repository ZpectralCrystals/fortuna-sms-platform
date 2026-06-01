-- Fase 03-C: backfill companies/company_users from profiles.
-- WARNING: DO NOT EXECUTE without backup, human approval, and reviewed precheck output.
-- This script links profiles to companies by valid RUC only.
-- It does NOT decide initial company balance (SUM/MAX/manual remains pending).
-- It does NOT grant starter bonus automatically for legacy profiles.

begin;

-- Verification BEFORE.
select
  'before_profiles' as check_name,
  count(*) as total_profiles,
  count(*) filter (where nullif(btrim(coalesce(ruc, '')), '') ~ '^[0-9]{11}$') as valid_ruc_profiles,
  count(*) filter (where company_id is not null) as profiles_with_company_id
from public.profiles;

select
  'before_companies' as check_name,
  count(*) as total_companies
from public.companies;

select
  'before_company_users' as check_name,
  count(*) as total_company_users
from public.company_users;

with valid_profiles as (
  select
    p.id as user_id,
    nullif(btrim(coalesce(p.ruc, '')), '') as ruc,
    nullif(btrim(coalesce(p.razon_social, '')), '') as razon_social,
    p.created_at
  from public.profiles p
  where nullif(btrim(coalesce(p.ruc, '')), '') ~ '^[0-9]{11}$'
),
company_seed as (
  select distinct on (ruc)
    ruc,
    razon_social
  from valid_profiles
  order by ruc, (razon_social is null), created_at asc
)
insert into public.companies (
  ruc,
  razon_social,
  status,
  is_active,
  created_at,
  updated_at
)
select
  cs.ruc,
  cs.razon_social,
  'active',
  true,
  now(),
  now()
from company_seed cs
on conflict (ruc) do update
   set razon_social = coalesce(companies.razon_social, excluded.razon_social),
       updated_at = now();

with valid_profiles as (
  select
    p.id as user_id,
    nullif(btrim(coalesce(p.ruc, '')), '') as ruc,
    row_number() over (
      partition by nullif(btrim(coalesce(p.ruc, '')), '')
      order by p.created_at asc, p.id
    ) as company_rank
  from public.profiles p
  where nullif(btrim(coalesce(p.ruc, '')), '') ~ '^[0-9]{11}$'
),
profile_companies as (
  select
    vp.user_id,
    c.id as company_id,
    case when vp.company_rank = 1 then 'owner' else 'member' end as role
  from valid_profiles vp
  join public.companies c on c.ruc = vp.ruc
)
insert into public.company_users (
  company_id,
  user_id,
  role,
  is_active,
  created_at
)
select
  pc.company_id,
  pc.user_id,
  pc.role,
  true,
  now()
from profile_companies pc
on conflict (company_id, user_id) do update
   set is_active = true,
       role = case
         when company_users.role = 'owner' then company_users.role
         else excluded.role
       end;

update public.profiles p
   set company_id = c.id,
       updated_at = now()
  from public.companies c
 where nullif(btrim(coalesce(p.ruc, '')), '') = c.ruc
   and nullif(btrim(coalesce(p.ruc, '')), '') ~ '^[0-9]{11}$'
   and (p.company_id is null or p.company_id <> c.id);

-- Verification AFTER.
select
  'after_profiles' as check_name,
  count(*) as total_profiles,
  count(*) filter (where nullif(btrim(coalesce(ruc, '')), '') ~ '^[0-9]{11}$') as valid_ruc_profiles,
  count(*) filter (where company_id is not null) as profiles_with_company_id
from public.profiles;

select
  'after_companies' as check_name,
  count(*) as total_companies,
  count(*) filter (where ruc ~ '^[0-9]{11}$') as valid_ruc_companies
from public.companies;

select
  'after_company_users' as check_name,
  count(*) as total_company_users,
  count(distinct company_id) as linked_companies,
  count(distinct user_id) as linked_users
from public.company_users;

select
  c.ruc,
  c.razon_social,
  count(cu.user_id) as linked_users,
  sum(coalesce(p.credits, 0)) as legacy_sum_credits,
  max(coalesce(p.credits, 0)) as legacy_max_credits,
  'PENDING_MANUAL_REVIEW: decide SUM vs MAX vs manual; do not create ledger here' as balance_decision
from public.companies c
left join public.company_users cu on cu.company_id = c.id
left join public.profiles p on p.id = cu.user_id
group by c.id, c.ruc, c.razon_social
order by c.ruc;

-- Leave transaction open for reviewer tools by default.
-- Change rollback to commit only after review and approval.
rollback;
