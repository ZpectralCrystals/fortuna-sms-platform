# FASE 4D - QA SMS test mode

Fecha: 2026-05-02

## Estado final

LISTO para FASE 5 proveedor real.

Flujo test ya validado en entorno real segun contexto:

`Angular /dashboard/send -> Edge Function send-sms -> RPC internal_send_sms_test -> profiles.credits -> sms_messages`

## Pruebas realizadas / revisadas

### Envio individual exitoso

- Flujo revisado en Angular: `/dashboard/send`.
- `SmsService.sendSingle()` usa `supabase.functions.invoke('send-sms')`.
- Edge Function/RPC hacen envio test, descuento e insert.
- Exito UI muestra recipient, segmentos, costo, status y `test_mode`.
- Despues del envio, Angular refresca creditos desde `profiles`.

### Numero invalido

- Frontend valida formato peruano `+51XXXXXXXXX`.
- Numeros incompletos, extranjeros o texto muestran:
  `Número inválido. Usa formato peruano +51XXXXXXXXX.`
- Edge/RPC conserva validacion real.

### Mensaje vacio

- Frontend bloquea mensaje vacio con:
  `El mensaje no puede estar vacío.`
- Edge/RPC conserva validacion real.

### Creditos insuficientes

- Frontend bloquea si creditos locales no alcanzan.
- Edge/RPC devuelve error real si saldo cambió o no alcanza:
  `Créditos insuficientes.`
- Prueba destructiva/no destructiva recomendada: usar cliente de bajo saldo o mensaje largo que supere saldo.

### Historial

- Historial lee `sms_messages`.
- Muestra `recipient`, `message`, `segments`, `cost`, `status`, `created_at`, `sent_at`, `error_message`.
- Estado vacio no rompe.

### Dashboard overview

- Overview lee `sms_messages`.
- Muestra mensajes recientes con `recipient`.
- Si no hay mensajes, muestra estado vacio.

## Errores encontrados

- Copy UX prometia campanas masivas aunque fase actual solo permite envio individual.
- Ayuda de formato mencionaba numeros locales de 9 digitos, pero regla QA exige `+51XXXXXXXXX`.
- Template CSV incluia ejemplo `965432109`.
- Interface de historial conservaba `delivered_at`, campo no consultado en fase test.

## Bugs corregidos

- Texto principal ajustado a modo test individual.
- Exito ahora dice `costo X crédito(s)`.
- Ayuda de telefono ahora usa solo `+51987654321`.
- Placeholder multiple/file no muestra ejemplo local sin `+51`.
- Template CSV usa solo numeros `+51`.
- Interface de historial limpia `delivered_at` no usado.

## Archivos modificados

- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.html`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/history-page.component.ts`
- `FASE_4D_QA_SMS_TEST_RESULTADO.md`

## Resultado build

```text
npm run build: OK
```

Compilo:

- `sms-client`
- `backoffice-admin`

Warning no bloqueante:

```text
Node.js version v25.9.0 detected.
Odd numbered Node.js versions will not enter LTS status and should not be used for production.
```

## Resultados rg

```bash
rg "from\\('sms_messages'\\).*insert|from\\('profiles'\\).*update|profiles\\.credits.*=" projects || true
```

Resultado: sin hallazgos.

```bash
rg "service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret" projects || true
```

Resultado: sin hallazgos.

```bash
rg "from\\('users'\\)|user:users|profiles\\.role|\\.role" projects supabase || true
```

Resultado: sin hallazgos.

## git diff --check

```text
OK
```

## Seguridad

- No `service_role` en Angular.
- No `SUPABASE_SERVICE_ROLE_KEY` en Angular.
- No insert directo a `sms_messages` desde Angular.
- No update directo a `profiles`.
- No asignacion directa a `profiles.credits`.
- No `users`.
- No `profiles.role`.

## Pendiente FASE 5 proveedor real

- Integrar proveedor real dentro de Edge Function, no Angular.
- Guardar provider secrets solo en Supabase secrets.
- Mapear respuesta proveedor a `provider_response` / `provider_message_id`.
- Manejar fallos proveedor sin descontar doble.
- Definir reintentos/idempotencia.
- Webhook delivery si proveedor lo soporta.
- Mantener modo test configurable para QA.
- Envio multiple y API keys siguen fuera de alcance hasta fases posteriores.
