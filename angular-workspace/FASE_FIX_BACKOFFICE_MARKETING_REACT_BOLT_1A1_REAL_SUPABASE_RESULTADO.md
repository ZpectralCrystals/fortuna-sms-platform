# FASE FIX BACKOFFICE MARKETING - React/Bolt 1:1 con data real

## Referencia React/Bolt

- Archivo usado: `../backoffice/src/pages/Marketing.tsx`.
- Se revisó estructura JSX, layout Tailwind, cards, gráfica de barras, recomendaciones, tabla de adquisición, top clientes y métricas clave.

## Diferencias antes

- Angular mostraba actividad SMS desde `sms_messages`.
- No seguía la pantalla React/Bolt de Marketing comercial.
- Faltaban cards: `Ingresos Este Mes`, `Crecimiento`, `Clientes Activos`, `Ticket Promedio`.
- Faltaban bloques: `Recomendaciones de Marketing`, `Tendencia de Ingresos`, `Adquisición de Clientes`, `Top 5 Clientes`, `Métricas Clave del Negocio`.

## Copiado visual 1:1

- Header `Marketing`.
- Título `Marketing & Análisis`.
- Subtítulo `Decisiones basadas en datos para impulsar tu negocio`.
- 4 cards superiores con iconos equivalentes.
- Card grande de recomendaciones con fondos semánticos.
- Gráfica de barras `Tendencia de Ingresos (Últimos 12 Meses)` con tooltip.
- Grid inferior 2 columnas:
  - `Adquisición de Clientes`
  - `Top 5 Clientes`
- Bloque final con gradiente suave:
  - `Tasa de Retención`
  - `Nuevos Clientes`
  - `Diferencia`
- Responsive conservado con grid 1/2/4 columnas.

## Data mock eliminada

- No se copiaron nombres, empresas, emails, montos ni fechas del React/Bolt.
- No hay arrays mock.
- No hay data hardcodeada.
- No se usan nombres tipo `Juan Villanueva`, `Carlos Rodríguez`, `Ana Torres`, `Pedro Sánchez`, `Marketing Pro`, `Empresa XYZ`, `Startup Innovadora`, `Innovatech`.

## Fuente real de datos

- `public.recharges` vía `RechargesService.listAdminRecharges()`.
- `public.profiles` vía `BackofficeService.listClients()`.
- Solo se consideran recargas `status = approved`.
- `BackofficeService.listClients()` ya excluye admins usando `public.admins`.

## Cálculos

- Ingresos este mes: suma `recharges.amount` aprobadas del mes actual.
- Crecimiento: mes actual vs mes anterior.
  - si mes anterior > 0: fórmula porcentual real.
  - si mes anterior = 0 y mes actual > 0: `Nuevo ingreso`.
  - si ambos 0: `0.0%`.
- Clientes activos: clientes únicos con recarga aprobada este mes.
- Total clientes: perfiles reales excluyendo admins.
- Ticket promedio: promedio de recargas aprobadas del mes actual; si no hay, promedio general aprobado.
- Recomendaciones:
  - ingresos en descenso si ingresos actuales < mes anterior.
  - baja retención si activos / totales < 40%.
  - sin nuevos clientes si primera compra aprobada del mes = 0.
  - buen desempeño si no hay alertas negativas.
  - info insuficiente si no hay recargas ni perfiles.
- Tendencia últimos 12 meses: suma mensual de recargas aprobadas.
- Adquisición de clientes: nuevos = primera compra aprobada en periodo; recurrentes = compra previa antes del periodo.
- Top 5 clientes: agrupa recargas aprobadas por `user_id`, suma monto y cuenta recargas, enriquece con `profiles`.
- Métricas clave:
  - retención = clientes recurrentes / clientes con compra.
  - nuevos clientes = primera compra aprobada del mes.
  - diferencia = ingresos mes actual - ingresos mes anterior.

## Archivos modificados

- `projects/backoffice-admin/src/app/pages/marketing-page.component.ts`
- `projects/backoffice-admin/src/app/pages/marketing-page.component.html`
- `projects/backoffice-admin/src/app/pages/marketing-page.component.scss`

## SQL

- No requiere SQL.

## Deploy Edge Function

- No requiere deploy Edge Function.

## Build

- `npm run build`: OK con Node `v22.22.2`.
- Compila `sms-client` y `backoffice-admin`.

## Resultado rg

- `from('users')|user:users|profiles.role|.role`: sin coincidencias.
- updates/insert directos prohibidos en `projects/backoffice-admin projects/shared`: sin coincidencias.
- `service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret|Bearer ey` en `projects/backoffice-admin projects/shared`: sin coincidencias.
- mocks/fakes prohibidos en `marketing-page*`: sin coincidencias.

## Estado final

LISTO.
