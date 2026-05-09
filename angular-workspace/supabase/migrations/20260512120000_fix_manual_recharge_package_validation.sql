-- FASE FIX RECARGA MANUAL FINAL
-- Manual commercial recharges must use package values from DB, not browser input.

drop function if exists public.admin_create_manual_recharge(uuid, integer, numeric, text, text, text);
drop function if exists public.admin_create_manual_recharge(uuid, uuid, text, text, text);

create function public.admin_create_manual_recharge(
  p_user_id uuid,
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
  v_admin_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_package public.sms_packages%rowtype;
  v_recharge_id uuid;
  v_operation_code text := nullif(btrim(coalesce(p_operation_code, '')), '');
  v_payment_method text := lower(nullif(btrim(coalesce(p_payment_method, '')), ''));
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_sms_credits integer;
  v_amount numeric;
  v_previous_credits numeric;
  v_new_credits numeric;
  v_previous_total_spent numeric;
  v_inventory_tid tid;
  v_previous_available bigint;
  v_next_available bigint;
  v_has_quantity_column boolean;
  v_has_admin_notes_column boolean;
  v_has_inventory_recharge_columns boolean;
  v_has_inventory_reference_columns boolean;
begin
  if v_admin_id is null or not exists (
    select 1
    from public.admins a
    where a.id = v_admin_id
      and a.is_active = true
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if p_user_id is null then
    raise exception 'CLIENT_NOT_FOUND';
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

  if exists (
    select 1
    from public.recharges r
    where r.operation_code = v_operation_code
  ) then
    raise exception 'OPERATION_CODE_ALREADY_EXISTS';
  end if;

  select *
    into v_profile
  from public.profiles p
  where p.id = p_user_id
  for update;

  if not found then
    raise exception 'CLIENT_NOT_FOUND';
  end if;

  if lower(coalesce(v_profile.email, '')) = 'alerts@smsfortuna.internal' then
    raise exception 'CLIENT_NOT_ALLOWED';
  end if;

  if exists (
    select 1
    from public.internal_accounts ia
    where ia.profile_id = p_user_id
  ) then
    raise exception 'CLIENT_NOT_ALLOWED';
  end if;

  if exists (
    select 1
    from public.admins a
    where a.id = p_user_id
  ) then
    raise exception 'CLIENT_NOT_ALLOWED';
  end if;

  select *
    into v_package
  from public.sms_packages sp
  where sp.id = p_package_id;

  if not found then
    raise exception 'PACKAGE_NOT_FOUND';
  end if;

  if coalesce(v_package.is_active, false) is not true then
    raise exception 'PACKAGE_INACTIVE';
  end if;

  v_sms_credits := v_package.sms_credits;
  v_amount := v_package.total_price;

  if v_sms_credits is null or v_sms_credits <= 0 or v_amount is null or v_amount < 0 then
    raise exception 'INVALID_PACKAGE_VALUES';
  end if;

  select exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'recharges'
      and c.column_name = 'quantity'
  )
    into v_has_quantity_column;

  select exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'recharges'
      and c.column_name = 'admin_notes'
  )
    into v_has_admin_notes_column;

  select ctid, available_sms
    into v_inventory_tid, v_previous_available
  from public.sms_inventory
  order by created_at asc
  limit 1
  for update;

  if not found then
    raise exception 'INVENTORY_NOT_FOUND';
  end if;

  if v_previous_available < v_sms_credits then
    raise exception 'INSUFFICIENT_INVENTORY';
  end if;

  v_next_available := v_previous_available - v_sms_credits;

  if v_has_quantity_column and v_has_admin_notes_column then
    execute '
      insert into public.recharges (
        user_id,
        package_id,
        quantity,
        sms_credits,
        amount,
        payment_method,
        status,
        operation_code,
        approved_by,
        approved_at,
        admin_notes
      )
      values ($1, $2, $3, $3, $4, $5, ''approved'', $6, $7, now(), $8)
      returning id
    '
      into v_recharge_id
      using p_user_id, p_package_id, v_sms_credits, v_amount, v_payment_method, v_operation_code, v_admin_id, v_notes;
  elsif v_has_quantity_column then
    execute '
      insert into public.recharges (
        user_id,
        package_id,
        quantity,
        sms_credits,
        amount,
        payment_method,
        status,
        operation_code,
        approved_by,
        approved_at
      )
      values ($1, $2, $3, $3, $4, $5, ''approved'', $6, $7, now())
      returning id
    '
      into v_recharge_id
      using p_user_id, p_package_id, v_sms_credits, v_amount, v_payment_method, v_operation_code, v_admin_id;
  elsif v_has_admin_notes_column then
    execute '
      insert into public.recharges (
        user_id,
        package_id,
        sms_credits,
        amount,
        payment_method,
        status,
        operation_code,
        approved_by,
        approved_at,
        admin_notes
      )
      values ($1, $2, $3, $4, $5, ''approved'', $6, $7, now(), $8)
      returning id
    '
      into v_recharge_id
      using p_user_id, p_package_id, v_sms_credits, v_amount, v_payment_method, v_operation_code, v_admin_id, v_notes;
  else
    execute '
      insert into public.recharges (
        user_id,
        package_id,
        sms_credits,
        amount,
        payment_method,
        status,
        operation_code,
        approved_by,
        approved_at
      )
      values ($1, $2, $3, $4, $5, ''approved'', $6, $7, now())
      returning id
    '
      into v_recharge_id
      using p_user_id, p_package_id, v_sms_credits, v_amount, v_payment_method, v_operation_code, v_admin_id;
  end if;

  v_previous_credits := coalesce(v_profile.credits, 0);
  v_previous_total_spent := coalesce(v_profile.total_spent, 0);

  update public.profiles
     set credits = coalesce(credits, 0) + v_sms_credits,
         total_spent = coalesce(total_spent, 0) + v_amount,
         updated_at = now()
   where id = p_user_id
   returning credits
      into v_new_credits;

  update public.sms_inventory
     set available_sms = v_next_available,
         sold_sms = coalesce(sold_sms, 0) + v_sms_credits,
         updated_at = now()
   where ctid = v_inventory_tid;

  if to_regclass('public.inventory_transactions') is not null then
    select exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'inventory_transactions'
        and c.column_name = 'recharge_id'
    )
      into v_has_inventory_recharge_columns;

    select exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'inventory_transactions'
        and c.column_name = 'previous_available_sms'
    )
      into v_has_inventory_reference_columns;

    if v_has_inventory_recharge_columns then
      execute '
        insert into public.inventory_transactions (
          recharge_id,
          quantity,
          transaction_type,
          notes
        )
        values ($1, $2, ''sale'', $3)
      '
        using v_recharge_id, v_sms_credits, coalesce(v_notes, 'Manual recharge: ' || v_package.name);
    elsif v_has_inventory_reference_columns then
      execute '
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
        values (''recharge_approval'', $1, $2, $3, ''recharges'', $4, $5, $6)
      '
        using -v_sms_credits, v_previous_available, v_next_available, v_recharge_id, coalesce(v_notes, 'Manual recharge: ' || v_package.name), v_admin_id;
    end if;
  end if;

  if to_regclass('public.profile_audit_logs') is not null then
    insert into public.profile_audit_logs (
      profile_id,
      changed_by,
      action,
      old_data,
      new_data
    )
    values (
      p_user_id,
      v_admin_id,
      'admin_create_manual_recharge',
      jsonb_build_object(
        'credits', v_previous_credits,
        'total_spent', v_previous_total_spent
      ),
      jsonb_build_object(
        'credits', v_new_credits,
        'total_spent', v_previous_total_spent + v_amount,
        'recharge_id', v_recharge_id,
        'package_id', p_package_id,
        'package_name', v_package.name,
        'sms_credits', v_sms_credits,
        'amount', v_amount,
        'payment_method', v_payment_method,
        'operation_code', v_operation_code,
        'previous_available_sms', v_previous_available,
        'new_available_sms', v_next_available,
        'notes', v_notes
      )
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'recharge_id', v_recharge_id,
    'new_balance', v_new_credits,
    'sms_credits', v_sms_credits,
    'amount', v_amount,
    'package_id', p_package_id,
    'package_name', v_package.name
  );
exception
  when unique_violation then
    raise exception 'OPERATION_CODE_ALREADY_EXISTS';
end;
$$;

revoke all on function public.admin_create_manual_recharge(uuid, uuid, text, text, text) from public, anon;
grant execute on function public.admin_create_manual_recharge(uuid, uuid, text, text, text) to authenticated;
