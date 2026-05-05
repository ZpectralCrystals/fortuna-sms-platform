# FIX UI - Historial SMS cliente alineación

## Causa visual

El icono de estado tenía tamaño pequeño sin columna fija y la fila usaba `align-items: flex-start`. El bloque derecho de acciones tampoco tenía ancho estable ni centrado vertical, así que icono, contenido y botón podían verse desalineados.

## Archivos modificados

- `projects/sms-client/src/app/dashboard/pages/history-page.component.scss`

## Cambios CSS aplicados

- `.message-row` ahora alinea verticalmente el contenido con `align-items: center`.
- `.status-icon` usa columna fija de `32px`, fondo sutil y centrado interno.
- `.message-row__main` mantiene icono + contenido con gap estable.
- `.message-row__content` conserva `flex: 1` y evita desbordes.
- `.message-actions` usa ancho fijo, columna derecha y centrado vertical.
- Botón `Ver detalle` queda alineado a la derecha en desktop.
- En mobile la fila apila contenido, acciones ocupan ancho completo y no se monta sobre texto.

## Build result

`npm run build`: OK. Warning Node v25 non-LTS, no bloquea build.
