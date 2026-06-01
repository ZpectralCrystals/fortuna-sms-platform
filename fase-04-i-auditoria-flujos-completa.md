# Fase 04-I - Auditoria completa de flujos

## 1. Resumen ejecutivo

Auditoria read-only de flujos Fortuna SMS.

No se modifico codigo funcional, DB, Edge Functions, migrations, secrets ni `SMS_PROVIDER_MODE`.

No se llamo proveedor real.

Estado corto:

- Envio SMS individual: **OK** en arquitectura nueva empresa/RUC.
- `api-send-sms`: **CONGELADO** con `503 FEATURE_FROZEN`.
- Empresa/RUC/ledger: **OK base**, pero frontend aun usa mucho `profiles.credits`.
- Dashboard admin inventario: **INCONSISTENTE/RIESGO** por mezcla de fuentes legacy/local.
- Recargas cliente/RUC y sincronizacion proveedor: **INCOMPLETO** en frontend.
- API keys, SMS multiple, Excel, Alertas SMS: **LEGACY/CONGELADO/RIESGO**.

## 2. Estado general del sistema

Graphify:

- `graphify-out/GRAPH_REPORT.md` existe.
- Grafo: 123 files, 1761 nodes, 2704 edges, 92 communities.
- Built commit: `3da4e45535bfbeac3dec1625e229c04486ac2f62`.
- `git rev-parse HEAD`: mismo commit.
- Limitacion: worktree tiene cambios sin commit desde fases 04-D a 04-H; grafo no refleja todos esos cambios. Toda conclusion se valido con archivos reales via `rg/sed`.

Estado repo:

- Worktree sucio por fases previas.
- Cambios frontend/admin y Edge locales ya existen.
- Reporte actual es unico archivo nuevo de esta fase.

## 3. Flujos Supabase DB

Modelo empresa/RUC:

- `companies`
- `company_users`
- `company_balance_transactions`
- `provider_balance_transactions`
- `provider_balance_snapshots`

Extensiones:

- `profiles.company_id`
- `recharges.company_id`
- `recharges.requested_by_user_id`
- `recharges.external_sync_status`
- `recharges.external_response_sanitized`
- `sms_messages.company_id`
- `sms_messages.ruc`
- `sms_messages.provider_response_sanitized`
- `sms_messages.provider_message_id`
- `sms_send_attempts.company_id`
- `sms_send_attempts.ruc`

Legacy relevante:

- `profiles.credits` sigue espejo/compatibilidad.
- `sms_inventory` aparece usado por migrations legacy de recarga manual, pero no se encontro `create table` local.
- `inventory_purchases` aparece usado por frontend actual, pero no se encontro migration local que cree tabla.
- `admin_add_sms_inventory` aparece usado por frontend actual, pero no se encontro migration local que cree RPC.
- `admin_approve_recharge` y `admin_reject_recharge` aparecen usados por frontend, pero no se encontro migration local que cree RPCs.

Riesgo: repo local no representa completo el schema live/legacy de inventario y aprobacion de recargas.

## 4. Flujos Edge Functions

`send-sms`:

- valida Bearer token con anon key.
- usa service role server-side.
- llama `internal_begin_company_sms_send_attempt`.
- obtiene `company_id`, `ruc`, `attempt_id`, segmentos y saldo.
- llama `sendIndividualSms(ruc, telefono, mensaje)`.
- success: `internal_complete_company_sms_send_success`.
- fail: `internal_complete_company_sms_send_failed`.
- maneja `reconciliation_required` si proveedor OK/local fail o provider fail/local completion fail.

`api-send-sms`:

- congelado.
- responde `503 FEATURE_FROZEN`.
- no llama adapter, proveedor ni API keys.

Admin Edge:

- `admin-register-provider-balance`: llama `registerProviderBalance`, RPC `admin_register_provider_balance_local`.
- `admin-sync-provider-balance`: llama `getProviderBalance`, RPC `admin_save_provider_balance_snapshot`.
- `admin-register-client-balance`: llama `registerClientBalance`, RPC `admin_register_company_recharge` / completion/fail.
- `admin-sync-client-balance`: llama `getClientBalance`, lee `companies`, lee `company_balance_transactions`.
- `_shared/admin-edge.ts`: valida auth y `admins.id = user_id AND is_active = true`.
- `_shared/sms-provider-current.ts`: mock salvo `SMS_PROVIDER_MODE === "production"`.

## 5. Flujos proveedor externo

Proveedor solo debe vivir en Edge Functions.

Detectado:

- Angular no llama directo a `services-fortuna.com`.
- Adapter usa login proveedor solo en production.
- En mock, retorna payload test sin HTTP real.

Endpoints:

- `POST /v1/api/login`
- `POST /v1/api/sms/individual/{ruc}`
- `POST /v1/api/sms/registrar/proveedor`
- `GET /v1/api/sms/consultar/proveedor`
- `POST /v1/api/sms/registrar/saldo`
- `GET /v1/api/sms/consultar/saldo/{ruc}`

## 6. Flujos frontend admin

Dashboards admin:

- `sms-client/src/app/admin/pages/dashboard-page.component.*`
- `backoffice-admin/src/app/pages/dashboard-page.component.*`
- ambos duplicados funcionalmente.
- `Comprar SMS` visible por `SHOW_SMS_PURCHASE_CONTROLS = true`.
- `Alertas SMS` oculto del sidebar con `SHOW_SMS_ALERTS_NAV = false`, ruta viva.

Admin accounts/users:

- edit RUC usa `BackofficeService.updateClientBasicInfo`.
- RPC: `admin_update_profile_company_ruc`.
- muestra `credits` desde `profiles.credits`.

Admin recharges:

- usa `RechargesService`.
- `approveRecharge()` llama `admin_approve_recharge`.
- `rejectRecharge()` llama `admin_reject_recharge`.
- `createManualRecharge()` llama `admin_create_manual_recharge`.
- estas RPCs son legacy/ausentes en migrations locales completas salvo `admin_create_manual_recharge`.

Admin alerts:

- ruta/componente existen.
- sidebar oculto.
- usa `low_balance_config`, `low_balance_alerts`, `profiles.credits`, RPCs de alertas.

Admin API keys:

- UI y servicios existen.
- public API congelada; activar seria incoherente.

## 7. Flujos frontend cliente

Registro:

- `AuthService.register()` envia metadata `full_name`, `razon_social/company_name`, `ruc`, `phone`.
- trigger `handle_new_user` nuevo crea/reusa company y vincula company_users si RUC valido.

Saldo cliente:

- `DashboardLayoutComponent`, `DashboardOverviewPageComponent`, `SendSmsPageComponent`, `RechargesPageComponent` leen `profiles.credits`.
- ledger actualiza `profiles.credits` por `internal_sync_company_legacy_credits`.
- UI cliente aun no lee ledger/RPC directo.

Envio SMS:

- `SmsService.sendSingle()` llama Edge Function `send-sms`.
- Multiple/file existen en UI/service pero usan `sendSingle()` en bucle, no endpoint proveedor multiple.
- Excel parsea archivo en frontend.

Recargas cliente:

- `RechargesService.createRecharge()` inserta directo en `recharges` pending.
- No llama flujo nuevo `admin_register_company_recharge` ni proveedor.

## 8. Matriz completa de flujos

| Flujo | Inicia | Frontend | Servicio Angular | Edge | RPC | Tablas leidas | Tablas escritas | Proveedor | Estado | Obs |
|---|---|---|---|---|---|---|---|---|---|---|
| Registro usuario nuevo | usuario | register page | AuthService.register | no | handle_new_user trigger | auth metadata | profiles, companies, company_users, ledger bonus | no | OK/RIESGO | RUC invalido no rompe, pero UI luego usa credits legacy |
| Vinculacion empresa/RUC | trigger/admin | signup/admin accounts | AuthService/BackofficeService | no | internal_attach_profile_to_company_from_ruc, admin_update_profile_company_ruc | profiles, companies, company_users | companies, company_users, profiles | no | OK | Admin bloquea multiusuario para cambio RUC |
| Bono inicial | trigger | no directo | no | no | internal_grant_starter_bonus_for_company | companies, ledger | ledger, companies, profiles.credits | no | OK | una vez por RUC via starter_bonus_granted_at |
| Edicion RUC admin | admin | accounts page | BackofficeService.updateClientBasicInfo | no | admin_update_profile_company_ruc | admins, profiles, companies, company_users | profiles, companies, audit | no | OK | no mueve ledger ni historico |
| Compra SMS admin / inventario | admin | dashboard | BackofficeService.addSmsInventory/getInventoryState | no | admin_add_sms_inventory | inventory_purchases, recharges | inventory_purchases via RPC | no | INCONSISTENTE | RPC/tabla no aparecen en migrations locales |
| Historial de compras | admin | dashboard | listInventoryPurchases | no | no | inventory_purchases, admins | no | no | RIESGO | depende tabla no migrada localmente |
| Recarga cliente/RUC | cliente | client recharges | RechargesService.createRecharge | no | no | sms_packages | recharges pending | no | LEGACY | inserta por user_id, no company flow completo |
| Registro saldo cliente proveedor | admin/interno | sin UI clara | no directo | admin-register-client-balance | admin_register_company_recharge + complete/fail | companies, recharges | recharges, ledger | POST registrar/saldo | RIESGO | Edge existe, UI no integrada |
| Consulta saldo cliente proveedor | admin/interno | sin UI clara | no directo | admin-sync-client-balance | no RPC central | companies, ledger | no | GET consultar/saldo/{ruc} | RIESGO | compara externo/local, no integra dashboard |
| Registro saldo proveedor | admin | sin UI dashboard auto | no directo | admin-register-provider-balance | admin_register_provider_balance_local | admins | provider_balance_transactions | POST registrar/proveedor | RIESGO | Edge disponible, no flujo UI final |
| Consulta saldo proveedor | admin/manual | no dashboard auto | no directo | admin-sync-provider-balance | admin_save_provider_balance_snapshot | admins | provider_balance_snapshots | GET consultar/proveedor | OK MANUAL | no debe auto-cargar dashboard |
| Dashboard admin metricas | admin | admin dashboards | BackofficeService | no | no/admin_add_sms_inventory indirecto | profiles, recharges, sms_messages, inventory_purchases | no | no | INCONSISTENTE | usa profiles.credits + inventario local no migrado |
| Dashboard cliente saldo | cliente | dashboard layout/overview | AuthService/direct Supabase | no | no | profiles.credits | no | no | LEGACY | depende sync legacy |
| Envio SMS individual | cliente | send sms page | SmsService.sendSingle | send-sms | internal_begin/complete | profiles/company/ledger/attempts | attempts, sms_messages, ledger, profiles.credits | POST individual/{ruc} | OK | fuente comercial ledger |
| Fallo envio SMS | cliente/proveedor | send sms page | SmsService | send-sms | internal_complete_failed | attempts | attempts/sms_messages failed | individual/{ruc} | OK/RIESGO | reconciliation logs si completion falla |
| API publica api-send-sms | externo | API key UI docs | ApiKeysService only | api-send-sms | none active | no | no | no | CONGELADO | 503 FEATURE_FROZEN |
| Alertas SMS | admin | alerts page hidden | direct Supabase | no | admin_upsert_low_balance_config, admin_generate_low_balance_alerts | profiles.credits, low_balance_* | low_balance_alerts | no | LEGACY/RIESGO | sidebar oculto, usa credits legacy |
| API keys | cliente/admin | api keys pages | ApiKeysService | api-send-sms frozen | create/revoke_api_key | api_keys_safe | api_keys via RPC | no | CONGELADO/RIESGO | UI visible pero public API congelada |
| SMS multiple | cliente | send page | SmsService.sendMultipleSimple | send-sms loop | company SMS RPC | ledger | attempts/messages/ledger | individual/{ruc} repeated | CONGELADO/PARCIAL | no endpoint multiple, puede enviar en bucle |
| Excel | cliente | send page | local parser | send-sms loop | company SMS RPC | profiles.credits | attempts/messages/ledger | individual/{ruc} repeated | CONGELADO/PARCIAL | parse activo; no plantilla proveedor |

## 9. Endpoints proveedor detectados

En `_shared/sms-provider-current.ts`:

- `POST /v1/api/login`
- `POST /v1/api/sms/individual/{ruc}`
- `POST /v1/api/sms/registrar/proveedor`
- `GET /v1/api/sms/consultar/proveedor`
- `POST /v1/api/sms/registrar/saldo`
- `GET /v1/api/sms/consultar/saldo/{ruc}`

No detectado en Angular:

- `services-fortuna.com`
- `/sms/consultar/proveedor`
- `/sms/individual`

## 10. RPCs detectadas

Modelo nuevo:

- `internal_is_admin_actor`
- `internal_company_balance`
- `internal_sync_company_legacy_credits`
- `internal_get_user_company`
- `internal_grant_starter_bonus_for_company`
- `internal_attach_profile_to_company_from_ruc`
- `internal_begin_company_sms_send_attempt`
- `internal_complete_company_sms_send_success`
- `internal_complete_company_sms_send_failed`
- `admin_update_profile_company_ruc`
- `admin_register_provider_balance_local`
- `admin_save_provider_balance_snapshot`
- `admin_register_company_recharge`
- `admin_complete_company_recharge_external_sync`
- `admin_fail_company_recharge_external_sync`

Legacy/otros:

- `internal_validate_sms_send`
- `internal_send_sms_provider_success`
- `internal_register_sms_failed`
- `internal_begin_sms_send_attempt`
- `internal_complete_sms_send_success`
- `internal_complete_sms_send_failed`
- `admin_update_client_profile`
- `admin_set_client_active`
- `admin_create_manual_recharge`
- `admin_upsert_low_balance_config`
- `admin_generate_low_balance_alerts`
- `admin_get_internal_alerts_account`
- `admin_ensure_internal_alerts_account`
- `admin_allocate_internal_sms`
- `create_api_key`
- `revoke_api_key`
- `admin_revoke_api_key`

Referenciadas por frontend pero no halladas en migrations locales:

- `admin_approve_recharge`
- `admin_reject_recharge`
- `admin_add_sms_inventory`

## 11. Tablas involucradas

Nuevas/objetivo:

- `companies`
- `company_users`
- `company_balance_transactions`
- `provider_balance_transactions`
- `provider_balance_snapshots`

Core legacy:

- `profiles`
- `recharges`
- `sms_messages`
- `sms_send_attempts`
- `sms_packages`
- `admins`
- `templates`

Admin/API/alerts:

- `api_keys`
- `api_request_logs`
- `low_balance_config`
- `low_balance_alerts`
- `internal_accounts`
- `internal_sms_allocations`
- `profile_audit_logs`

Riesgo de schema:

- `sms_inventory` usado por migrations legacy, no creado localmente.
- `inventory_purchases` usado por frontend actual, no creado localmente.

## 12. Flujos OK

- SMS individual con RUC via `send-sms`.
- Adapter proveedor en mock salvo `SMS_PROVIDER_MODE=production`.
- `api-send-sms` congelado.
- Admin RUC update via RPC nueva.
- Graphify disponible para orientar arquitectura.

## 13. Flujos congelados

- API publica `api-send-sms`.
- API keys como canal operativo.
- SMS multiple real proveedor.
- Plantilla Excel proveedor.
- Alertas SMS en sidebar.

## 14. Flujos inconsistentes

- Inventario admin:
  - UI compra via `admin_add_sms_inventory`.
  - card calcula desde `inventory_purchases` menos `recharges`.
  - migrations locales no crean `inventory_purchases` ni `admin_add_sms_inventory`.
  - legacy recarga manual usa `sms_inventory`.

- Recargas:
  - cliente crea `recharges` por user_id.
  - admin approve/reject RPCs no aparecen en migrations locales.
  - nuevo flujo company/provider (`admin_register_company_recharge`) existe en DB/Edge, no integrado en Angular principal.

- Saldo:
  - fuente verdad nueva es ledger.
  - frontend cliente/admin sigue mostrando `profiles.credits`.
  - `profiles.credits` depende de sync legacy para no mentir.

- Duplicidad:
  - `sms-client` admin y `backoffice-admin` tienen dashboards duplicados.
  - cambios deben aplicarse doble o se divergen.

## 15. Flujos legacy

- `profiles.credits` como saldo visible.
- `sms_inventory`.
- `admin_create_manual_recharge`.
- alerts low balance con `profiles.credits`.
- API keys UI.
- internal old SMS RPCs.

## 16. Problema inventario dashboard

Estado actual por archivos:

- `Comprar SMS` visible.
- `handlePurchase()` llama `BackofficeService.addSmsInventory()`.
- `addSmsInventory()` llama RPC `admin_add_sms_inventory`.
- luego recarga `loadStats()`, `loadPurchases()`, `loadInventory()`.
- `getInventoryState()` calcula desde `inventory_purchases` y `recharges`.

Problema:

- local migrations no contienen `inventory_purchases` ni `admin_add_sms_inventory`.
- si live si los tiene, flujo puede funcionar.
- si live no los tiene o RLS bloquea, compra/card fallaran o mostraran 0.
- si existen recargas aprobadas historicas mayores a compras locales, disponible sera 0 por `max(total - sold, 0)`.

Decision tecnica sugerida:

- P0: verificar schema live de `inventory_purchases`, `admin_add_sms_inventory`, `admin_approve_recharge`, `admin_reject_recharge`.
- P1: decidir una sola fuente inventario admin: `sms_inventory` legacy vs `inventory_purchases` ledger local vs provider ledger.
- P1: migrar frontend a read model/RPC estable, no calculo ad hoc en Angular.

## 17. Riesgos tecnicos

- Frontend depende de RPCs/tablas que no aparecen en migrations locales.
- `profiles.credits` sigue muy extendido.
- Alertas y dashboard cliente pueden mostrar saldo legacy incorrecto si sync falla.
- API keys UI sigue accesible aunque public API congelada.
- Multiple/file pueden enviar en bucle por `send-sms`, contradice congelamiento conceptual.
- Provider balance/admin client balance Edge Functions existen, pero sin UI controlada.
- `provider_balance_snapshots` ya no debe alimentar inventario compras.
- Worktree sucio dificulta separar fases.

## 18. Correcciones recomendadas P0/P1/P2/P3

P0:

- Auditar schema live read-only para `inventory_purchases`, `sms_inventory`, `admin_add_sms_inventory`, `admin_approve_recharge`, `admin_reject_recharge`.
- Confirmar si compra SMS escribe realmente donde dashboard lee.
- Bloquear UI multiple/file si negocio dice congelado, o documentar que es single-loop permitido.

P1:

- Crear/normalizar RPC read-only `admin_get_dashboard_inventory()` que devuelva `total_sms`, `sold_sms`, `available_sms`, `source`.
- Reemplazar calculo Angular de inventario por RPC/read model.
- Migrar dashboard cliente a `internal_get_user_company`/ledger o endpoint seguro, no `profiles.credits` directo.
- Integrar recargas empresa/RUC con `admin_register_company_recharge` y provider sync controlado.

P2:

- Unificar dashboard admin duplicado (`sms-client` y `backoffice-admin`) o extraer shared component.
- Ocultar API keys UI mientras `api-send-sms` este congelado.
- Ocultar/desactivar Alertas ruta directa, no solo sidebar, si no debe usarse.

P3:

- Limpiar RPCs legacy obsoletas cuando produccion estable.
- Documentar matriz de fuentes de saldo.
- Regenerar Graphify tras limpiar worktree.

## 19. Comandos ejecutados

- `find graphify-out -maxdepth 2 -type f`
- `sed -n ... graphify-out/GRAPH_REPORT.md`
- `python3` read-only sobre `graphify-out/manifest.json`, `.graphify_labels.json`, `graph.json`
- `git status --short`
- `git diff --stat`
- `git rev-parse HEAD`
- `ls -1 angular-workspace/supabase/migrations`
- `rg` sobre migrations, SQL, Edge Functions y Angular services/pages
- `sed` read-only sobre Edge Functions y servicios Angular

## 20. Comandos NO ejecutados

- `npm run build`
- `deno check`
- `supabase db push`
- `supabase db reset`
- `supabase functions deploy`
- SQL remoto
- migration
- backfill
- `curl/fetch/http` a `services-fortuna.com`
- cambios de secrets
- cambios de `SMS_PROVIDER_MODE`
- commit/push

## 21. Decision recomendada

No pasar a mas fixes visuales hasta cerrar P0 de inventario/schema.

Siguiente fase recomendada:

1. Validacion live read-only de `inventory_purchases`, `sms_inventory`, `admin_add_sms_inventory`, `admin_approve_recharge`, `admin_reject_recharge`.
2. Elegir fuente unica de inventario admin.
3. Crear read model/RPC para dashboard admin.
4. Despues, corregir frontend con base estable.
