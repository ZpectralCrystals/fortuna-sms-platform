# FASE 6A - Provider Adapter + modo test/prod SMS

## Estado final

LISTO.

`send-sms` quedó preparado con modo `test|prod` por environment variable. Modo test sigue usando `internal_send_sms_test`. Modo prod queda bloqueado de forma segura con `PROVIDER_NOT_CONFIGURED` hasta tener endpoint real funcional y RPC final de persistencia/descuento.

## Arquitectura propuesta

Angular mantiene único punto de entrada:

```ts
supabase.functions.invoke('send-sms', {
  body: { recipient, message }
})
```

Edge Function:

```text
Angular
→ send-sms Edge Function
→ auth.getUser(token)
→ SMS_PROVIDER_MODE
   → test: internal_send_sms_test
   → prod: sendWithRealProvider placeholder
```

## Archivos modificados

- `supabase/functions/send-sms/index.ts`
- `FASE_6A_PROVIDER_ADAPTER_DISENO_RESULTADO.md`

No se modificó Angular.
No se modificó DB.

## Modo test/prod

Variable:

```text
SMS_PROVIDER_MODE = "test" | "prod"
```

Default seguro:

```text
test
```

Modo test:

- provider: `internal_test`
- test_mode: `true`
- no llama APIs externas
- llama RPC `internal_send_sms_test`
- conserva descuento de créditos actual
- conserva insert en `sms_messages`
- mantiene respuesta compatible

Modo prod:

- función placeholder: `sendWithRealProvider(...)`
- no llama endpoints reales todavía
- si falta configuración, retorna `PROVIDER_NOT_CONFIGURED`
- no descuenta créditos
- no registra como `sent`
- no expone secrets

## Variables env necesarias

Actuales:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Futuro proveedor:

- `SMS_PROVIDER_MODE`
- `SMS_PROVIDER_API_URL`
- `SMS_PROVIDER_API_KEY`
- `SMS_PROVIDER_USERNAME`
- `SMS_PROVIDER_PASSWORD`
- `SMS_PROVIDER_SENDER_ID`
- `SMS_PROVIDER_TIMEOUT_MS`

Reglas:

- no hardcodear valores
- no poner secrets en Angular
- no poner secrets en tablas
- no loguear secrets

## Contrato provider adapter

Request:

```ts
type SmsProviderRequest = {
  userId: string;
  recipient: string;
  message: string;
  segments: number;
};
```

Result:

```ts
type SmsProviderResult = {
  success: boolean;
  provider: string;
  providerMessageId?: string;
  providerResponse?: unknown;
  errorMessage?: string;
  rawStatus?: string;
};
```

Implementación interna agrega campos de compatibilidad para response actual:

- `messageId`
- `recipient`
- `segments`
- `cost`
- `status`
- `testMode`

## Respuesta compatible

Se mantiene:

```json
{
  "success": true,
  "message_id": "...",
  "recipient": "+51999999999",
  "segments": 1,
  "cost": 1,
  "status": "sent",
  "test_mode": true
}
```

## Estrategia de errores

Mapeados:

- `INVALID_PHONE`
- `EMPTY_MESSAGE`
- `INSUFFICIENT_CREDITS`
- `PROFILE_INACTIVE`
- `PROFILE_NOT_FOUND`
- `NOT_AUTHORIZED`
- `PROVIDER_NOT_CONFIGURED`
- `PROVIDER_REQUEST_FAILED`
- `PROVIDER_TIMEOUT`
- `PROVIDER_INVALID_RESPONSE`

Mensajes usuario:

- `PROVIDER_NOT_CONFIGURED` → `Proveedor SMS real aún no configurado.`
- `PROVIDER_REQUEST_FAILED` → `No se pudo conectar con el proveedor SMS.`
- `PROVIDER_TIMEOUT` → `El proveedor SMS no respondió a tiempo.`
- `PROVIDER_INVALID_RESPONSE` → `Respuesta inválida del proveedor SMS.`

## Estrategia anti doble descuento

Estado actual:

- modo test descuenta dentro de `internal_send_sms_test`
- modo prod no descuenta todavía

Estrategia recomendada para FASE 6B:

1. validar sesión
2. validar perfil activo y saldo suficiente
3. calcular segmentos/costo
4. llamar proveedor real con timeout
5. si proveedor acepta, registrar éxito y descontar créditos por RPC atómica
6. si proveedor falla, registrar failed opcional sin descontar
7. usar idempotency key para evitar doble envío/descuento

RPC futura recomendada:

- `internal_send_sms_provider_success`
- `internal_register_sms_failed`

O una RPC única atómica equivalente.

## Cómo conectar proveedor real cuando entreguen endpoint

En `sendWithRealProvider(...)`:

1. leer envs con `getRealProviderConfig()`
2. validar config
3. construir payload provider
4. usar `AbortController` con `SMS_PROVIDER_TIMEOUT_MS`
5. llamar `fetch(config.apiUrl, ...)`
6. parsear JSON/text seguro
7. mapear respuesta provider a `SmsProviderResult`
8. no loguear payload con secrets
9. si success, llamar RPC futura de persistencia/descuento
10. si failed, devolver error mapeado

## Comandos deploy/secrets sugeridos

Deploy:

```bash
supabase functions deploy send-sms
```

Secrets test:

```bash
supabase secrets set SMS_PROVIDER_MODE=test
```

Secrets prod futuro:

```bash
supabase secrets set SMS_PROVIDER_MODE=prod
supabase secrets set SMS_PROVIDER_API_URL="https://..."
supabase secrets set SMS_PROVIDER_API_KEY="..."
supabase secrets set SMS_PROVIDER_USERNAME="..."
supabase secrets set SMS_PROVIDER_PASSWORD="..."
supabase secrets set SMS_PROVIDER_SENDER_ID="..."
supabase secrets set SMS_PROVIDER_TIMEOUT_MS="10000"
```

Solo configurar secrets reales cuando proveedor entregue endpoint validado.

## Checklist cuando tengamos endpoint real

- endpoint base confirmado
- método HTTP
- auth header/body confirmado
- sender id confirmado
- formato request single SMS
- formato response success
- formato response error
- códigos error proveedor
- timeout recomendado
- límites rate
- idempotency key soportada o estrategia propia
- webhook delivery status
- sandbox/prod separados
- encoding/segmentación confirmada
- costo por SMS confirmado

## Qué queda pendiente para FASE 6B

- implementar `sendWithRealProvider` real
- crear RPC de persistencia/descuento prod
- definir registro failed sin descuento
- idempotencia
- retries controlados
- webhook delivery
- modo test/prod observable en logs seguros
- pruebas con sandbox proveedor

## Riesgos pendientes

- Sin endpoint real no se puede validar contrato final.
- Sin RPC prod atómica habría riesgo de doble descuento si se implementa mal.
- Sin webhook delivery, estado `delivered` dependerá de polling o quedará pendiente.
- Sin rate limit, provider podría rechazar tráfico alto.
- Sin idempotencia, retry manual podría duplicar envío.
