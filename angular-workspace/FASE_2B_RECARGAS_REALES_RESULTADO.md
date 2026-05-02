# FASE 2B - Recargas reales Angular

## Archivos modificados

- `projects/shared/src/lib/models/recharge.model.ts`
- `projects/shared/src/lib/services/recharges.service.ts`
- `projects/sms-client/src/app/dashboard/pages/recharges-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/recharges-page.component.html`
- `projects/sms-client/src/app/dashboard/pages/recharges-page.component.scss`
- `projects/backoffice-admin/src/app/pages/recharges-page.component.ts`
- `projects/backoffice-admin/src/app/pages/recharges-page.component.html`

## Conectado a Supabase real

- Cliente SMS carga paquetes activos desde `sms_packages`.
- Cliente SMS crea solicitudes reales en `recharges`.
- Cliente SMS lista su historial real de `recharges`.
- Backoffice lista recargas reales desde `recharges`.
- Backoffice trae datos relacionados de `profiles`.
- Backoffice trae datos relacionados de `sms_packages`.
- Shared `RechargesService` quedo implementado parcialmente para FASE 2B.

## En modo pendiente

- Aprobacion de recargas.
- Rechazo de recargas.
- Actualizacion de `profiles.credits`.
- Inventario SMS.
- RPC atomica de aprobacion/rechazo.
- SMS real.
- API keys.
- Creacion manual de recarga desde backoffice.

## Queries usadas

Paquetes activos:

```ts
supabase
  .from('sms_packages')
  .select('*')
  .eq('is_active', true)
  .order('sms_credits')
```

Historial cliente:

```ts
supabase
  .from('recharges')
  .select(`
    id,
    user_id,
    package_id,
    sms_credits,
    amount,
    payment_method,
    operation_code,
    status,
    created_at,
    approved_at,
    rejected_at,
    rejection_reason,
    package:sms_packages(*)
  `)
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
```

Creacion cliente:

```ts
supabase
  .from('recharges')
  .insert(payload)
  .select(`
    id,
    user_id,
    package_id,
    sms_credits,
    amount,
    payment_method,
    operation_code,
    status,
    created_at,
    approved_at,
    rejected_at,
    rejection_reason,
    package:sms_packages(*)
  `)
  .single()
```

Listado admin:

```ts
supabase
  .from('recharges')
  .select(`
    id,
    user_id,
    package_id,
    sms_credits,
    amount,
    payment_method,
    operation_code,
    status,
    created_at,
    approved_at,
    rejected_at,
    rejection_reason,
    profile:profiles(full_name, email, razon_social, ruc),
    package:sms_packages(*)
  `)
  .order('created_at', { ascending: false })
```

## Payload de creacion de recarga

```ts
{
  user_id: auth.uid(),
  package_id: selectedPackage.id,
  sms_credits: selectedPackage.sms_credits,
  amount: selectedPackage.total_price,
  payment_method: selectedMethod,
  operation_code: operationCode?.trim() || null,
  status: 'pending'
}
```

## Validaciones implementadas

- Si no hay sesion, cliente muestra error claro.
- Si no hay paquetes activos, cliente muestra estado vacio.
- Si no hay paquete seleccionado, se bloquea envio.
- Si no hay metodo de pago, se bloquea envio.
- Si Supabase/RLS devuelve error, se muestra mensaje con contexto.
- Al crear recarga, no se suma credito.
- Al crear recarga, no se toca `profiles.credits`.
- Al crear recarga, no se toca inventario.
- Luego de crear recarga, se refresca historial.

## Pruebas realizadas

- `npm run build`: OK.
- `npx tsc --noEmit -p tsconfig.json`: OK.
- `rg "from\\('users'\\)|user:users|profiles\\.role|\\.role" projects || true`: sin resultados.

## Pruebas manuales recomendadas

- Cliente entra a `/dashboard/recharges` y ve 5 paquetes desde `sms_packages`.
- Cliente selecciona paquete, metodo de pago y codigo opcional.
- Cliente confirma recarga.
- Supabase muestra nuevo registro en `recharges` con `status = pending`.
- Cliente ve historial actualizado.
- `profiles.credits` no cambia.
- Backoffice entra a `/recharges` y ve recarga con perfil y paquete.
- Backoffice click en aprobar/rechazar muestra mensaje FASE 3 y no actualiza DB.
- Sin paquetes activos, cliente ve estado vacio.
- Sin sesion, cliente ve error o guard redirige antes.

## Riesgos detectados

- Relacion PostgREST `recharges -> sms_packages` depende de FK real `package_id`.
- Relacion PostgREST `recharges -> profiles` depende de FK real `user_id`.
- Si RLS de `recharges` no permite `insert` propio, cliente vera error claro pero no creara recarga.
- Si RLS admin no permite select global, backoffice vera error claro.
- Campos usados asumen FASE 2A: `sms_credits`, `base_price`, `tax_rate`, `total_price`, `price_per_sms`, `is_popular`.

## Siguiente fase recomendada

FASE 3: aprobacion/rechazo segura con RPC atomica:

- Validar admin activo en `admins`.
- Bloquear recarga `pending`.
- Verificar inventario.
- Cambiar estado.
- Sumar `profiles.credits`.
- Registrar `operation_code`, `approved_at`, `approved_by` o rechazo.
- Registrar movimiento inventario.
