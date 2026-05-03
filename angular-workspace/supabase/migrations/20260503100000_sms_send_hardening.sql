create extension if not exists pgcrypto with schema extensions;

create table if not exists public.sms_send_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  idempotency_key text not null,
  recipient text not null,
  provider_recipient text,
  message text not null,
  message_hash text not null,
  segments integer not null,
  cost numeric(10,4) not null,
  status text not null default 'processing',
  sms_message_id uuid references public.sms_messages(id) on delete set null,
  provider text,
  provider_response jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz not null default now() + interval '15 minutes',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sms_send_attempts_user_idempotency_key_unique unique (user_id, idempotency_key),
  constraint sms_send_attempts_status_check check (status in ('processing', 'sent', 'failed')),
  constraint sms_send_attempts_segments_check check (segments > 0),
  constraint sms_send_attempts_cost_check check (cost >= 0),
  constraint sms_send_attempts_idempotency_key_check check (btrim(idempotency_key) <> '')
);

create index if not exists sms_send_attempts_user_created_at_idx
  on public.sms_send_attempts (user_id, created_at desc);

create index if not exists sms_send_attempts_status_idx
  on public.sms_send_attempts (status);

create index if not exists sms_send_attempts_expires_at_idx
  on public.sms_send_attempts (expires_at);

create index if not exists sms_send_attempts_sms_message_id_idx
  on public.sms_send_attempts (sms_message_id);

alter table public.sms_send_attempts enable row level security;

revoke all on public.sms_send_attempts from public, anon, authenticated;
grant select on public.sms_send_attempts to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'sms_send_attempts'
      and policyname = 'sms_send_attempts_select_own'
  ) then
    create policy sms_send_attempts_select_own
      on public.sms_send_attempts
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'sms_send_attempts'
      and policyname = 'sms_send_attempts_select_admin'
  ) then
    create policy sms_send_attempts_select_admin
      on public.sms_send_attempts
      for select
      to authenticated
      using (public.is_admin());
  end if;
end;
$$;

create or replace function public.internal_begin_sms_send_attempt(
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
  v_profile public.profiles%rowtype;
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
  v_recent_attempts integer;
  v_reserved_segments integer;
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

  select *
    into v_existing
  from public.sms_send_attempts
  where user_id = p_user_id
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
        'recipient', coalesce(v_message_row.recipient, v_existing.recipient),
        'provider_recipient', v_existing.provider_recipient,
        'segments', coalesce(v_message_row.segments, v_existing.segments),
        'cost', coalesce(v_message_row.cost, v_existing.cost),
        'status', 'sent',
        'test_mode', false
      );
    end if;

    if v_existing.status = 'processing' and v_existing.expires_at > now() then
      raise exception 'SMS_SEND_ALREADY_PROCESSING';
    end if;

    raise exception 'SMS_SEND_ALREADY_FAILED_USE_NEW_KEY';
  end if;

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

  v_segments := public.calculate_sms_segments(v_message);
  v_cost := round((v_segments * 0.08)::numeric, 4);

  select coalesce(sum(segments), 0)
    into v_reserved_segments
  from public.sms_send_attempts
  where user_id = p_user_id
    and status = 'processing'
    and expires_at > now();

  if coalesce(v_profile.credits, 0) - v_reserved_segments < v_segments then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  select count(*)
    into v_recent_attempts
  from public.sms_send_attempts
  where user_id = p_user_id
    and status in ('processing', 'sent')
    and created_at >= now() - interval '60 seconds';

  if v_recent_attempts >= 30 then
    raise exception 'RATE_LIMIT_EXCEEDED';
  end if;

  v_provider_recipient := replace(v_recipient, '+', '');
  v_message_hash := encode(extensions.digest(v_message, 'sha256'), 'hex');

  begin
    insert into public.sms_send_attempts (
      user_id,
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
  exception
    when unique_violation then
      raise exception 'SMS_SEND_ALREADY_PROCESSING';
  end;

  return jsonb_build_object(
    'success', true,
    'attempt_id', v_attempt_id,
    'user_id', p_user_id,
    'recipient', v_recipient,
    'provider_recipient', v_provider_recipient,
    'segments', v_segments,
    'cost', v_cost,
    'credits_before', coalesce(v_profile.credits, 0),
    'reserved_segments', v_reserved_segments
  );
end;
$$;

create or replace function public.internal_complete_sms_send_success(
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
  v_profile public.profiles%rowtype;
  v_existing_message public.sms_messages%rowtype;
  v_message_id uuid;
  v_provider text;
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
      'status', 'sent',
      'test_mode', false
    );
  end if;

  if v_attempt.status <> 'processing' then
    raise exception 'SMS_SEND_ALREADY_FAILED_USE_NEW_KEY';
  end if;

  select *
    into v_profile
  from public.profiles
  where id = v_attempt.user_id
  for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if coalesce(v_profile.is_active, false) is not true then
    raise exception 'PROFILE_INACTIVE';
  end if;

  if coalesce(v_profile.credits, 0) < v_attempt.segments then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  update public.profiles
  set
    credits = coalesce(credits, 0) - v_attempt.segments,
    updated_at = now()
  where id = v_attempt.user_id;

  v_provider := nullif(btrim(coalesce(p_provider, '')), '');
  v_provider_response := coalesce(p_provider_response, '{}'::jsonb)
    || jsonb_build_object(
      'provider', coalesce(v_provider, 'fortuna_services'),
      'test_mode', false,
      'attempt_id', v_attempt.id
    );

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
    v_attempt.user_id,
    v_attempt.recipient,
    v_attempt.message,
    v_attempt.segments,
    v_attempt.cost,
    'sent',
    nullif(btrim(coalesce(p_provider_message_id, '')), ''),
    v_provider_response,
    now()
  )
  returning id into v_message_id;

  update public.sms_send_attempts
  set
    status = 'sent',
    sms_message_id = v_message_id,
    provider = coalesce(v_provider, 'fortuna_services'),
    provider_response = v_provider_response,
    completed_at = now(),
    updated_at = now()
  where id = v_attempt.id;

  return jsonb_build_object(
    'success', true,
    'message_id', v_message_id,
    'recipient', v_attempt.recipient,
    'segments', v_attempt.segments,
    'cost', v_attempt.cost,
    'status', 'sent',
    'test_mode', false
  );
end;
$$;

create or replace function public.internal_complete_sms_send_failed(
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
      'status', 'sent',
      'test_mode', false
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

  v_provider := nullif(btrim(coalesce(p_provider, '')), '');
  v_error_message := nullif(btrim(coalesce(p_error_message, '')), '');
  v_provider_response := coalesce(p_provider_response, '{}'::jsonb)
    || jsonb_build_object(
      'provider', coalesce(v_provider, 'fortuna_services'),
      'test_mode', false,
      'attempt_id', v_attempt.id
    );

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
    v_attempt.user_id,
    v_attempt.recipient,
    v_attempt.message,
    v_attempt.segments,
    v_attempt.cost,
    'failed',
    v_provider_response,
    v_error_message
  )
  returning id into v_message_id;

  update public.sms_send_attempts
  set
    status = 'failed',
    sms_message_id = v_message_id,
    provider = coalesce(v_provider, 'fortuna_services'),
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

revoke all on function public.internal_begin_sms_send_attempt(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.internal_complete_sms_send_success(uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.internal_complete_sms_send_failed(uuid, text, jsonb, text) from public, anon, authenticated;

grant execute on function public.internal_begin_sms_send_attempt(uuid, text, text, text) to service_role;
grant execute on function public.internal_complete_sms_send_success(uuid, text, text, jsonb) to service_role;
grant execute on function public.internal_complete_sms_send_failed(uuid, text, jsonb, text) to service_role;
