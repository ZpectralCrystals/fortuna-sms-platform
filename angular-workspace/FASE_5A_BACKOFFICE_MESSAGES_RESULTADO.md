# FASE 5A - Backoffice mensajes reales

Fecha: 2026-05-02

## Estado final

LISTO.

Backoffice `/messages` queda conectado a `sms_messages` real con datos de cliente desde `profiles`. Proveedor real, API keys y envio multiple siguen fuera de alcance.

## Archivos modificados

- `projects/backoffice-admin/src/app/pages/messages-page.component.ts`
- `projects/backoffice-admin/src/app/pages/messages-page.component.html`
- `projects/backoffice-admin/src/app/pages/messages-page.component.scss`
- `projects/shared/src/lib/services/sms.service.ts`
- `projects/shared/src/lib/models/sms.model.ts`
- `FASE_5A_BACKOFFICE_MESSAGES_RESULTADO.md`

## Query usada

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
    created_at,
    profile:profiles (
      full_name,
      email,
      razon_social,
      ruc
    )
  `)
  .order('created_at', { ascending: false })
```

Filtro server opcional:

```ts
.eq('status', filters.status)
```

Solo SELECT. No insert, update ni delete.

## Filtros implementados

- Estado: `all`, `pending`, `sent`, `delivered`, `failed`.
- Busqueda local por:
  - cliente
  - email
  - recipient
  - message
  - razon social
  - RUC
- Orden por `created_at desc`.

Fecha desde/hasta no se implemento: no habia patron simple necesario y estado + busqueda cubren esta fase.

## Datos mostrados

- Cliente: `full_name` con fallback a email y `Cliente sin nombre`.
- Email.
- Razon social / RUC.
- Recipient.
- Message.
- Segments.
- Cost.
- Status.
- Test mode si `provider_response.test_mode = true`.
- Provider desde `provider_response.provider` / `provider_response.provider_name`, fallback `test`.
- `created_at`.
- `sent_at`.
- `error_message`.

## Estado vacio / errores

- Sin mensajes: `Aún no hay mensajes enviados.`
- Error Supabase/RLS: `No se pudieron cargar los mensajes. Verifica permisos de administrador.`

## Que queda en modo test

- `send-sms` sigue usando provider test interno.
- `sms_messages.provider_response.test_mode = true` identifica mensajes test.
- Backoffice solo visualiza mensajes; no reenvia, no cambia estado.

## Que NO se tocó

- Proveedor SMS real.
- API keys.
- Envio multiple.
- Campañas.
- Webhooks.
- Secrets.
- Service role en Angular.
- RPC de inventario/recargas.
- Tabla `users`.
- `profiles.role`.

## Seguridad

- Angular no usa `service_role`.
- Angular no usa `SUPABASE_SERVICE_ROLE_KEY`.
- Angular no inserta `sms_messages`.
- Angular no actualiza `profiles.credits`.
- Angular no usa `users`.
- Angular no usa `profiles.role`.

## Pruebas manuales recomendadas

1. Enviar SMS test desde cliente `/dashboard/send`.
2. Entrar a backoffice `/messages`.
3. Confirmar que aparece el mensaje nuevo.
4. Confirmar cliente/email.
5. Confirmar razon social / RUC si existen.
6. Filtrar por `sent`.
7. Buscar por recipient.
8. Buscar por texto del mensaje.
9. Confirmar badge `Test`.
10. Confirmar sin errores en consola.

## Riesgos / pendientes

- Si RLS de `sms_messages` no permite admin select, backoffice mostrara error de permisos.
- Si `provider_response` no trae `provider`, se muestra `test` cuando `test_mode = true`.
- Fecha desde/hasta queda pendiente hasta necesitar filtro avanzado.
- Proveedor real puede traer campos adicionales; mapear en FASE 5B/5C sin romper vista.

## Siguiente fase recomendada

FASE 5B: preparar proveedor real en Edge Function con secrets de Supabase, modo test/prod por env, mapeo de respuesta proveedor e idempotencia. API keys y envio multiple siguen para fases posteriores.

## Validaciones

```bash
npm run build
git diff --check
git diff --stat
rg "from\\('users'\\)|user:users|profiles\\.role|\\.role" projects supabase || true
rg "service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret" projects || true
rg "from\\('sms_messages'\\).*insert|from\\('profiles'\\).*update|profiles\\.credits.*=" projects || true
```

Resultado:

- Build OK.
- `git diff --check` OK.
- Rg seguridad sin resultados.
