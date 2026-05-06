# FASE 8A - Revisión integral SMS pre API

## Estado final

PARCIAL.

Sistema funcional/coherente en código revisado, pero build Angular no completa por crash de `ng build sms-client` / `esbuild` con Node 22. TypeScript sí valida.

## Estado por módulo

| Módulo | Estado | Evidencia |
|---|---:|---|
| Auth cliente | LISTO | `AuthService.register()` usa Supabase Auth; errores auth mapeados a español; pantalla post-registro muestra verificación correo + botón login. |
| Bono Starter | LISTO si SQL aplicado | Migración `20260508100000_starter_credits_on_signup.sql` setea `profiles.credits default 10`, `total_spent default 0`, trigger `handle_new_user()` inserta `credits=10`, `total_spent=0`. |
| Landing pública | LISTO | Header tiene `Iniciar sesión` + `Comenzar`; Starter anuncia 10 SMS; widget WhatsApp en Home/About; mensajes usan `encodeURIComponent`. |
| Dashboard cliente | LISTO en código | Cards con data real; saldo desde `profiles.credits`; gráficos reales; sin mocks; sin `Entregados`/`Tasa de entrega`; gráfico alineado a Analytics. |
| Analytics cliente | LISTO en código | Métricas desde `sms_messages`; `Aceptados = sent + status futuro`; fallidos reales; gasto real; gráfico limpio + tooltip; sin labels falsos delivery. |
| SMS individual | LISTO | `SmsService.sendSingle()` llama `functions.invoke('send-sms')`; envía `recipient`, `message`, `idempotency_key`; no inserta `sms_messages`; refresca créditos por lectura. |
| Envío múltiple simple | LISTO | Parser normaliza `+519XXXXXXXX`, deduplica, detecta inválidos; `sendMultipleSimple()` usa `for...of`; cada SMS tiene idempotency key; errores parciales continúan. |
| Envío desde fichero | LISTO | Soporta `.csv`, `.txt`, `.xlsx`, `.xls`; usa `xlsx`; columnas teléfono/mensaje; mensajes por fila; preview; plantilla Excel; envío secuencial vía `sendFileRowsSimple()`. |
| Plantillas SMS | LISTO | Tabla `templates`; CRUD por usuario actual; variables como chips/preview; `Usar plantilla` navega a `/dashboard/send?templateId=...`; no autoenvía. |
| Historial cliente | LISTO con observación | Lista mensajes reales, filtros, detalle, provider response sanitizado. Observación: filtro/label `Entregado(s)` aún existe solo en Historial para status futuro. No afecta Dashboard/Analytics. |
| Backoffice mensajes | LISTO | Lista todos los SMS; filtros; detalle; relación `profiles`; traza `sms_send_attempts`; sanitize de provider response; solo lectura. |
| Backoffice recargas/inventario | LISTO | Inventario por RPC `admin_add_sms_inventory`; aprobación/rechazo por RPC; cliente crea recarga; créditos se actualizan backend/RPC, no Angular directo. |
| Limpieza legacy | LISTO | Sidebar no muestra `Sincronización` ni `Kit Integración`; rutas `/sync` y `/integration-kit` redirigen a dashboard. |
| Seguridad frontend | LISTO | No `from('users')`, no `profiles.role`, no service role en Angular, no insert directo a `sms_messages`, no update directo `profiles.credits`. |

## Bugs encontrados

- `npm run build` falla con Node 22:

```txt
Now using node v22.22.2 (npm v10.9.7)
ng build sms-client
Abort trap: 6
```

- En corrida previa con Node 22 apareció `esbuild` deadlock. En esta corrida volvió a `Abort trap: 6`. `tsc` pasa, entonces apunta a builder/esbuild, no a TypeScript app.
- Historial cliente aún tiene texto `Entregados` para status futuro `delivered`. No está en Dashboard/Analytics; se deja como observación porque FASE 8A no pidió cambiar UX historial y backoffice puede conservar semántica técnica.

## Bugs corregidos

- Sin cambios nuevos de lógica en FASE 8A.
- Cambios ya presentes antes de esta revisión: gráficos Dashboard/Analytics con data real y sin métricas falsas de delivery.

## Bugs pendientes

- Resolver crash `ng build sms-client` / `esbuild`.
- Decidir si Historial cliente debe renombrar filtro `Entregados` a `Aceptados` para coherencia total sin webhook.
- Validar SQL Starter aplicado en Supabase remoto. Si no se aplicó, usuarios nuevos no recibirán 10 SMS.

## Validación de datos reales

- Dashboard:
  - `profiles.credits` → saldo.
  - `sms_messages` → stats, recientes, gráficos 7 días.
- Analytics:
  - `sms_messages` → total, aceptados, fallidos, costo, gráficos 30 días/6 meses.
- Envío:
  - Angular solo llama Edge Function `send-sms`.
  - Backend valida crédito/descuenta/registra.
- Historial:
  - `SmsService.listMyMessages()` filtra por `user_id` actual.
- Backoffice:
  - `SmsService.listAdminMessages()` lee `sms_messages` + `profiles` + `sms_send_attempts`.

## Validación seguridad

Comando:

```txt
rg "from\\('users'\\)|user:users|profiles\\.role|\\.role" projects supabase
```

Resultado: sin coincidencias.

Comando:

```txt
rg "from\\('sms_messages'\\).*insert|from\\('profiles'\\).*update|profiles\\.credits.*=" projects
```

Resultado: sin coincidencias.

Comando:

```txt
rg "service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret|Bearer ey|admin.fortuna|Fortun@" projects supabase
```

Resultado esperado/controlado:

- `SUPABASE_SERVICE_ROLE_KEY` solo en Edge Function `send-sms`.
- `grant ... to service_role` solo en migraciones SQL.
- `admin@fortuna.com.pe` aparece como email público/contacto/fallback.
- Sin `Bearer ey`, sin `sb_secret`, sin password proveedor hardcodeado.

## Validación Dashboard/Analytics

Comando:

```txt
rg "Tasa de entrega|Tasa de Entrega|Entregados|Entregado|delivery|delivered" projects/sms-client/src/app/dashboard/pages/dashboard-overview-page* projects/sms-client/src/app/dashboard/pages/analytics-page* -n
```

Resultado: sin coincidencias.

Comando:

```txt
rg "mock|fake|hardcode|Oferta especial|Codigo de verificacion|Gracias por tu compra|FRT|FORTUNA20" projects/sms-client/src/app/dashboard -n
```

Resultado: sin coincidencias.

## Validación build

Ejecutado:

```txt
source ~/.nvm/nvm.sh && nvm use 22 && rm -rf .angular/cache && npm run build
```

Resultado: falla.

```txt
Now using node v22.22.2 (npm v10.9.7)
ng build sms-client
Abort trap: 6
```

Validación adicional:

```txt
source ~/.nvm/nvm.sh && nvm use 22 && ./node_modules/.bin/tsc -p projects/sms-client/tsconfig.app.json --noEmit
```

Resultado: OK.

## ¿Requiere SQL?

No para FASE 8A.

Sí confirmar/aplicar si falta en Supabase remoto:

- `supabase/migrations/20260508100000_starter_credits_on_signup.sql`
- `supabase/migrations/20260503100000_sms_send_hardening.sql`
- RPCs provider prod/cost si ambiente remoto no las tiene.

## ¿Requiere deploy Edge Function?

No por esta revisión.

Sí si remoto no tiene última `send-sms` hardening/provider real.

## Módulos listos

- Auth cliente.
- Landing + WhatsApp.
- Dashboard cliente, en código.
- Analytics cliente, en código.
- SMS individual.
- Múltiple simple.
- Desde fichero CSV/TXT/XLSX/XLS.
- Plantillas.
- Historial.
- Backoffice mensajes.
- Backoffice recargas/inventario.
- Limpieza legacy.
- Seguridad frontend.

## Módulos pendientes antes API

- Build Angular debe quedar verde.
- Validar migraciones aplicadas en Supabase remoto.
- Prueba manual end-to-end producción: registro nuevo → 10 créditos → enviar SMS → historial → backoffice mensajes.
- Decidir renombre Historial `Entregados` → `Aceptados`.

## Pendientes explícitos no implementados

- API Keys cliente.
- API pública externa.
- `campaign_id` real.
- Campañas.
- Provider bulk optimizado.
- Delivery webhook.
- Consulta real de entrega.

## Recomendación FASE 8B

Antes de API Keys/API pública:

1. Resolver `ng build sms-client` crash (`esbuild`/Angular builder).
2. Confirmar SQL remoto con checklist Supabase.
3. Ejecutar smoke test real con cuenta nueva.
4. Luego diseñar API Keys con scopes, hash de keys, rate limit, auditoría, RPC/Edge Function propia; no exponer service role.
