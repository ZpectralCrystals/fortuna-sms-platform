# FASE 3B - Inventario y aprobacion por RPC

## Archivos modificados

- `projects/shared/src/lib/services/backoffice.service.ts`
- `projects/shared/src/lib/services/recharges.service.ts`
- `projects/backoffice-admin/src/app/pages/dashboard-page.component.ts`
- `projects/backoffice-admin/src/app/pages/recharges-page.component.ts`
- `projects/backoffice-admin/src/app/pages/recharges-page.component.html`

## RPC conectadas

- `admin_add_sms_inventory(p_quantity, p_amount, p_operation_number, p_notes)`
- `admin_approve_recharge(p_recharge_id, p_operation_code)`
- `admin_reject_recharge(p_recharge_id, p_rejection_reason)`

## Payloads usados

Agregar inventario:

```ts
supabase.rpc('admin_add_sms_inventory', {
  p_quantity: quantity,
  p_amount: amount,
  p_operation_number: operationNumber || null,
  p_notes: notes || null
})
```

Aprobar recarga:

```ts
supabase.rpc('admin_approve_recharge', {
  p_recharge_id: recharge.id,
  p_operation_code: operationCode
})
```

Rechazar recarga:

```ts
supabase.rpc('admin_reject_recharge', {
  p_recharge_id: recharge.id,
  p_rejection_reason: rejectionReason
})
```

## Conectado a Supabase real

- Dashboard carga inventario desde `sms_inventory`.
- Dashboard carga compras desde `inventory_purchases` con datos de `admins`.
- Dashboard agrega inventario por RPC `admin_add_sms_inventory`.
- Backoffice recargas aprueba por RPC `admin_approve_recharge`.
- Backoffice recargas rechaza por RPC `admin_reject_recharge`.
- Despues de compra exitosa se refrescan stats, inventario y compras.
- Despues de aprobar/rechazar se refresca listado de recargas.

## Validaciones implementadas

- Compra inventario: `quantity > 0`.
- Compra inventario: `amount >= 0`.
- Aprobar: solo `pending`.
- Aprobar: `operation_code` requerido si la recarga no trae uno.
- Rechazar: solo `pending`.
- Rechazar: `rejection_reason` requerido.
- Errores RPC mapeados:
  - `INSUFFICIENT_INVENTORY` -> "Inventario insuficiente para aprobar esta recarga."
  - `RECHARGE_ALREADY_PROCESSED` -> "Esta recarga ya fue procesada."
  - `NOT_AUTHORIZED` -> "No tienes permisos de administrador."

## Sin tocar

- No tabla `users`.
- No `profiles.role`.
- No update directo a `recharges`.
- No update directo a `profiles.credits`.
- No update directo a `sms_inventory`.
- No insert directo en `inventory_transactions`.
- No `service_role` en frontend.
- No secrets.
- No SMS real.
- No API keys.
- No cambios en `sms-client`.

## Pruebas realizadas

- `npx tsc --noEmit -p tsconfig.json`: OK.
- `npm run build`: OK.
- `rg "from\\('users'\\)|user:users|profiles\\.role|\\.role" projects || true`: sin resultados.
- `rg "from\\('recharges'\\).*update|update\\(.*recharges|from\\('profiles'\\).*update|from\\('sms_inventory'\\).*update" projects || true`: sin resultados.

## Pruebas manuales recomendadas

- Dashboard muestra inventario real desde `sms_inventory`.
- Dashboard muestra historial vacio si no hay compras.
- Comprar inventario con cantidad calculada y monto valido.
- Ver nueva fila en `inventory_purchases`.
- Ver movimiento generado por RPC en `inventory_transactions`.
- Ver inventario refrescado.
- Backoffice `/recharges`: aprobar recarga pending con codigo operacion.
- Ver status aprobado y creditos/inventario actualizados por RPC.
- Backoffice `/recharges`: rechazar recarga pending con motivo.
- Ver status rechazado y motivo.
- Intentar aprobar con inventario insuficiente y validar mensaje.
- Intentar aprobar recarga ya procesada y validar mensaje.
- Intentar con usuario no admin y validar mensaje.

## Errores conocidos

- Dashboard sigue leyendo resumen general por `get_dashboard_stats`; si esa RPC no existe o falla, se muestra error pero inventario directo puede seguir cargando.
- La vista dashboard no se refresca automaticamente cuando se aprueba/rechaza desde la pantalla de recargas; al volver/recargar dashboard cargara valores actualizados.

## Siguiente fase recomendada

FASE 4: auditoria y experiencia operativa:

- Mejorar dashboard para recalculo unificado post acciones globales.
- Agregar detalle de transacciones de inventario.
- Agregar filtros por estado/fecha en recargas.
- Preparar flujo SMS real y API keys sin plaintext.
