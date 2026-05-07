# FASE FIX BACKOFFICE ALERTAS - React/Bolt 1:1 literal

## Referencia

- Archivo React/Bolt usado: `../backoffice/src/pages/Alerts.tsx`.

## Diferencias antes

- Angular tenía nota interpretativa sobre revisión/envío posterior.
- Angular mostraba sección extra `Clientes con saldo bajo`, no presente en React/Bolt.
- Header no separaba `Alertas SMS` y `Alertas de Saldo Bajo` como pidió la fase.

## Copiado 1:1

- Se mantuvo estructura visual React/Bolt:
  - `Alertas SMS`
  - `Alertas de Saldo Bajo`
  - `Sistema automático de notificaciones por SMS`
  - botón `Enviar Alertas Ahora`
  - cards `Total Alertas`, `Hoy`, `Esta Semana`, `Usuarios Únicos`
  - card `Configuración del Sistema`
  - `Estado del Sistema`
  - switch activo/inactivo
  - `Umbral en Soles (S/)`
  - `Umbral en SMS`
  - `Espera entre alertas (horas)`
  - `Métodos de Envío`
  - `Enviar por SMS`
  - `Enviar por Email`
  - `Mensaje de Alerta`
  - `Variables disponibles: {name}, {balance}, {amount}`
  - botones `Cancelar` / `Guardar Configuración`
  - `Historial de Alertas`
  - empty state `No hay alertas registradas`

## Textos mantenidos

- No se cambió `Enviar Alertas Ahora`.
- No se quitó `Métodos de Envío`.
- No se quitó `Enviar por SMS`.
- No se quitó `Enviar por Email`.
- No se cambió `Sistema automático de notificaciones por SMS`.

## Data real Supabase

- `low_balance_config`: configuración real.
- `low_balance_alerts`: historial y métricas reales.
- `profiles` / `admins`: lógica interna existente para clientes bajo saldo, sin sección visible nueva.

## RPCs

- Guardar config: `admin_upsert_low_balance_config`.
- Botón `Enviar Alertas Ahora`: `admin_generate_low_balance_alerts`.

## No corregido intencionalmente

- No se corrigió semántica SMS/Email porque fase pidió copia literal React/Bolt.
- No se cambió texto del botón aunque funcionalmente use RPC segura.
- No se agregó sección `Clientes con saldo bajo` porque React/Bolt no la muestra.

## Archivos modificados

- `projects/backoffice-admin/src/app/pages/alerts-page.component.ts`
- `projects/backoffice-admin/src/app/pages/alerts-page.component.html`
- `projects/backoffice-admin/src/app/pages/alerts-page.component.scss`

## SQL

- No requiere SQL.

## Deploy Edge Function

- No requiere deploy Edge Function.

## Build

- `npm run build`: OK con Node `v22.22.2`.
- `sms-client`: OK.
- `backoffice-admin`: OK.
- `git diff --check`: OK.

## RG

- `from('users')|user:users|profiles.role|.role`: sin coincidencias.
- updates/insert directos prohibidos en backoffice/shared: sin coincidencias.
- `service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret|Bearer ey` en backoffice/shared: sin coincidencias.
- mocks/fakes en `alerts-page*`: sin coincidencias.
- sección extra `Clientes con saldo bajo`: sin coincidencias visibles en `alerts-page*`.

## Estado final

LISTO.
