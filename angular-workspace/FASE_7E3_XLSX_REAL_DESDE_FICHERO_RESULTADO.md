# FASE 7E3 - XLSX real desde fichero

## Estado final

LISTO.

Se agrego soporte real para `.xlsx` y `.xls` en `/dashboard/send` > `Desde Fichero`, manteniendo CSV/TXT y el flujo seguro por Edge Function `send-sms`.

## Dependencia instalada

- `xlsx@^0.18.5`

Archivos actualizados por instalacion:

- `package.json`
- `package-lock.json`

Nota: `npm install xlsx` reporto vulnerabilidades del arbol npm. No se ejecuto `npm audit fix` para evitar cambios fuera de alcance.

## Archivos modificados

- `package.json`
- `package-lock.json`
- `projects/shared/src/lib/models/sms.model.ts`
- `projects/shared/src/lib/services/sms.service.ts`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.html`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.scss`

## Formatos soportados

- Excel `.xlsx`
- Excel `.xls`
- CSV `.csv`
- TXT `.txt`

La UI ya no dice que XLSX queda pendiente.

## Como parsea XLSX/XLS

Angular lee Excel con:

```ts
XLSX.read(data, { type: 'array' })
```

Luego:

- toma la primera hoja
- convierte a matriz con `XLSX.utils.sheet_to_json(..., { header: 1 })`
- elimina filas vacias
- detecta encabezados
- mapea telefono y mensaje

Si no hay hoja o filas:

- `Archivo Excel vacío.`

Si no hay columna telefono:

- `No se encontró una columna de teléfono. Usa una columna llamada telefono o celular.`

## Como detecta columnas

Telefono:

- `telefono`
- `teléfono`
- `phone`
- `celular`
- `numero`
- `número`
- `nro`
- `mobile`

Mensaje:

- `mensaje`
- `message`
- `texto`
- `contenido`
- `sms`

Los encabezados se normalizan a minusculas, sin acentos y sin simbolos.

## Mensaje por fila

Regla:

- Si existe columna mensaje, usa mensaje de esa fila.
- Si no existe columna mensaje, usa mensaje general del textarea.
- Si una fila queda sin mensaje y textarea esta vacio, bloquea envio:
  `Cada fila debe tener mensaje o escribe un mensaje general.`

## CSV/TXT

Se mantiene soporte existente:

- `telefono,mensaje`
- lista simple de telefonos
- separadores por salto de linea, coma, punto y coma, tab o espacios

CSV/TXT puede usar mensaje por fila o fallback a mensaje general.

## Deduplicado

Deduplica por numero normalizado.

Si hay duplicados con mensajes distintos, conserva primer registro y marca el resto como duplicados removidos.

## Creditos

Calculo usa mensaje real por fila:

```ts
segments = calculateSegments(row.message || generalMessage)
totalCredits = sum(segments)
cost = totalCredits * 0.08
```

Backend sigue validando saldo y descontando creditos. Angular no descuenta directo.

## Envio

Se agrego:

- `SmsFileRow`
- `SmsFileSendResult`
- `SmsService.sendFileRowsSimple(rows)`

Flujo:

- `for...of` secuencial
- `idempotency_key` por fila
- `sendSingle({ recipient, message, idempotency_key })`
- si una fila falla, continua con las demas
- si error de sesion, corta

No usa `Promise.all`.

## Plantilla descargable

Boton descarga `.xlsx` con hoja `Plantilla SMS`.

Columnas:

- `Teléfono`
- `Mensaje`

Filas ejemplo:

- `956062256`
- `51956062256`
- `+51987654321`

## Seguridad mantenida

- No se toca Supabase.
- No se toca Edge Function `send-sms`.
- No se toca proveedor SMS.
- No se crea `campaigns`.
- No se crea `users`.
- No se usa `from('users')`.
- No se usa `profiles.role`.
- No se inserta directo en `sms_messages`.
- No se actualiza directo `profiles.credits`.
- No se usa `service_role` en Angular.

## Pendientes

- `campaign_id` real.
- Campanas.
- Endpoint proveedor `/sms/plantilla`.
- Reporte avanzado de errores por archivo.
- Paginacion/agrupacion visual de lotes.

## Pruebas manuales recomendadas

1. Descargar plantilla Excel.
2. Subir `.xlsx` descargado.
3. Confirmar tipo `Excel` en preview.
4. Confirmar filas leidas, validos, invalidos y duplicados.
5. Confirmar preview con telefono normalizado y mensaje por fila.
6. Enviar.
7. Ver resultados enviados/fallidos.
8. Ir a `/dashboard/history`; confirmar cada SMS individual.
9. Probar Excel sin columna telefono; debe mostrar error claro.
10. Probar CSV/TXT anterior; no debe romper.

## Build

`npm run build`: OK.
