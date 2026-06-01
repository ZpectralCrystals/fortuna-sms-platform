# Fase 05-E - Provider-safe Excel

## 1. Resumen ejecutivo

Se corrigio solo el flujo Desde Fichero para enviar mensajes personalizados en formato seguro para el proveedor.

SMS multiple normal queda intacto. Angular no llama `services-fortuna.com`. El envio sigue pasando por Supabase `send-sms-batch`.

## 2. Problema tratado

El proveedor rechazaba mensajes personalizados de Excel con:

`Error al enviar los sms a los destinos. Contactar con el administrador`

SMS multiple normal funcionaba con texto simple, por eso el riesgo estaba en caracteres del contenido Excel.

## 3. Archivos modificados

- `angular-workspace/projects/sms-client/src/app/dashboard/pages/send-sms-page.component.ts`
- `angular-workspace/projects/sms-client/src/app/dashboard/pages/send-sms-page.component.html`
- `angular-workspace/supabase/functions/send-sms-batch/index.ts`

## 4. Frontend Desde Fichero

Se agrego helper:

`providerSafeSmsText(text: string): string`

Reglas aplicadas antes de enviar cada fila:

- `trim`
- normalizacion Unicode `NFD`
- remocion de diacriticos
- `ñ/Ñ` convertido efectivamente a `n/N`
- remocion de signos no esenciales, comas, puntos, comillas y simbolos raros
- solo letras, numeros, espacios, guion y slash
- normalizacion de espacios multiples
- limite `918` caracteres
- validacion de mensaje no vacio despues de sanitizar

Ejemplo:

`Hola Elizabeth, recuerda tu cita mañana.`

se envia como:

`Hola Elizabeth recuerda tu cita manana`

## 5. Preview

El preview mantiene mensaje original visible para el usuario.

El contador de SMS/caracteres usa el texto que sera enviado al proveedor.

Se agrego nota:

`El texto puede ajustarse para compatibilidad con proveedor SMS.`

## 6. Edge Function send-sms-batch

`body.messages[].message` aplica la misma defensa con `providerSafeSmsText`.

Modo comun de SMS multiple sigue usando su sanitizacion normal. No se cambio su comportamiento.

Errores reales por fila se mantienen:

- `error_code`
- `error`
- `error_message`
- `provider_message`

## 7. Validaciones

Comandos ejecutados:

```bash
deno check angular-workspace/supabase/functions/send-sms-batch/index.ts
npm run build
rg "services-fortuna.com" angular-workspace/projects -n
git diff --stat -- angular-workspace/supabase/functions/send-sms-batch/index.ts angular-workspace/projects/sms-client/src/app/dashboard/pages/send-sms-page.component.ts angular-workspace/projects/sms-client/src/app/dashboard/pages/send-sms-page.component.html
```

Resultados:

- `deno check` OK.
- `npm run build` OK para `sms-client` y `backoffice-admin`.
- `rg services-fortuna.com angular-workspace/projects` sin resultados.
- Build mostro warning de Node `v25.9.0` por version impar no LTS, sin fallo.

## 8. Comandos NO ejecutados

- No `supabase db push`.
- No migrations.
- No DB reset.
- No deploy.
- No llamada directa a `services-fortuna.com`.
- No cambio de `SMS_PROVIDER_MODE`.
- No cambios en `send-sms` individual.
- No cambios en `api-send-sms`.
- No cambios DB.

## 9. Riesgos pendientes

- Si proveedor rechaza aun con texto seguro, validar contrato exacto de caracteres permitido.
- Prueba real 2/2 requiere ejecutar desde UI con sesion y saldo production.
- Mensajes con caracteres fuera de ASCII perderan tildes/signos por compatibilidad proveedor.

## 10. Decision recomendada

Pasar a prueba manual UI Desde Fichero con 2 filas simples.

Esperado:

- 2 procesados.
- 2 enviados.
- 0 fallidos.
- saldo baja 2.
- historial muestra 2 mensajes enviados.
