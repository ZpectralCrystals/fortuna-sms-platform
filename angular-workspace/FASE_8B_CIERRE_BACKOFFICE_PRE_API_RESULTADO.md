# FASE 8B - Cierre Backoffice pre API

Fecha: 2026-05-06

## Estado final

**LISTO para pasar a FASE 8C/API**, con módulos futuros marcados como pendientes y sin pantallas falsas.

No requiere SQL. No requiere deploy de Edge Function.

## Archivos modificados

- `projects/backoffice-admin/src/app/pages/users-page.component.ts`
- `projects/backoffice-admin/src/app/pages/users-page.component.html`
- `projects/backoffice-admin/src/app/pages/api-keys-page.component.html`
- `projects/backoffice-admin/src/app/pages/alerts-page.component.html`
- `projects/backoffice-admin/src/app/pages/invoices-page.component.html`
- `projects/backoffice-admin/src/app/pages/marketing-page.component.html`

## Estado por módulo

| Módulo | Estado | Data usada | Bugs encontrados | Corrección |
| --- | --- | --- | --- | --- |
| Dashboard | LISTO | RPC `get_dashboard_stats`, `sms_inventory` | Sin mock detectado | Sin cambios |
| Usuarios | LISTO | `profiles`, `admins` para excluir admins | Botones “Agregar Usuario” y activar/desactivar no tenían backend funcional | Módulo quedó lectura/listado real, con error state claro |
| Cuentas | LISTO | `profiles`, `recharges`, `sms_messages`, `profile_audit_logs`; RPC admin para edición/estado | Sin redirección cruzada; ruta independiente | Sin cambios |
| Recargas | LISTO | `recharges`, paquetes reales; RPC `admin_approve_recharge` / `admin_reject_recharge` | Sin update directo crítico detectado | Sin cambios |
| Inventario | LISTO | `sms_inventory`, `inventory_purchases`; RPC `admin_add_sms_inventory` | Sin update directo crítico detectado | Sin cambios |
| Mensajes | LISTO | `sms_messages`, `profiles`, `sms_send_attempts` | Sanitiza provider response; sin escritura | Sin cambios |
| API Keys | PENDIENTE | Ninguna data productiva | UI parecía permitir crear keys sin backend/API pública | Pantalla pendiente profesional, sin botón falso |
| Alertas SMS | PENDIENTE | Ninguna data productiva | Config local parecía funcional sin backend/cola/RPC | Pantalla pendiente profesional |
| Facturas | PENDIENTE | Ninguna data productiva | Filtros/export aparentaban módulo conectado | Pantalla pendiente profesional |
| Marketing | PENDIENTE | Ninguna data productiva | KPIs/recomendación podían parecer datos reales | Pantalla pendiente profesional |

## Rutas y sidebar

- `/dashboard` carga Dashboard.
- `/users` carga `UsersPageComponent`.
- `/accounts` carga `AccountsPageComponent`.
- `/recharges` carga Recargas.
- `/messages` carga Mensajes.
- `/api-keys`, `/alerts`, `/invoices`, `/marketing` quedan visibles como módulos pendientes.
- `/sync` redirige a `/dashboard`.
- `/integration-kit` redirige a `/dashboard`.
- Sidebar visible mantiene: Dashboard, Usuarios, Recargas, Cuentas, Mensajes, API Keys, Alertas SMS, Facturas, Marketing.
- Sidebar no muestra Sincronización ni Kit Integración.

## Seguridad

- No se creó tabla `users`.
- No se usa `from('users')`.
- No se usa `profiles.role`.
- No se usa `service_role` en Angular.
- No hay inserts directos a `sms_messages` desde Angular.
- No hay updates directos a `profiles.credits`, `sms_inventory` ni `recharges.status` desde Angular.
- `service_role` aparece solo en Edge Function/migraciones esperadas.
- `admin@fortuna.com.pe` aparece como correo público/fallback, no como secreto.

## Resultado build

Comando:

```bash
source ~/.nvm/nvm.sh
nvm use 22
npm run build
```

Resultado:

```text
Now using node v22.22.2 (npm v10.9.7)
ng build sms-client && ng build backoffice-admin
sms-client: OK
backoffice-admin: OK
```

## Resultado git diff

```text
6 files changed, 45 insertions(+), 812 deletions(-)
```

## Resultado rg

```text
rg "from\\('users'\\)|user:users|profiles\\.role|\\.role" projects supabase || true
Sin resultados.

rg "from\\('sms_messages'\\).*insert|from\\('profiles'\\).*update|profiles\\.credits.*=|from\\('sms_inventory'\\).*update|from\\('recharges'\\).*update" projects || true
Sin resultados.

rg "service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret|Bearer ey|admin.fortuna|Fortun@" projects supabase || true
Resultados esperados:
- `SUPABASE_SERVICE_ROLE_KEY` solo en `supabase/functions/send-sms/index.ts`.
- grants `service_role` solo en migraciones.
- `admin@fortuna.com.pe` en landing/legal/layout como correo público.

rg "Sincronización|Sincronizacion|Kit Integración|Kit Integracion" projects/backoffice-admin/src/app -n || true
Resultados solo en componentes legacy ocultos/no usados; rutas `/sync` y `/integration-kit` redirigen a dashboard.

rg "mock|fake|hardcode|lorem|demo data|datos de prueba" projects/backoffice-admin/src/app -n || true
Sin resultados.
```

## Bugs corregidos

- Usuarios: eliminado botón de creación y acciones de activación visuales sin backend directo.
- API Keys: eliminado flujo visual de creación/gestión falsa antes de implementar API pública.
- Alertas SMS: eliminado formulario local que parecía guardar/enviar alertas.
- Facturas: eliminado filtro/export que parecía conectado sin integración real.
- Marketing: eliminado dashboard de KPIs/recomendación sin data real.

## Pendientes explícitos

- API Keys cliente.
- API pública externa.
- Alertas SMS con cola/RPC/auditoría.
- Facturación productiva.
- Marketing/campañas.
- Delivery webhook.
- Campaign ID real.

## Siguiente fase recomendada

FASE 8C: diseño SQL/RPC/Edge Function para API Keys y API pública, con permisos, rate limit, auditoría e idempotencia.
