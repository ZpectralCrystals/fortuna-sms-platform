# Fase 04-A - Cierre backend Supabase actual

Fecha: 2026-05-29  
Proyecto: Fortuna SMS  
Supabase actual: `sms-fortuna-dev`  
Project ref: `ewltnrfqwkhimnyqfrrw`  
Repo: `/Volumes/MAC/MAC Ext/Desktop/Fortuna sms`

## 1. Resumen ejecutivo

Backend Supabase actual queda técnicamente cerrado en modo mock.

Estado validado por contexto:

- Backup DB generado.
- Migration empresa/RUC ejecutada correctamente.
- Backfill ejecutado.
- Edge Functions desplegadas.
- Smoke test `send-sms` en mock descontó saldo correctamente.
- `api-send-sms` responde `503 FEATURE_FROZEN`.
- Angular build no falló.
- No se requiere cambio frontend para cerrar esta fase.

Decisión: backend listo para revisión final pre-production, no para proveedor real todavía.

## 2. Estado base de datos

Migration empresa/RUC aplicada en Supabase actual.

Tablas/modelo operativo:

- `companies`
- `company_users`
- `company_balance_transactions`
- `provider_balance_transactions`
- `provider_balance_snapshots`

Compatibilidad:

- `profiles.credits` permanece como espejo temporal/legacy.
- Fuente real de saldo comercial: ledger `company_balance_transactions`.

No se modificó DB en esta fase.

## 3. Estado empresas/RUC

Conteos validados:

- `companies = 5`
- `company_users = 5`
- `profiles.company_id = 5`

Interpretación:

- 5 RUC/empresas migradas.
- 5 usuarios vinculados a empresa.
- Usuarios sin RUC válido quedan fuera de backfill automático, según criterio previo.

## 4. Estado ledger saldo

Ledger validado:

- `legacy_migration = 5` filas.
- `legacy_migration = 1716` SMS importados.
- `sms_send = 1` fila.
- `sms_send = -1` SMS.

Conclusión:

- Saldo comercial vive en ledger.
- `profiles.credits` no debe usarse como fuente de verdad nueva.
- `profiles.credits` puede seguir como compatibilidad temporal mientras Angular termina transición visual.

## 5. Estado Edge Functions

Desplegadas:

- `send-sms`
- `api-send-sms`
- `admin-register-provider-balance`
- `admin-sync-provider-balance`
- `admin-register-client-balance`
- `admin-sync-client-balance`

Estado técnico esperado:

- `send-sms` usa empresa/RUC.
- `send-sms` descuenta saldo vía RPC/ledger.
- `send-sms` usa adapter proveedor en mock si `SMS_PROVIDER_MODE !== "production"`.
- Admin functions quedan disponibles para saldo proveedor/cliente en flujo controlado.

No se hizo deploy en esta fase.

## 6. Smoke tests realizados

Smoke validado por contexto:

- `send-sms` en mock ejecutó flujo completo.
- Saldo empresa/RUC descontó correctamente.
- Ledger generó `sms_send = -1`.
- No hubo llamada a proveedor real.
- `api-send-sms` respondió `503 FEATURE_FROZEN`.

Conclusión:

- Camino SMS individual mock funciona.
- Descuento por empresa/RUC funciona.
- API pública legacy queda congelada.

## 7. Estado api-send-sms

Estado:

- Congelado.
- Responde `503 FEATURE_FROZEN`.
- No debe activar API keys.
- No debe llamar adapter.
- No debe llamar proveedor.

Decisión:

- Mantener congelado hasta fase futura específica de API keys.

## 8. Estado Angular

Contexto:

- Angular build no falló.
- No se desea modificar frontend por ahora.

Confirmación:

- No se requieren cambios frontend para cerrar Fase 04-A.
- Angular puede seguir mostrando `profiles.credits` temporalmente si hace falta, siempre documentado como espejo legacy.
- La fuente real de saldo backend ya es ledger por empresa/RUC.

## 9. Decisión: no modificar frontend

Decisión aceptada:

- No tocar Angular en esta fase.
- No cambiar pantallas.
- No ocultar aún saldos legacy desde UI.
- No activar API keys.
- No activar SMS múltiple.
- No activar Excel.

Razón:

- Objetivo de Fase 04-A es cierre backend Supabase actual.
- Frontend puede quedar para fase posterior.

## 10. Secrets y modo proveedor

Modo requerido:

- `SMS_PROVIDER_MODE` debe quedar distinto de `production`.
- Modo actual operativo esperado: mock.

Pendiente antes de production:

- Rotar credenciales proveedor.
- Limpiar tokens/credenciales expuestas en Postman.
- Confirmar contrato real proveedor.
- Ejecutar prueba real controlada solo con aprobación explícita.

No se cambiaron secrets en esta fase.

## 11. Riesgos pendientes

Riesgos:

- Credenciales proveedor deben rotarse antes de production.
- Proveedor real no probado en ventana controlada.
- `SMS_PROVIDER_MODE=production` no debe activarse todavía.
- API keys siguen congeladas.
- SMS múltiple sigue congelado.
- Plantilla Excel sigue congelada.
- Frontend aún puede mostrar `profiles.credits` como compatibilidad visual.
- Transfer project debe esperar cierre production/control real.

## 12. Checklist antes de production

- [ ] Rotar credenciales proveedor.
- [ ] Revocar Bearer tokens expuestos.
- [ ] Revocar X-API-KEY expuesta.
- [ ] Limpiar Postman v3.
- [ ] Confirmar `SMS_PROVIDER_MODE` sigue mock hasta prueba aprobada.
- [ ] Ejecutar prueba proveedor real controlada.
- [ ] Confirmar conciliación local vs proveedor.
- [ ] Confirmar logs no exponen tokens.
- [ ] Confirmar service role solo server-side.
- [ ] Confirmar `api-send-sms` sigue congelado.
- [ ] Confirmar API keys no activadas.
- [ ] Confirmar SMS múltiple no activado.
- [ ] Confirmar Excel no activado.
- [ ] Definir si Angular cambia de `profiles.credits` a saldo ledger.

## 13. Checklist antes de transfer project

- [ ] Backend actual estable.
- [ ] Backup DB reciente confirmado.
- [ ] Migration/backfill auditados.
- [ ] Smoke tests documentados.
- [ ] Secrets rotados.
- [ ] Proveedor real probado o explícitamente diferido.
- [ ] Postman sanitizado.
- [ ] API keys/múltiple/Excel congelados o planificados.
- [ ] Responsable nuevo acepta estado y riesgos.
- [ ] Documentar `profiles.credits` como legacy temporal.
- [ ] Exportar informe final para dueño/organización destino.

## 14. Decisión recomendada

Cerrar Fase 04-A como backend Supabase actual listo en mock.

No pasar a production todavía.

No transferir todavía.

Siguiente recomendado:

1. Rotación credenciales/Postman.
2. Prueba proveedor real controlada.
3. Conciliación saldo local vs proveedor.
4. Recién luego decidir production/transfer.

Comandos ejecutados en esta fase:

```bash
git status --short
git diff --stat
```

Comandos NO ejecutados:

- `supabase db push`
- `supabase functions deploy`
- SQL write
- Migration
- Backfill
- Proveedor real
- Cambio secrets
- Cambio frontend
- `SMS_PROVIDER_MODE=production`
- `git commit`
- `git push`
