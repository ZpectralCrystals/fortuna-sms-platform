# API Pública SMS Fortuna

Endpoint:

```text
POST https://<project-ref>.supabase.co/functions/v1/api-send-sms
```

Autenticación:

```text
X-API-Key: fs_live_xxxxx
```

También se acepta:

```text
Authorization: Bearer fs_live_xxxxx
```

## Enviar SMS

Body:

```json
{
  "recipient": "956062256",
  "message": "Hola desde API SMS Fortuna",
  "idempotency_key": "pedido-123-opcional"
}
```

Teléfono Perú aceptado:

- `956062256`
- `51956062256`
- `+51956062256`

Respuesta success:

```json
{
  "success": true,
  "message_id": "uuid",
  "recipient": "+51956062256",
  "segments": 1,
  "cost": 0.08,
  "status": "sent"
}
```

Ejemplo curl:

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/api-send-sms" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: fs_live_xxxxx" \
  -d '{
    "recipient": "956062256",
    "message": "Hola desde API Fortuna SMS",
    "idempotency_key": "pedido-123"
  }'
```

## Errores

Formato:

```json
{
  "success": false,
  "error_code": "INVALID_PHONE",
  "message": "Número de teléfono inválido."
}
```

Códigos:

- `METHOD_NOT_ALLOWED`
- `API_KEY_REQUIRED`
- `API_KEY_INVALID`
- `API_KEY_REVOKED`
- `API_KEY_EXPIRED`
- `INSUFFICIENT_SCOPE`
- `PROFILE_INACTIVE`
- `INVALID_PHONE`
- `EMPTY_MESSAGE`
- `INVALID_IDEMPOTENCY_KEY`
- `INSUFFICIENT_CREDITS`
- `RATE_LIMIT_EXCEEDED`
- `PROVIDER_ERROR`
- `INTERNAL_ERROR`

## Idempotencia

`idempotency_key` evita doble procesamiento para mismo cliente. Si no se envía, la función genera una interna. Para integraciones comerciales, enviar una clave propia por operación.

Formato permitido: letras, números, `_`, `.`, `-`, entre 8 y 120 caracteres.

## Rate limit

Cada API Key tiene límites:

- 60 requests por minuto por defecto.
- 1000 requests por día por defecto.

Los requests se auditan en `api_request_logs`.

## Seguridad

- La API Key completa solo se muestra una vez al crearla.
- La base de datos guarda solo SHA-256 hash.
- Backoffice y cliente ven solo prefijo, estado y fechas.
- Si se filtra una API Key, revocarla y crear otra.

## Deploy

La función pública valida `X-API-Key`, por eso se despliega sin JWT de Supabase:

```bash
supabase functions deploy api-send-sms --no-verify-jwt
```

## Adaptador temporal

`api-send-sms` llama un adaptador temporal que reutiliza el proveedor/backend actual. El contrato público no depende de ese proveedor.

Cuando el backend externo entregue endpoints internos con `X-Internal-Token`, solo se reemplaza el adapter interno; clientes externos mantienen este mismo endpoint y formato.
