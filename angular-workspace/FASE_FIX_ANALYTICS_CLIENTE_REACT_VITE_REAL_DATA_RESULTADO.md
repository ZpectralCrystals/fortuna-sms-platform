# FASE FIX - Analytics cliente React/Vite con data real

## Estado final

LISTO.

## Archivo React/Vite usado como referencia

- `../sms/src/pages/Analytics.tsx`

## Diseño React/Vite

React/Vite usa:

- 4 cards superiores.
- Iconos `TrendingUp`, `MessageSquare`, `CheckCircle`, `XCircle`, `DollarSign`.
- Layout `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6`.
- Cards blancas con `rounded-xl`, borde gris, sombra suave, padding 24px.
- Gráfica 1 con `LineChart` y dos líneas.
- Gráfica 2 con `PieChart`.
- Gráfica 3 con `BarChart` mensual.

## Diferencias encontradas

- Angular mostraba `Tasa de Entrega`.
- Angular mostraba `Entregados`.
- Angular calculaba tasa sobre `delivered`, dato no confirmado porque no hay webhook de entrega.
- Gráfico de estado podía verse desordenado si un segmento dominaba.

## Qué se copió 1:1

- Estructura general.
- Cards superiores.
- Iconos equivalentes SVG.
- Colores base:
  - azul `#3b82f6`
  - verde `#10b981`
  - rojo `#ef4444`
  - amarillo `#f59e0b`
  - morado para gasto
- Gráficas:
  - línea últimos 30 días
  - distribución por estado
  - barras últimos 6 meses
- Spacing, bordes, sombras y responsive.

## Cambios semánticos por falta de delivery webhook

Se reemplazó:

- `Tasa de Entrega` -> `Tasa de éxito de envío`
- `Entregados` -> `Aceptados`

`Aceptados` significa:

```text
status = sent
status futuro de entrega si existe
```

No se muestra confirmación real de entrega al celular.

## Métricas reales

- Total Enviados: `sent + status futuro de entrega si existe`.
- Tasa de éxito de envío: `aceptados / (aceptados + failed)`.
- SMS Fallidos: `failed`.
- Gasto Total: suma de `cost` solo de mensajes aceptados.
- `pending` no cuenta como éxito ni fallo.

## Gráficas reales

### Envíos últimos 30 días

- Aceptados por día.
- Fallidos por día.
- Agrupado por `sms_messages.created_at`.

### Distribución por Estado

- Aceptados.
- Pendientes.
- Fallidos.
- Leyenda limpia al lado/debajo para evitar labels montados.

### Tendencia últimos 6 meses

- Mensajes aceptados por mes.
- Costo aceptado por mes.

## Archivos modificados

- `projects/sms-client/src/app/dashboard/pages/analytics-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/analytics-page.component.html`
- `projects/sms-client/src/app/dashboard/pages/analytics-page.component.scss`

## Resultado build

OK.

```text
npm run build
sms-client OK
backoffice-admin OK
```

Nota: Node local muestra advertencia por versión impar `v25.9.0`, pero build finaliza correctamente.

## Resultado rg

Analytics específico:

```text
rg "Tasa de Entrega|Tasa de entrega|Entregados|Entregado|delivery|delivered" projects/sms-client/src/app/dashboard/pages/analytics-page.component* -n
sin resultados
```

Dashboard general:

- Sin mocks/hardcodes.
- Sin `users`.
- Sin `profiles.role`.
- Sin insert directo a `sms_messages`.
- Sin update directo a `profiles.credits`.
- Sin `service_role`/secrets.

Nota: el `rg` amplio sobre `projects/sms-client/src/app/dashboard/pages` todavía encuentra textos `delivered/Entregado` en historial y send-sms, fuera de alcance de esta fase porque la regla decía no tocar historial ni envío SMS.
