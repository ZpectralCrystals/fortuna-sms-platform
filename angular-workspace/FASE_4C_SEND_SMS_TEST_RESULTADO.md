# FASE 4C - send-sms test + Angular

Fecha: 2026-05-02

## Estado

PARCIAL para SMS real.

Modo test conectado. Falta deploy manual de Edge Function y prueba real contra Supabase limpio.

## Archivos modificados

- `supabase/functions/send-sms/index.ts`
- `projects/shared/src/lib/models/sms.model.ts`
- `projects/shared/src/lib/services/sms.service.ts`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.html`
- `projects/sms-client/src/app/dashboard/pages/history-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/history-page.component.html`
- `projects/sms-client/src/app/dashboard/pages/dashboard-overview-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/dashboard-overview-page.component.html`

## Edge Function creada

Ruta:

```text
supabase/functions/send-sms/index.ts
```

Flujo:

1. Acepta `POST`.
2. Responde `OPTIONS` para CORS.
3. Lee `Authorization: Bearer <token>`.
4. Valida usuario con cliente anon y `auth.getUser(token)`.
5. Usa `SUPABASE_SERVICE_ROLE_KEY` solo dentro de Edge Function.
6. Lee `recipient` y `message`.
7. Llama RPC `internal_send_sms_test`.
8. Devuelve resultado en JSON.

No loguea tokens. No expone service role. No toca proveedor real.

## Payload esperado

```json
{
  "recipient": "+51987654321",
  "message": "Mensaje de prueba"
}
```

## Respuesta esperada

```json
{
  "success": true,
  "message_id": "uuid",
  "recipient": "+51987654321",
  "segments": 1,
  "cost": 1,
  "status": "sent",
  "test_mode": true
}
```

## Errores manejados

- `INVALID_PHONE` -> `Número inválido. Usa formato peruano +51XXXXXXXXX.`
- `EMPTY_MESSAGE` -> `El mensaje no puede estar vacío.`
- `INSUFFICIENT_CREDITS` -> `Créditos insuficientes.`
- `PROFILE_INACTIVE` -> `Tu cuenta está inactiva.`
- `PROFILE_NOT_FOUND` -> `Perfil no encontrado.`
- `NOT_AUTHORIZED` / sesión inválida -> `Sesión inválida.`

## Cambios Angular

- `SmsService.sendSingle()` llama `supabase.functions.invoke('send-sms')`.
- `/dashboard/send` usa envío individual real en modo test.
- Frontend valida teléfono/mensaje como UX.
- Edge/RPC mantienen validación real.
- Loading, éxito y errores quedan visibles.
- Éxito muestra recipient, segmentos, costo, status y `test_mode`.
- Después del envío, la página refresca créditos desde `profiles`.
- Envío múltiple y archivo quedan bloqueados para siguiente fase.
- Angular no inserta `sms_messages`.
- Angular no actualiza `profiles.credits`.
- Angular no usa `service_role`.

## Historial / overview

- Historial lee `sms_messages` con columnas:
  `recipient, message, segments, cost, status, created_at, sent_at, error_message`.
- Dashboard overview lee mensajes recientes con `recipient`.

Nota: si DB real conserva `to_phone` en vez de `recipient`, hay que alinear DB o SELECT antes de prueba manual. Esta fase queda según contrato pedido: `recipient`.

## Validaciones ejecutadas

```bash
npm run build
git diff --stat
rg "from\\('users'\\)|user:users|profiles\\.role|\\.role" projects supabase || true
rg "from\\('sms_messages'\\).*insert|from\\('profiles'\\).*update|profiles\\.credits.*=" projects || true
git diff --check
```

Resultado:

- Build OK para `sms-client` y `backoffice-admin`.
- Warning no bloqueante: Node.js `v25.9.0` no LTS.
- `git diff --check`: OK.
- No referencias a `users`, `profiles.role` ni `.role`.
- No insert directo a `sms_messages`.
- No update directo a `profiles`.
- No asignacion directa a `profiles.credits`.

## Deploy manual

Desde raiz del workspace:

```bash
supabase functions deploy send-sms
```

Secrets requeridos:

```bash
supabase secrets set SUPABASE_URL="https://TU-PROYECTO.supabase.co"
supabase secrets set SUPABASE_ANON_KEY="TU_ANON_KEY"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="TU_SERVICE_ROLE_KEY"
```

## Servir local

Crear `supabase/.env.local` con:

```bash
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_ANON_KEY=TU_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
```

Servir:

```bash
supabase functions serve send-sms --env-file supabase/.env.local
```

## Pruebas manuales recomendadas

1. Login cliente activo con créditos.
2. Abrir `/dashboard/send`.
3. Enviar SMS individual a `+51XXXXXXXXX`.
4. Confirmar mensaje éxito con `test_mode true`.
5. Confirmar créditos bajan en la página.
6. Abrir `/dashboard/history`.
7. Confirmar mensaje nuevo con `recipient`, `message`, `segments`, `cost`, `status sent`, `sent_at`.
8. Probar número inválido.
9. Probar mensaje vacío.
10. Probar cliente sin créditos.
11. Probar sesión vencida.

## Pendiente proveedor real

- Edge Function con proveedor SMS externo.
- Secrets del proveedor solo en Supabase secrets.
- Manejo de provider response, provider_message_id, fallos y reintentos.
- Webhooks/confirmación de entrega si proveedor soporta.

## Pendiente envío múltiple / API keys

- Envío múltiple desde dashboard.
- Carga archivo/campañas.
- Endpoint API con api keys hasheadas.
- Rate limits.
- Auditoría y trazabilidad por campaña.
