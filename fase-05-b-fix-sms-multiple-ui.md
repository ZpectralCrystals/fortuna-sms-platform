# Fase 05-B - Fix SMS multiple UI

## 1. Resumen

Se corrigió frontend de `/dashboard/send-sms` modo Múltiple.

Problemas corregidos:

- `SMS requeridos` mostraba `smsCount` por mensaje, no total por destinatarios.
- Saldo del resumen usaba helper distinto al sidebar y podía quedar `0`.
- Botón quedaba deshabilitado con saldo suficiente.

No se tocó backend, DB, provider adapter, `send-sms` individual ni `api-send-sms`.

## 2. Archivos modificados

- `angular-workspace/projects/sms-client/src/app/dashboard/pages/send-sms-page.component.ts`
- `angular-workspace/projects/sms-client/src/app/dashboard/pages/send-sms-page.component.html`
- `angular-workspace/projects/shared/src/lib/services/sms.service.ts`

## 3. Cálculo SMS requeridos

`requiredCredits` ya existía correcto:

```ts
requiredCredits = phoneCount * smsCount
```

El bug estaba en template: mostraba `smsCount`.

Corregido:

```html
<strong>{{ requiredCredits }}</strong>
```

Caso esperado:

- 2 destinatarios
- 1 segmento
- `requiredCredits = 2`
- costo `S/ 0.16`

## 4. Créditos disponibles

Send page ahora usa misma fuente visible del sidebar: `profiles.credits`.

También se agregó estado `balanceLoading`:

- mientras carga: `Cargando...`
- no muestra `0` falso
- no permite submit hasta tener saldo cargado

## 5. Botón enviar

Bloquea solo si:

- no hay destinatarios válidos
- falta mensaje
- saldo aún carga
- `requiredCredits > credits`
- `sending = true`

Con 5 créditos y 2 requeridos, botón queda habilitable.

## 6. Envío múltiple

Confirmado:

- Angular llama `SmsService.sendMultipleSimple()`.
- `sendMultipleSimple()` invoca `supabase.functions.invoke('send-sms-batch')`.
- Angular no manda uno por uno.
- Angular no llama `services-fortuna.com`.

## 7. Build

OK:

```bash
npm run build
```

Compiló:

- `sms-client`
- `backoffice-admin`

Nota: Node mostró warning por versión impar `v25.9.0`; no bloqueó build.

## 8. Comandos ejecutados

- `sed`
- `rg`
- `git diff`
- `npm run build`

## 9. Validaciones

- `rg "services-fortuna.com" angular-workspace/projects -n`: sin resultados.
- `send-sms-batch` aparece en `SmsService.sendMultipleSimple`.
- `sendSingle()` solo queda para modo individual.

## 10. Riesgos pendientes

- Backend sigue siendo fuente final de verdad: si ledger real no tiene saldo, `send-sms-batch` rechazará aunque UI muestre espejo `profiles.credits`.
- Recomendado alinear sidebar y pantalla envío a endpoint/RPC único de saldo empresa en fase posterior.

## 11. Decisión recomendada

Probar en navegador:

- 2 destinatarios válidos.
- mensaje 1 segmento.
- sidebar 5 SMS.

Resultado esperado:

- `SMS requeridos = 2`
- `Créditos disponibles = 5`
- `Créditos después = 3`
- botón habilitado
- envío usa `send-sms-batch`
