# FASE 5F - QA general pre proveedor real

## Estado final

LISTO para iniciar integración de proveedor SMS real.

No se implementó proveedor real, no se crearon API keys, no se tocó Edge Function, no se tocaron recargas/inventario y no hubo cambios de arquitectura.

## Resumen ejecutivo

Revisión técnica sobre cliente SMS, backoffice, arquitectura Supabase, seguridad y deuda pre-producción.

Resultado:

- `npm run build`: OK
- `git diff --check`: OK
- seguridad Angular: OK
- sin `users` runtime
- sin permisos por `profiles.role`
- sin `service_role` en Angular
- sin insert directo a `sms_messages`
- sin update directo a `profiles.credits`
- flujo SMS test mantiene Edge Function + RPC
- plantillas con variables mantienen mensaje final renderizado

Limitación: QA fue estático/técnico con build y búsquedas; pruebas manuales con Supabase real siguen recomendadas antes de conectar proveedor.

## Flujos cliente revisados

- Login cliente usa Supabase Auth y `profiles`.
- Dashboard cliente lee perfil/créditos.
- Recargas cargan paquetes reales y crean solicitudes en `recharges`.
- Historial de recargas filtra por usuario actual.
- Plantillas usan `templates` con RLS.
- Crear/editar plantilla detecta variables y guarda `variables`.
- Eliminar plantilla usa delete propio por RLS.
- Usar plantilla navega a `/dashboard/send?templateId=...`.
- Envío manual usa textarea editable.
- Envío con plantilla bloquea edición del texto base.
- Variables se llenan en inputs dinámicos.
- Vista previa final muestra texto exacto a enviar.
- Envío SMS test llama `supabase.functions.invoke('send-sms')`.
- Historial SMS lee `sms_messages`.
- Múltiple/fichero siguen bloqueados como pendiente.

## Flujos backoffice revisados

- Login admin valida fila activa en `admins`.
- Dashboard lee stats por RPC y estado real de inventario.
- Compra de inventario usa `admin_add_sms_inventory`.
- Recargas listan `recharges` con `profiles` y `sms_packages`.
- Aprobar usa `admin_approve_recharge`.
- Rechazar usa `admin_reject_recharge`.
- Mensajes backoffice leen `sms_messages` con `profiles`.
- Cuentas/clientes usan `profiles`.
- Detalle cliente lee recargas, mensajes y auditoría.
- Edición cliente usa `admin_update_client_profile`.
- Activar/desactivar usa `admin_set_client_active`.
- `/users` redirige a `/accounts` en router.

## Arquitectura DB validada conceptualmente

Tablas esperadas en modelo actual:

- `profiles`
- `admins`
- `sms_packages`
- `recharges`
- `sms_inventory`
- `inventory_purchases`
- `inventory_transactions`
- `sms_messages`
- `templates`
- `profile_audit_logs`

RPC críticas esperadas:

- `admin_add_sms_inventory`
- `admin_approve_recharge`
- `admin_reject_recharge`
- `get_dashboard_stats`
- `internal_send_sms_test`
- `admin_update_client_profile`
- `admin_set_client_active`

Edge Function:

- `send-sms`

## Hallazgos corregidos

Ningún bug crítico nuevo corregido en esta fase.

Código actual ya contenía corrección previa de flujo de plantillas:

- base readonly en modo plantilla
- preview final renderizada
- botón quitar plantilla
- validación de variables faltantes
- botón enviar con motivo de bloqueo

## Hallazgos pendientes

- `UsersPageComponent` legacy aún existe como archivo, pero ruta `/users` redirige a `/accounts`; no afecta runtime.
- No hay paginación server-side en mensajes, cuentas, recargas o auditoría.
- QA visual real en navegador no ejecutado en esta fase.
- Validación real de RLS depende de sesión Supabase y políticas aplicadas.
- No hay test automatizado unit/e2e.

## Archivos modificados

- `FASE_5F_QA_GENERAL_PRE_PROVEEDOR_RESULTADO.md`

No se modificó lógica Angular/Edge/DB en esta fase.

## Resultado build

```text
npm run build: OK
sms-client: OK
backoffice-admin: OK
```

Nota:

```text
Node.js version v25.9.0 detected.
Odd numbered Node.js versions will not enter LTS status and should not be used for production.
```

Advertencia no bloqueante de entorno local.

## Resultado git diff

Antes de crear este reporte:

```text
git diff --stat: sin cambios tracked
git diff --check: OK
```

## Resultados rg

### users / profiles.role

```text
rg "from\\('users'\\)|user:users|profiles\\.role|\\.role" projects supabase || true
sin resultados
```

### service role / secrets Angular

```text
rg "service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret" projects || true
sin resultados
```

### inserts/updates críticos Angular

```text
rg "from\\('sms_messages'\\).*insert|from\\('profiles'\\).*update|profiles\\.credits.*=|total_spent.*=" projects || true
sin resultados
```

### API keys / secrets / password / token

```text
rg "api_keys.*key|api_key.*text|secret|password|token" projects supabase || true
```

Hallazgos:

- `supabase/functions/send-sms/index.ts`: variable local `token` para Authorization Bearer.
- Formularios auth: campos `password`.
- Modelos auth: `password`.
- AuthService: login/register/reset password.

No se encontró:

- `api_keys.key`
- `api_key text`
- secrets hardcodeados
- `SUPABASE_SERVICE_ROLE_KEY` dentro de Angular

## Checklist seguridad

- No tabla `users` en runtime Angular: OK.
- No `user:users`: OK.
- No `profiles.role`: OK.
- No `service_role` en Angular: OK.
- No `SUPABASE_SERVICE_ROLE_KEY` en Angular: OK.
- No `sb_secret` en Angular: OK.
- No insert directo a `sms_messages`: OK.
- No update directo a `profiles.credits`: OK.
- No update directo a `profiles.total_spent`: OK.
- Cambios críticos por RPC: OK.
- Edge Function usa service role solo server-side: OK.

## Checklist funcional

- Auth cliente/admin: OK por código.
- Guard cliente/admin: OK por código.
- Recargas cliente: OK por código.
- Recargas backoffice: OK por código.
- Inventario/RPC: OK por código.
- SMS test: OK por código.
- Historial SMS: OK por código.
- Backoffice mensajes: OK por código.
- Accounts/clientes: OK por código.
- Templates + variables: OK por código.
- `/users` redirect: OK en router.

## Checklist visual

Revisión estática:

- Badges principales: sin deformación evidente en CSS actual.
- Modal accounts ya separado/compactado desde fase previa.
- Send template mode muestra base, variables y preview en bloques separados.
- Botón enviar muestra motivo de bloqueo.
- Empty/loading states existen en templates, history, accounts, messages y recargas.

Pendiente:

- Capturas reales desktop/mobile.
- Prueba con datos largos: emails, nombres, mensajes de 480 caracteres, razón social larga.

## Riesgos antes de proveedor real

- Falta modo test/prod por env.
- Falta provider adapter real.
- Falta manejo de códigos de error proveedor.
- Falta idempotencia/reintentos.
- Falta webhook delivery status.
- Falta rate limit.
- Falta monitoreo/logs.
- Falta rotación de secrets.
- Falta política formal de backups.
- Falta paginación server-side.
- Falta permisos de columna/hardening final.
- Falta auditoría de envío real por provider response.

## Info faltante proveedor SMS

Antes de FASE proveedor real, pedir:

- endpoint base
- método auth
- formato credenciales
- formato request single SMS
- formato response success/error
- códigos de error
- callback/webhook delivery
- límites rate/concurrencia
- encoding/segmentación
- sender ID/originador
- ambiente sandbox/prod
- SLA/reintentos

## Siguiente fase recomendada

FASE 6A: diseño técnico provider adapter + Edge Function modo `test|prod`, sin exponer secrets y sin tocar Angular con credenciales.
