# FASE 7E2 - Validacion Desde Fichero vs React/Vite

## Estado final

LISTO.

Se audito la version original React/Vite y se alineo Angular en lo seguro: carga de fichero con mensajes personalizados por fila, preview, calculo por mensaje real y envio secuencial por Edge Function `send-sms`.

## Que hacia React/Vite

Archivo encontrado:

- `../sms/src/pages/SendSMS.tsx`

React/Vite usaba:

- dependencia `xlsx`
- carga `.xlsx`, `.xls`, `.csv`, `.txt`
- columnas `Telefono`, `Mensaje`
- mensajes personalizados por fila
- nombre de campana
- intento de crear registro en `campaigns`
- inserts directos en `sms_messages`
- update directo de `profiles.credits` y `profiles.total_spent`

Parte unsafe legacy no se migro tal cual porque el proyecto Angular actual usa Edge Function + RPC.

## Que hace Angular ahora

Archivo principal:

- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.ts`

Angular ahora:

- soporta `.csv` y `.txt`
- no promete Excel porque Angular no tiene dependencia `xlsx`
- acepta columnas `telefono,mensaje`
- acepta encabezados `telefono`, `teléfono`, `phone`, `celular`, `mensaje`, `message`
- soporta filas con mensaje personalizado
- soporta archivo solo con telefonos y usa mensaje general del textarea
- envia secuencialmente
- cada fila usa `SmsService.sendSingle()` con `idempotency_key` propia
- no usa `Promise.all`
- si un destinatario falla, continua con el resto
- si falla sesion, corta y muestra error

## XLSX/XLS

No funciona en Angular porque `package.json` no tiene dependencia para leer Excel.

No se instalo dependencia nueva.

La UI queda honesta:

- acepta seleccionar `.xlsx/.xls` solo para mostrar error claro
- mensaje: `Por ahora soportamos CSV o TXT. XLSX se implementará en una siguiente fase.`

## CSV/TXT

Funciona con:

```csv
telefono,mensaje
956062256,Hola Juan este es un mensaje personalizado
51956062256,Hola Maria este es otro mensaje
+51987654321,Hola Carlos prueba SMS
```

Tambien funciona con lista simple:

```txt
956062256
51956062256
+51987654321
```

Y con numeros separados por coma, punto y coma, espacios o saltos de linea.

## Mensajes personalizados por fila

Regla final:

- Si fila trae columna `mensaje`, se envia ese mensaje.
- Si fila no trae mensaje, se envia el mensaje general del textarea.
- Si una fila no trae mensaje y textarea esta vacio, se bloquea envio.

## Nombre de campana

`campaignName` queda visible como referencia local del envio.

No se guarda en DB porque no existe contrato actual de `campaigns` en Supabase limpio para esta fase.

`campaign_id` real queda pendiente para fase futura.

## Creditos

Angular calcula estimado por mensaje real:

- `segments = calculateSegments(mensaje_fila_o_general)`
- `creditos = suma(segments)`
- `costo = creditos * 0.08`

Backend sigue validando saldo y descuenta por RPC/Edge Function.

## Bugs encontrados

- UI anterior podia sugerir Excel aunque Angular no tenia parser XLSX real.
- En fase previa, archivo con `telefono,mensaje` no usaba mensaje por fila.
- Textarea `required` podia bloquear envio de archivo con mensajes por fila aunque el archivo estuviera completo.
- Conteo de creditos en archivo usaba mensaje general, no mensaje real por fila.
- Archivo con lista de telefonos separados por coma podia interpretarse como `telefono,mensaje`.

## Bugs corregidos

- CSV/TXT parsea telefono + mensaje.
- Si no hay mensaje por fila, usa textarea general.
- Preview muestra telefono, mensaje final, caracteres y SMS.
- Conteo de creditos usa mensaje final real por fila.
- Descarga de plantilla genera `telefono,mensaje`.
- Excel queda bloqueado con mensaje claro.
- Nombre de campana queda documentado como referencia local, no persistencia.

## Archivos modificados

- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.html`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.scss`

## Requiere SQL

No.

## Requiere deploy Edge Function

No.

## Pruebas manuales recomendadas

1. Subir CSV con columnas `telefono,mensaje`.
2. Confirmar preview con mensaje por fila.
3. Enviar y confirmar resultados por destinatario.
4. Subir TXT con solo numeros, escribir mensaje general y enviar.
5. Probar duplicado y confirmar que se remueve.
6. Probar numero invalido y confirmar alerta.
7. Probar `.xlsx` y confirmar error claro.
8. Revisar `/dashboard/history`: cada SMS debe aparecer individualmente.

## Pendientes

- XLSX real con dependencia autorizada.
- Tabla/campaign_id real.
- Endpoint proveedor `/sms/plantilla`.
- Campanas.
- Agrupador de lote.
- Reporte avanzado de errores por archivo.

## Build

`npm run build`: OK.
