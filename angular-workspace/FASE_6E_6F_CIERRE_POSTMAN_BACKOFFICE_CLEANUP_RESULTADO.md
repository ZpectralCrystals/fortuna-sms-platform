# FASE 6E/6F - Cierre Postman proveedor + cleanup Backoffice

## Estado final

LISTO.

## Postman

Archivo encontrado:

```text
docs/private/Back Sms Fortuna.postman_collection.json
```

Credenciales/tokens no fueron impresos ni copiados.

## Endpoints reales detectados

- Login:
  - `POST https://services-fortuna.com/v1/api/login`
  - body `x-www-form-urlencoded`
  - campos `usuario`, `password`
- SMS individual:
  - `POST https://services-fortuna.com/v1/api/sms/individual`
  - Bearer token
  - body JSON
  - campos `telefono`, `mensaje`
- SMS múltiple:
  - apunta a `/v1/api/sms/individual`
  - body igual a individual
  - no confirma bulk real
- SMS plantilla:
  - `POST https://services-fortuna.com/v1/api/sms/plantilla`
  - Bearer token
  - body `form-data`
  - campo `file`

## `send-sms` vs Postman

`send-sms` coincide con Postman para SMS individual:

- Login dinámico con usuario/password desde secrets.
- No token fijo.
- Token solo en memoria.
- Envío individual usa `telefono` y `mensaje`.
- Teléfono proveedor va sin `+`.
- Recipient interno puede guardarse como `+519XXXXXXXX`.
- Provider response se sanitiza antes de guardar.

## ¿Se modificó `send-sms`?

No por esta fase. No hubo diferencia crítica contra Postman.

Nota: el archivo puede seguir apareciendo en `git diff` por cambios previos 6D/fallback, no por ajuste Postman nuevo.

## ¿Requiere redeploy Edge Function?

Por Postman: no.

Si cambios previos de `send-sms` aún no fueron desplegados: sí.

Comando:

```bash
supabase functions deploy send-sms
```

## ¿Requiere nuevos secrets?

No nuevos.

Confirmar existentes:

```text
SMS_PROVIDER_MODE=prod
SMS_PROVIDER_API_URL=https://services-fortuna.com
SMS_PROVIDER_USERNAME=<secret>
SMS_PROVIDER_PASSWORD=<secret>
SMS_PROVIDER_TIMEOUT_MS=10000
```

No usar token fijo del Postman.

## ¿Requiere SQL?

Para análisis Postman: no.

Para hardening 6D completo: sí, si aún no se aplicó:

```bash
supabase db push
```

## Backoffice cleanup

### Sincronización

- Quitado del sidebar.
- Ruta `/sync` redirige a dashboard.

### Kit Integración

- Quitado del sidebar.
- Ruta `/integration-kit` redirige a dashboard.

## Resultado build

`npm run build`: OK.

Builds:

- `sms-client`: OK
- `backoffice-admin`: OK

## Resultado `git diff --check`

OK.

## Resultado `git diff --stat`

```text
 angular-workspace/.gitignore                       |   1 +
 .../Back Sms Fortuna.postman_collection (1).json   | 172 ---------------------
 .../backoffice-admin/src/app/app.routes.ts         |   6 +-
 .../src/app/layouts/admin-layout.component.ts      |   4 +-
 4 files changed, 4 insertions(+), 179 deletions(-)
```

Nota: `git diff --stat` incluye cambios existentes de worktree sobre `.gitignore` y un Postman duplicado eliminado. La limpieza 6F tocó rutas/sidebar.

## Resultado rg

- `from('users')`, `user:users`, `profiles.role`, `.role`: sin hallazgos.
- insert directo `sms_messages` / update directo `profiles.credits` desde Angular: sin hallazgos.
- `service_role` aparece en Edge Function/migrations como uso esperado de servidor/RPC grants.
- Secret scan encontró credenciales/tokens dentro de `docs/private` Postman. No se copiaron a reportes ni código. `docs/private/` está ignorado en `.gitignore`; no commitear esa carpeta.
- `Sincronización` / `Kit Integración`: ya no aparecen en sidebar; quedan archivos legacy y rutas `/sync` / `/integration-kit` redirigidas a dashboard.

## Pruebas manuales recomendadas

### Proveedor SMS

1. Verificar secrets en Supabase.
2. Enviar SMS individual real.
3. Confirmar provider_response sin token/password.
4. Confirmar teléfono proveedor sin `+`.
5. Confirmar `sms_messages.status = sent`.
6. Confirmar créditos descontados por segmentos.

### Backoffice

1. Abrir sidebar.
2. Confirmar no aparece `Sincronización`.
3. Confirmar no aparece `Kit Integración`.
4. Navegar a `/sync`, debe ir a dashboard.
5. Navegar a `/integration-kit`, debe ir a dashboard.

## Riesgos pendientes

- Bulk real no confirmado.
- Plantilla por archivo no implementada.
- Delivery webhook pendiente.
- Reconciliación de attempts expirados pendiente.
