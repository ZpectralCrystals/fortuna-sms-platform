# FASE FIX - Dashboard gráfica enviados dinámica

## Estado final

LISTO.

## Gráfica reemplazada

Se eliminó la gráfica porcentual de “Tasa de éxito de envío”.

Nueva gráfica:

```text
Envíos aceptados por día
```

No usa porcentajes ni eje `0%`, `25%`, `50%`, `75%`, `100%`.

## Cálculo de “Envíos aceptados por día”

Por cada día de los últimos 7 días:

```text
aceptados = count(status = sent) + count(status = delivered)
```

`delivered` queda solo como soporte futuro si algún día llega webhook de entrega.
La UI del dashboard no muestra “Entregados” ni “Tasa de entrega”.

## Cambios visuales

- Segunda gráfica ahora usa cantidades reales.
- Eje Y numérico.
- Línea verde con puntos pequeños.
- Grid sutil.
- Labels de días abajo.
- Hover/title: `Aceptados: N`.
- Primera gráfica se mantiene como `SMS por día (últimos 7 días)`.

## Archivos modificados

- `projects/sms-client/src/app/dashboard/pages/dashboard-overview-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/dashboard-overview-page.component.html`
- `projects/sms-client/src/app/dashboard/pages/dashboard-overview-page.component.scss`

## Resultado build

OK.

```text
npm run build
sms-client OK
backoffice-admin OK
```

Nota: Node local muestra advertencia por versión impar `v25.9.0`, pero build finaliza correctamente.

## Resultado git diff

```text
3 files changed, 172 insertions(+), 99 deletions(-)
```

## Resultado rg

No hay textos de UI `Tasa de entrega`, `Entregados`, `Entrega`.

`delivered` aparece solo en TS como status técnico soportado para contar futuros mensajes aceptados:

```text
status === 'delivered'
stats.delivered
```

No se encontraron mocks/hardcodes en dashboard.
