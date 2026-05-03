# FASE 6B - Proveedor SMS real individual

## Estado final

LISTO para aplicar SQL, configurar secrets y desplegar Edge Function.

Modo test sigue intacto. Modo prod ahora implementa login proveedor + envío individual real + persistencia/descuento por RPC segura.

## Archivos modificados

- `supabase/functions/send-sms/index.ts`
- `supabase/migrations/20260502230000_sms_provider_prod_rpcs.sql`
- `FASE_6B_PROVIDER_REAL_INDIVIDUAL_RESULTADO.md`

No se modificó Angular.
No se tocaron recargas/inventario.
No se creó tabla `users`.
No se usó `profiles.role`.

## Migración creada

Archivo:

- `supabase/migrations/20260502230000_sms_provider_prod_rpcs.sql`

RPCs:

- `public.internal_validate_sms_send`
- `public.internal_send_sms_provider_success`
- `public.internal_register_sms_failed`

Grants:

- revoke a `public`, `anon`, `authenticated`
- grant execute a `service_role`

Si Supabase CLI/local no acepta `service_role`, ejecutar SQL en dashboard y confirmar grants manualmente.

## RPC: internal_validate_sms_send

Entrada:

```sql
p_user_id uuid
p_recipient text
p_message text
```

Valida:

- mensaje no vacío
- teléfono Perú
- profile existe
- profile activo
- segmentos con `public.calculate_sms_segments`
- créditos suficientes

No descuenta.
No inserta `sms_messages`.

Devuelve:

```json
{
  "success": true,
  "user_id": "...",
  "recipient": "+51956062256",
  "provider_recipient": "51956062256",
  "segments": 1,
  "cost": 1,
  "credits_before": 10
}
```

## RPC: internal_send_sms_provider_success

Valida de nuevo:

- profile existe
- profile activo
- créditos suficientes con lock `for update`

Luego:

- descuenta `profiles.credits = credits - segments`
- inserta `sms_messages`
- status `sent`
- `sent_at = now()`
- guarda `provider_response`
- guarda `provider_message_id` si existe

Devuelve:

```json
{
  "success": true,
  "message_id": "...",
  "recipient": "+51956062256",
  "segments": 1,
  "cost": 1,
  "status": "sent",
  "test_mode": false
}
```

## RPC: internal_register_sms_failed

Inserta `sms_messages` con:

- status `failed`
- no descuenta créditos
- guarda `error_message`
- guarda `provider_response`

Devuelve:

```json
{
  "success": false,
  "message_id": "...",
  "status": "failed",
  "error_message": "..."
}
```

## Edge Function prod

Modo:

```text
SMS_PROVIDER_MODE=prod
```

Flujo:

1. valida Supabase user con Bearer del cliente.
2. lee `recipient`, `message`.
3. llama `internal_validate_sms_send`.
4. login proveedor.
5. envía SMS individual.
6. si proveedor OK, llama `internal_send_sms_provider_success`.
7. si proveedor falla después del preflight, llama `internal_register_sms_failed`.
8. responde formato compatible a Angular.

## Login proveedor

Endpoint:

```text
POST ${SMS_PROVIDER_API_URL}/v1/api/login
Content-Type: application/x-www-form-urlencoded
```

Body:

```text
usuario=<SMS_PROVIDER_USERNAME>
password=<SMS_PROVIDER_PASSWORD>
```

Éxito si:

- HTTP 2xx
- `code === "0"`
- `message === "OK"`
- `data.token` existe

Token:

- si viene `Bearer ey...`, se usa tal cual
- si viene sin `Bearer`, se antepone
- no se loguea
- no se guarda en DB

## Envío proveedor

Endpoint:

```text
POST ${SMS_PROVIDER_API_URL}/v1/api/sms/individual
Authorization: Bearer <token>
Content-Type: application/json
```

Body:

```json
{
  "telefono": "51956062256",
  "mensaje": "Texto SMS"
}
```

Éxito si:

- HTTP 2xx
- `code === "0"`
- `message === "OK"`
- `data.codigo === "OK"`

Provider:

```text
fortuna_services
```

## Normalización teléfono

Acepta:

- `+51956062256`
- `51956062256`
- `956062256`

Interno:

```text
recipient = +51956062256
```

Proveedor:

```text
provider_recipient = 51956062256
```

## Evitar doble descuento

Estrategia aplicada:

- preflight valida saldo sin descontar
- proveedor real se llama una vez
- success RPC vuelve a validar saldo con `for update`
- descuento e insert ocurren juntos después de respuesta OK proveedor
- failed RPC no descuenta

Riesgo conocido:

- si proveedor envía OK pero success RPC falla por carrera de saldo, SMS ya fue enviado y no queda descontado/registrado como sent.
- mitigación futura: reserva/idempotency key o RPC de reserva previa.

## Errores mapeados

- `INVALID_PHONE`
- `EMPTY_MESSAGE`
- `INSUFFICIENT_CREDITS`
- `PROFILE_INACTIVE`
- `PROFILE_NOT_FOUND`
- `NOT_AUTHORIZED`
- `PROVIDER_NOT_CONFIGURED`
- `PROVIDER_AUTH_FAILED`
- `PROVIDER_REQUEST_FAILED`
- `PROVIDER_TIMEOUT`
- `PROVIDER_INVALID_RESPONSE`

## Secrets requeridos

```bash
supabase secrets set SMS_PROVIDER_MODE=prod
supabase secrets set SMS_PROVIDER_API_URL=https://services-fortuna.com
supabase secrets set SMS_PROVIDER_USERNAME="<usuario proveedor>"
supabase secrets set SMS_PROVIDER_PASSWORD="<password proveedor>"
supabase secrets set SMS_PROVIDER_TIMEOUT_MS=10000
```

No usar:

```text
SMS_PROVIDER_TOKEN fijo
```

## Aplicar migración

```bash
supabase db push
```

O SQL manual desde dashboard Supabase:

```text
supabase/migrations/20260502230000_sms_provider_prod_rpcs.sql
```

## Deploy

```bash
supabase functions deploy send-sms
```

Para mantener test:

```bash
supabase secrets set SMS_PROVIDER_MODE=test
supabase functions deploy send-sms
```

## Pruebas manuales recomendadas

### Test mode

1. `SMS_PROVIDER_MODE=test`
2. enviar SMS desde `/dashboard/send`
3. confirmar crédito descuenta
4. confirmar `sms_messages.status = sent`
5. confirmar `provider_response.test_mode = true`

### Prod mode

1. aplicar migración
2. configurar secrets prod
3. deploy Edge Function
4. usuario con créditos suficientes
5. enviar a `+51956062256`
6. confirmar provider responde OK
7. confirmar crédito descuenta
8. confirmar `sms_messages.status = sent`
9. confirmar `provider_response.provider = fortuna_services`
10. probar número inválido
11. probar créditos insuficientes
12. probar password proveedor erróneo en ambiente controlado

## Riesgos pendientes

- proveedor no devuelve ID real de mensaje; `provider_message_id` queda null.
- sin delivery webhook, no hay `delivered` real.
- sin idempotency key, retry manual puede duplicar envío.
- sin rate limit, provider puede rechazar ráfagas.
- token login no cacheado; cada SMS hace login.
- falta bulk real.
- falta archivo/plantilla provider.

## Siguiente fase recomendada

FASE 6C:

- prueba controlada prod con secrets reales
- capturar responses provider reales
- ajustar mapping si cambia contrato
- agregar webhook/polling delivery si proveedor lo ofrece
- diseñar idempotency/rate limit antes de bulk
