# FASE 7E - Envio desde fichero basico

## Estado final

LISTO.

Se habilito la pestana `Desde Fichero` en `/dashboard/send` para cargar archivos locales con numeros, previsualizar destinatarios y enviar el mismo mensaje usando el flujo seguro existente de `SmsService.sendMultipleSimple()`.

## Formatos soportados

- CSV (`.csv`)
- TXT (`.txt`)

XLSX queda pendiente. No se instalo ninguna libreria nueva. Si el usuario selecciona `.xlsx` o `.xls`, la UI muestra:

> Por ahora soportamos CSV o TXT. XLSX se implementara en una siguiente fase.

## Archivos modificados

- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.html`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.scss`

## Como parsea archivo

Angular lee el archivo localmente con `FileReader`.

El contenido se divide por:

- salto de linea
- coma
- punto y coma
- espacios

Tambien ignora encabezados simples:

- `telefono`
- `teléfono`
- `phone`
- `celular`

## Como normaliza numeros

Formatos aceptados:

- `956062256` -> `+51956062256`
- `51956062256` -> `+51956062256`
- `+51956062256` -> `+51956062256`

Regex final:

```ts
/^\+519\d{8}$/
```

## Como deduplica

Despues de normalizar, usa un `Set` para evitar enviar dos veces al mismo numero.

La preview muestra:

- entradas detectadas
- numeros validos
- invalidos
- duplicados removidos
- primeros 10 numeros normalizados

## Como calcula creditos

Usa el mensaje actual del textarea:

- SMS por destinatario: `smsCount`
- total SMS: `destinatarios_validos * smsCount`
- costo estimado: `total_sms * 0.08`
- creditos despues: `credits - total_sms`

Si los creditos no alcanzan claramente, el boton queda bloqueado.

## Como envia

Al confirmar, la UI llama:

```ts
SmsService.sendMultipleSimple({
  recipients,
  message
})
```

Ese servicio ya envia secuencialmente, un destinatario por vez, usando `sendSingle()` y un `idempotency_key` por SMS.

No se usa `Promise.all`.

## Seguridad mantenida

- No se inserta directo en `sms_messages` desde Angular.
- No se actualiza `profiles.credits` desde Angular.
- No se usa `service_role` en Angular.
- No se toca Supabase.
- No se toca Edge Function `send-sms`.
- No se crea tabla `users`.
- No se usa `profiles.role`.

## Errores manejados

- Archivo no soportado.
- Archivo vacio.
- XLSX pendiente.
- Sin numeros validos.
- Numeros invalidos.
- Duplicados removidos.
- Creditos insuficientes.
- Errores parciales por destinatario desde el flujo multiple existente.

## Pendientes

- XLSX.
- Endpoint proveedor `/sms/plantilla`.
- Campanas.
- `campaign_id` o agrupador de lote.
- Reporte avanzado de errores por archivo.
- Optimizacion futura con endpoint bulk del proveedor si se decide usarlo.

## Pruebas manuales recomendadas

1. Ir a `/dashboard/send`.
2. Abrir pestana `Desde Fichero`.
3. Subir CSV:
   ```csv
   telefono
   956062256
   51956062256
   +51987654321
   ```
4. Confirmar preview con 3 numeros validos.
5. Escribir mensaje.
6. Confirmar resumen de creditos.
7. Enviar desde fichero.
8. Confirmar resultados enviados/fallidos.
9. Ir a `/dashboard/history` y verificar que cada SMS aparece como mensaje individual.

## Build

`npm run build`: OK.
