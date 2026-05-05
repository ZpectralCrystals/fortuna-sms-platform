# FASE 7B - Historial y Dashboard cliente mejorado

## Estado final

LISTO.

Se mejoró dashboard cliente e historial SMS usando `profiles` y `sms_messages`. No se modificó Supabase, no se tocó Edge Function `send-sms`, no se hicieron inserts directos a `sms_messages` ni updates directos a `profiles.credits`.

## Archivos modificados

- `projects/shared/src/lib/models/sms.model.ts`
- `projects/shared/src/lib/services/sms.service.ts`
- `projects/sms-client/src/app/dashboard/pages/dashboard-overview-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/dashboard-overview-page.component.html`
- `projects/sms-client/src/app/dashboard/pages/dashboard-overview-page.component.scss`
- `projects/sms-client/src/app/dashboard/pages/history-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/history-page.component.html`
- `projects/sms-client/src/app/dashboard/pages/history-page.component.scss`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.html`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.scss`

## Queries usadas

Perfil/créditos:

```ts
AuthService.getCurrentProfile()
```

Lee `profiles` con:

```ts
profiles.id = auth.uid()
profiles.is_active = true
```

Historial cliente:

```ts
supabase
  .from('sms_messages')
  .select(`
    id,
    user_id,
    recipient,
    message,
    segments,
    cost,
    status,
    provider_message_id,
    provider_response,
    error_message,
    sent_at,
    delivered_at,
    created_at
  `)
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(limit)
```

Stats cliente:

```ts
supabase
  .from('sms_messages')
  .select('status, segments, cost')
  .eq('user_id', userId)
```

Trazabilidad básica:

```ts
supabase
  .from('sms_send_attempts')
  .select('id, sms_message_id, idempotency_key, provider_recipient, status, provider, provider_response, error_message, started_at, completed_at, expires_at, created_at, updated_at')
  .in('sms_message_id', messageIds)
```

Si RLS bloquea `sms_send_attempts`, historial no rompe; solo queda sin intento asociado.

## Métricas implementadas

Dashboard:

- Créditos disponibles desde `profiles.credits`.
- SMS enviados: `sent + delivered`.
- SMS fallidos: `failed`.
- SMS consumidos: suma `segments` de `sent/delivered`.
- Costo total estimado: suma `cost` de `sent/delivered`.

## Filtros implementados

Historial:

- Estado: todos, enviados, fallidos, pendientes, entregados.
- Búsqueda por teléfono o texto del mensaje.
- Fecha desde.
- Fecha hasta.

## Dashboard cliente

Sección `Últimos mensajes` muestra:

- recipient.
- mensaje resumido.
- status traducido.
- segments.
- cost.
- created_at/sent_at.

Estado vacío:

```text
Aún no has enviado SMS. Empieza enviando tu primer mensaje.
```

CTA:

- `Enviar SMS` hacia `/dashboard/send`.

## Historial cliente

`/dashboard/history` ahora muestra:

- destinatario.
- mensaje.
- segmentos.
- costo.
- estado.
- proveedor.
- fecha.
- acción `Ver detalle`.

Detalle muestra:

- ID.
- destinatario.
- mensaje completo.
- segmentos.
- costo.
- estado.
- proveedor.
- test mode.
- error message.
- provider message id.
- created_at.
- sent_at.
- delivered_at.
- idempotency key si existe.
- provider_recipient si existe.
- provider_response sanitizado.

## Sanitización visual

Se ocultan claves sensibles en JSON si aparecen accidentalmente:

- `token`
- `password`
- `authorization`
- `api_key`
- `apikey`
- `secret`
- `service_role`

## UX post envío

Después de enviar SMS:

- Se mantiene éxito claro.
- Se muestra SMS descontado, costo y estado traducido.
- Se refresca `profiles.credits` vía lectura.
- Se agregó link `Ver historial`.
- No se inserta `sms_messages` desde Angular.
- No se actualiza `profiles.credits` desde Angular.

## Qué quedó pendiente

- Paginación server-side.
- Agregados por RPC si el volumen de mensajes crece.
- Delivery webhook real para `delivered_at`.
- Envío múltiple.
- Envío desde fichero.
- Campañas.
- API Keys externas.
- Plantillas avanzadas.

## Pruebas manuales recomendadas

1. Entrar como cliente.
2. Abrir `/dashboard`.
3. Confirmar créditos actuales.
4. Confirmar cards de enviados/fallidos/consumo/costo.
5. Enviar SMS individual desde `/dashboard/send`.
6. Confirmar éxito y link `Ver historial`.
7. Confirmar que créditos bajan después del envío.
8. Abrir `/dashboard/history`.
9. Filtrar por estado `Enviados`.
10. Buscar por teléfono.
11. Buscar por texto.
12. Abrir `Ver detalle`.
13. Confirmar que provider response no muestra secretos.
14. Probar estado vacío con usuario sin mensajes.
