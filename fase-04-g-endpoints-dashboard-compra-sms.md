# Fase 04-G - Endpoints y dashboard compra SMS

## 1. Resumen

Se auditaron llamadas actuales a endpoints proveedor y Edge Functions.

Se restauro `Comprar SMS` en dashboard admin.

Se desactivo consulta automatica de saldo proveedor desde dashboard admin. El dashboard ya no invoca `admin-sync-provider-balance` al cargar.

No se modifico backend, DB, migrations, Edge Functions, `send-sms`, `SMS_PROVIDER_MODE`, API keys, SMS multiple ni Excel.

## 2. Endpoints proveedor detectados

Los endpoints proveedor detectados estan concentrados en:

- `angular-workspace/supabase/functions/_shared/sms-provider-current.ts`

Endpoints:

- `POST /v1/api/sms/individual/{ruc}`
- `POST /v1/api/sms/registrar/proveedor`
- `GET /v1/api/sms/consultar/proveedor`
- `POST /v1/api/sms/registrar/saldo`
- `GET /v1/api/sms/consultar/saldo/{ruc}`

No se detectaron llamadas directas a `services-fortuna.com` desde Angular.

## 3. Edge Functions que los usan

- `send-sms`
  - usa `sendIndividualSms(...)`
  - endpoint proveedor: `POST /v1/api/sms/individual/{ruc}`

- `admin-register-provider-balance`
  - usa `registerProviderBalance(...)`
  - endpoint proveedor: `POST /v1/api/sms/registrar/proveedor`

- `admin-sync-provider-balance`
  - usa `getProviderBalance(...)`
  - endpoint proveedor: `GET /v1/api/sms/consultar/proveedor`

- `admin-register-client-balance`
  - usa `registerClientBalance(...)`
  - endpoint proveedor: `POST /v1/api/sms/registrar/saldo`

- `admin-sync-client-balance`
  - usa `getClientBalance(...)`
  - endpoint proveedor: `GET /v1/api/sms/consultar/saldo/{ruc}`

`api-send-sms` queda congelado fuera de esta fase.

## 4. Componentes Angular que los invocan

Despues del ajuste, Angular no invoca automaticamente:

- `admin-sync-provider-balance`
- `admin-register-provider-balance`
- `admin-sync-client-balance`
- `admin-register-client-balance`

Dashboard admin usa:

- `BackofficeService.getDashboardStats()`
- `BackofficeService.getInventoryState()`
- `BackofficeService.listInventoryPurchases()`
- `BackofficeService.addSmsInventory()`

`getInventoryState()` ahora lee solo tabla local:

- `provider_balance_snapshots`

No llama Edge Function de sync proveedor.

`addSmsInventory()` mantiene RPC local:

- `admin_add_sms_inventory`

No llama proveedor real.

## 5. Cambios en dashboard admin

Archivos modificados:

- `angular-workspace/projects/shared/src/lib/services/backoffice.service.ts`
- `angular-workspace/projects/sms-client/src/app/admin/pages/dashboard-page.component.ts`
- `angular-workspace/projects/backoffice-admin/src/app/pages/dashboard-page.component.ts`

Cambios:

- `SHOW_SMS_PURCHASE_CONTROLS = true`
- `getInventoryState()` ya no llama `functions.invoke('admin-sync-provider-balance')`
- Inventario del dashboard sale de snapshot local previo, no de consulta live proveedor
- Cards mantienen defaults seguros, sin cajas vacias

## 6. Comprar SMS restaurado

`Comprar SMS` vuelve a mostrarse en:

- `sms-client` admin dashboard
- `backoffice-admin` dashboard

El modal y flujo visual quedan activos como estaban, usando RPC local de inventario.

`Historial de Compras` se mantiene visible.

## 7. Consulta proveedor desactivada en dashboard

Antes:

- Dashboard -> `BackofficeService.getInventoryState()` -> `admin-sync-provider-balance` -> proveedor `GET /sms/consultar/proveedor`

Ahora:

- Dashboard -> `BackofficeService.getInventoryState()` -> tabla local `provider_balance_snapshots`

No hay consulta automatica de saldo proveedor al cargar dashboard.

`admin-sync-provider-balance` no se borro. Queda disponible para uso manual/controlado fuera del dashboard.

## 8. Build

Comando ejecutado:

```bash
npm run build
```

Resultado: OK.

Compilo:

- `sms-client`
- `backoffice-admin`

Nota: Node mostro advertencia por version impar `v25.9.0`; no bloqueo build.

## 9. Riesgos pendientes

- Si `provider_balance_snapshots` no tiene filas, inventario muestra `0`.
- `Comprar SMS` usa flujo local legacy/RPC `admin_add_sms_inventory`; no registra saldo proveedor real.
- Si se requiere saldo proveedor real, usar `admin-sync-provider-balance` de forma manual/controlada, no automatico en dashboard.
- Validacion visual final requiere sesion admin activa en browser.

## 10. Decision recomendada

Fase 04-G lista.

Dashboard admin puede mostrar `Comprar SMS` sin consultar automaticamente saldo proveedor.
