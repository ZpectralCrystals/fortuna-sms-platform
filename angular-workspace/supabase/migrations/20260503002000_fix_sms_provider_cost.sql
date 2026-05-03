create or replace function public.internal_validate_sms_send(
  p_user_id uuid,
  p_recipient text,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_message text;
  v_phone text;
  v_recipient text;
  v_provider_recipient text;
  v_segments integer;
  v_cost numeric;
begin
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

  v_provider_recipient := replace(v_recipient, '+', '');

  select *
    into v_profile
  from public.profiles
  where id = p_user_id;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if coalesce(v_profile.is_active, false) is not true then
    raise exception 'PROFILE_INACTIVE';
  end if;

  v_segments := public.calculate_sms_segments(v_message);
  v_cost := round((v_segments * 0.08)::numeric, 4);

  if coalesce(v_profile.credits, 0) < v_segments then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  return jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'recipient', v_recipient,
    'provider_recipient', v_provider_recipient,
    'segments', v_segments,
    'cost', v_cost,
    'credits_before', coalesce(v_profile.credits, 0)
  );
end;
$$;

create or replace function public.internal_send_sms_provider_success(
  p_user_id uuid,
  p_recipient text,
  p_message text,
  p_segments integer,
  p_cost numeric,
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
  v_profile public.profiles%rowtype;
  v_message_id uuid;
  v_segments integer;
  v_cost numeric;
begin
  v_segments := greatest(coalesce(p_segments, 0), 1);
  v_cost := round((v_segments * 0.08)::numeric, 4);

  select *
    into v_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if coalesce(v_profile.is_active, false) is not true then
    raise exception 'PROFILE_INACTIVE';
  end if;

  if coalesce(v_profile.credits, 0) < v_segments then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  update public.profiles
  set
    credits = credits - v_segments,
    updated_at = now()
  where id = p_user_id;

  insert into public.sms_messages (
    user_id,
    recipient,
    message,
    segments,
    cost,
    status,
    provider_message_id,
    provider_response,
    sent_at
  )
  values (
    p_user_id,
    p_recipient,
    p_message,
    v_segments,
    v_cost,
    'sent',
    nullif(btrim(coalesce(p_provider_message_id, '')), ''),
    coalesce(p_provider_response, '{}'::jsonb) || jsonb_build_object('provider', p_provider, 'test_mode', false),
    now()
  )
  returning id into v_message_id;

  return jsonb_build_object(
    'success', true,
    'message_id', v_message_id,
    'recipient', p_recipient,
    'segments', v_segments,
    'cost', v_cost,
    'status', 'sent',
    'test_mode', false
  );
end;
$$;

create or replace function public.internal_register_sms_failed(
  p_user_id uuid,
  p_recipient text,
  p_message text,
  p_segments integer,
  p_cost numeric,
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
  v_message_id uuid;
  v_segments integer;
  v_cost numeric;
begin
  v_segments := greatest(coalesce(p_segments, 0), 1);
  v_cost := round((v_segments * 0.08)::numeric, 4);

  insert into public.sms_messages (
    user_id,
    recipient,
    message,
    segments,
    cost,
    status,
    provider_response,
    error_message
  )
  values (
    p_user_id,
    p_recipient,
    p_message,
    v_segments,
    v_cost,
    'failed',
    coalesce(p_provider_response, '{}'::jsonb) || jsonb_build_object('provider', p_provider, 'test_mode', false),
    nullif(btrim(coalesce(p_error_message, '')), '')
  )
  returning id into v_message_id;

  return jsonb_build_object(
    'success', false,
    'message_id', v_message_id,
    'status', 'failed',
    'error_message', p_error_message
  );
end;
$$;

revoke all on function public.internal_validate_sms_send(uuid, text, text) from public, anon, authenticated;
revoke all on function public.internal_send_sms_provider_success(uuid, text, text, integer, numeric, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.internal_register_sms_failed(uuid, text, text, integer, numeric, text, jsonb, text) from public, anon, authenticated;

grant execute on function public.internal_validate_sms_send(uuid, text, text) to service_role;
grant execute on function public.internal_send_sms_provider_success(uuid, text, text, integer, numeric, text, text, jsonb) to service_role;
grant execute on function public.internal_register_sms_failed(uuid, text, text, integer, numeric, text, jsonb, text) to service_role;
