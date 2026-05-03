# FASE 6B.2 - UI labels proveedor real vs modo test

## Estado final

LISTO.

Se corrigieron textos de `/dashboard/send` para no mostrar siempre “modo test”.

## Cambios

Archivos:

- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.html`
- `FASE_6B2_UI_LABELS_PROVIDER_REAL_RESULTADO.md`

## Labels actualizados

Subtítulo:

```text
Envía SMS individuales desde tu saldo disponible
```

Success:

- si `sendResult.test_mode === true`:

```text
SMS enviado en modo test
```

- si `sendResult.test_mode === false`:

```text
SMS enviado correctamente
```

Detalle success:

- recipient
- segmentos
- créditos descontados
- status
- modo `test` o `real`

## Qué no se tocó

- Edge Function
- proveedor real
- Supabase
- créditos
- `sms_messages`
- recargas/inventario
- templates

## Validación esperada

Provider real devuelve:

```json
{ "test_mode": false }
```

UI muestra:

```text
SMS enviado correctamente
modo real
```

Modo test devuelve:

```json
{ "test_mode": true }
```

UI muestra:

```text
SMS enviado en modo test
modo test
```
