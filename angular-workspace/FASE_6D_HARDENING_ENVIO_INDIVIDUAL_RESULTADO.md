# FASE 6D - Hardening producción envío individual real

## Estado final

PARCIAL.

Código, migración y build quedaron OK. Falta aplicar SQL en Supabase y desplegar Edge Function `send-sms` para que producción quede endurecida en runtime.

## Archivos modificados

- `supabase/functions/send-sms/index.ts`
- `supabase/migrations/20260503100000_sms_send_hardening.sql`
- `projects/shared/src/lib/models/sms.model.ts`
- `projects/shared/src/lib/services/sms.service.ts`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.ts`
- `FASE_6D_HARDENING_ENVIO_INDIVIDUAL_RESULTADO.md`

## SQL / migración creada

Archivo:

```text
supabase/migrations/20260503100000_sms_send_hardening.sql
```

Incluye:

- `public.sms_send_attempts`
- RLS para lectura propia de cliente
- RLS para lectura admin con `public.is_admin()`
- `grant select` a `authenticated`
- sin grants directos de insert/update/delete a `authenticated`
- RPC service-definer para iniciar/completar intentos

## Tabla creada

`public.sms_send_attempts`

Campos clave:

- `user_id`
- `idempotency_key`
- `recipient`
- `provider_recipient`
- `message`
- `message_hash`
- `segments`
- `cost`
- `status`: `processing`, `sent`, `failed`
- `sms_message_id`
- `provider`
- `provider_response`
- `error_message`
- `started_at`
- `completed_at`
- `expires_at`

Constraints:

- `unique(user_id, idempotency_key)`
- `segments > 0`
- `cost >= 0`
- status controlado

Índices:

- `user_id, created_at desc`
- `status`
- `expires_at`
- `sms_message_id`

## RPC creadas

### `public.internal_begin_sms_send_attempt(...)`

Hace:

- valida `p_user_id`
- valida `idempotency_key`
- valida mensaje
- normaliza teléfono:
  - `+51956062256` -> `+51956062256`
  - `51956062256` -> `+51956062256`
  - `956062256` -> `+51956062256`
- calcula `provider_recipient = 51956062256`
- calcula segmentos con `public.calculate_sms_segments`
- calcula `cost = round((segments * 0.08)::numeric, 4)`
- bloquea perfil con `FOR UPDATE`
- valida cuenta activa
- valida créditos disponibles
- reserva lógica: resta intentos `processing` no expirados antes de permitir otro envío
- rate limit: máximo 30 intentos `processing/sent` en 60 segundos
- crea attempt `processing`
- no descuenta créditos
- no inserta `sms_messages`

### `public.internal_complete_sms_send_success(...)`

Hace:

- bloquea attempt con `FOR UPDATE`
- si ya está `sent`, devuelve resultado existente
- bloquea profile con `FOR UPDATE`
- valida créditos suficientes otra vez
- descuenta `profiles.credits = credits - segments`
- inserta `sms_messages` con `status = sent`
- marca attempt `sent`
- guarda `sms_message_id`, provider, response, timestamps

### `public.internal_complete_sms_send_failed(...)`

Hace:

- bloquea attempt con `FOR UPDATE`
- si ya está `sent`, no lo convierte a `failed`
- inserta `sms_messages` con `status = failed`
- no descuenta créditos
- marca attempt `failed`
- guarda provider, response, error y timestamps

## Idempotencia

Angular genera `idempotency_key` con `crypto.randomUUID()` al iniciar envío.

Payload a Edge:

```json
{
  "recipient": "+51956062256",
  "message": "Texto SMS",
  "idempotency_key": "uuid"
}
```

Edge también acepta header:

```text
Idempotency-Key: <key>
```

Prioridad:

1. `body.idempotency_key`
2. header `Idempotency-Key`
3. fallback `crypto.randomUUID()`

Validación:

- 8 a 120 caracteres
- letras, números, `.`, `_`, `-`

## Cómo evita doble envío

- `unique(user_id, idempotency_key)` impide duplicar mismo intento.
- Si mismo key está `processing`, RPC devuelve `SMS_SEND_ALREADY_PROCESSING`.
- Si mismo key ya está `sent`, RPC devuelve `already_processed=true` sin llamar proveedor otra vez.
- Angular deshabilita botón mientras `sending=true`.
- Retry manual usa nueva key.

## Cómo evita doble descuento

- Créditos solo se descuentan en `internal_complete_sms_send_success`.
- RPC bloquea attempt `FOR UPDATE`.
- Si attempt ya está `sent`, devuelve existente y no descuenta otra vez.
- RPC bloquea profile `FOR UPDATE` antes de descontar.
- Begin no descuenta, pero reserva capacidad restando intentos `processing` no expirados para evitar sobreventa concurrente.
- Failed no descuenta.

## Rate limit

RPC corta si usuario tiene 30 intentos `processing/sent` en últimos 60 segundos.

Error:

```text
RATE_LIMIT_EXCEEDED
```

HTTP:

```text
429
```

Mensaje usuario:

```text
Has enviado demasiados SMS en poco tiempo. Intenta nuevamente en unos segundos.
```

## Cambios Edge Function

Prod antes:

```text
validate_sms_send -> login provider -> send provider -> success/failed RPC
```

Prod ahora:

```text
begin attempt -> login provider -> send provider -> complete success/failed
```

Test:

```text
internal_send_sms_test
```

Modo test queda compatible. Hardening fuerte aplica a prod.

Logs:

- no token
- no password
- no Authorization
- no service role
- no mensaje completo
- log seguro: `request_id`, `user_id`, `provider`, `status`, `error_code`, `duration_ms`

Provider response se sanitiza antes de guardar:

- `token`
- `password`
- `authorization`
- `api_key`
- `secret`

## Cambios Angular

`SmsSendRequest` ahora soporta:

```ts
idempotency_key?: string;
```

`SmsService.sendSingle()` envía:

```ts
{
  recipient,
  message,
  idempotency_key
}
```

`send-sms-page`:

- genera key al iniciar envío
- guarda key mientras `sending=true`
- evita doble click con guard temprano
- mantiene botón deshabilitado mientras envía
- retry luego de error usa nueva key

## Errores nuevos mapeados

- `INVALID_IDEMPOTENCY_KEY`
- `SMS_SEND_ALREADY_PROCESSING`
- `SMS_SEND_ALREADY_FAILED_USE_NEW_KEY`
- `RATE_LIMIT_EXCEEDED`
- `DUPLICATE_SEND_ATTEMPT`
- `SMS_SEND_ATTEMPT_NOT_FOUND`

Mensajes usuario:

- `Este envío ya está en proceso. Espera unos segundos.`
- `Este envío ya fue procesado.`
- `Has enviado demasiados SMS en poco tiempo. Intenta nuevamente en unos segundos.`
- `No se pudo validar este envío. Intenta nuevamente.`

## Resultado build

`npm run build`: OK.

Builds:

- `sms-client`: OK
- `backoffice-admin`: OK

Nota: Node.js `v25.9.0` muestra warning por versión impar no LTS. No bloquea.

## Resultado checks

`git diff --check`: OK.

`git diff --stat`:

```text
 .../projects/shared/src/lib/models/sms.model.ts    |   1 +
 .../shared/src/lib/services/sms.service.ts         |   3 +-
 .../app/dashboard/pages/send-sms-page.component.ts |  22 +-
 .../supabase/functions/send-sms/index.ts           | 418 ++++++++++++++-------
 4 files changed, 300 insertions(+), 144 deletions(-)
```

Nota: archivos nuevos no aparecen en `git diff --stat` hasta estar staged:

- `supabase/migrations/20260503100000_sms_send_hardening.sql`
- `FASE_6D_HARDENING_ENVIO_INDIVIDUAL_RESULTADO.md`

## Resultados rg

### users / profiles.role

Sin resultados.

### service_role / secrets en Angular

Sin resultados en `projects`.

### inserts/updates críticos en Angular

Sin resultados.

### credenciales proveedor

Resultado esperado:

```text
supabase/functions/send-sms/index.ts:    password: getEnv("SMS_PROVIDER_PASSWORD"),
```

No apareció:

- `admin.fortuna`
- `Fortun@`
- `sb_secret`
- `Bearer ey`

No hay credencial hardcodeada.

### hardening

Encontrado en `projects` / `supabase`:

- `sms_send_attempts`
- `idempotency`
- `RATE_LIMIT_EXCEEDED`
- `SMS_SEND_ALREADY_PROCESSING`

## Requiere ejecutar SQL

Sí.

Opciones:

```bash
supabase db push
```

O ejecutar manualmente:

```text
supabase/migrations/20260503100000_sms_send_hardening.sql
```

## Requiere deploy

Sí.

```bash
supabase functions deploy send-sms
```

Secrets existentes deben mantenerse:

```bash
supabase secrets set SMS_PROVIDER_MODE=prod
supabase secrets set SMS_PROVIDER_API_URL=https://services-fortuna.com
supabase secrets set SMS_PROVIDER_USERNAME='<usuario>'
supabase secrets set SMS_PROVIDER_PASSWORD='<password>'
supabase secrets set SMS_PROVIDER_TIMEOUT_MS=10000
```

No usar token fijo.

## Pruebas manuales recomendadas

1. Aplicar migración.
2. Deploy Edge Function.
3. Enviar 1 SMS real desde `/dashboard/send`.
4. Confirmar:
   - `sms_send_attempts.status = sent`
   - `sms_send_attempts.sms_message_id` existe
   - `sms_messages.status = sent`
   - `sms_messages.cost = 0.0800` para 1 SMS
   - `profiles.credits` baja 1
5. Doble click rápido:
   - UI debe bloquear
   - DB no debe crear 2 sent para misma key
6. Repetir misma `idempotency_key` con curl:
   - no debe llamar proveedor otra vez
   - debe devolver resultado existente
7. Forzar 31 intentos en 60 segundos en ambiente controlado:
   - debe devolver HTTP 429
8. Probar proveedor mal configurado en staging:
   - attempt `failed`
   - sms_message `failed`
   - créditos sin descuento

## SQL validación recomendado

```sql
select
  id,
  user_id,
  idempotency_key,
  recipient,
  provider_recipient,
  segments,
  cost,
  status,
  sms_message_id,
  provider,
  error_message,
  started_at,
  completed_at,
  expires_at
from public.sms_send_attempts
order by created_at desc
limit 20;
```

```sql
select
  id,
  recipient,
  segments,
  cost,
  status,
  provider_response->>'provider' as provider,
  provider_response->>'test_mode' as test_mode,
  error_message,
  created_at,
  sent_at
from public.sms_messages
order by created_at desc
limit 20;
```

## Riesgos pendientes

- Si proveedor acepta SMS y luego DB queda totalmente caída antes de completar success, puede quedar intento `processing` hasta expirar. Falta job de reconciliación.
- No hay delivery webhook real.
- No hay id externo confiable del proveedor.
- No hay cola/outbox durable previa a proveedor.
- No hay rate limit configurable por plan.
- No hay monitoreo/alertas productivas.
- No hay envío múltiple.
- No hay API Keys.
- No hay campañas.

## Siguiente fase recomendada

FASE 6E: validación productiva del hardening:

- aplicar SQL
- deploy Edge Function
- probar idempotencia real
- probar rate limit en staging
- revisar logs
- definir job de reconciliación para attempts expirados
