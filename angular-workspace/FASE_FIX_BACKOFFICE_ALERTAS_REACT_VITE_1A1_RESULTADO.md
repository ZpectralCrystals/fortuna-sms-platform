# FASE FIX - Backoffice Alertas SMS React/Vite 1:1

Fecha: 2026-05-07

## Estado final

**LISTO**. Requiere aplicar SQL nuevo en Supabase.

No se tocó API Keys, API pública, `send-sms`, proveedor SMS, envío cliente, historial cliente, dashboard cliente, mensajes, recargas ni inventario.

## Archivo React/Vite usado como referencia

- `../backoffice/src/pages/Alerts.tsx`

## Diferencias encontradas

React/Vite tenía pantalla completa:

- Header con botón `Enviar Alertas Ahora`.
- 4 cards: Total Alertas, Hoy, Esta Semana, Usuarios Únicos.
- Card `Configuración del Sistema`.
- Switch de estado.
- Inputs de umbral en soles, umbral en SMS, cooldown.
- Checkboxes SMS/Email.
- Textarea con variables `{name}`, `{balance}`, `{amount}`.
- Botones Cancelar / Guardar Configuración.
- Card `Historial de Alertas`.

Angular anterior tenía versión parcial:

- Solo umbral créditos.
- Sin umbral soles.
- Sin cooldown.
- Sin mensaje template.
- Sin botón real para generar alertas.
- Métricas distintas a React/Vite.

## Qué se copió 1:1

- Estructura visual general.
- Header + botón azul.
- Cards superiores con mismos títulos.
- Card grande de configuración.
- Switch verde/gray.
- Grid 2 columnas de inputs.
- Checkboxes de métodos.
- Textarea de mensaje.
- Botones Cancelar / Guardar Configuración.
- Historial con columnas similares: Fecha, Cliente, Contacto, Balance, Equivalente, Vía, Estado.
- Empty states e iconos SVG equivalentes a lucide.

## Campos `low_balance_config` usados

- `is_active`
- `threshold_amount`
- `threshold_credits`
- `cooldown_hours`
- `send_sms`
- `send_email`
- `message_template`
- `created_at`
- `updated_at`

Sincronización UI:

- Editar soles recalcula SMS: `threshold_amount / 0.08`.
- Editar SMS recalcula soles: `threshold_credits * 0.08`.

## Migración nueva

Creada:

- `supabase/migrations/20260510100000_extend_low_balance_config_ui.sql`

Agrega campos faltantes:

- `threshold_amount`
- `cooldown_hours`
- `send_sms`
- `send_email`
- `message_template`
- `low_balance_alerts.sent_via`
- `low_balance_alerts.message_sent`

No borra tablas. No duplica tablas. No pierde data.

## RPCs usadas/creadas

Creada/reemplazada:

- `public.admin_upsert_low_balance_config(boolean, numeric, numeric, integer, boolean, boolean, text)`

Uso:

- Guarda config por RPC admin.
- Evita update directo desde Angular.

Creada:

- `public.admin_generate_low_balance_alerts()`

Uso:

- Valida admin.
- Lee config activa.
- Busca `profiles.credits <= threshold_credits`.
- Excluye admins.
- Respeta `cooldown_hours`.
- Inserta `low_balance_alerts` con `status = 'pending'`.
- Devuelve `generated`, `skipped`, `threshold_credits`, `threshold_amount`.

## Cómo funciona “Enviar Alertas Ahora”

El botón llama `admin_generate_low_balance_alerts()`.

Genera registros pendientes para revisión/envío posterior.

No hace:

- No envía SMS real.
- No llama `send-sms`.
- No llama proveedor.
- No descuenta créditos.
- No envía email real.

Pendiente:

- Cola/notificaciones reales SMS/Email.
- Worker/Edge Function de envío posterior.

## Archivos modificados

- `projects/backoffice-admin/src/app/pages/alerts-page.component.ts`
- `projects/backoffice-admin/src/app/pages/alerts-page.component.html`
- `supabase/migrations/20260510100000_extend_low_balance_config_ui.sql`

## SQL requerido

Sí:

```bash
supabase db push
```

## Deploy Edge requerido

No.

## Resultado build

Comando:

```bash
source ~/.nvm/nvm.sh
nvm use 22
npm run build
```

Resultado:

```text
sms-client: OK
backoffice-admin: OK
```

## Resultado rg

```text
rg "from\\('users'\\)|user:users|profiles\\.role|\\.role" projects supabase || true
Sin resultados.

rg "from\\('sms_messages'\\).*insert|from\\('profiles'\\).*update|profiles\\.credits.*=|from\\('sms_inventory'\\).*update|from\\('recharges'\\).*update" projects || true
Sin resultados.

rg "service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret|Bearer ey|admin.fortuna|Fortun@" projects supabase || true
Resultados esperados:
- `SUPABASE_SERVICE_ROLE_KEY` solo en Edge Function.
- grants `service_role` solo en migraciones previas.
- `admin@fortuna.com.pe` como correo público/fallback.

rg "mock|fake|hardcode|lorem|demo data|datos de prueba" projects/backoffice-admin/src/app/pages/alerts-page* -n || true
Sin resultados.
```

## Estado final

**LISTO**
