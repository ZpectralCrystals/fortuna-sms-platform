# Supabase Final Unificado - SMS Fortuna

## 1. Resumen ejecutivo

Angular actual tiene dos apps: `sms-client` y `backoffice-admin`. Ambas ya compilan, pero el contrato Supabase todavía no está limpio.

Decisión recomendada: crear un Supabase nuevo con un único modelo de identidad basado en `auth.users` + `profiles`, y usar `admins` solo como tabla de permisos admin. No crear tabla real `users`; esa tabla viene de backoffice legacy y duplica `profiles`.

Core producción mínimo:

- `profiles`
- `admins`
- `sms_packages`
- `recharges`
- `sms_inventory`
- `inventory_purchases`
- `inventory_transactions`
- `sms_messages`
- `templates`
- `api_keys`
- `sms_provider_config`

Core SQL/RPC mínimo:

- `handle_new_user`
- `update_updated_at`
- `is_admin`
- `get_dashboard_stats`
- `add_sms_to_inventory`
- `approve_recharge`
- `reject_recharge`

Edge Functions mínimo:

- `send-sms`
- `sms-webhook`
- `create-api-key`
- `revoke-api-key`

Importante: Angular actual todavía tiene dos pantallas backoffice (`/users`, `/recharges`) leyendo `from('users')`. Eso debe corregirse a `profiles` antes de conectar producción. No se recomienda crear tabla `users` nueva.

## 2. Fuentes revisadas

- Apps Angular:
  - `angular-workspace/projects/sms-client`
  - `angular-workspace/projects/backoffice-admin`
  - `angular-workspace/projects/shared`
- Services shared:
  - `AuthService`
  - `SupabaseService`
  - stubs: `SmsService`, `RechargesService`, `ApiKeysService`, `BackofficeService`, `CreditsService`
- Migraciones antiguas:
  - `sms/supabase/migrations`
  - `backoffice/supabase/migrations`
- Edge Functions antiguas:
  - `sms/supabase/functions`
  - `backoffice/supabase/functions`

## 3. Tablas que SÍ deben quedarse

| Tabla | Motivo | Pantallas Angular | Services |
|---|---|---|---|
| `profiles` | Fuente única de clientes registrados, saldo SMS, datos fiscales y estado | sms dashboard layout, overview, send, recharges; backoffice accounts | `AuthService` indirecto vía trigger, llamadas directas de páginas |
| `admins` | Permisos admin y login backoffice | backoffice guard, admin layout, accounts exclusión admin | `AuthService.isAdmin()` |
| `sms_packages` | Paquetes SMS vendibles | backoffice recharges; futuro cliente recargas dinámico | llamadas directas actuales en backoffice |
| `recharges` | Solicitudes y aprobaciones de recarga | sms recharges, backoffice recharges, dashboard stats | llamadas directas actuales |
| `sms_inventory` | Inventario global de SMS mayorista | backoffice dashboard, recharges | RPC `add_sms_to_inventory`, `approve_recharge` |
| `inventory_purchases` | Compras de inventario mayorista | backoffice dashboard | dashboard page |
| `inventory_transactions` | Auditoría de entradas/salidas de inventario | backoffice auditoría futura | RPCs de inventario |
| `sms_messages` | Historial, analytics, envío y delivery | sms overview, history, analytics; backoffice messages futuro | páginas sms directas, Edge `send-sms` |
| `templates` | Plantillas de cliente | sms templates | página templates directa |
| `api_keys` | API keys de cliente, hash server-side | sms API keys; backoffice API keys futuro | Edge `create-api-key`, `send-sms` |
| `sms_provider_config` | Config no secreta del proveedor SMS | backoffice futuro proveedor | Edge `send-sms` puede leer config no secreta |

## 4. Tablas que NO deben quedarse

| Tabla legacy | Decisión | Razón |
|---|---|---|
| `users` | NO crear tabla real | Duplica `profiles`. Angular debe migrar `from('users')` a `profiles`. |
| `campaigns` | NO core por ahora | No hay pantalla Angular real conectada. Puede volver cuando campañas exista. |
| `sms_quotas` | NO core por ahora | No usada por Angular. Quota/rate limit debe vivir en Edge/API keys. |
| `provider_config` | NO, usar `sms_provider_config` | Nombre duplicado legacy. |
| `sms_delivery_webhooks` | NO core | `sms_messages` + Edge `sms-webhook` basta. Logs opcionales después. |
| `webhook_config` | NO core | No usado por Angular actual. |
| `webhook_logs` | NO core | No usado. |
| `platform_sync_config` | NO core | `/sync` visual segura; backend no definido. |
| `sync_logs` | NO core | `/sync` visual segura. |
| `external_package_mapping` | NO core | Corporate sync pendiente. |
| `external_recharge_mapping` | NO core | Corporate sync pendiente. |
| `recharge_status_events` | NO core | Puede agregarse si integración externa exige tracking. |
| `integration_api_keys` | NO core | Duplica `api_keys`. |
| `integration_webhooks` | NO core | No usado por Angular. |
| `integration_logs` | NO core | No usado por Angular. |
| `blog_categories` | NO core | Blog Angular está mock/estático; no lee Supabase. Opcional. |
| `blog_posts` | NO core | Blog post redirige a `/blog`; no lee Supabase. Opcional. |
| `low_balance_config` | NO core | `/alerts` visual segura; RPC/Edge no conectados. Opcional fase posterior. |
| `low_balance_alerts` | NO core | Igual anterior. |

## 5. Tablas opcionales

| Tabla | Cuándo agregar |
|---|---|
| `blog_categories`, `blog_posts` | Si blog público deja de ser estático y se administra desde backoffice. |
| `campaigns` | Si envío masivo/campañas necesita tracking propio separado de `sms_messages`. |
| `low_balance_config`, `low_balance_alerts` | Si alertas de bajo saldo pasan de visual seguro a funcional. |
| `sync_config`, `sync_logs`, mappings externos | Si Corporate API se conecta de verdad. |
| `integration_kits` + storage bucket | Si `/integration-kit` sube ZIP real. |
| `webhook_logs` | Si se necesita auditoría técnica de webhooks proveedor. |

## 6. Uso Angular actual por tabla

### `profiles`

Usos:

- `AuthService.register()` manda metadata de perfil al signUp.
- `dashboard-layout.component.ts` lee `id,email,full_name,company_name,razon_social,credits`.
- `dashboard-overview-page.component.ts` lee `id,full_name,credits`.
- `send-sms-page.component.ts` lee `id,credits`.
- `recharges-page.component.ts` lee `credits,total_spent`.
- `accounts-page.component.ts` lee `id,email,full_name,razon_social,ruc,phone,role,is_active,credits,total_spent,created_at,updated_at`.

Recomendación:

- Mantener `profiles` como única fuente de clientes.
- Eliminar dependencia de `users` en backoffice.
- `credits` debe representar SMS disponibles, no soles. Angular debe alinear cálculos de costo/deducción.

### `admins`

Usos:

- `AuthService.isAdmin()` lee `id,is_active`.
- `admin-layout.component.ts` puede leer sesión.
- `accounts-page.component.ts` excluye admin con `admins.id`.
- `inventory_purchases` relaciona admin por `purchased_by`.

Recomendación:

- `admins.id = auth.users.id`.
- No usar `auth_user_id`.

### `sms_messages`

Usos:

- `dashboard-overview-page.component.ts`
- `history-page.component.ts`
- `analytics-page.component.ts`
- backoffice `/messages` está visual seguro, pero necesitará esta tabla.

Recomendación:

- Escritura real solo por Edge `send-sms`.
- Cliente solo lectura propia.
- Admin lectura global.

### `templates`

Usos:

- `templates-page.component.ts` lee/insert/update/delete directo.

Riesgo:

- CRUD directo desde frontend es aceptable si RLS limita `user_id = auth.uid()`.

### `api_keys`

Usos:

- `sms-client /dashboard/api-keys` lee `id,user_id,name,key,is_active,created_at,last_used_at`.
- Backoffice API Keys visual seguro no lee Supabase.

Riesgo:

- Angular actual espera columna `key` en texto plano. Eso NO debe existir en producción.

Recomendación:

- Guardar `key_hash`, `key_prefix`, `key_suffix`.
- Edge `create-api-key` devuelve key plaintext una sola vez.
- UI debe mostrar preview, no key real persistida.

### `recharges`

Usos:

- `sms-client /dashboard/recharges` lee `id,user_id,amount,sms_credits,status,payment_method,created_at`.
- `backoffice /recharges` lee recargas con paquete y usuario.
- `get_dashboard_stats` cuenta pendientes e ingresos.

Recomendación:

- `status`: `pending`, `approved`, `rejected`.
- Angular cliente debe mapear `approved` como `Completado`.
- Aprobación debe ir por RPC/Edge admin, no update directo.

### `sms_inventory`, `inventory_purchases`, `inventory_transactions`

Usos:

- `backoffice /dashboard` usa `get_dashboard_stats`, `inventory_purchases`, `add_sms_to_inventory`.
- `backoffice /recharges` lee inventario.

Recomendación:

- Compra inventario: RPC `add_sms_to_inventory`.
- Salida inventario: RPC `approve_recharge`.
- No updates directos desde frontend.

### `sms_packages`

Usos:

- `backoffice /recharges` lee paquetes activos.

Recomendación:

- Seed de paquetes comerciales se hace después con script controlado, no en `schema_final.sql`.

## 7. Services shared

| Service | Estado actual | Acción recomendada |
|---|---|---|
| `SupabaseService` | Real, configura cliente anon | Mantener. |
| `AuthService` | Real, auth + admins | Mantener, limpiar formatting luego. |
| `SmsService` | Stub | Implementar contra Edge `send-sms`. |
| `RechargesService` | Stub | Implementar contra RPC/Edge de recargas. |
| `ApiKeysService` | Stub | Implementar contra Edge `create-api-key` / `revoke-api-key`. |
| `BackofficeService` | Stub | Implementar dashboard/inventario/admin ops. |
| `CreditsService` | Stub | Implementar lectura `profiles.credits`. |

## 8. Edge Functions necesarias

### Core

| Edge Function | Motivo |
|---|---|
| `send-sms` | Único punto autorizado para envío real, validación auth/API key, deducción créditos, llamada proveedor, insert `sms_messages`. |
| `sms-webhook` | Recibir delivery del proveedor y actualizar `sms_messages`. |
| `create-api-key` | Generar API key server-side, guardar hash, devolver plaintext una vez. |
| `revoke-api-key` | Revocar API key de forma controlada. |

### Opcionales posteriores

| Edge Function | Motivo |
|---|---|
| `request-recharge` | Si se crea recarga desde cliente sin WhatsApp manual. |
| `recharge-webhook` | Si proveedor externo/Corporate crea recargas. |
| `sync-packages`, `sync-users` | Si Corporate API se conecta. |
| `send-low-balance-alerts` | Si alertas pasan a producción. |
| `upload-integration-kit` | Si storage real de kit se activa. |

## 9. RPC / SQL functions necesarias

### Core

| Function | Motivo |
|---|---|
| `is_admin()` | RLS y guards SQL. |
| `handle_new_user()` | Crear `profiles` al registrar usuario. |
| `update_updated_at()` | Mantener timestamps. |
| `get_dashboard_stats()` | Backoffice dashboard. |
| `add_sms_to_inventory()` | Compra inventario mayorista segura. |
| `approve_recharge()` | Admin aprueba, acredita créditos y descuenta inventario en una transacción. |
| `reject_recharge()` | Admin rechaza sin acreditar. |

### No copiar ahora

- `get_marketing_stats`
- `get_revenue_trends`
- `get_customer_acquisition_stats`
- `get_top_customers`
- `get_low_balance_config`
- `update_low_balance_config`
- `get_alert_statistics`
- `get_recent_alerts`
- `sync_package_from_corporate_api`
- `confirm_recharge_from_corporate_api`
- `sync_or_create_user_from_corporate_api`
- `create_recharge_from_corporate_api`

## 10. Variables de entorno necesarias

### Angular

- `supabaseUrl`
- `supabaseAnonKey`

### Edge Functions

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SMS_PROVIDER_BASE_URL`
- `SMS_PROVIDER_API_KEY`
- `SMS_PROVIDER_SENDER_ID`
- `API_KEY_PEPPER`
- `CORPORATE_WEBHOOK_SECRET` opcional
- `SMS_WEBHOOK_SECRET` opcional

No poner secrets en repo. Solo placeholders en docs/env examples.

## 11. RLS requerido

Base:

- `profiles`: usuario ve/actualiza lo propio; admin ve/actualiza todos.
- `admins`: admin activo ve admins; usuario puede leer su propia fila admin para guard.
- `templates`: usuario CRUD propio; admin lectura global.
- `api_keys`: usuario lee sus previews; creación/revocación por Edge/service role; admin lectura global.
- `sms_messages`: usuario lee propios; insert/update por service role; admin lee global.
- `recharges`: usuario lee propios y puede crear pending; admin lee todos; aprobación/rechazo por RPC/admin.
- `sms_packages`: lectura para usuarios autenticados; admin gestiona.
- `sms_inventory`: admin lectura; escritura solo RPC/service role.
- `inventory_purchases`: admin lectura; escritura solo RPC.
- `inventory_transactions`: admin lectura; escritura solo RPC/service role.
- `sms_provider_config`: admin lectura/config no secreta; secrets en env.

## 12. Inconsistencias Angular a corregir antes de conectar producción

1. `backoffice/users-page.component.ts` usa `from('users')`.
   - Cambiar a `profiles`.

2. `backoffice/recharges-page.component.ts` usa:
   - `from('users')`
   - relación `user:users(...)`
   - Cambiar a `profiles` y relación `user:profiles(...)`.

3. `sms-client/api-keys-page.component.ts` lee columna `key`.
   - Cambiar a `key_prefix/key_suffix` o `key_preview`.
   - Creación vía Edge `create-api-key`.

4. `sms-client/send-sms-page.component.ts` calcula costo con `0.08` pero compara contra `credits`.
   - Definir `credits` como SMS disponibles.
   - Deducir segmentos, no soles.

5. `sms-client/recharges-page.component.ts` espera status `completed`.
   - Mapear `approved` como completado o alinear enum.

6. Backoffice `/api-keys`, `/messages`, `/alerts`, `/invoices`, `/marketing`, `/sync`, `/integration-kit` están visual seguro.
   - No conectar tablas opcionales hasta definir backend.

## 13. Basura / QA / legacy no usada

Basura o no-core:

- Tabla real `users` de backoffice legacy.
- Duplicados `provider_config` vs `sms_provider_config`.
- `integration_api_keys` duplicado con `api_keys`.
- Sync Corporate completo hasta que exista contrato real.
- Low balance alerts hasta que se apruebe flujo.
- Blog DB hasta que el blog deje de ser estático.
- Storage `integration-kits` hasta que se active upload real.
- Edge functions antiguas duplicadas:
  - `notify-backoffice`
  - `sync-user-backoffice`
  - `platform-api-users`
  - `platform-api-recharges`
  - `platform-notify-webhook`
  - `query-recharge`
  - `request-recharge` si WhatsApp manual sigue vigente

## 14. Estructura mínima nueva Supabase

Crear desde cero:

1. Extensiones: `pgcrypto`.
2. Enums: roles/status.
3. Tablas core.
4. Triggers de `updated_at`.
5. Trigger `auth.users -> profiles`.
6. RLS + policies.
7. RPCs core.
8. Edge functions core.
9. Seeds controlados separados:
   - admins iniciales
   - paquetes SMS
   - config proveedor no secreta

`schema_final.sql` no incluye clientes, API keys reales ni secrets.

## 15. Conclusión: schema recomendado producción

Usar `profiles` como tabla única de clientes. `admins` solo permiso admin. No copiar todo Supabase viejo. Llevar solo tablas core operativas: perfiles, admins, paquetes, recargas, inventario, mensajes, plantillas, API keys seguras y config proveedor no secreta.

El resto queda fuera hasta que Angular deje modo visual seguro y exista contrato backend real.

