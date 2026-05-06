# FASE FIX - Dashboard métricas sin delivery webhook

## Estado final

LISTO.

## Por qué se cambió Entregados a Aceptados

Todavía no existe delivery webhook ni consulta real de entrega del operador.
Por eso el dashboard no debe prometer entregas confirmadas.

La métrica principal ahora usa “Aceptados”, que representa mensajes aceptados por el flujo de envío:

- `sent`
- `delivered` si existe en el futuro

`delivered` sigue soportado como status individual, pero no se presenta como métrica principal.

## Cómo se calcula tasa de éxito

```text
aceptados = sent + delivered
procesados = sent + delivered + failed
tasa de éxito = aceptados / procesados
```

`pending` no entra en la tasa porque aún no está procesado.

## Cambios aplicados

- Card “Entregados” -> “Aceptados”.
- “Aceptados” cuenta `sent + delivered`.
- “Fallidos” mantiene `failed`.
- Título “Tasa de entrega” -> “Tasa de éxito de envío”.
- Línea de la gráfica usa porcentaje de éxito diario.
- Barra diaria mantiene total enviados y aceptados.
- Se agregó nota visual:

```text
La confirmación de entrega al operador se implementará con webhook de entrega.
```

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
3 files changed, 171 insertions(+), 86 deletions(-)
```

## Resultado git diff --check

OK.
