# FASE 4E - Cierre tecnico SMS test mode

Fecha: 2026-05-02

## Estado final SMS test

LISTO para continuar.

Flujo SMS test cerrado y validado:

```text
Angular /dashboard/send
-> Supabase Edge Function send-sms
-> RPC internal_send_sms_test
-> descuenta profiles.credits
-> inserta sms_messages
-> historial/dashboard leen sms_messages
```

## Edge Function

Ruta confirmada:

```text
supabase/functions/send-sms/index.ts
```

Estado deploy: desplegada, segun validacion real confirmada por el usuario.

Responsabilidades:

- Recibe `POST`.
- Valida JWT de usuario con anon key.
- Usa `SUPABASE_SERVICE_ROLE_KEY` solo dentro de Edge Function.
- Llama `internal_send_sms_test`.
- Devuelve `message_id`, `recipient`, `segments`, `cost`, `status`, `test_mode`.
- No usa proveedor real.
- No loguea tokens.
- No expone service role.

## Angular

Confirmado:

```ts
supabase.functions.invoke('send-sms')
```

Archivos involucrados:

- `projects/shared/src/lib/services/sms.service.ts`
- `projects/shared/src/lib/models/sms.model.ts`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.html`
- `projects/sms-client/src/app/dashboard/pages/history-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/history-page.component.html`
- `projects/sms-client/src/app/dashboard/pages/dashboard-overview-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/dashboard-overview-page.component.html`
- `supabase/functions/send-sms/index.ts`

Angular NO:

- inserta directo en `sms_messages`.
- actualiza `profiles.credits`.
- usa `service_role`.
- usa `SUPABASE_SERVICE_ROLE_KEY`.
- usa tabla `users`.
- usa `profiles.role`.

## Pruebas reales confirmadas

- `/dashboard/send` envia SMS en modo test.
- Edge Function `send-sms` desplegada correctamente.
- RPC `internal_send_sms_test` ejecuta flujo.
- `profiles.credits` baja correctamente.
- `sms_messages` registra:
  - `recipient`
  - `message`
  - `segments`
  - `cost`
  - `status = sent`
  - `provider_response.test_mode = true`
- Historial muestra mensajes desde `sms_messages`.
- Dashboard overview lee `sms_messages`.

## SQL validacion recomendado

Ver ultimos mensajes:

```sql
select
  id,
  user_id,
  recipient,
  message,
  segments,
  cost,
  status,
  provider_response,
  created_at,
  sent_at,
  error_message
from public.sms_messages
order by created_at desc
limit 20;
```

Ver creditos del cliente:

```sql
select
  id,
  email,
  full_name,
  credits,
  is_active,
  updated_at
from public.profiles
where id = auth.uid();
```

Validar funcion test existe:

```sql
select
  routine_schema,
  routine_name,
  routine_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'normalize_peru_phone',
    'calculate_sms_segments',
    'internal_send_sms_test'
  )
order by routine_name;
```

Validar no hay mensajes fallidos recientes:

```sql
select
  status,
  count(*) as total
from public.sms_messages
where created_at >= now() - interval '24 hours'
group by status
order by status;
```

## Pendiente proveedor real

- Integrar proveedor SMS real dentro de Edge Function, no Angular.
- Guardar provider secrets solo en Supabase secrets.
- Definir `SMS_PROVIDER_API_URL`, `SMS_PROVIDER_API_KEY` u otros secrets necesarios.
- Mapear respuesta proveedor a `provider_message_id` y `provider_response`.
- Manejar errores externos sin doble descuento.
- Definir idempotencia/reintentos.
- Mantener modo test configurable para QA.
- Implementar webhook delivery si proveedor lo soporta.

## Pendiente envio multiple

- UI final para múltiples destinatarios.
- Endpoint/RPC batch.
- Validacion por fila.
- Resultado parcial por destinatario.
- Registro de campañas/lotes si aplica.
- Rate limit y control de costos.

## Pendiente API keys

- Generar API keys hash/prefix/suffix.
- Nunca guardar keys en texto plano.
- Edge Function/API endpoint autenticado por key.
- Rate limits por key.
- Revocacion/expiracion.
- Auditoria de uso.

## Riesgos conocidos

- Proveedor real puede fallar despues de descontar si no se diseña transaccion/idempotencia.
- Webhook delivery puede llegar duplicado; necesita manejo idempotente.
- Envio multiple puede consumir creditos rapido; requiere confirmacion y limites.
- Secrets deben vivir solo en Supabase secrets, nunca en tablas ni frontend.
- Node local `v25.9.0` compila, pero no es LTS.

## Checklist antes de produccion

- Confirmar secrets proveedor en Supabase.
- Confirmar modo test/prod controlado por env.
- Probar telefono invalido, credito insuficiente, cuenta inactiva.
- Probar respuesta proveedor exitosa/fallida.
- Revisar logs sin tokens/secrets.
- Confirmar `service_role` solo en Edge Functions.
- Confirmar RLS mantiene `sms_messages` solo usuario/admin.
- Confirmar monitoreo de errores.
- Confirmar backup y plan rollback.

## Resultado validaciones

Pendiente de esta ejecucion:

- `npm run build`
- `git diff --check`
- `git diff --stat`
- `git status --short`
- `rg` seguridad

## Estado final

LISTO para continuar con FASE 5 proveedor real.
