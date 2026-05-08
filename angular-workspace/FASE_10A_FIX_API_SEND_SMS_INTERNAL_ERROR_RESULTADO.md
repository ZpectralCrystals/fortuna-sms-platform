# FASE 10A FIX - api-send-sms INTERNAL_ERROR

## Estado final

LISTO.

## Causa identificada

`api-send-sms` hacía lectura/escritura directa con service role sobre:

- `public.api_keys`
- `public.api_request_logs`

La migración inicial creó tablas/RLS/vistas/RPCs, pero no dio privilegios explícitos a `service_role` para esas tablas.

Resultado:

- request sin API Key no tocaba DB y respondía bien `API_KEY_REQUIRED`
- request con API Key llegaba a `API_KEY_LOOKUP`
- lookup sobre `api_keys` fallaba por privilegios
- catch global devolvía `INTERNAL_ERROR`
- no llegaba a `internal_begin_sms_send_attempt`
- por eso no registraba SMS

## Fix aplicado

Migración nueva:

- `supabase/migrations/20260511110000_grant_api_public_edge_service_role.sql`

SQL:

```sql
grant select, update on public.api_keys to service_role;
grant select, insert on public.api_request_logs to service_role;
```

También se aplicó en remoto con:

```bash
supabase db query --linked "grant select, update on public.api_keys to service_role; grant select, insert on public.api_request_logs to service_role;"
```

## Logging seguro agregado

Archivo:

- `supabase/functions/api-send-sms/index.ts`

Etapas agregadas:

- `ENV_CHECK`
- `API_KEY_LOOKUP`
- `PROFILE_LOOKUP`
- `RATE_LIMIT`
- `BEGIN_ATTEMPT_RPC`
- `PROVIDER_ADAPTER`
- `COMPLETE_SUCCESS_RPC`
- `COMPLETE_FAILED_RPC`

Datos logueados:

- `request_id`
- `stage`
- `api_key_id`
- `user_id`
- `key_prefix`
- status/errores
- flags de env
- params RPC esperados

No se loguea:

- API Key completa
- `key_hash`
- provider token
- passwords
- secrets

## RPC params confirmados

`internal_begin_sms_send_attempt`:

- SQL: `p_user_id`, `p_idempotency_key`, `p_recipient`, `p_message`
- Edge: coincide exacto

`internal_complete_sms_send_success`:

- SQL: `p_attempt_id`, `p_provider`, `p_provider_message_id`, `p_provider_response`
- Edge: coincide exacto

`internal_complete_sms_send_failed`:

- SQL: `p_attempt_id`, `p_provider`, `p_provider_response`, `p_error_message`
- Edge: coincide exacto

## SUPABASE_SERVICE_ROLE_KEY

Confirmado en Edge secrets con:

```bash
supabase secrets list
```

Resultado:

- `SUPABASE_SERVICE_ROLE_KEY` existe
- también existen `SUPABASE_URL`, `SUPABASE_ANON_KEY`, provider envs

## DB remoto verificado

Consulta:

```sql
select
  to_regclass('public.api_keys'),
  to_regclass('public.api_request_logs'),
  to_regprocedure('public.internal_begin_sms_send_attempt(uuid,text,text,text)'),
  to_regprocedure('public.internal_complete_sms_send_success(uuid,text,text,jsonb)'),
  to_regprocedure('public.internal_complete_sms_send_failed(uuid,text,jsonb,text)');
```

Resultado:

- `api_keys` existe
- `api_request_logs` existe
- RPC begin existe
- RPC complete success existe
- RPC complete failed existe

Privilegios `service_role` verificados en remoto.

## Deploy

Ejecutado:

```bash
supabase functions deploy api-send-sms --no-verify-jwt
```

Resultado:

- deploy OK en project `ewltnrfqwkhimnyqfrrw`

## Curl probado

Sin API Key:

- antes y después: `401 API_KEY_REQUIRED`

Con API Key inválida:

Antes:

- `500 INTERNAL_ERROR`

Después:

- `401 API_KEY_INVALID`

Respuesta actual:

```json
{
  "success": false,
  "error_code": "API_KEY_INVALID",
  "message": "API Key inválida."
}
```

No se probó envío real con API Key válida porque no hay raw API Key válida disponible en repo/logs y generarla/enviar SMS real podría descontar créditos o enviar SMS sin confirmación.

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

OK.

## git diff --stat

Resultado comando:

```text
.../supabase/functions/api-send-sms/index.ts       | 195 ++++++++++++++++++++-
1 file changed, 193 insertions(+), 2 deletions(-)
```

Nota:

- la migración nueva aparece como untracked en `git status`, no entra en `git diff --stat` hasta staging.

## Archivos modificados

- `supabase/functions/api-send-sms/index.ts`

## Archivos nuevos

- `supabase/migrations/20260511110000_grant_api_public_edge_service_role.sql`
- `FASE_10A_FIX_API_SEND_SMS_INTERNAL_ERROR_RESULTADO.md`

## No tocado

- UI
- API pública contract
- `send-sms` actual
- adapter temporal
- dashboard cliente
- backoffice UI

## Pendiente

- Probar curl real con API Key válida del cliente.
- Revisar logs Edge si apareciera otra etapa fallando después de `API_KEY_LOOKUP`.
