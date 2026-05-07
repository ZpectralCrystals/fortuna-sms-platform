# FASE 9 - QA FINAL CLIENTE + BACKOFFICE PRE API

## 1. Estado general

LISTO para pasar a fase API Keys / API pública.

Alcance validado:

- Build completo con Node 22.
- QA estática Cliente + Backoffice.
- Seguridad frontend.
- Limpieza legacy.
- Módulos pre API revisados.

No probado con sesión real:

- Smoke test completo con usuario real, correo confirmado, proveedor SMS y Supabase remoto.
- Se deja como prueba manual obligatoria antes de release productivo.

## 2. Build y entorno

Comandos:

```bash
source ~/.nvm/nvm.sh
nvm use 22
node -v
npm -v
rm -rf .angular/cache
npm run build
```

Resultado:

- Node: `v22.22.2`
- npm: `10.9.7`
- `sms-client`: OK
- `backoffice-admin`: OK

## 3. Estado Cliente

### Landing

Estado: LISTO.

- Botón `Comenzar`: OK.
- Botón `Iniciar sesión`: OK.
- Widget WhatsApp con glifo reconocible: OK.
- Plan Starter muestra 10 SMS gratis: OK.
- No se detectaron datos mock en código productivo.

### Auth / Registro

Estado: LISTO.

- Registro usa Supabase Auth.
- Mensaje de confirmar correo visible.
- Pantalla informa que debe validar correo y luego iniciar sesión.
- Starter 10 SMS queda soportado por trigger SQL `handle_new_user`.
- `profiles.credits = 10` y `total_spent = 0` en registro inicial según migración.
- Usuario desactivado bloqueado en login con mensaje `Cuenta desactivada` + WhatsApp soporte.

### Dashboard cliente

Estado: LISTO.

- Usa `profiles.credits`.
- Usa `sms_messages` real.
- Cards: Total Enviados, Aceptados, Fallidos, Saldo disponible.
- Gráficas con data real.
- Sin `Entregados` / `Tasa de entrega`.
- Sin mocks.

### Analytics cliente

Estado: LISTO.

- Usa `sms_messages` real.
- `Aceptados = sent + delivered` si existiera futuro.
- `Fallidos = failed`.
- Gasto total desde `cost` real.
- Sin `Entregados`.
- Sin `Tasa de Entrega`.
- Sin mocks.

### Envío individual

Estado: LISTO.

- Valida teléfono.
- Valida mensaje.
- Calcula caracteres/SMS.
- Calcula costo.
- Envía por Edge Function `send-sms` mediante `SmsService.sendSingle`.
- Usa `idempotency_key`.
- No inserta `sms_messages` desde Angular.
- No actualiza créditos desde Angular.

### Envío múltiple simple

Estado: LISTO.

- Parser de números.
- Normaliza a `+519XXXXXXXX`.
- Deduplica.
- Reporta inválidos.
- Calcula créditos.
- Envío secuencial.
- Maneja errores parciales.
- Historial registra cada SMS.

### Envío desde fichero

Estado: LISTO.

- CSV/TXT/XLSX/XLS soportados.
- Lee primera hoja Excel.
- Soporta columnas teléfono/mensaje.
- Mensajes personalizados por fila.
- Preview, inválidos, duplicados y créditos.
- Envío secuencial por fila.
- No rompe flujo seguro de Edge Function.

### Plantillas SMS

Estado: LISTO.

- Crear/editar/eliminar: OK.
- Variables detectadas.
- En Enviar SMS con variables:
  - texto base readonly.
  - inputs por variable.
  - preview final.
  - no envía placeholders sin reemplazar.
- Múltiple simple usa variables globales.
- Fichero conserva flujo actual; mapeo de variables por columnas queda pendiente.

### Historial cliente

Estado: LISTO.

- Lista mensajes reales.
- Filtros por estado/fecha/búsqueda.
- Detalle real.
- Provider response sanitizado.
- Export CSV existe.
- Labels corregidos a `Aceptado` para no prometer entrega final sin webhook.

### Recargas cliente

Estado: LISTO.

- Paquetes reales.
- Solicitud de recarga crea `recharges` pendiente.
- No actualiza créditos.
- Aprobación queda en Backoffice por RPC.

### API Keys cliente

Estado: PENDIENTE CONTROLADO.

- Página convertida a módulo pendiente.
- Ya no consulta tabla `api_keys`.
- Ya no muestra creación funcional.
- API pública queda fase final.

## 4. Estado Backoffice

### Dashboard admin

Estado: LISTO.

- Usa RPC `get_dashboard_stats`.
- Inventario real.
- Recargas reales.
- Mensajes reales.
- Label corregido: `Tasa de aceptación`, no entrega.
- Mensajes aceptados = `sent + delivered` si existiera futuro.

### Usuarios

Estado: LISTO.

- Visual React/Vite.
- Data real `profiles`.
- Excluye admins vía tabla `admins`.
- Buscador por nombre/email/empresa/teléfono.
- Activar/desactivar por RPC `admin_set_client_active`.
- No usa tabla `users`.
- No usa `profiles.role`.

### Cuentas

Estado: LISTO.

- Visual cards React/Vite.
- Data real `profiles`, `recharges`, `sms_messages`, `profile_audit_logs`.
- Buscador y filtros.
- Detalle cliente.
- Edición por RPC `admin_update_client_profile`.
- Cambio de estado por RPC.
- Auditoría si tabla existe.

### Recargas

Estado: LISTO.

- Lista recargas reales.
- Filtros por estado.
- Aprobar por RPC `admin_approve_recharge`.
- Rechazar por RPC `admin_reject_recharge`.
- Sin update directo a `recharges.status`.
- Sin update directo a `profiles.credits`.

### Inventario

Estado: LISTO.

- Inventario real desde `sms_inventory`.
- Compras reales desde `inventory_purchases`.
- Agregar inventario por RPC `admin_add_sms_inventory`.
- Sin update directo inseguro.

### Mensajes

Estado: LISTO.

- Lista SMS reales.
- Métricas reales.
- Filtros visuales limpios.
- Búsqueda, estado, fechas.
- Detalle con intento asociado.
- Provider response sanitizado.
- Labels corregidos a `Aceptado`.

### Alertas SMS

Estado: LISTO PRE API.

- Visual React/Bolt 1:1.
- Config real desde `low_balance_config`.
- Métricas e historial desde `low_balance_alerts`.
- Guardar configuración usa RPC `admin_upsert_low_balance_config`.
- `Enviar Alertas Ahora` usa RPC `admin_generate_low_balance_alerts`.
- No llama `send-sms`.
- No descuenta créditos.
- Envío real de alertas queda pendiente.

### Facturas

Estado: LISTO.

- Visual React/Vite.
- Usa recargas aprobadas reales.
- Filtros año/mes.
- Métricas reales.
- Export CSV real.
- No SUNAT.
- No tabla `invoices` inventada.

### Marketing

Estado: LISTO.

- Visual React/Bolt.
- Data real desde `recharges` aprobadas y `profiles`.
- Sin nombres/empresas mock.
- Calcula:
  - ingresos mes actual.
  - crecimiento.
  - clientes activos.
  - ticket promedio.
  - recomendaciones.
  - tendencia 12 meses.
  - adquisición.
  - top clientes.
  - métricas clave.
- No campañas fake.

### API Keys Backoffice

Estado: PENDIENTE CONTROLADO.

- Pantalla profesional pendiente.
- No crea keys.
- No tabla API.
- No Edge Function API.

### Sidebar / Legacy

Estado: LISTO.

Sidebar Backoffice muestra:

- Dashboard
- Usuarios
- Recargas
- Cuentas
- Mensajes
- API Keys
- Alertas SMS
- Facturas
- Marketing

No muestra:

- Sincronización
- Kit Integración

Rutas:

- `/sync` redirige a dashboard.
- `/integration-kit` redirige a dashboard.

Archivos legacy orphan de Sync/Integration Kit fueron eliminados.

## 5. Funciones SQL críticas

Detectadas en migraciones:

- `handle_new_user`
- `internal_begin_sms_send_attempt`
- `internal_complete_sms_send_success`
- `internal_complete_sms_send_failed`
- `admin_upsert_low_balance_config`
- `admin_generate_low_balance_alerts`
- `admin_set_client_active`
- `admin_update_client_profile`

SQL manual recomendado en Supabase antes de release:

```sql
select proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in (
    'handle_new_user',
    'internal_begin_sms_send_attempt',
    'internal_complete_sms_send_success',
    'internal_complete_sms_send_failed',
    'admin_upsert_low_balance_config',
    'admin_generate_low_balance_alerts',
    'admin_set_client_active',
    'admin_update_client_profile'
  );
```

También validar en Supabase:

```sql
select threshold_amount, threshold_credits, cooldown_hours, send_sms, send_email, message_template
from public.low_balance_config
limit 1;
```

```sql
select email, credits, total_spent, created_at
from public.profiles
order by created_at desc
limit 10;
```

## 6. Bugs encontrados

### Críticos

Ninguno.

### Altos

Ninguno.

### Medios

- Cliente `/dashboard/api-keys` todavía consultaba `api_keys` y mostraba creación pendiente como si fuera módulo activo.
- Archivos legacy orphan `sync-page` e `integration-kit-page` seguían en código aunque rutas ya redirigían.

### Bajos

- Labels `Entregado` / `Tasa de entrega` fuera de Dashboard/Analytics en Historial, Backoffice Mensajes y Dashboard Admin.

## 7. Bugs corregidos en esta fase

- Cliente API Keys convertido a pantalla pendiente, sin query a `api_keys`, sin botón funcional falso.
- Eliminados archivos legacy:
  - `sync-page.component.*`
  - `integration-kit-page.component.*`
- Labels corregidos:
  - `Entregado(s)` → `Aceptado(s)`
  - `Tasa de entrega exitosa` → `Tasa de aceptación`
  - `Mensajes entregados` → `Mensajes aceptados`

## 8. Pendientes explícitos

- API Keys cliente/admin.
- API pública externa.
- Envío real de alertas SMS sin descontar créditos.
- Variables por destinatario en múltiple simple.
- Mapeo de variables desde columnas de fichero.
- Delivery webhook / consulta real de entrega.
- Smoke test real con Supabase remoto, correo confirmado y proveedor SMS.

## 9. Validaciones técnicas

### Build

OK.

### `git diff --check`

OK.

### `git diff --stat`

```text
38 files changed, 2023 insertions(+), 2872 deletions(-)
```

Incluye cambios acumulados de fases anteriores y fixes QA.

### Seguridad rg

```bash
rg "from\\('users'\\)|user:users|profiles\\.role|\\.role" projects supabase || true
```

Resultado: sin resultados.

```bash
rg "from\\('sms_messages'\\).*insert|from\\('profiles'\\).*update|profiles\\.credits.*=|from\\('sms_inventory'\\).*update|from\\('recharges'\\).*update" projects || true
```

Resultado: sin resultados.

```bash
rg "service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret|Bearer ey" projects supabase || true
```

Resultado: aparece solo en Supabase Edge Function/migrations esperadas:

- `supabase/functions/send-sms/index.ts`
- migraciones con grants a `service_role`

No aparece en Angular.

### Mocks rg

```bash
rg "mock|fake|hardcode|lorem|demo data|datos de prueba|Juan Villanueva|Carlos Rodríguez|Carlos Rodriguez|Ana Torres|Pedro Sanchez|Pedro Sánchez|Marketing Pro|Startup Innovadora|Empresa XYZ|QA Backoffice|QA Interno|999111222" projects -n || true
```

Resultado: sin resultados.

### Legacy / API / delivery labels

Resultado: sin resultados para:

- `Entregado`
- `Entregados`
- `Tasa de entrega`
- `Sincronización`
- `Kit Integración`
- `from('api_keys')`
- `Nueva API Key`

## 10. SQL requerido

No.

No se aplicó SQL nuevo en FASE 9.

## 11. Deploy Edge requerido

No.

No se tocó `send-sms`.

## 12. Smoke test real recomendado

NO PROBADO en esta ejecución por falta de sesión/correo/proveedor real desde entorno local.

Ejecutar manual:

1. Crear usuario nuevo.
2. Confirmar correo.
3. Validar `credits = 10`, `total_spent = 0`.
4. Enviar 1 SMS individual.
5. Validar descuento a 9 SMS.
6. Ver historial cliente.
7. Ver Backoffice Mensajes.
8. Crear recarga cliente.
9. Aprobar recarga en Backoffice.
10. Validar incremento de créditos e inventario.
11. Validar Facturas y Marketing.
12. Desactivar usuario.
13. Intentar login y ver `Cuenta desactivada`.
14. Reactivar usuario.
15. Validar login normal.

## 13. Recomendación

Pasar a FASE API Keys/API pública después de ejecutar smoke real en entorno con Supabase y proveedor configurados.

Estado final: LISTO.
