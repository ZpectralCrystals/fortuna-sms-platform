# FASE FIX - Menús Backoffice y error SMS

## 1. Causa Usuarios/Cuentas

- Fix anterior dejó `/users` cargando `AccountsPageComponent`.
- `/accounts` redirigía a `/users`.
- Sidebar quedó sin `Cuentas`.
- Resultado: no existían dos rutas independientes, aunque negocio pide dos menús visibles.

## 2. Archivos modificados para menús

- `projects/backoffice-admin/src/app/app.routes.ts`

`admin-layout.component.ts` ya tenía ambos items visibles en estado actual del workspace:

- `Usuarios` -> `/users`
- `Cuentas` -> `/accounts`

## 3. Ruta final Usuarios

```ts
{ path: 'users', component: UsersPageComponent }
```

`UsersPageComponent` usa `profiles`, excluye admins, no usa `from('users')`, no usa `profiles.role`.

## 4. Ruta final Cuentas

```ts
{ path: 'accounts', component: AccountsPageComponent }
```

`AccountsPageComponent` queda como gestión completa de cuentas/clientes con detalle, edición RPC, auditoría y métricas.

No hay redirect:

- no `/users -> /accounts`
- no `/accounts -> /users`

Active state queda correcto porque cada sidebar item apunta a ruta exacta distinta.

## 5. Causa probable error SMS

Causa más probable:

- Edge Function 6D ya intenta llamar `internal_begin_sms_send_attempt`.
- Si migración `20260503100000_sms_send_hardening.sql` no fue aplicada, o Supabase tiene schema cache viejo, Edge falla antes de enviar.
- Síntomas probables:
  - RPC `internal_begin_sms_send_attempt` no existe
  - tabla `sms_send_attempts` no existe
  - error `PGRST202`
  - error `Could not find the function`
  - error `schema cache`

Angular sí envía:

```ts
supabase.functions.invoke('send-sms', {
  body: {
    recipient,
    message,
    idempotency_key
  }
})
```

No hay insert directo en `sms_messages` desde Angular.

No hay update directo a `profiles.credits` desde Angular.

## 6. Correcciones SMS aplicadas

Archivo:

- `supabase/functions/send-sms/index.ts`

Cambios:

- Edge mantiene flujo hardening primero:
  - `internal_begin_sms_send_attempt`
  - provider login/send
  - `internal_complete_sms_send_success`
  - `internal_complete_sms_send_failed`
- Si hardening no está disponible por DB/schema cache, Edge detecta:
  - `PGRST202`
  - `schema cache`
  - `Could not find the function`
  - `internal_begin_sms_send_attempt`
  - `sms_send_attempts`
  - `does not exist`
- En ese caso usa fallback legacy seguro:
  - `internal_validate_sms_send`
  - provider login/send
  - `internal_send_sms_provider_success`
  - `internal_register_sms_failed`
- Fallback mantiene SMS funcionando mientras SQL hardening se aplica.
- Logs agregados son seguros:
  - `user_id`
  - `provider`
  - `status`
  - `error_code`
- No se loguea:
  - Authorization
  - service_role
  - password
  - API keys
  - mensaje completo

Errores cubiertos/mapeados:

- `INVALID_PHONE`
- `EMPTY_MESSAGE`
- `INSUFFICIENT_CREDITS`
- `PROFILE_INACTIVE`
- `RATE_LIMIT_EXCEEDED`
- `SMS_SEND_ALREADY_PROCESSING`
- `PROVIDER_ERROR`
- `NOT_AUTHORIZED`

## 7. Requiere redeploy Edge Function

Sí.

```bash
supabase functions deploy send-sms
```

Sin redeploy, producción seguirá usando Edge anterior.

## 8. Requiere ejecutar SQL en Supabase

Para funcionamiento inmediato con fallback: no necesariamente, si RPC legacy 6B existe.

Para hardening real completo: sí.

```bash
supabase db push
```

O aplicar:

```text
supabase/migrations/20260503100000_sms_send_hardening.sql
```

Después de aplicar SQL, si Supabase sigue devolviendo schema cache error, redeploy Edge o esperar refresco de cache.

## 9. Resultado build

`npm run build`: OK.

Builds:

- `sms-client`: OK
- `backoffice-admin`: OK

Nota: Node.js `v25.9.0` muestra warning no LTS. No bloquea.

## 10. Resultado rg

Comandos:

```bash
rg "from\\('users'\\)|user:users|profiles\\.role|\\.role" projects supabase || true
rg "from\\('sms_messages'\\).*insert|from\\('profiles'\\).*update|profiles\\.credits.*=" projects || true
rg "service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret" projects || true
```

Resultados:

- users/profiles.role: sin hallazgos.
- insert `sms_messages` / update `profiles.credits` desde Angular: sin hallazgos.
- service_role/secrets en Angular: sin hallazgos.

## 11. Pruebas manuales recomendadas

### Backoffice

1. Abrir `/users`.
2. Confirmar sidebar marca `Usuarios`.
3. Abrir `/accounts`.
4. Confirmar sidebar marca `Cuentas`.
5. Confirmar no hay salto entre rutas.

### SMS

1. Redeploy Edge Function:

```bash
supabase functions deploy send-sms
```

2. Si no se aplicó hardening SQL, probar envío:
   - debe usar fallback legacy
   - debe enviar si RPC 6B existe
3. Aplicar SQL hardening:

```bash
supabase db push
```

4. Probar envío otra vez:
   - debe crear `sms_send_attempts`
   - debe insertar `sms_messages`
   - debe descontar `profiles.credits`
5. Revisar logs Edge:
   - si aparece `legacy_fallback`, falta SQL/cache hardening.
6. Validar DB:

```sql
select id, user_id, idempotency_key, status, sms_message_id, error_message, created_at
from public.sms_send_attempts
order by created_at desc
limit 20;
```

```sql
select id, recipient, segments, cost, status, error_message, created_at
from public.sms_messages
order by created_at desc
limit 20;
```

## Estado final

PARCIAL.

Código corregido y build OK. Requiere redeploy Edge Function. Hardening completo requiere aplicar SQL 6D en Supabase.
