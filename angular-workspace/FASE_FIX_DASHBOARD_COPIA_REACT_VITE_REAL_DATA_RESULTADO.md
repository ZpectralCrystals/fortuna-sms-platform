# FASE FIX - Dashboard copia React/Vite con data real

## Estado final

LISTO.

## Fuente React/Vite

- `../sms/src/pages/Dashboard.tsx`

## Partes copiadas 1:1

- Header con título `Dashboard`, saludo y botón `Enviar SMS`.
- Grid de 4 cards superiores.
- Cards con fondo blanco, borde gris, radio 12px, sombra suave, padding 24px.
- Iconos equivalentes lucide:
  - `Send`
  - `CheckCircle`
  - `XCircle`
  - `CreditCard`
- Grid de 2 gráficas en desktop.
- Sección `Mensajes recientes` con header, link `Ver todos`, filas compactas y empty state.
- Spacing base `24px`, tamaños de títulos y cards alineados al React/Vite.

## Cambios semánticos por falta de delivery webhook

React/Vite mostraba `Entregados` y `Tasa de entrega`.
Angular no puede prometer entrega real porque no hay webhook de operador.

Cambios permitidos:

- `Entregados` -> `Aceptados`.
- `Tasa de entrega` -> `Envíos aceptados por día`.
- `delivered` se mantiene solo como status técnico futuro.

## Métricas reales

- Saldo disponible: `profiles.credits`.
- Saldo en soles: `profiles.credits * 0.08`.
- Total Enviados: `sent + delivered`.
- Aceptados: `sent + delivered`.
- Fallidos: `failed`.
- SMS por día: conteo real de `sms_messages` por `created_at`, últimos 7 días.
- Envíos aceptados por día: conteo real de `sent + delivered` por `created_at`, últimos 7 días.
- Mensajes recientes: últimos 5 `sms_messages` reales del usuario autenticado.

## Gráficas

- No se instaló librería nueva.
- Se reemplazó el intento anterior por SVG responsive estilo Recharts:
  - grid dashed sutil
  - eje Y numérico
  - labels de días
  - barras azul/verde
  - línea verde con puntos pequeños
  - tooltips nativos con `Enviados: N` / `Aceptados: N`
- No hay eje porcentual.
- No hay texto `Tasa de entrega`.
- No hay tooltip `Entregados`.

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
3 files changed, 251 insertions(+), 201 deletions(-)
```

## Resultado rg

Mocks/hardcodes dashboard: sin resultados.

Textos incorrectos:

- `Tasa de entrega`: sin resultados.
- `Tasa de éxito`: sin resultados.
- `Entregados`: sin resultados.
- `Entregado`: sin resultados.
- `delivered`: aparece solo como status técnico interno para soportar datos futuros.

Violaciones:

- `users` / `profiles.role`: sin resultados.
- insert directo `sms_messages` / update `profiles.credits`: sin resultados.
- `service_role` / secrets en Angular: sin resultados.
