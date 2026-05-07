# FASE 10A - API Keys + API pública con adaptador temporal

## Estado final

LISTO.

## Arquitectura implementada

- API pública estable: `POST /functions/v1/api-send-sms`.
- Autenticación propia por `X-API-Key` o `Authorization: Bearer`.
- Persistencia segura: API Key completa solo se muestra una vez; DB guarda SHA-256 en `key_hash`.
- Edge Function pública valida key, scope, cuenta activa, rate limit, teléfono, mensaje, créditos e idempotencia.
- Envío real queda detrás de adaptador temporal reutilizando endpoints actuales del proveedor/backend.
- Cuando existan endpoints internos con `X-Internal-Token`, solo se reemplaza adapter, no contrato público.

## Tabla `api_keys`

Migración:

- `supabase/migrations/20260511100000_api_keys_public_api.sql`

Campos:

- `id`
- `user_id`
- `name`
- `key_prefix`
- `key_hash`
- `scopes`
- `is_active`
- `last_used_at`
- `expires_at`
- `revoked_at`
- `rate_limit_per_minute`
- `rate_limit_per_day`
- `description`
- `created_at`
- `updated_at`

Reglas:

- No guarda raw API Key.
- `key_prefix` identifica la clave en UI.
- `key_hash` solo se usa en SQL/Edge Function.

## Tabla `api_request_logs`

Creada para:

- auditoría de llamadas API
- rate limit básico
- trazabilidad por `api_key_id`, `user_id`, `endpoint`, `status`, `error_code`

## RPCs creadas

- `public.create_api_key(p_name, p_scopes)`
  - valida `auth.uid()`
  - valida profile activo
  - genera `fs_live_...`
  - guarda SHA-256
  - devuelve API Key completa solo en respuesta de creación

- `public.revoke_api_key(p_key_id)`
  - cliente revoca solo keys propias

- `public.admin_revoke_api_key(p_key_id)`
  - admin revoca cualquier key
  - valida `public.is_admin()` y `admins.is_active`

## RLS / vistas seguras

- RLS activado en `api_keys` y `api_request_logs`.
- `api_keys_safe`: vista cliente sin `key_hash`.
- `admin_api_keys_safe`: vista backoffice sin `key_hash`.
- Angular lee solo vistas seguras y RPCs.

## Edge Function

Archivo:

- `supabase/functions/api-send-sms/index.ts`

Flujo:

1. valida método `POST`
2. lee API Key
3. hashea SHA-256
4. busca `api_keys.key_hash`
5. valida activa/no revocada/no expirada/scope `sms:send`
6. valida profile activo
7. aplica rate limit por `api_request_logs`
8. normaliza teléfono Perú a `+519XXXXXXXX`
9. valida mensaje e idempotency key
10. llama `internal_begin_sms_send_attempt`
11. llama adaptador temporal
12. completa éxito con `internal_complete_sms_send_success`
13. completa fallo con `internal_complete_sms_send_failed`
14. actualiza `last_used_at`
15. registra `api_request_logs`

## Adaptador temporal

Archivo:

- `supabase/functions/_shared/sms-provider-current.ts`

Técnica:

- Encapsula proveedor/backend actual:
  - login actual `/v1/api/login`
  - envío actual `/v1/api/sms/individual`
  - sanitización de respuesta
  - mapeo de errores
- En modo test devuelve éxito controlado para que `api-send-sms` registre por RPC hardening.

Comentario incluido:

- `TODO: reemplazar por adapter X-Internal-Token cuando backend externo entregue endpoints internos.`

## Futuro X-Internal-Token

Pendiente futuro:

- crear adapter interno definitivo que llame:
  - `/v1/api/internal/sms/individual`
  - `/v1/api/internal/sms/multiple`
  - `/v1/api/internal/sms/plantilla`
- headers:
  - `X-Internal-Token`
  - `X-Request-Id`
- sin cambiar endpoint público cliente.

## UI cliente API Keys

Archivos:

- `projects/sms-client/src/app/dashboard/pages/api-keys-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/api-keys-page.component.html`
- `projects/sms-client/src/app/dashboard/pages/api-keys-page.component.scss`

Funciones:

- lista API Keys propias
- crea API Key
- muestra clave completa solo una vez
- copia clave
- muestra `key_prefix`, scopes, estado, límites, fechas
- revoca key propia

No muestra:

- `key_hash`
- API Key completa después de cerrar modal

## UI Backoffice API Keys

Archivos:

- `projects/backoffice-admin/src/app/pages/api-keys-page.component.ts`
- `projects/backoffice-admin/src/app/pages/api-keys-page.component.html`
- `projects/backoffice-admin/src/app/pages/api-keys-page.component.scss`

Funciones:

- lista keys de clientes desde `admin_api_keys_safe`
- busca por cliente/email/empresa/prefijo
- filtra por estado
- muestra métricas: total, activas, revocadas, con uso
- revoca key activa con RPC admin

No muestra:

- API Key completa
- `key_hash`

## Servicio/modelo compartido

Archivos:

- `projects/shared/src/lib/models/api-key.model.ts`
- `projects/shared/src/lib/services/api-keys.service.ts`

Incluye:

- `ApiKey`
- `CreatedApiKey`
- `BackofficeApiKey`
- lectura cliente/backoffice
- crear/revocar cliente
- revocar admin

## Documentación creada

- `API_PUBLICA_SMS_FORTUNA.md`

Incluye:

- endpoint
- método
- headers
- body
- formato teléfono Perú
- ejemplo curl
- success response
- errores
- idempotency key
- rate limit
- seguridad API Key
- deploy `--no-verify-jwt`

## SQL requerido

Sí:

- aplicar `supabase/migrations/20260511100000_api_keys_public_api.sql`

No se aplicó SQL destructivo.

## Deploy requerido

Sí:

```bash
supabase functions deploy api-send-sms --no-verify-jwt
```

Motivo:

- función pública usa API Key propia, no JWT Supabase.

## Build

Comando:

```bash
source ~/.nvm/nvm.sh
nvm use 22
rm -rf .angular/cache
npm run build
```

Resultado:

- `sms-client` OK
- `backoffice-admin` OK

## git diff --check

OK. Sin whitespace errors.

## rg seguridad

Comandos:

```bash
rg "from\\('users'\\)|user:users|profiles\\.role|\\.role" projects supabase || true
rg "from\\('sms_messages'\\).*insert|from\\('profiles'\\).*update|profiles\\.credits.*=|from\\('sms_inventory'\\).*update|from\\('recharges'\\).*update" projects || true
rg "service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret|Bearer ey|provider_password|password|usuario" projects/sms-client projects/backoffice-admin projects/shared || true
rg "key_hash|api_key|fs_live|fs_test" projects supabase -n || true
```

Resultado:

- No `from('users')`.
- No `profiles.role`.
- No updates críticos directos desde Angular.
- No `service_role` en Angular.
- `password` aparece en auth/login normales.
- `api_key` aparece en sanitización y lectura de respuesta de creación.
- `key_hash` aparece solo en Edge Function/migración, no en UI Angular.

## Pruebas manuales recomendadas

1. Aplicar migración SQL.
2. Crear API Key desde cliente.
3. Copiar API Key mostrada una vez.
4. Confirmar que al cerrar modal no vuelve a verse completa.
5. Enviar SMS con curl usando `X-API-Key`.
6. Validar descuento de créditos.
7. Validar `sms_messages`.
8. Validar `sms_send_attempts`.
9. Validar `api_request_logs`.
10. Probar API Key inválida.
11. Probar API Key revocada.
12. Probar saldo insuficiente.
13. Probar teléfono inválido.
14. Probar `idempotency_key` repetida.
15. Confirmar Backoffice no muestra hash ni clave completa.
16. Revocar desde Backoffice.

## Pendientes

- Deploy de `api-send-sms`.
- Aplicar migración en Supabase.
- Probar contra proveedor real en entorno con secrets.
- Reemplazar adapter temporal por adapter `X-Internal-Token` cuando backend externo entregue endpoints internos.
- Extender API pública a multiple/plantilla en fases futuras.

## Archivos modificados

- `projects/shared/src/lib/models/api-key.model.ts`
- `projects/shared/src/lib/services/api-keys.service.ts`
- `projects/sms-client/src/app/dashboard/pages/api-keys-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/api-keys-page.component.html`
- `projects/sms-client/src/app/dashboard/pages/api-keys-page.component.scss`
- `projects/backoffice-admin/src/app/pages/api-keys-page.component.ts`
- `projects/backoffice-admin/src/app/pages/api-keys-page.component.html`
- `projects/backoffice-admin/src/app/pages/api-keys-page.component.scss`

## Archivos nuevos

- `supabase/migrations/20260511100000_api_keys_public_api.sql`
- `supabase/functions/api-send-sms/index.ts`
- `supabase/functions/_shared/sms-provider-current.ts`
- `API_PUBLICA_SMS_FORTUNA.md`
- `FASE_10A_API_KEYS_API_PUBLICA_ADAPTADOR_TEMPORAL_RESULTADO.md`
