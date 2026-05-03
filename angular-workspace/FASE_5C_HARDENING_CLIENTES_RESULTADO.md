# FASE 5C - Hardening clientes y seguridad updates

Fecha: 2026-05-02

## Estado final

PARCIAL.

Codigo Angular y migracion SQL quedan listos. Falta ejecutar la migracion en Supabase real para que las RPC existan. Despues de aplicar SQL, estado esperado: LISTO.

## Archivos modificados

- `projects/backoffice-admin/src/app/pages/accounts-page.component.ts`
- `projects/backoffice-admin/src/app/pages/accounts-page.component.html`
- `projects/shared/src/lib/services/backoffice.service.ts`
- `projects/shared/src/lib/models/user.model.ts`
- `supabase/migrations/20260502_harden_client_profile_updates.sql`
- `FASE_5C_HARDENING_CLIENTES_RESULTADO.md`

## SQL / migracion creada

Archivo:

```text
supabase/migrations/20260502_harden_client_profile_updates.sql
```

Incluye:

- Tabla `public.profile_audit_logs`.
- Indices por `profile_id, created_at desc` y `changed_by`.
- RLS enabled.
- Policy SELECT admin: `profile_audit_logs_select_admin`.
- RPC `public.admin_update_client_profile`.
- RPC `public.admin_set_client_active`.
- Grants a `authenticated`.

## RPC creadas

### `public.admin_update_client_profile`

Params:

```sql
p_profile_id uuid,
p_full_name text,
p_razon_social text,
p_ruc text,
p_phone text,
p_is_active boolean
```

Valida:

- `auth.uid()` existe.
- `public.is_admin()`.
- admin activo en `public.admins`.
- cliente existe en `profiles`.
- cliente no existe en `admins`.
- RUC null/vacio o 11 digitos.
- telefono null/vacio o `+51XXXXXXXXX`.

Actualiza solo:

- `full_name`
- `razon_social`
- `ruc`
- `phone`
- `is_active`
- `updated_at`

Audita en `profile_audit_logs`.

### `public.admin_set_client_active`

Params:

```sql
p_profile_id uuid,
p_is_active boolean
```

Valida admin/cliente igual. Actualiza solo `is_active` y `updated_at`. Audita cambio de estado.

## Updates directos eliminados

Antes:

```ts
supabase.from('profiles').update(...)
```

Ahora:

```ts
supabase.rpc('admin_update_client_profile', ...)
supabase.rpc('admin_set_client_active', ...)
```

Angular ya no actualiza directo `profiles`.

## Campos permitidos por RPC

- `full_name`
- `razon_social`
- `ruc`
- `phone`
- `is_active`

## Campos prohibidos

- `id`
- `email`
- `credits`
- `total_spent`
- auth data

## Auditoria implementada

Tabla:

```text
public.profile_audit_logs
```

Campos:

- `id`
- `profile_id`
- `changed_by`
- `action`
- `old_data`
- `new_data`
- `created_at`

Backoffice detalle cliente muestra auditoria reciente si la tabla/RPC ya existen. Si SQL no se aplico, la carga de auditoria falla suave y no rompe detalle.

## SQL requerido en Supabase

Si. Debes ejecutar la migracion en Supabase real antes de probar editar/activar clientes.

Comando recomendado desde `angular-workspace`:

```bash
supabase db push
```

Alternativa manual:

```bash
supabase db execute --file supabase/migrations/20260502_harden_client_profile_updates.sql
```

O copiar el contenido del SQL en Supabase SQL Editor.

## Pruebas manuales recomendadas

1. Ejecutar migracion.
2. Login backoffice admin activo.
3. Abrir `/accounts`.
4. Editar `full_name`, `razon_social`, `ruc`, `phone`.
5. Probar RUC invalido.
6. Probar telefono invalido.
7. Desactivar cliente.
8. Reactivar cliente.
9. Confirmar que `credits`, `total_spent`, `email`, `id` no cambian.
10. Confirmar fila en `profile_audit_logs`.
11. Confirmar auditoria visible en detalle.
12. Intentar editar perfil admin y confirmar bloqueo.

## Riesgos pendientes

- Hasta ejecutar migracion, la UI llamara RPC inexistentes y update fallara.
- Policies viejas de update directo siguen existiendo por regla de no romper UI; hardening fuerte total requiere permissions de columna o revocar update directo en fase futura.
- Auditoria no registra diff por campo; guarda snapshot old/new de campos permitidos.
- Si `public.is_admin()` no valida `is_active`, la RPC tambien valida `admins.is_active = true`.

## Siguiente fase recomendada

FASE 5D: hardening DB final de columnas criticas: revisar grants/policies para impedir update directo de `credits`, `total_spent`, `email` incluso fuera de Angular; agregar tests SQL de RPC y auditoria.

## Validaciones ejecutadas

```bash
npm run build
git diff --check
git diff --stat
rg "from\\('users'\\)|user:users|profiles\\.role|\\.role" projects supabase || true
rg "service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret" projects || true
rg "from\\('profiles'\\).*update|profiles\\.credits.*=|total_spent.*=" projects || true
```

Resultado:

- Build OK.
- `git diff --check` OK.
- Los 3 `rg` pedidos sin resultados.
