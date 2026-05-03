# FASE 6B.1 - Fix cost SMS provider real

## Estado final

LISTO.

Se creó migración incremental para alinear `sms_messages.cost` en modo prod con modo test:

```sql
round((segments * 0.08)::numeric, 4)
```

Créditos siguen descontando por segmentos:

```text
1 segmento = 1 crédito
```

## Problema corregido

Modo prod guardaba:

```text
segments = 1
cost = 1.0000
```

Debe guardar:

```text
segments = 1
cost = 0.0800
```

Para 2 segmentos:

```text
cost = 0.1600
```

## SQL creado

- `supabase/migrations/20260503002000_fix_sms_provider_cost.sql`

## Funciones actualizadas

- `public.internal_validate_sms_send`
- `public.internal_send_sms_provider_success`
- `public.internal_register_sms_failed`

## Cambio aplicado

Antes:

```sql
v_cost := v_segments;
v_cost := coalesce(p_cost, v_segments);
```

Ahora:

```sql
v_cost := round((v_segments * 0.08)::numeric, 4);
```

## Qué no cambia

- `profiles.credits` baja por `v_segments`.
- modo test no se toca.
- Edge Function no se toca.
- Angular no se toca.
- proveedor real no se toca.
- recargas/inventario no se toca.
- datos históricos no se actualizan.

## Por qué success recalcula cost

Aunque `internal_validate_sms_send` devuelve `cost = 0.0800`, `internal_send_sms_provider_success` vuelve a calcularlo desde `p_segments`.

Motivo:

- evita confiar en `p_cost`
- mantiene consistencia si Edge manda valor viejo
- reduce riesgo de guardar costo incorrecto

## Failed también alineado

`internal_register_sms_failed` también calcula:

```sql
round((segments * 0.08)::numeric, 4)
```

Así mensajes failed quedan consistentes para reporting, sin descontar créditos.

## Requiere ejecutar SQL

Sí.

```bash
supabase db push
```

O aplicar manualmente:

```text
supabase/migrations/20260503002000_fix_sms_provider_cost.sql
```

## Pruebas recomendadas

1. Aplicar migración.
2. Enviar SMS real de 1 segmento.
3. Confirmar:
   - `profiles.credits` baja en 1
   - `sms_messages.segments = 1`
   - `sms_messages.cost = 0.0800`
4. Enviar SMS real de 2 segmentos.
5. Confirmar:
   - `profiles.credits` baja en 2
   - `sms_messages.segments = 2`
   - `sms_messages.cost = 0.1600`
6. Confirmar modo test sigue igual.

## Riesgo pendiente

Históricos con `cost = 1.0000` no se corrigen automáticamente. Si se quiere normalizar historial, hacer SQL separado con revisión previa.
