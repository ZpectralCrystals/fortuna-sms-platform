# Fase 04-B - Entrega Transfer Project

Fecha: 2026-05-29  
Proyecto: Fortuna SMS  
Supabase actual: `sms-fortuna-dev`  
Project ref: `ewltnrfqwkhimnyqfrrw`

## 1. Estado backend Supabase actual

Backend Supabase actual queda estable en modo mock.

Supabase es fuente de verdad comercial. `services-fortuna.com` queda proveedor operativo futuro, no activo en production.

Estado:

- Empresa/RUC implementado.
- Saldo por empresa/RUC implementado.
- Ledger como fuente real de saldo.
- `profiles.credits` queda espejo legacy temporal.
- SMS individual funciona en mock.
- API pública legacy congelada.

## 2. DB/migration/backfill/ledger aplicados

Aplicado:

- Migration empresa/RUC.
- Backfill `companies`.
- Backfill `company_users`.
- Backfill `profiles.company_id`.
- Import legacy balance a `company_balance_transactions`.

Estado validado:

- `companies = 5`
- `company_users = 5`
- `profiles.company_id = 5`
- `legacy_migration = 5` filas
- `legacy_migration = 1716` SMS
- `sms_send = 1` fila
- `sms_send = -1` SMS

Conclusión:

- Ledger funciona.
- Saldo legacy importado.
- `profiles.credits` no debe volver a ser fuente comercial principal.

## 3. Edge Functions desplegadas

Desplegadas:

- `send-sms`
- `api-send-sms`
- `admin-register-provider-balance`
- `admin-sync-provider-balance`
- `admin-register-client-balance`
- `admin-sync-client-balance`

Estado:

- `send-sms` usa empresa/RUC.
- `send-sms` descuenta saldo ledger.
- Admin functions preparadas para saldo proveedor/cliente.
- `api-send-sms` congelada.

## 4. Smoke tests mock aprobados

Smoke tests mock aprobados:

- `send-sms` en mock.
- Descuento saldo empresa/RUC.
- Registro `sms_send = -1` en ledger.
- Sin llamada proveedor real.
- `api-send-sms` devuelve `503 FEATURE_FROZEN`.

Conclusión:

- Backend operativo en mock.
- Flujo SMS individual backend cerrado para entrega.

## 5. api-send-sms congelado

Estado:

- `api-send-sms` responde `503 FEATURE_FROZEN`.
- API keys no activadas.
- No llama proveedor.
- No llama lógica legacy de envío.

Mantener congelado hasta fase futura específica.

## 6. Frontend sin cambios

Frontend no fue modificado para esta entrega.

Estado:

- Angular build no falló.
- No se cambió UI.
- No se cambió flujo visual.
- No se activó API keys.
- No se activó SMS múltiple.
- No se activó Excel.

Nota:

- UI puede seguir mostrando `profiles.credits` como espejo temporal.
- Backend ya usa ledger como fuente real.

## 7. SMS_PROVIDER_MODE debe quedar mock

Regla:

- `SMS_PROVIDER_MODE` debe quedar distinto de `production`.
- Solo `SMS_PROVIDER_MODE=production` puede llamar proveedor real.

Para transfer:

- Mantener mock.
- No probar proveedor real durante transferencia.
- No cambiar secrets sin plan de rotación.

## 8. Riesgos pendientes

Riesgos abiertos:

- Proveedor real no probado.
- Credenciales proveedor por rotar.
- Postman v3 por limpiar.
- Bearer tokens/X-API-KEY expuestos deben revocarse.
- API keys congeladas.
- SMS múltiple congelado.
- Plantilla Excel congelada.
- `profiles.credits` sigue como compatibilidad temporal.

Impacto:

- Proyecto apto para entrega estable en mock.
- Proyecto no apto para producción real hasta prueba proveedor y rotación secrets.

## 9. Checklist para nuevo dueño

Antes de operar:

- [ ] Revisar este informe.
- [ ] Revisar `fase-04-a-cierre-backend-supabase-actual.md`.
- [ ] Confirmar backup DB reciente.
- [ ] Mantener `SMS_PROVIDER_MODE` en mock.
- [ ] No activar API keys.
- [ ] No activar SMS múltiple.
- [ ] No activar Excel.
- [ ] Validar saldo ledger vs UI.

Antes de production real:

- [ ] Rotar credenciales proveedor.
- [ ] Revocar tokens expuestos.
- [ ] Limpiar Postman v3.
- [ ] Usar variables Postman.
- [ ] Ejecutar prueba real controlada con proveedor.
- [ ] Conciliar saldo proveedor vs saldo local.
- [ ] Revisar logs sin secrets.
- [ ] Definir transición frontend desde `profiles.credits` a saldo ledger.

Antes de cambios futuros:

- [ ] Crear rama.
- [ ] Hacer backup.
- [ ] Probar en staging/local.
- [ ] Ejecutar Deno check.
- [ ] Ejecutar smoke tests mock.
- [ ] Documentar cambios.

## 10. Decisión

Apto para transferir como proyecto estable en mock.

No apto para producción real hasta:

- Proveedor real probado controladamente.
- Credenciales rotadas.
- Postman v3 limpiado.
- Conciliación saldo local/proveedor validada.

Decisión final:

- Transfer Project: sí, si nuevo dueño acepta estado mock y riesgos pendientes.
- Production real: no todavía.
