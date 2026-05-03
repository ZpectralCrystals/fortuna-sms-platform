# FASE 6C - QA proveedor real individual + pulido final UI

## Estado final

LISTO para avanzar a la siguiente fase, manteniendo el envío individual real en producción y el modo test compatible.

## Archivos modificados

- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.html`
- `projects/sms-client/src/app/dashboard/pages/history-page.component.html`
- `FASE_6C_QA_PROVIDER_REAL_INDIVIDUAL_RESULTADO.md`

## Mejoras UI aplicadas

- El éxito real ya no muestra `modo real`, `test_mode`, `provider`, `fortuna_services` ni nombres técnicos.
- El éxito real muestra texto comercial:
  - `SMS enviado correctamente`
  - `+51956062256 · 1 SMS descontado · estado enviado`
- El éxito test conserva texto explícito solo para simulación:
  - `SMS enviado en modo test`
  - `Simulación interna. No enviado a proveedor real.`
- Los estados se traducen para cliente:
  - `sent` -> `enviado`
  - `failed` -> `fallido`
  - `pending` -> `pendiente`
  - `delivered` -> `entregado`
- El resumen de envío usa `SMS requeridos` en vez de `SMS por mensaje`.
- El historial cliente muestra `SMS` en vez de `segmento(s)`.
- La nota informativa del formulario ahora es neutral: Edge Function + RPC segura, sin mencionar provider test interno.

## Resultado build

`npm run build`: OK.

Build generado para:

- `sms-client`
- `backoffice-admin`

Nota: Node.js `v25.9.0` muestra advertencia por versión impar no LTS, pero no bloquea build.

## Resultado git diff

`git diff --check`: OK.

`git diff --stat`:

```text
 .../dashboard/pages/history-page.component.html    |  2 +-
 .../dashboard/pages/send-sms-page.component.html   | 12 +++-------
 .../app/dashboard/pages/send-sms-page.component.ts | 28 ++++++++++++++++++++--
 3 files changed, 30 insertions(+), 12 deletions(-)
```

## Resultados rg

### users / profiles.role

Comando:

```bash
rg "from\\('users'\\)|user:users|profiles\\.role|\\.role" projects supabase || true
```

Resultado: sin hallazgos.

### service_role / secrets Angular

Comando:

```bash
rg "service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret" projects || true
```

Resultado: sin hallazgos.

### inserts/updates críticos desde Angular

Comando:

```bash
rg "from\\('sms_messages'\\).*insert|from\\('profiles'\\).*update|profiles\\.credits.*=|total_spent.*=" projects || true
```

Resultado: sin hallazgos.

### credenciales/token proveedor

Comando:

```bash
rg "SMS_PROVIDER_PASSWORD|admin\\.fortuna|Fortun|sb_secret|Bearer ey" projects supabase || true
```

Resultado:

- Aparecen textos públicos de marca `SMS Fortuna` / `Fortuna Fintech SAC`.
- Aparece el nombre de env `SMS_PROVIDER_PASSWORD` en `supabase/functions/send-sms/index.ts`.
- No apareció `admin.fortuna`.
- No apareció `Bearer ey`.
- No apareció `sb_secret`.
- No se detectaron credenciales hardcodeadas.

## QA proveedor real individual

Validación esperada ya confirmada por contexto:

- Envío real individual con `SMS_PROVIDER_MODE=prod`.
- Login proveedor OK.
- `POST /v1/api/sms/individual` OK.
- `sms_messages.status = sent`.
- `sms_messages.cost = 0.0800` para 1 SMS.
- `provider_response.provider = fortuna_services`.
- `provider_response.test_mode = false`.
- `error_message = null`.
- `profiles.credits` baja por segmentos, no por monto.

## SQL de validación recomendado

```sql
select
  id,
  user_id,
  recipient,
  segments,
  cost,
  status,
  provider_response->>'provider' as provider,
  provider_response->>'test_mode' as test_mode,
  error_message,
  created_at,
  sent_at
from public.sms_messages
order by created_at desc
limit 10;
```

```sql
select
  id,
  email,
  credits,
  is_active
from public.profiles
where id = '<USER_ID_A_VALIDAR>';
```

## Errores controlados revisados

La UI mantiene mensajes claros para:

- teléfono inválido
- mensaje vacío
- créditos insuficientes
- cuenta inactiva
- proveedor no configurado
- auth proveedor fallida
- timeout proveedor
- respuesta inválida proveedor

No se forzaron pruebas destructivas de credenciales reales. Para probar errores de proveedor, usar ambiente controlado con secrets temporales.

## Seguridad confirmada

- Angular no usa `service_role`.
- Angular no lee `SUPABASE_SERVICE_ROLE_KEY`.
- Angular no inserta directo en `sms_messages`.
- Angular no actualiza `profiles.credits`.
- Angular no actualiza `total_spent`.
- No hay `from('users')`.
- No hay `user:users`.
- No hay `profiles.role`.
- No hay token proveedor hardcodeado.

## Riesgos pendientes

- Falta webhook/confirmación real de delivery.
- El proveedor no entrega ID claro de mensaje; se guarda respuesta completa.
- Falta idempotencia contra doble click/reintentos de red.
- Falta rate limit por usuario.
- Falta monitoreo de errores proveedor.
- Falta envío múltiple.
- Falta API keys.
- Falta campañas.

## Siguiente fase recomendada

FASE 6D: hardening de producción para envío individual real:

- idempotency key
- rate limit básico
- logs seguros
- monitoreo de errores proveedor
- política de reintentos
- bloqueo anti doble envío en Edge Function
