-- FASE FIX - React/Vite parity for low balance alerts UI.
-- Extends existing config/history tables without dropping data.

alter table public.low_balance_config
  add column if not exists threshold_amount numeric(12,2) not null default 12,
  add column if not exists cooldown_hours integer not null default 24 check (cooldown_hours >= 0),
  add column if not exists send_sms boolean not null default false,
  add column if not exists send_email boolean not null default true,
  add column if not exists message_template text not null default 'Hola {name}, tu saldo es bajo ({balance} SMS ≈ S/ {amount}). Recarga ahora para no interrumpir tus operaciones.';

alter table public.low_balance_alerts
  add column if not exists sent_via text not null default 'pending',
  add column if not exists message_sent text;

update public.low_balance_config
   set threshold_amount = round((threshold_credits * 0.08)::numeric, 2),
       send_sms = coalesce(send_sms, false),
       send_email = coalesce(send_email, true),
       cooldown_hours = coalesce(cooldown_hours, 24),
       message_template = coalesce(
         nullif(message_template, ''),
         'Hola {name}, tu saldo es bajo ({balance} SMS ≈ S/ {amount}). Recarga ahora para no interrumpir tus operaciones.'
       )
 where threshold_amount is null
    or threshold_amount = 12;

create index if not exists low_balance_alerts_user_cooldown_idx
on public.low_balance_alerts(user_id, created_at desc);

create or replace function public.admin_upsert_low_balance_config(
  p_is_active boolean,
  p_threshold_amount numeric,
  p_threshold_credits numeric,
  p_cooldown_hours integer,
  p_send_sms boolean,
  p_send_email boolean,
  p_message_template text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_config public.low_balance_config%rowtype;
  v_message_template text := nullif(btrim(p_message_template), '');
begin
  if v_admin_id is null or not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if p_threshold_amount is null or p_threshold_amount < 0 then
    raise exception 'INVALID_THRESHOLD_AMOUNT';
  end if;

  if p_threshold_credits is null or p_threshold_credits < 0 then
    raise exception 'INVALID_THRESHOLD_CREDITS';
  end if;

  if p_cooldown_hours is null or p_cooldown_hours < 0 then
    raise exception 'INVALID_COOLDOWN';
  end if;

  if v_message_template is null then
    raise exception 'EMPTY_MESSAGE_TEMPLATE';
  end if;

  select *
    into v_config
  from public.low_balance_config
  order by created_at asc
  limit 1
  for update;

  if found then
    update public.low_balance_config
       set is_active = coalesce(p_is_active, true),
           threshold_amount = round(p_threshold_amount::numeric, 2),
           threshold_credits = round(p_threshold_credits::numeric, 2),
           cooldown_hours = p_cooldown_hours,
           send_sms = coalesce(p_send_sms, false),
           send_email = coalesce(p_send_email, true),
           notify_admin = true,
           notify_client = coalesce(p_send_sms, false) or coalesce(p_send_email, true),
           message_template = v_message_template,
           updated_at = now()
     where id = v_config.id
     returning *
        into v_config;
  else
    insert into public.low_balance_config (
      is_active,
      threshold_amount,
      threshold_credits,
      cooldown_hours,
      send_sms,
      send_email,
      notify_admin,
      notify_client,
      message_template
    )
    values (
      coalesce(p_is_active, true),
      round(p_threshold_amount::numeric, 2),
      round(p_threshold_credits::numeric, 2),
      p_cooldown_hours,
      coalesce(p_send_sms, false),
      coalesce(p_send_email, true),
      true,
      coalesce(p_send_sms, false) or coalesce(p_send_email, true),
      v_message_template
    )
    returning *
       into v_config;
  end if;

  return jsonb_build_object(
    'success', true,
    'config', to_jsonb(v_config)
  );
end;
$$;

create or replace function public.admin_generate_low_balance_alerts()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_config public.low_balance_config%rowtype;
  v_generated integer := 0;
  v_skipped integer := 0;
  v_rec record;
  v_sent_via text;
  v_amount numeric;
  v_message text;
begin
  if v_admin_id is null or not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select *
    into v_config
  from public.low_balance_config
  order by created_at asc
  limit 1;

  if not found then
    raise exception 'CONFIG_NOT_FOUND';
  end if;

  if not coalesce(v_config.is_active, false) then
    raise exception 'ALERTS_DISABLED';
  end if;

  v_sent_via := case
    when coalesce(v_config.send_sms, false) and coalesce(v_config.send_email, false) then 'sms,email'
    when coalesce(v_config.send_sms, false) then 'sms'
    when coalesce(v_config.send_email, false) then 'email'
    else 'pending'
  end;

  for v_rec in
    select
      p.id,
      p.email,
      p.full_name,
      p.razon_social,
      p.credits
    from public.profiles p
    where p.credits <= v_config.threshold_credits
      and not exists (
        select 1
        from public.admins a
        where a.id = p.id
      )
    order by p.credits asc
  loop
    if exists (
      select 1
      from public.low_balance_alerts a
      where a.user_id = v_rec.id
        and a.created_at >= now() - make_interval(hours => coalesce(v_config.cooldown_hours, 24))
    ) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_amount := round((coalesce(v_rec.credits, 0) * 0.08)::numeric, 2);
    v_message := replace(
      replace(
        replace(
          coalesce(v_config.message_template, 'Hola {name}, tu saldo es bajo ({balance} SMS ≈ S/ {amount}). Recarga ahora para no interrumpir tus operaciones.'),
          '{name}',
          coalesce(nullif(v_rec.full_name, ''), nullif(v_rec.razon_social, ''), nullif(v_rec.email, ''), 'cliente')
        ),
        '{balance}',
        coalesce(v_rec.credits, 0)::text
      ),
      '{amount}',
      v_amount::text
    );

    insert into public.low_balance_alerts (
      user_id,
      credits_at_alert,
      threshold_credits,
      alert_type,
      status,
      sent_via,
      message_sent
    )
    values (
      v_rec.id,
      coalesce(v_rec.credits, 0),
      v_config.threshold_credits,
      'low_balance',
      'pending',
      v_sent_via,
      v_message
    );

    v_generated := v_generated + 1;
  end loop;

  return jsonb_build_object(
    'success', true,
    'generated', v_generated,
    'skipped', v_skipped,
    'threshold_credits', v_config.threshold_credits,
    'threshold_amount', v_config.threshold_amount
  );
end;
$$;

revoke all on function public.admin_upsert_low_balance_config(boolean, numeric, numeric, integer, boolean, boolean, text) from public, anon, authenticated;
grant execute on function public.admin_upsert_low_balance_config(boolean, numeric, numeric, integer, boolean, boolean, text) to authenticated;

revoke all on function public.admin_generate_low_balance_alerts() from public, anon, authenticated;
grant execute on function public.admin_generate_low_balance_alerts() to authenticated;
