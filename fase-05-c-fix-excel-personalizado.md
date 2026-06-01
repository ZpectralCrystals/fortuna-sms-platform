# Fase 05-C - Fix Excel personalizado

## 1. Resumen

Se corrigió flujo “Desde Fichero” para enviar mensajes personalizados por fila usando `send-sms-batch`.

No se tocó:

- `send-sms` individual
- `api-send-sms`
- DB
- migrations
- provider adapter
- `SMS_PROVIDER_MODE`

Angular no llama `services-fortuna.com`.

## 2. Problema

Excel parseaba bien:

- filas válidas
- mensajes personalizados detectados
- total SMS correcto
- saldo visible correcto

Pero envío fallaba porque flujo de fichero agrupaba por mensaje común y no existía modo explícito `messages[]` en `send-sms-batch`.

## 3. Fix Edge Function

Archivo:

- `angular-workspace/supabase/functions/send-sms-batch/index.ts`

Ahora soporta dos modos:

Modo A, mensaje común:

```json
{
  "recipients": ["+519...", "+519..."],
  "message": "texto común"
}
```

Modo B, mensajes personalizados:

```json
{
  "messages": [
    { "recipient": "+519...", "message": "texto 1" },
    { "recipient": "+519...", "message": "texto 2" }
  ]
}
```

Validaciones:

- máximo 50
- teléfonos normalizados
- duplicados por recipient removidos
- mensaje obligatorio por fila
- segmentos calculados por mensaje
- saldo total validado antes de iniciar
- resultados por fila

## 4. Fix Angular Desde Fichero

Archivo:

- `angular-workspace/projects/shared/src/lib/services/sms.service.ts`

`sendFileRowsSimple()` ahora llama:

```ts
supabase.functions.invoke('send-sms-batch', {
  body: {
    messages: rows.map(row => ({
      recipient: row.recipient,
      message: row.message
    }))
  }
})
```

Ya no manda mensaje global vacío ni agrupa por texto.

## 5. UI errores

Archivo:

- `angular-workspace/projects/sms-client/src/app/dashboard/pages/send-sms-page.component.ts`

Si `sent = 0`:

- no muestra alerta verde
- muestra alerta roja
- conserva lista de resultados por fila
- muestra primer error real disponible

Si `sent > 0` y `failed > 0`:

- mantiene resultado parcial visible

## 6. Validaciones

OK:

```bash
deno check angular-workspace/supabase/functions/send-sms-batch/index.ts
npm run build
```

`rg services-fortuna.com angular-workspace/projects -n`:

- sin resultados

## 7. Resultado esperado

Archivo 2 filas:

- 2 procesados
- 2 enviados
- 0 fallidos
- saldo baja 2
- historial muestra 2 mensajes

## 8. Riesgos pendientes

- Requiere deploy de `send-sms-batch` antes de probar en producción real.
- Si ledger real difiere de `profiles.credits`, Edge usa ledger/RPC como verdad final y puede rechazar por saldo.

## 9. Decisión recomendada

Pasar a deploy controlado de `send-sms-batch`, luego smoke test con Excel de 2 filas.
