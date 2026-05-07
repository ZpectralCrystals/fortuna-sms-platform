# FASE 8C/8D/8E - Backoffice Alertas, Facturas, Marketing

Fecha: 2026-05-07

## Estado final

**LISTO** con una condición operativa: aplicar la migración nueva de alertas en Supabase.

No se implementó API Keys ni API pública. API Keys queda pendiente.

## 1. Alertas SMS

Estado: **LISTO con SQL requerido**

Tabla usada:

- `public.low_balance_config`
- `public.low_balance_alerts`
- `public.profiles`
- `public.admins`

SQL creado:

- `supabase/migrations/20260509100000_create_low_balance_alerts.sql`

Qué crea:

- Tabla `low_balance_config`.
- Tabla `low_balance_alerts`.
- RLS admin para lectura.
- RPC `public.admin_upsert_low_balance_config(...)`.
- Config inicial: umbral 10 créditos, activo, notificación admin activa, cliente inactiva.

Data mostrada:

- Config actual de umbral.
- Estado activo/pausado.
- Clientes con `profiles.credits <= threshold_credits`.
- Email, nombre, razón social/RUC, créditos, estado, fecha actualización.
- Historial de alertas desde `low_balance_alerts`.
- Métricas: clientes bajo umbral, alertas registradas, pendientes/enviadas.

Funciones completadas:

- Leer config real.
- Guardar config por RPC admin.
- Listar clientes bajo saldo.
- Listar historial real.
- Mostrar limitación real.

Limitaciones reales:

- No envía SMS automático.
- No descuenta créditos.
- Cola/notificaciones quedan para fase posterior.

## 2. Facturas / Comprobantes internos

Estado: **LISTO**

Fuente de data:

- `recharges` aprobadas.
- Relación `profiles`.
- Relación `sms_packages`.

Campos mostrados:

- Cliente.
- Email.
- RUC.
- Razón social.
- Paquete.
- SMS.
- Monto.
- Método de pago.
- Código operación.
- Fecha aprobación.
- Estado.

Filtros:

- Buscar por cliente/email/RUC/código operación.
- Fecha desde.
- Fecha hasta.
- Método de pago.

Métricas:

- Recargas aprobadas.
- SMS vendidos.
- Total aprobado.

Acciones:

- Ver detalle.
- Exportar CSV real de comprobantes internos filtrados.

Aclaración:

- No emite comprobantes SUNAT.
- No crea tabla `invoices`.
- Módulo funciona como control interno de recargas aprobadas.

## 3. Marketing

Estado: **LISTO**

Tablas consultadas:

- `sms_messages`.
- Relación `profiles`.

Métricas reales:

- SMS aceptados: status `sent` + `delivered` futuro.
- SMS fallidos: status `failed`.
- Costo total: suma `cost` de aceptados.
- Clientes con actividad: usuarios únicos en mensajes cargados.

Gráficas/listas:

- Actividad SMS últimos 30 días.
- Top clientes por consumo.
- Actividad reciente de alto volumen últimos 7 días.

Limitación `campaign_id`:

- No existe agrupación real por campañas todavía.
- La pantalla muestra análisis real de mensajes individuales.
- Campañas avanzadas quedan pendientes hasta agregar `campaign_id`.

Qué queda pendiente:

- Agrupador por campaña.
- Creación/gestión de campañas.
- Provider bulk optimizado.

## 4. API Keys

Estado: **PENDIENTE**

Confirmado:

- Pantalla queda profesional pendiente.
- No hay botón Crear.
- No se creó tabla API.
- No se creó Edge Function API.
- No se implementó API pública.

Texto vigente:

> Este módulo se implementará en la fase final de API pública externa.

## Archivos modificados

- `projects/backoffice-admin/src/app/pages/alerts-page.component.ts`
- `projects/backoffice-admin/src/app/pages/alerts-page.component.html`
- `projects/backoffice-admin/src/app/pages/alerts-page.component.scss`
- `projects/backoffice-admin/src/app/pages/invoices-page.component.ts`
- `projects/backoffice-admin/src/app/pages/invoices-page.component.html`
- `projects/backoffice-admin/src/app/pages/invoices-page.component.scss`
- `projects/backoffice-admin/src/app/pages/marketing-page.component.ts`
- `projects/backoffice-admin/src/app/pages/marketing-page.component.html`
- `projects/backoffice-admin/src/app/pages/marketing-page.component.scss`
- `supabase/migrations/20260509100000_create_low_balance_alerts.sql`

## SQL requerido

Sí. Aplicar:

```bash
supabase db push
```

O ejecutar la migración:

```text
supabase/migrations/20260509100000_create_low_balance_alerts.sql
```

## Deploy Edge requerido

No.

No se tocó `send-sms`.

## Resultado build

Comando:

```bash
source ~/.nvm/nvm.sh
nvm use 22
rm -rf .angular/cache
npm run build
```

Resultado:

```text
sms-client: OK
backoffice-admin: OK
```

## Resultado git diff

```text
9 files changed, 1213 insertions(+), 285 deletions(-)
```

Nota: `git diff --stat` no incluye archivos nuevos sin stage. Archivos nuevos:

- `supabase/migrations/20260509100000_create_low_balance_alerts.sql`
- `FASE_8C_8D_8E_BACKOFFICE_ALERTAS_FACTURAS_MARKETING_RESULTADO.md`

## Resultado rg

```text
rg "from\\('users'\\)|user:users|profiles\\.role|\\.role" projects supabase || true
Sin resultados.

rg "from\\('sms_messages'\\).*insert|from\\('profiles'\\).*update|profiles\\.credits.*=|from\\('sms_inventory'\\).*update|from\\('recharges'\\).*update" projects || true
Sin resultados.

rg "service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret|Bearer ey|admin.fortuna|Fortun@" projects supabase || true
Resultados esperados:
- `SUPABASE_SERVICE_ROLE_KEY` solo en Edge Function `send-sms`.
- grants `service_role` solo en migraciones previas.
- `admin@fortuna.com.pe` como correo público/fallback.

rg "mock|fake|hardcode|lorem|demo data|datos de prueba" projects/backoffice-admin/src/app -n || true
Sin resultados.
```

## Validación menú

Sidebar debe mostrar:

- Dashboard.
- Usuarios.
- Recargas.
- Cuentas.
- Mensajes.
- API Keys.
- Alertas SMS.
- Facturas.
- Marketing.

Sidebar no debe mostrar:

- Sincronización.
- Kit Integración.

Rutas legacy existentes:

- `/sync` redirige a dashboard.
- `/integration-kit` redirige a dashboard.

## Estado final

**LISTO**

Siguiente fase recomendada:

FASE API final: API Keys + API pública externa, con SQL, hashing, rate limit, auditoría e idempotencia.
