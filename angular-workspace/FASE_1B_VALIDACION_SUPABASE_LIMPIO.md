# FASE 1B - Validacion Supabase limpio

## Alcance

Esta fase no modifica Angular ni DB. Solo define contrato esperado y entrega SQL de diagnostico seguro (`SELECT` only) para correr en Supabase real antes de FASE 2.

Archivos revisados:

- `angular-workspace/FASE_1_AUTH_PROFILES_ADMINS_RESULTADO.md`
- `SUPABASE_FINAL_UNIFICADO.md`
- `supabase_final/schema_final.sql`
- Migraciones legacy bajo `sms/supabase/migrations`
- Migraciones legacy bajo `backoffice/supabase/migrations`

No encontrados en workspace:

- `ANALISIS_SMS_LEGACY_PARA_ANGULAR.md`
- `ANALISIS_BACKOFFICE_LEGACY_PARA_ANGULAR.md`

## Tablas que debe tener Supabase limpio ahora

Base identidad y FASE 1/2:

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

Internas de Supabase/Auth:

- `auth.users`

## Tablas que NO debe tener todavia

No deben existir en Supabase limpio FASE 1B:

- `users`
- `provider_config`
- `integration_api_keys`
- `integration_webhooks`
- `platform_sync_config`
- `sync_logs`
- `external_recharge_mapping`
- `external_package_mapping`

Tambien no cargar por ahora:

- `campaigns`
- `sms_quotas`
- `webhook_config`
- `webhook_logs`
- `sms_delivery_webhooks`
- `recharge_status_events`
- `integration_logs`
- `blog_categories`
- `blog_posts`
- `low_balance_config`
- `low_balance_alerts`

## Columnas minimas de `profiles`

Requeridas para FASE 1 + FASE 2:

- `id uuid primary key references auth.users(id)`
- `email text`
- `full_name text`
- `razon_social text`
- `ruc text`
- `phone text`
- `is_active boolean`
- `credits bigint` o numerico equivalente
- `total_spent numeric`
- `created_at timestamptz`
- `updated_at timestamptz`

No usar para permisos:

- `role`

Si `role` existe, no debe participar en login, guards, RLS admin ni RPC admin.

## Columnas minimas de `admins`

Requeridas:

- `id uuid primary key references auth.users(id)`
- `email text`
- `full_name text`
- `is_active boolean`
- `created_at timestamptz`
- `updated_at timestamptz`

Permitido si se decide mantener niveles admin:

- `role` solo dentro de `admins`, nunca en `profiles`.

Contrato clave:

- `admins.id` debe ser igual a `auth.users.id`.
- Admin activo = fila en `admins` con `is_active = true`.

## RLS esperada para `profiles`

RLS debe estar habilitado.

Policies minimas:

- Cliente autenticado puede leer su propio perfil: `id = auth.uid()`.
- Admin activo puede leer perfiles: `public.is_admin()`.
- Cliente puede actualizar solo campos permitidos de su propio perfil si se habilita edicion.
- Admin activo puede actualizar perfiles si la operacion backoffice lo requiere.
- Nadie debe leer/escribir perfiles por `profiles.role`.

Patron aceptable:

- `profiles_select_own_or_admin`
- `profiles_update_own_or_admin`

## RLS esperada para `admins`

RLS debe estar habilitado.

Policies minimas:

- Admin autenticado puede leer su propia fila: `id = auth.uid()`.
- Admin activo puede leer admins si backoffice lo requiere: `public.is_admin()`.
- Gestion de admins debe quedar restringida a super admin o service role.
- Login admin debe poder leer `admins.id`, `admins.email`, `admins.full_name`, `admins.is_active`.

Patron aceptable:

- `admins_select_self_or_admin`
- `admins_manage_super_admin`

## Si existe tabla `users`

Problemas:

- Duplica `profiles` como fuente de clientes.
- Rompe contrato Angular FASE 1: cliente vive en `profiles`.
- Puede crear FK nuevas hacia `users` y bloquear `recharges.user_id -> profiles.id`.
- Puede reintroducir migraciones legacy de backoffice.
- Puede causar divergence de saldo: `users.sms_balance` vs `profiles.credits`.
- Puede exponer RLS/policies antiguas no revisadas.

Accion:

- No crear `users`.
- No usar `users`.
- Si existe en DB real, marcar critico y planificar correccion no destructiva revisada antes de FASE 2.

## Si `profiles` todavia tiene `role`

Problemas:

- Invita a volver a usar `profiles.role` para permisos admin.
- Contradice FASE 1: permisos admin viven en `admins`.
- RPCs como `get_dashboard_stats()` pueden contar clientes con `p.role = 'client'`, ocultando clientes reales si falta role o tiene valor incorrecto.
- Policies legacy pueden usar `profiles.role = 'admin'` y saltarse `admins`.

Accion:

- No usar `profiles.role`.
- Detectar RPCs/policies que referencian `profiles.role`.
- Corregir antes de FASE 2 cualquier RPC necesario para recargas/dashboard que dependa de `profiles.role`.

## Si existe `api_keys.key` en texto plano

Problemas:

- Filtracion de DB expone API keys reales.
- RLS mal configurado podria permitir lectura de secrets.
- No hay rotacion segura si se guarda plaintext.
- UI cliente puede terminar mostrando secreto persistido.

Contrato seguro:

- Guardar `key_hash`, `key_prefix`, `key_suffix`.
- Devolver key plaintext solo una vez desde Edge Function `create-api-key`.
- `send-sms` debe verificar hash server-side.

## Si `sms_provider_config` guarda `api_key`/`api_secret`

Problemas:

- Secrets del proveedor SMS quedan en tabla consultable.
- Backoffice/admin leak expone proveedor.
- Backups y logs DB pasan a contener secretos.

Contrato seguro:

- `sms_provider_config` solo guarda config no secreta: `provider_name`, `base_url`, `sender_id`, `is_active`.
- Secrets viven en variables de entorno de Edge Functions.

## Hallazgos locales antes de correr SQL real

- `supabase_final/schema_final.sql` no crea tabla `users`.
- `supabase_final/schema_final.sql` usa `api_keys.key_hash`, `key_prefix`, `key_suffix`; no define `api_keys.key`.
- `supabase_final/schema_final.sql` define `sms_provider_config` sin `api_key` ni `api_secret`.
- `supabase_final/schema_final.sql` todavia define `profiles.role`.
- `supabase_final/schema_final.sql` tiene `get_dashboard_stats()` con `p.role = 'client'`.
- Migraciones legacy si aparecen en DB real son riesgo: varias crean/alteran `users`, `provider_config`, `integration_api_keys`, `integration_webhooks`, `platform_sync_config`, `sync_logs`, mappings externos y secretos en tablas.

## Resultado esperado para FASE 2

Para iniciar FASE 2 sin deuda critica:

- `profiles` existe y tiene columnas minimas.
- `admins` existe y tiene columnas minimas.
- `users` no existe.
- `recharges.user_id` referencia `profiles.id`.
- Ninguna FK referencia `users`.
- RLS de `profiles` y `admins` habilitado.
- Policies de admin dependen de `admins`/`is_admin()`, no de `profiles.role`.
- RPCs necesarios para dashboard/recargas no dependen de `profiles.role`.
- `api_keys` no tiene `key`/`api_key` plaintext.
- `sms_provider_config` no tiene `api_key`/`api_secret`.
