# FASE 6E - Análisis Postman proveedor SMS

## Estado

Postman encontrado:

```text
docs/private/Back Sms Fortuna.postman_collection.json
```

Credenciales/tokens no fueron impresos ni copiados.

## Endpoints detectados

### Login

- Método: `POST`
- URL: `https://services-fortuna.com/v1/api/login`
- Auth: no bearer previo
- Body: `x-www-form-urlencoded`
- Campos:
  - `usuario`
  - `password`

### SMS individual

- Método: `POST`
- URL: `https://services-fortuna.com/v1/api/sms/individual`
- Auth: Bearer token
- Body: JSON raw
- Campos:
  - `telefono`
  - `mensaje`

### SMS múltiple

- Método: `POST`
- URL detectada: `https://services-fortuna.com/v1/api/sms/individual`
- Auth: Bearer token
- Body: JSON raw
- Campos:
  - `telefono`
  - `mensaje`

Nota: Postman múltiple apunta al mismo endpoint/body de SMS individual. No representa bulk real listo.

### SMS plantilla

- Método: `POST`
- URL: `https://services-fortuna.com/v1/api/sms/plantilla`
- Auth: Bearer token
- Body: `form-data`
- Campos:
  - `file` tipo archivo

## Token

- Postman usa Bearer token para SMS.
- Token viene del login o está configurado como auth del request.
- Integración segura debe hacer login dinámico.
- No usar token fijo del Postman.
- Token proveedor debe vivir solo en memoria durante ejecución Edge.

## Comparación contra `send-sms`

Archivo revisado:

```text
supabase/functions/send-sms/index.ts
```

Coincidencias:

- Base URL configurable por `SMS_PROVIDER_API_URL`, esperado `https://services-fortuna.com`.
- Login usa:
  - `POST ${apiUrl}/v1/api/login`
  - `Content-Type: application/x-www-form-urlencoded`
  - campos `usuario`, `password`
- SMS individual usa:
  - `POST ${apiUrl}/v1/api/sms/individual`
  - `Authorization: Bearer <token>`
  - JSON `{ telefono, mensaje }`
- `telefono` proveedor sale sin `+`.
- `recipient` interno puede mantenerse como `+519XXXXXXXX`.
- `provider_recipient` viene desde RPC hardening o fallback normaliza sin `+`.
- No usa token fijo.
- Usa secrets:
  - `SMS_PROVIDER_API_URL`
  - `SMS_PROVIDER_USERNAME`
  - `SMS_PROVIDER_PASSWORD`
  - `SMS_PROVIDER_TIMEOUT_MS`
- Sanitiza provider_response antes de guardar:
  - token
  - password
  - authorization
  - api_key/apikey
  - secret

## Diferencias detectadas

No hay diferencia crítica para envío individual.

SMS múltiple y plantilla existen en Postman, pero quedan fuera de alcance de esta fase. No se implementaron.

## Cambio requerido en `send-sms`

Ninguno por Postman.

La Edge Function ya coincide con el flujo real individual del proveedor.

## Riesgos

- `SMS_PROVIDER_API_URL` debe estar en secrets como `https://services-fortuna.com`.
- Si se despliega hardening sin SQL 6D, Edge usa fallback legacy si existe RPC 6B.
- Si faltan secrets, prod devuelve proveedor no configurado.
- Bulk real no está confirmado porque Postman múltiple duplica individual.
- Plantilla requiere archivo `form-data`, fuera de alcance.

## Conclusión

`send-sms` coincide con Postman para SMS individual real.
