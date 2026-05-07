# FASE FIX SMS TEMPLATES - VARIABLES EN ENVIO

## Estado final

LISTO.

En `Enviar SMS`, si una plantilla tiene variables, usuario ya no edita el texto completo. Solo edita valores de variables. Mensaje enviado es vista previa final renderizada.

## Deteccion de variables

Regex usada:

```ts
/\{\s*([a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ-]+)\s*\}/g
```

Reglas:

- Soporta letras, numeros, guion bajo, guion y acentos.
- Ignora espacios dentro de llaves.
- Deduplica variables repetidas con `Set`.
- Conserva orden de aparicion.

## Inputs generados

Cuando plantilla trae variables:

- Se oculta textarea editable del mensaje base.
- Se muestra plantilla base como lectura.
- Se crea un input por variable unica.
- `templateVariableValues` guarda valores por nombre de variable.

Cuando plantilla no trae variables:

- Se mantiene comportamiento normal.
- Mensaje queda editable en textarea.

## Vista previa

Vista previa usa:

- `renderTemplatePreview(content, values)`

Si variable esta vacia:

- Se conserva placeholder en preview.
- Boton queda bloqueado por validacion.

Contador:

- Caracteres = mensaje final renderizado.
- SMS = segmentos del mensaje final renderizado.

## Validacion anti placeholders

Antes de enviar:

- Si falta variable: bloquea con `Completa las variables de la plantilla antes de enviar.`
- Si queda placeholder sin reemplazar: bloquea con mismo mensaje.
- No envia texto con placeholders sin resolver.

## Envio individual

Flujo:

1. Selecciona plantilla.
2. Si tiene variables, aparecen inputs.
3. Preview genera mensaje final.
4. `sendSingle()` recibe mensaje final, no plantilla base.

## Envio multiple simple

Flujo:

1. Selecciona plantilla.
2. Variables son globales para todos destinatarios.
3. `sendMultipleSimple()` recibe mensaje final renderizado.
4. Envio sigue secuencial desde servicio existente.

## Envio desde fichero

No se cambio parser XLSX/CSV/TXT.

Reglas actuales:

- Si archivo trae columna mensaje, usa mensaje por fila.
- Si fila no trae mensaje, usa mensaje general.
- Si llega texto con placeholder sin resolver, se bloquea.
- Mapeo de variables por columnas queda pendiente para fase futura.

## Archivos modificados

- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.html`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.scss`
- `projects/shared/src/lib/services/sms.service.ts`

## SQL

No requiere SQL.

## Deploy Edge Function

No requiere deploy Edge Function.

## Build

- `npm run build`: OK
- `sms-client`: OK
- `backoffice-admin`: OK

## Resultado rg

- `from('users')|user:users|profiles.role|.role`: sin resultados.
- direct insert `sms_messages` / update `profiles.credits`: sin resultados.
- placeholders exactos en `send-sms-page*`: sin resultados.
- `service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret|Bearer ey`: aparecen solo en Supabase Edge/migrations existentes, no en Angular.

## Pendiente

- Variables por destinatario en envio multiple simple.
- Mapeo de variables desde columnas del archivo.

## Estado

LISTO.
