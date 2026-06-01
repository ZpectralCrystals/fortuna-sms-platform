# Fase 05-F - Fix Recargas ambiguous profiles

## 1. Resumen

Se corrigio solo consulta frontend de recargas admin.

Error tratado:

`Could not embed because more than one relationship was found for 'recharges' and 'profiles'`

Causa: `recharges` tiene mas de una FK hacia `profiles` (`user_id` y `requested_by_user_id`). PostgREST no puede resolver `profiles(...)` sin FK explicita.

## 2. Archivo modificado

- `angular-workspace/projects/shared/src/lib/services/recharges.service.ts`

## 3. Consulta corregida

Antes:

```sql
profile:profiles(full_name, email, razon_social, ruc)
```

Ahora:

```sql
profile:profiles!recharges_user_id_fkey(id, email, full_name, razon_social, ruc, phone, credits)
```

Relación usada:

- `recharges.user_id -> profiles.id`

## 4. Compatibilidad TypeScript

El alias `profile` se mantuvo.

Los componentes admin y backoffice siguen leyendo `recharge.profile`, sin cambios visuales.

## 5. Requested by

No se agrego embed `requested_by` porque pagina Recargas actual muestra cliente de la recarga, no usuario solicitante/admin.

Si luego se necesita solicitante:

```sql
requested_by:profiles!recharges_requested_by_user_id_fkey(id, email, full_name)
```

## 6. Build

Comando ejecutado:

```bash
npm run build
```

Resultado:

- `sms-client` OK.
- `backoffice-admin` OK.
- Warning Node `v25.9.0` por version impar no LTS, sin fallo.

## 7. Comandos NO ejecutados

- No DB.
- No migrations.
- No deploy.
- No provider.
- No `send-sms`.
- No `api-send-sms`.
- No `send-sms-batch`.
- No cambio `SMS_PROVIDER_MODE`.

## 8. Riesgos pendientes

- Si nombre FK en Supabase live fuera distinto al default `recharges_user_id_fkey`, PostgREST seguira fallando. En ese caso usar query de `pg_constraint` para confirmar nombre real o cambiar a merge local de dos queries.

## 9. Decision recomendada

Probar `/admin/recharges`.

Esperado:

- Recargas cargan sin error PostgREST.
- Se muestran usuario, paquete, cantidad, monto, metodo, fecha, estado, codigo operacion y acciones.
