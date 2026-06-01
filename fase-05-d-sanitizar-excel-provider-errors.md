# Fase 05-D - Sanitizar Excel y errores proveedor

## 1. Resumen

Se corrigió flujo “Desde Fichero” para:

- sanitizar mensajes personalizados antes de enviarlos;
- aplicar misma sanitización en `send-sms-batch`;
- mostrar error real del proveedor por fila.

No se tocó `send-sms` individual, `api-send-sms`, DB, migrations, provider adapter ni `SMS_PROVIDER_MODE`.

## 2. Sanitización frontend

Archivo:

- `angular-workspace/projects/sms-client/src/app/dashboard/pages/send-sms-page.component.ts`

Nuevo helper:

- `sanitizeMessageForSend()`

Reglas:

- `trim()`
- saltos de línea / tabs -> espacio
- remueve invisibles `\u200B-\u200D\uFEFF`
- remueve control chars
- normaliza espacios múltiples
- limita a `918` caracteres

Desde Fichero envía mensaje sanitizado por fila.

## 3. Sanitización Edge

Archivo:

- `angular-workspace/supabase/functions/send-sms-batch/index.ts`

Nuevo helper:

- `sanitizeSmsMessage()`

Se aplica a:

- `body.message`
- `body.messages[].message`

Si mensaje queda vacío tras sanitizar, no se envía y se registra `console.warn` con metadata segura:

- `row_index`
- `recipient`
- `reason`

## 4. Error proveedor por fila

Antes:

- proveedor `code=1` terminaba como error genérico.

Ahora:

- lee `provider_response.message`, `mensaje` o `error`;
- devuelve por fila:
  - `recipient`
  - `success`
  - `error_code`
  - `error`
  - `error_message`
  - `provider_message`

Formato visible:

`Proveedor rechazó el SMS: Error al enviar los sms a los destinos. Contactar con el administrador`

## 5. UI Desde Fichero

Si `sent = 0`:

- no muestra éxito verde;
- muestra alerta roja;
- mantiene lista de resultados;
- usa primer error real disponible.

Si `sent > 0` y `failed > 0`:

- muestra parcial.

## 6. Archivos modificados

- `angular-workspace/supabase/functions/send-sms-batch/index.ts`
- `angular-workspace/projects/shared/src/lib/models/sms.model.ts`
- `angular-workspace/projects/shared/src/lib/services/sms.service.ts`
- `angular-workspace/projects/sms-client/src/app/dashboard/pages/send-sms-page.component.ts`

## 7. Validaciones

OK:

```bash
deno check angular-workspace/supabase/functions/send-sms-batch/index.ts
npm run build
```

OK:

```bash
rg "services-fortuna.com" angular-workspace/projects -n
```

Sin resultados.

## 8. Resultado esperado

Excel con 2 filas simples:

- 2 procesados
- 2 enviados si proveedor acepta contenido
- 0 fallidos
- saldo baja 2
- historial muestra 2 mensajes

Si proveedor rechaza:

- UI muestra error real por fila;
- no aparece “procesado exitosamente” cuando `sent = 0`.

## 9. Riesgos pendientes

- Requiere deploy de `send-sms-batch` para probar en producción.
- Si proveedor rechaza contenido por regla no documentada, ahora queda visible, pero contrato exacto debe confirmarse con proveedor.

## 10. Decisión recomendada

Deploy controlado de `send-sms-batch`, luego smoke test con Excel:

- mensajes simples;
- mensajes con acentos;
- mensajes con saltos de línea;
- mensajes con caracteres copiados desde Excel.
