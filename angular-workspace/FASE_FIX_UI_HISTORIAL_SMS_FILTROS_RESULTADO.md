# FIX UI - Historial SMS filtros

## Causa del problema visual

Los filtros usaban grid sin columnas definidas en desktop y los inputs no tenían altura fija. Los iconos estaban centrados por `top: 50%`, pero eso se desalineaba con campos que sí tienen label (`Desde` / `Hasta`).

## Archivos modificados

- `projects/sms-client/src/app/dashboard/pages/history-page.component.scss`

## Qué se corrigió en filtros

- Desktop usa grid: `1.2fr 1.2fr 1fr 1fr`.
- Filtros alinean con `align-items: end`.
- Inputs/select tienen altura uniforme de `44px`.
- Iconos quedan centrados dentro del input con `bottom: 12px`.
- Labels `Desde` y `Hasta` quedan encima del input, con spacing fijo.
- Mobile conserva una columna y padding compacto.

## Qué se mantuvo en filas

- Icono izquierdo con columna fija.
- Contenido central flexible.
- Badge Real/Test + botón `Ver detalle` alineados a la derecha.
- Mobile apila filas sin overflow.

## Build result

`npm run build`: OK. Warning Node v25 non-LTS, no bloquea.
