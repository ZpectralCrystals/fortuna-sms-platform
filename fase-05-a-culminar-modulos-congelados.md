# Fase 05-A - Culminar módulos congelados

## 1. Resumen ejecutivo

Se reactivaron localmente los módulos congelados para producción real:

- `api-send-sms` público por `X-API-Key`.
- `send-sms-batch` para SMS múltiple.
- Excel/CSV/TXT usando batch, no proveedor directo.
- Consulta manual de saldo proveedor desde admin vía `admin-sync-provider-balance`.

No se hizo deploy. No se ejecutó SQL. No se llamó `services-fortuna.com` desde Angular. No se cambió `SMS_PROVIDER_MODE`.

Graphify fue usado como mapa de contexto (`graphify-out/GRAPH_REPORT.md`), validando todo contra archivos reales.

## 2. api-send-sms reactivado

`angular-workspace/supabase/functions/api-send-sms/index.ts` dejó de responder `FEATURE_FROZEN`.

Flujo actual:

- Lee `X-API-Key`.
- Calcula SHA-256 y busca `api_keys.key_hash`.
- Valida `is_active`, `revoked_at`, `expires_at`, scope `sms:send`.
- Aplica rate limit básico por `api_request_logs`.
- Acepta body `telefono/mensaje` y aliases `recipient/message`.
- Usa `internal_begin_company_sms_send_attempt`.
- Resuelve empresa/RUC desde el usuario dueño de la API key.
- Envía con `sendIndividualSms(ruc, telefono, mensaje)`.
- Completa success/fail por RPC.
- Registra `api_request_logs`.
- Actualiza `last_used_at`.
- No usa `profiles.credits` como saldo real.
- No expone respuesta cruda del proveedor.

Respuesta OK:

```json
{
  "success": true,
  "status": "sent",
  "message_id": "...",
  "credits_used": 1,
  "balance_after": 0
}
```

## 3. Validación API keys

Auditoría local:

- `api_keys` tiene `user_id`, `key_hash`, `key_prefix`, `is_active`, `scopes`, `created_at`, `revoked_at`, `expires_at`.
- No tiene `company_id`.
- Resolución de empresa queda por `user_id` vía RPC interna y modelo `company_users/companies`.
- `api_request_logs` existe para registrar uso.

Pantalla cliente de API keys vuelve a documentar API pública Supabase y muestra body `telefono/mensaje`.

## 4. send-sms-batch

Creada:

- `angular-workspace/supabase/functions/send-sms-batch/index.ts`

Reglas:

- Requiere JWT de usuario.
- Máximo 50 destinatarios.
- Normaliza teléfonos peruanos.
- Deduplica destinatarios.
- Envía uno por uno usando `/sms/individual/{ruc}` mediante adapter.
- Cada destinatario crea intento propio.
- Fallidos no descuentan saldo.
- Devuelve `partial_success` si aplica.
- Registra conciliación si proveedor envió pero completion local falló.

## 5. SMS múltiple

`SmsService.sendMultipleSimple()` ahora llama `send-sms-batch`.

La pantalla `send-sms-page` mantiene modo múltiple, preview y validación. Se agregó límite de 50 destinatarios antes de enviar.

## 6. Excel / plantilla

Excel/CSV/TXT sigue parseándose en Angular.

Cambio clave:

- `sendFileRowsSimple()` agrupa filas por mensaje y llama `send-sms-batch`.
- No llama proveedor directo.
- Máximo 50 filas por lote desde UI.
- Si hay mensajes personalizados por fila, se agrupan por texto para usar batch sin activar endpoint plantilla proveedor.
- Descarga de plantilla Excel se mantiene.

Plantillas complejas del proveedor siguen fuera de alcance.

## 7. Consulta saldo proveedor

Se reactivó uso manual de:

- `admin-sync-provider-balance`

Cambios:

- `BackofficeService.syncProviderBalance()`.
- Botón admin “Consultar saldo proveedor”.
- Card secundaria “Saldo Proveedor”.
- Guarda snapshot vía Edge Function existente.

No se usa para inventario local. Inventario sigue:

`inventory_purchases.quantity - recharges.sms_credits approved`

## 8. Archivos modificados

Principales:

- `angular-workspace/supabase/functions/api-send-sms/index.ts`
- `angular-workspace/supabase/functions/send-sms-batch/index.ts`
- `angular-workspace/projects/shared/src/lib/services/sms.service.ts`
- `angular-workspace/projects/shared/src/lib/services/backoffice.service.ts`
- `angular-workspace/projects/sms-client/src/app/dashboard/pages/send-sms-page.component.ts`
- `angular-workspace/projects/sms-client/src/app/dashboard/pages/api-keys-page.component.ts`
- `angular-workspace/projects/sms-client/src/app/dashboard/pages/api-keys-page.component.html`
- `angular-workspace/projects/sms-client/src/app/admin/pages/dashboard-page.component.ts`
- `angular-workspace/projects/sms-client/src/app/admin/pages/dashboard-page.component.html`
- `angular-workspace/projects/sms-client/src/app/admin/pages/api-keys-page.component.html`
- `angular-workspace/projects/backoffice-admin/src/app/pages/dashboard-page.component.ts`
- `angular-workspace/projects/backoffice-admin/src/app/pages/dashboard-page.component.html`
- `angular-workspace/projects/backoffice-admin/src/app/pages/api-keys-page.component.html`

Nota: `.gitignore` aparece modificado en worktree, pero no corresponde a esta fase.

## 9. Deno check

OK:

```bash
deno check angular-workspace/supabase/functions/send-sms/index.ts \
  angular-workspace/supabase/functions/api-send-sms/index.ts \
  angular-workspace/supabase/functions/send-sms-batch/index.ts \
  angular-workspace/supabase/functions/admin-register-api-key/index.ts \
  angular-workspace/supabase/functions/admin-delete-api-key/index.ts \
  angular-workspace/supabase/functions/admin-consult-api-key/index.ts \
  angular-workspace/supabase/functions/admin-list-api-keys/index.ts \
  angular-workspace/supabase/functions/admin-sync-provider-balance/index.ts
```

## 10. Build Angular

OK:

```bash
npm run build
```

Compiló:

- `sms-client`
- `backoffice-admin`

Nota: Node mostró warning por versión impar `v25.9.0`; no bloqueó build.

## 11. Comandos ejecutados

- `sed`
- `rg`
- `git status --short`
- `git diff --stat`
- `deno check`
- `npm run build`

Validaciones `rg`:

- `services-fortuna.com` no aparece en `angular-workspace/projects`.
- `FEATURE_FROZEN` no aparece en Edge/frontend activos.
- `/sms/individual` está en adapter.
- `admin-sync-provider-balance` aparece solo como acción manual desde `BackofficeService`.

## 12. Riesgos pendientes

- Falta deploy controlado de `api-send-sms` y `send-sms-batch`.
- Falta smoke test real con API key.
- Falta smoke test real batch con 2-3 destinatarios.
- Falta probar saldo proveedor en producción con botón admin.
- Rate limit usa `api_request_logs`; si tabla no existe o no tiene grants, no bloquea main flow pero debe revisarse en remoto.
- Batch no usa endpoint bulk del proveedor; manda individual por destinatario, como regla requerida.

## 13. Deploy requerido

Pendiente, no ejecutado:

- `api-send-sms`
- `send-sms-batch`

Recomendado validar también que funciones ya desplegadas sigan OK:

- `send-sms`
- `admin-sync-provider-balance`

## 14. Smoke tests requeridos

Antes de considerar producción cerrada:

- Crear API key desde cliente.
- Enviar SMS por `api-send-sms` con `X-API-Key`.
- Repetir con mismo `Idempotency-Key` y validar no duplica.
- Probar API key revocada.
- Probar saldo insuficiente.
- Probar batch con 2 destinatarios válidos.
- Probar batch con duplicado e inválido.
- Probar Excel con <= 50 filas.
- Probar botón “Consultar saldo proveedor”.
- Confirmar inventario local no cambia tras consulta proveedor.

## 15. Decisión recomendada

Pasar a Fase 05-B: deploy controlado + smoke tests en producción.

No cerrar como producción final hasta ejecutar smoke tests reales y revisar logs de `api_request_logs`, `sms_send_attempts`, `sms_messages`, `company_balance_transactions` y snapshots proveedor.
