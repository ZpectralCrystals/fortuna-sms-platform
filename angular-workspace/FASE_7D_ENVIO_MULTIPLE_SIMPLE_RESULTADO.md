# FASE 7D - Envío múltiple simple desde el cliente

## Estado final

LISTO.

Se habilitó envío múltiple simple en `/dashboard/send`. No se creó tabla, no se modificó Supabase, no se tocó Edge Function `send-sms`, no se implementó provider bulk y no se agregó campaña/archivo.

## Archivos modificados

- `projects/shared/src/lib/models/sms.model.ts`
- `projects/shared/src/lib/services/sms.service.ts`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.html`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.scss`

## Cómo parsea números

El frontend divide el textarea por:

- salto de línea
- coma
- punto y coma
- espacio

Luego limpia caracteres no numéricos comunes, conservando `+`.

## Cómo normaliza números

Formatos aceptados:

```text
956062256     -> +51956062256
51956062256   -> +51956062256
+51956062256  -> +51956062256
```

Regex final:

```ts
/^\+519\d{8}$/
```

Esto limita envío a números móviles Perú válidos en formato `+519XXXXXXXX`.

La validación real sigue en Edge Function/RPC. Frontend solo mejora UX.

## Cómo maneja duplicados

Después de normalizar:

- usa `Set<string>`
- conserva primer número
- descarta repetidos
- muestra lista de duplicados removidos

## Cómo calcula créditos estimados

```ts
smsCount = calculateSegments(message)
requiredCredits = validRecipients.length * smsCount
estimatedCost = requiredCredits * 0.08
afterCredits = credits - requiredCredits
```

Si créditos no alcanzan, bloquea envío y muestra:

```text
Tus créditos podrían ser insuficientes para este envío múltiple.
```

El backend sigue validando créditos antes de descontar cada SMS.

## Cómo envía secuencialmente

Se agregó:

```ts
SmsService.sendMultipleSimple({ recipients, message })
```

Implementación:

- `for...of`
- genera `idempotency_key` por destinatario
- llama `sendSingle()`
- espera cada envío antes del siguiente
- no usa `Promise.all`
- no inserta directo `sms_messages`
- no actualiza `profiles.credits`

## Cómo maneja errores parciales

Si un número falla:

- guarda resultado fallido
- continúa con siguiente destinatario
- muestra error por fila

Si error parece global de sesión/autorización:

- detiene lote
- muestra error claro

## Integración con plantillas

Si usuario llega con `templateId`:

- carga contenido en textarea editable
- funciona en modo individual y múltiple
- no autoenvía
- variables se muestran como chips informativos
- placeholders no bloquean envío
- usuario puede editar texto antes de enviar

## Resultado UI

Antes de enviar:

- destinatarios válidos
- inválidos
- duplicados removidos
- números normalizados
- SMS por destinatario
- créditos estimados
- costo estimado
- créditos disponibles
- créditos después

Después de enviar:

- total procesados
- enviados
- fallidos
- créditos consumidos según respuestas exitosas
- costo total según respuestas exitosas
- lista por destinatario
- botón/link `Ver historial`
- botón `Enviar otro múltiple`

## Qué quedó pendiente

- Envío desde fichero.
- Campañas.
- Provider bulk `/sms/multiple`.
- Agrupación de lotes/campaign id.
- Paginación server-side avanzada.
- Reintentos controlados por lote.

## Pruebas manuales recomendadas

1. Abrir `/dashboard/send`.
2. Seleccionar tab `Múltiple`.
3. Pegar:

```text
956062256
51956062256
+51987654321
+51987654321
abc
123
```

4. Confirmar normalizados.
5. Confirmar inválidos.
6. Confirmar duplicado removido.
7. Escribir mensaje corto.
8. Confirmar créditos estimados.
9. Enviar.
10. Confirmar resultados por destinatario.
11. Confirmar credits refrescados.
12. Abrir `/dashboard/history`.
13. Confirmar que cada SMS aparece individualmente.

## SQL / Edge

SQL requerido: NO.

Deploy Edge Function requerido: NO.
