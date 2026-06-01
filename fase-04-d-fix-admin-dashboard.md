# Fase 04-D - Fix dashboard admin

Fecha: 2026-05-30  
Proyecto: Fortuna SMS  
Repo: `/Volumes/MAC/MAC Ext/Desktop/Fortuna sms`

## 1. Resumen

Dashboard admin corregido localmente.

Cambios:

- Cards superiores mantienen valores aunque falle carga parcial.
- Inventario Disponible usa Supabase como intermediario.
- Angular llama Edge Function `admin-sync-provider-balance`.
- Si Edge falla, lee último `provider_balance_snapshots`.
- Si no hay snapshot, muestra `0`.
- Botón `Comprar SMS` oculto detrás de feature flag `false`.
- No se llama directo a `services-fortuna.com`.

No se tocó:

- `send-sms`
- provider real
- `SMS_PROVIDER_MODE`
- production
- API keys
- SMS múltiple
- Excel
- DB/migrations
- deploy

## 2. Archivos modificados

- `angular-workspace/projects/shared/src/lib/services/backoffice.service.ts`
- `angular-workspace/projects/backoffice-admin/src/app/pages/dashboard-page.component.ts`
- `angular-workspace/projects/backoffice-admin/src/app/pages/dashboard-page.component.html`
- `angular-workspace/projects/sms-client/src/app/admin/pages/dashboard-page.component.ts`
- `angular-workspace/projects/sms-client/src/app/admin/pages/dashboard-page.component.html`

Se tocaron ambos dashboards admin porque existen dos apps/rutas:

- `backoffice-admin`
- `sms-client /admin/dashboard`

## 3. Botón Comprar SMS ocultado

Se agregó flag local:

```ts
const SHOW_SMS_PURCHASE_CONTROLS = false;
readonly showSmsPurchaseControls = SHOW_SMS_PURCHASE_CONTROLS;
```

HTML:

- Botón `Comprar SMS` queda dentro de `@if (showSmsPurchaseControls)`.
- Modal compra queda dentro de `@if (showSmsPurchaseControls && showPurchaseModal)`.
- `Historial de Compras` se mantiene visible.

No se borraron rutas ni métodos legacy.

## 4. Inventario proveedor mostrado

Servicio:

- `BackofficeService.getInventoryState()`

Orden:

1. `supabase.functions.invoke('admin-sync-provider-balance')`
2. Fallback `provider_balance_snapshots` último registro.
3. Fallback `0` con source `unavailable`.

No usa compra manual para card inventario.

No llama proveedor directo desde Angular.

No expone secrets.

## 5. Métricas restauradas

Cards superiores:

- `Inventario Disponible`: `inventory.available_sms`.
- `Ingresos`: `recharges.total_revenue`.
- Subtítulo ingresos: `recharges.approved_sms_sold`.
- `Recargas Pendientes`: `recharges.pending_recharges`.
- Subtítulo recargas: `users.active_users`.
- `Total Usuarios`: `users.total_users`.
- Subtítulo usuarios: `users.active_users`.

Fix adicional:

- `backoffice-admin` usaba `statsData.users?.total_revenue`; ahora usa `statsData.recharges?.total_revenue`.
- `backoffice-admin` ahora tiene `revenueSmsSold`, `failedMessages`, `pendingMessages`, igual que `sms-client/admin`.
- Mensajes pendientes usa `stats.pendingMessages`, no cálculo ambiguo `totalMessages - sentMessages`.

## 6. Servicios usados

Supabase:

- Edge Function: `admin-sync-provider-balance`.
- Tabla fallback: `provider_balance_snapshots`.
- Tablas métricas existentes:
  - `profiles`
  - `admins`
  - `internal_accounts`
  - `recharges`
  - `sms_messages`

No usado:

- `services-fortuna.com` directo.
- Secrets frontend.
- Provider production.

## 7. Build

Comando:

```bash
npm run build
```

Resultado:

- `sms-client`: OK.
- `backoffice-admin`: OK.

Warning:

- Node local `v25.9.0` no LTS. Build no falló.

## 8. Riesgos pendientes

- Edge `admin-sync-provider-balance` debe seguir en mock hasta autorización.
- Si Edge falla y no hay snapshot, inventario muestra `0`.
- Modal/flujo compra manual sigue en código legacy pero oculto por flag.
- Historial compras sigue visible por compatibilidad.
- Production proveedor sigue pendiente de prueba controlada.

## 9. Decisión recomendada

Fix dashboard admin OK local.

Siguiente:

1. Aplicar/deploy frontend solo con aprobación.
2. Probar `/admin/dashboard`.
3. Confirmar cards:
   - Inventario Disponible
   - Ingresos
   - Recargas Pendientes
   - Total Usuarios
4. Confirmar botón `Comprar SMS` no visible.
5. Mantener `SMS_PROVIDER_MODE` sin production.
