# FASE FIX - Analytics labels Aceptados

## Estado final

PARCIAL.

Razón: analytics ya no contiene textos `Entregados`, `Entregado`, `Tasa de Entrega`, `delivery` ni `delivered`, pero `npm run build` falla por crash de Angular CLI/Node con `Abort trap: 6` antes de emitir error de compilación.

## Dónde salía "Entregados"

En Analytics:

- Card `Tasa de Entrega`.
- Nota `{{ stats.delivered }} entregados`.
- Leyenda gráfica `Entregados`.
- Clase/serie `line--delivered`.
- Métrica `deliveryRate`.
- Campo interno visible `delivered`.

## Qué se cambió

- `Tasa de Entrega` -> `Tasa de éxito de envío`.
- `Entregados` -> `Aceptados`.
- Serie verde de `Envíos últimos 30 días` -> `Aceptados`.
- Serie roja -> `Fallidos`.
- Leyenda visible -> `Aceptados` / `Fallidos`.
- Tooltip nativo de línea no contiene `Entregados`.
- Status futuro se mantiene calculado sin texto visible.

## Validación visual por código

Analytics template actual:

- Card muestra `Tasa de éxito de envío`.
- Nota muestra `{{ stats.accepted }} aceptados`.
- Leyenda muestra `Aceptados` y `Fallidos`.
- Gráfico estado muestra `Aceptados`, `Pendientes`, `Fallidos`.
- No existe `Entregados` en HTML/SCSS/TS de Analytics.

## Archivos modificados

- `projects/sms-client/src/app/dashboard/pages/analytics-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/analytics-page.component.html`
- `projects/sms-client/src/app/dashboard/pages/analytics-page.component.scss`

## Resultado build

Falló por crash de Angular CLI/Node:

```text
npm run build
ng build sms-client
Abort trap: 6
```

También se intentó:

```text
ng cache clean
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

Mismo resultado.

`tsc -p projects/sms-client/tsconfig.app.json --noEmit` sí pasa.

## Resultado rg

Analytics específico:

```bash
rg "Entregados|Entregado|Tasa de Entrega|Tasa de entrega|delivery|delivered" projects/sms-client/src/app/dashboard/pages/analytics-page.component* -n || true
```

Resultado:

```text
sin resultados
```

Todo `src/app`:

```text
Hay coincidencias en history, send-sms y landing pública. Fuera de alcance por instrucción explícita: no tocar historial, envío SMS ni otras pantallas.
```

## Estado

PARCIAL por build crash externo. Labels de Analytics: corregidos.
