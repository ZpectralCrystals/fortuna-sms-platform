# Fase 04-M - Integracion final endpoints proveedor

## 1. Resumen ejecutivo

Se integraron localmente los endpoints restantes de API Keys del proveedor usando Supabase Edge Functions como intermediario. Angular no llama directamente a `services-fortuna.com`; las pantallas admin invocan funciones Supabase.

No se ejecuto deploy, no se ejecuto SQL, no se llamo al proveedor real y no se cambio `SMS_PROVIDER_MODE`. El modo mock sigue siendo el camino por defecto salvo que `SMS_PROVIDER_MODE === "production"`.

Graphify fue revisado como contexto existente en `graphify-out/GRAPH_REPORT.md`. El grafo indica hubs principales de Angular/servicios, pero esta fase se valido contra archivos reales con `rg`, `deno check` y build.

## 2. Endpoints integrados

- `POST /v1/api/sms/registrar/apikey`
- `POST /v1/api/sms/eliminar/apikey`
- `GET /v1/api/sms/consultar/apikey`
- `GET /v1/api/sms/listar/apikey`

Tambien se conservaron en el adapter:

- `POST /v1/api/sms/individual/{ruc}`
- `POST /v1/api/sms/registrar/saldo`
- `GET /v1/api/sms/consultar/saldo/{ruc}`
- `POST /v1/api/sms/registrar/proveedor`

## 3. Endpoints excluidos

- No se incorporo uso nuevo de `GET /v1/api/sms/consultar/proveedor`.
- El dashboard admin no invoca `admin-sync-provider-balance`.
- El dashboard admin no usa `provider_balance_snapshots` como fuente principal de inventario.
- `api-send-sms` sigue congelado con `FEATURE_FROZEN`.
- SMS multiple y Excel siguen fuera de alcance.

## 4. Edge Functions creadas/modificadas

Creadas:

- `angular-workspace/supabase/functions/admin-register-api-key/index.ts`
- `angular-workspace/supabase/functions/admin-delete-api-key/index.ts`
- `angular-workspace/supabase/functions/admin-consult-api-key/index.ts`
- `angular-workspace/supabase/functions/admin-list-api-keys/index.ts`

Modificadas:

- `angular-workspace/supabase/functions/_shared/sms-provider-current.ts`
- `angular-workspace/projects/shared/src/lib/services/api-keys.service.ts`
- `angular-workspace/projects/sms-client/src/app/admin/pages/api-keys-page.component.ts`
- `angular-workspace/projects/sms-client/src/app/admin/pages/api-keys-page.component.html`
- `angular-workspace/projects/backoffice-admin/src/app/pages/api-keys-page.component.ts`
- `angular-workspace/projects/backoffice-admin/src/app/pages/api-keys-page.component.html`
- `angular-workspace/projects/sms-client/src/app/dashboard/pages/api-keys-page.component.html`

## 5. Adapter proveedor

El adapter ahora expone:

- `registerApiKey(ruc, nombre)`
- `deleteApiKey(ruc, { nombre, id })`
- `getApiKey(ruc)`
- `listApiKeys()`

Todas las funciones respetan:

- mock si `SMS_PROVIDER_MODE !== "production"`
- production solo si `SMS_PROVIDER_MODE === "production"`
- sanitizacion de respuestas
- no persistir tokens
- no exponer respuesta cruda al frontend

## 6. API Keys proveedor por RUC

Las nuevas Edge Functions validan sesion/admin activo mediante `requireAdmin`. Las funciones con RUC validan 11 digitos antes de llamar al adapter.

Angular ahora tiene metodos en `ApiKeysService`:

- `providerRegister`
- `providerDelete`
- `providerConsult`
- `providerList`

Las pantallas admin muestran aviso de que las API keys se gestionan por RUC en backend proveedor via Supabase. La pantalla cliente ya no promete envio por `api-send-sms`.

## 7. Estado api-send-sms

Sin reactivacion. Sigue congelado con `FEATURE_FROZEN`.

No se implemento flujo publico con API key para envio SMS.

## 8. Dashboard e inventario

Se verifico que el dashboard admin no usa:

- `admin-sync-provider-balance`
- `/sms/consultar/proveedor`
- `provider_balance_snapshots` como fuente principal

El inventario sigue basado en calculo local: compras de inventario menos recargas aprobadas.

## 9. Validaciones deno check

OK:

- `deno check angular-workspace/supabase/functions/admin-register-api-key/index.ts`
- `deno check angular-workspace/supabase/functions/admin-delete-api-key/index.ts`
- `deno check angular-workspace/supabase/functions/admin-consult-api-key/index.ts`
- `deno check angular-workspace/supabase/functions/admin-list-api-keys/index.ts`
- `deno check angular-workspace/supabase/functions/send-sms/index.ts`
- `deno check angular-workspace/supabase/functions/api-send-sms/index.ts`
- `deno check angular-workspace/supabase/functions/admin-register-provider-balance/index.ts`
- `deno check angular-workspace/supabase/functions/admin-sync-provider-balance/index.ts`
- `deno check angular-workspace/supabase/functions/admin-register-client-balance/index.ts`
- `deno check angular-workspace/supabase/functions/admin-sync-client-balance/index.ts`

## 10. Build Angular

OK:

- `npm run build`

Compilo:

- `sms-client`
- `backoffice-admin`

Nota: Node mostro advertencia por version impar `v25.9.0`; no bloqueo el build.

## 11. Comandos ejecutados

- `sed` para revisar adapter, admin helpers, API key pages y servicios.
- `rg` para auditar endpoints proveedor, dashboard e invocaciones Angular.
- `find graphify-out` y lectura de `graphify-out/GRAPH_REPORT.md`.
- `git status --short`
- `git diff --stat`
- `git diff --name-only`
- `deno --version`
- `deno check` de Edge Functions nuevas y afectadas.
- `npm run build`

No se ejecuto ningun comando remoto de Supabase.

## 12. Riesgos pendientes

- Las nuevas Edge Functions aun no estan desplegadas.
- El contrato exacto del proveedor para `consultar/apikey` y `eliminar/apikey` debe confirmarse antes de prueba real.
- En production, la pantalla admin de API Keys podria invocar `admin-list-api-keys`; mantener `SMS_PROVIDER_MODE` en mock hasta prueba controlada.
- Rotacion/limpieza de credenciales Postman sigue pendiente si aun no se hizo.
- `api-send-sms` sigue congelado; no apto para integraciones publicas.
- No activar SMS multiple ni Excel sin fase separada.

## 13. Decision recomendada

Puede pasar a revision humana de Fase 04-M y luego a una fase de deploy controlado de estas cuatro Edge Functions, manteniendo `SMS_PROVIDER_MODE` en mock para smoke tests.

No pasar a prueba real proveedor hasta confirmar contrato de API Keys, rotar credenciales expuestas y autorizar explicitamente `SMS_PROVIDER_MODE=production`.
