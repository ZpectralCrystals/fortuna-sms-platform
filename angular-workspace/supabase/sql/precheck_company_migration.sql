-- Read-only precheck before company/RUC migration.
-- Safe to run: SELECT only, no writes.

select
  'base_table' as check_type,
  'profiles' as item,
  to_regclass('public.profiles') is not null as ok
union all
select 'base_table', 'recharges', to_regclass('public.recharges') is not null
union all
select 'base_table', 'sms_messages', to_regclass('public.sms_messages') is not null
union all
select 'base_table', 'sms_send_attempts', to_regclass('public.sms_send_attempts') is not null
union all
select 'base_table', 'sms_packages', to_regclass('public.sms_packages') is not null
union all
select 'base_table', 'admins', to_regclass('public.admins') is not null;

with profile_base as (
  select
    p.id,
    nullif(btrim(coalesce(p.ruc, '')), '') as ruc,
    coalesce(p.credits, 0)::numeric as credits,
    p.created_at
  from public.profiles p
)
select
  count(*) as total_profiles,
  count(*) filter (where ruc ~ '^[0-9]{11}$') as profiles_con_ruc_valido,
  count(*) filter (where ruc is null or ruc !~ '^[0-9]{11}$') as profiles_con_ruc_vacio_o_invalido
from profile_base;

with profile_base as (
  select
    p.id,
    nullif(btrim(coalesce(p.ruc, '')), '') as ruc,
    coalesce(p.credits, 0)::numeric as credits
  from public.profiles p
),
valid_ruc as (
  select *
  from profile_base
  where ruc ~ '^[0-9]{11}$'
)
select
  ruc,
  count(*) as usuarios_por_ruc,
  sum(credits) as sum_credits_por_ruc,
  max(credits) as max_credits_por_ruc,
  count(*) filter (where credits >= 10) as posibles_bonos_por_usuario,
  case
    when count(*) > 1 and count(*) filter (where credits >= 10) > 1 then 'REVISION_MANUAL: posible bono duplicado por RUC'
    when count(*) > 1 then 'REVISION_MANUAL: RUC compartido, elegir SUM vs MAX'
    else 'OK'
  end as recomendacion
from valid_ruc
group by ruc
order by usuarios_por_ruc desc, ruc;

with invalid_ruc as (
  select
    p.id,
    p.email,
    p.ruc,
    coalesce(p.credits, 0)::numeric as credits
  from public.profiles p
  where nullif(btrim(coalesce(p.ruc, '')), '') is null
     or nullif(btrim(coalesce(p.ruc, '')), '') !~ '^[0-9]{11}$'
)
select
  id,
  email,
  ruc,
  credits,
  'NO_MIGRAR_AUTO: corregir RUC antes de crear company' as recomendacion
from invalid_ruc
order by email nulls last, id;

with valid_ruc as (
  select
    nullif(btrim(coalesce(p.ruc, '')), '') as ruc,
    coalesce(p.credits, 0)::numeric as credits
  from public.profiles p
  where nullif(btrim(coalesce(p.ruc, '')), '') ~ '^[0-9]{11}$'
)
select
  ruc,
  count(*) as perfiles,
  sum(credits) as candidato_sum,
  max(credits) as candidato_max,
  case
    when count(*) = 1 then 'usar credits actual'
    when count(*) filter (where credits >= 10) > 1 then 'pendiente: no usar SUM sin validar bonos duplicados; revisar manualmente'
    else 'pendiente: decidir SUM vs MAX segun historial de recargas'
  end as recomendacion_saldo_inicial
from valid_ruc
group by ruc
having count(*) > 1
order by perfiles desc, ruc;
