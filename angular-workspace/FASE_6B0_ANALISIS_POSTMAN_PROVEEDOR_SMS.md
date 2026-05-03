# FASE 6B.0 - Análisis Postman proveedor SMS Fortuna

## Estado final

LISTO.

Colección analizada:

- `Back Sms Fortuna.postman_collection.json`

Esta fase solo documenta integración. No modifica Angular, Edge Function, Supabase ni DB.

## Endpoints detectados

Base detectada:

```text
https://services-fortuna.com
```

### Login

```text
POST https://services-fortuna.com/v1/api/login
```

Auth:

- sin Bearer previo
- body `x-www-form-urlencoded`

Payload:

```text
usuario=<redacted>
password=<redacted>
```

Riesgo:

- credenciales están guardadas en colección Postman.
- deben tratarse como expuestas.
- rotar antes de producción.

### SMS individual

```text
POST https://services-fortuna.com/v1/api/sms/individual
```

Auth:

```text
Authorization: Bearer <provider_token>
```

Body:

```json
{
  "telefono": "51XXXXXXXXX",
  "mensaje": "Texto SMS"
}
```

Confirmado:

- método `POST`
- endpoint `/v1/api/sms/individual`
- usa Bearer token
- payload JSON con `telefono` y `mensaje`

Notas:

- muestra teléfono sin `+`, formato `51XXXXXXXXX`.
- nuestro frontend usa `+51XXXXXXXXX`; adapter debe normalizar antes de proveedor.

### SMS multiple

Colección:

```text
POST https://services-fortuna.com/v1/api/sms/individual
```

Auth:

```text
Authorization: Bearer <provider_token>
```

Body:

```json
{
  "telefono": "51XXXXXXXXX",
  "mensaje": "Texto SMS"
}
```

Conclusión:

- `sms multiple` duplica endpoint/body de `sms individual`.
- No representa envío múltiple real.
- No usar para implementar bulk.
- Pedir endpoint real bulk si proveedor lo ofrece.

### SMS plantilla

```text
POST https://services-fortuna.com/v1/api/sms/plantilla
```

Auth:

```text
Authorization: Bearer <provider_token>
```

Body:

```text
multipart/form-data
file=<archivo .xlsx>
```

Confirmado:

- usa `form-data`
- campo `file`
- collection apunta a archivo local `.xlsx`

No usar todavía:

- esta fase no implementa envío por archivo.
- requiere contrato de columnas, validaciones y respuesta.

## Auth detectado

Flujo inferido:

1. `POST /v1/api/login`
2. proveedor devuelve token Bearer
3. usar token en `/sms/individual` y `/sms/plantilla`

Falta confirmar:

- nombre exacto del campo token en response
- TTL/expiración
- si token es JWT siempre
- si hay refresh token
- códigos HTTP para credenciales inválidas
- formato error JSON

## Riesgos

- Colección contiene Bearer tokens de ejemplo.
- Colección contiene usuario/password.
- Tokens/credenciales deben considerarse expuestos.
- Tokens parecen temporales; no deben hardcodearse en secrets como token fijo.
- Si Edge Function hace login por cada SMS, puede aumentar latencia y fallar por rate limit.
- Si se cachea token, Edge Runtime puede no garantizar cache estable entre instancias.
- No hay ejemplos de respuestas reales.
- No hay contrato de errores proveedor.
- `sms multiple` no es bulk real.
- `sms plantilla` requiere archivo y contrato extra.

## Secrets Supabase recomendados

Guardar solo en Supabase secrets:

```text
SMS_PROVIDER_MODE=prod
SMS_PROVIDER_API_URL=https://services-fortuna.com
SMS_PROVIDER_USERNAME=<usuario proveedor>
SMS_PROVIDER_PASSWORD=<password proveedor>
SMS_PROVIDER_TIMEOUT_MS=10000
SMS_PROVIDER_SENDER_ID=<si aplica>
```

Opcional si proveedor confirma API key:

```text
SMS_PROVIDER_API_KEY=<api key proveedor>
```

No recomendado:

```text
SMS_PROVIDER_TOKEN=<token bearer pegado desde Postman>
```

Motivo:

- token puede expirar
- token fue expuesto en colección
- token fijo causa fallas silenciosas

## Qué falta para integrar

Necesario antes de FASE 6B real:

- response real de `/login`
- response success de `/sms/individual`
- response error de `/sms/individual`
- errores por teléfono inválido
- errores por token vencido
- errores por credenciales inválidas
- timeout real esperado
- límites rate
- confirmación formato teléfono: `51XXXXXXXXX` vs `+51XXXXXXXXX`
- confirmación encoding/segmentos
- si endpoint retorna id de mensaje proveedor
- si existe webhook/polling de delivery
- endpoint bulk real si existe
- contrato de archivo plantilla si se usará después

## Respuestas reales que necesitamos capturar

### Login OK

Capturar:

```json
{
  "token": "...",
  "expires_in": 600
}
```

O el formato real equivalente.

### Login error

Capturar:

```json
{
  "error": "...",
  "message": "..."
}
```

### SMS individual OK

Capturar:

```json
{
  "id": "...",
  "estado": "...",
  "mensaje": "..."
}
```

O el formato real equivalente.

### SMS individual error

Capturar casos:

- teléfono inválido
- mensaje vacío
- token inválido/vencido
- saldo proveedor insuficiente si aplica
- proveedor caído
- timeout

## Propuesta mapping `sendWithRealProvider`

Entrada interna:

```ts
type SmsProviderRequest = {
  userId: string;
  recipient: string;
  message: string;
  segments: number;
};
```

Normalización:

```text
+51999999999 -> 51999999999
```

Login proveedor:

```http
POST /v1/api/login
Content-Type: application/x-www-form-urlencoded

usuario=<secret>
password=<secret>
```

Envío:

```http
POST /v1/api/sms/individual
Authorization: Bearer <token login>
Content-Type: application/json

{
  "telefono": "51999999999",
  "mensaje": "texto final renderizado"
}
```

Salida esperada:

```ts
type SmsProviderResult = {
  success: boolean;
  provider: 'fortuna_services';
  providerMessageId?: string;
  providerResponse?: unknown;
  errorMessage?: string;
  rawStatus?: string;
};
```

Mapeo sugerido:

- HTTP 2xx + provider success → `success: true`
- HTTP 401/403 → `PROVIDER_AUTH_FAILED`
- HTTP timeout → `PROVIDER_TIMEOUT`
- HTTP 4xx con validación → `PROVIDER_REQUEST_FAILED`
- response sin id/status usable → `PROVIDER_INVALID_RESPONSE`
- network error → `PROVIDER_REQUEST_FAILED`

## Estrategia segura crédito / DB

No descontar antes del proveedor.

Flujo prod recomendado:

1. Edge valida usuario Supabase.
2. Edge valida perfil/saldo por RPC futura.
3. Edge login proveedor.
4. Edge envía SMS individual.
5. Si proveedor acepta, llamar RPC atómica:
   - descontar créditos
   - insertar `sms_messages`
   - guardar `provider_message_id`
   - guardar `provider_response`
6. Si proveedor falla:
   - no descontar
   - opcional registrar failed por RPC

RPC futuras recomendadas:

- `internal_send_sms_provider_success`
- `internal_register_sms_failed`

O una RPC única equivalente.

## Recomendación tokens

No usar tokens hardcodeados.

Token en Postman:

- considerar expuesto
- considerar vencible
- rotar
- no copiar a código
- no copiar a Angular
- no guardar en tabla

Mejor:

- guardar usuario/password en Supabase secrets
- login desde Edge Function
- manejar error auth
- luego optimizar cache si proveedor confirma TTL

## Recomendación rotación

Rotar:

- usuario/password del proveedor usado en colección
- Bearer tokens expuestos
- cualquier credencial compartida por chat/captura/export

Luego:

- regenerar colección sin tokens reales
- usar variables Postman locales
- no versionar colección con secrets

## Pendiente FASE 6B

- pedir responses reales
- implementar login proveedor en Edge Function
- implementar `sendWithRealProvider`
- agregar timeout con `AbortController`
- mapear respuesta real
- crear RPC prod atómica
- deploy Edge Function
- configurar Supabase secrets
- pruebas sandbox/prod controladas
