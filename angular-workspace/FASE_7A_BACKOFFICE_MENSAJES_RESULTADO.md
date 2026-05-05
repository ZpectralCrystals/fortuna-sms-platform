# FASE 7A - Backoffice Mensajes SMS

## Estado final

LISTO para auditoría básica de SMS desde Backoffice.

El módulo `/messages` queda como pantalla de solo lectura para revisar mensajes enviados, fallidos, pendientes o entregados. No se modificó Supabase, no se tocó `send-sms`, no se agregaron escrituras directas a `sms_messages` ni updates a `profiles`.

## Archivos modificados

- `projects/backoffice-admin/src/app/pages/messages-page.component.ts`
- `projects/backoffice-admin/src/app/pages/messages-page.component.html`
- `projects/backoffice-admin/src/app/pages/messages-page.component.scss`
- `projects/shared/src/lib/services/sms.service.ts`
- `projects/shared/src/lib/models/sms.model.ts`

## Ruta y sidebar

- Ruta confirmada: `/messages`
- Componente: `MessagesPageComponent`
- Menú Backoffice: `Mensajes`
- No se cambiaron rutas ni navegación en esta fase.

## Queries usadas

Listado principal:

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
    created_at,
    profile:profiles (
      full_name,
      email,
      razon_social,
      ruc
    )
  `)
  .order('created_at', { ascending: false })
  .limit(100)
```

Filtros server-side:

- `status`
- `created_at >= fecha desde`
- `created_at <= fecha hasta`

Trazabilidad de intentos:

```ts
supabase
  .from('sms_send_attempts')
  .select(`
    id,
    sms_message_id,
    idempotency_key,
    provider_recipient,
    status,
    provider,
    provider_response,
    error_message,
    started_at,
    completed_at,
    expires_at,
    created_at,
    updated_at
  `)
  .in('sms_message_id', messageIds)
```

Si `sms_send_attempts` no responde por RLS o disponibilidad, la pantalla no rompe y muestra `Sin intento asociado`.

## Campos mostrados

Tabla:

- Cliente
- Email
- Destinatario
- Mensaje
- Segmentos
- Costo
- Estado
- Proveedor
- Test/Real
- Error
- Fecha creación
- Fecha envío
- Acción `Ver detalle`

Detalle:

- ID mensaje
- Cliente
- Email
- Teléfono destino
- Mensaje completo
- Segmentos
- Costo
- Estado
- Provider message id
- Provider
- Test mode
- Error message
- Provider response sanitizado
- Fechas
- Intento asociado desde `sms_send_attempts`

## Filtros implementados

- Estado: todos, pendiente, enviado, entregado, fallido.
- Búsqueda local por cliente, email, destinatario, mensaje, razón social o RUC.
- Fecha desde/hasta.
- Límite: últimos 100 mensajes.

## Métricas implementadas

- Total mensajes.
- Enviados.
- Fallidos.
- SMS consumidos.
- Costo total.

Las métricas se calculan sobre la lista cargada. Queda pendiente paginación/server-side para métricas globales si el volumen crece.

## Relación con profiles

Se usa relación PostgREST:

```ts
profile:profiles(full_name,email,razon_social,ruc)
```

No se usa tabla `users`. No se usa `profiles.role`.

## Relación con sms_send_attempts

Se consulta por separado:

```ts
sms_send_attempts.sms_message_id = sms_messages.id
```

Esto evita romper el listado si la relación embebida no está disponible o si RLS bloquea la tabla de intentos.

## Sanitización visual

El JSON de `provider_response` se muestra con pretty print, ocultando claves sensibles si aparecen accidentalmente:

- `token`
- `password`
- `authorization`
- `api_key`
- `apikey`
- `secret`
- `service_role`

## Qué quedó pendiente

- Paginación real/server-side.
- Export CSV/Excel.
- Métricas globales en SQL/RPC si se necesitan más de 100 registros.
- Delivery webhook real para poblar `delivered_at`.
- Vista avanzada de retries/idempotencia.

## Pruebas manuales recomendadas

1. Entrar a Backoffice como admin.
2. Abrir `/messages`.
3. Confirmar que se muestran últimos 100 mensajes.
4. Probar filtro por `Enviado`, `Fallido`, `Pendiente`.
5. Buscar por teléfono.
6. Buscar por email de cliente.
7. Abrir `Ver detalle`.
8. Confirmar que se ve provider response sin tokens/secrets.
9. Confirmar que si no hay intento asociado aparece `Sin intento asociado`.
10. Confirmar que RLS admin permite leer `sms_messages` y, si aplica, `sms_send_attempts`.
