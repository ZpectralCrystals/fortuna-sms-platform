# FASE 5B - Clientes/cuentas Backoffice

Fecha: 2026-05-02

## Estado final

LISTO.

`profiles` queda como fuente unica de clientes. `admins` queda como fuente unica de administradores. `/accounts` es pantalla principal de gestion de clientes. `/users` redirige a `/accounts`.

## Archivos modificados

- `projects/backoffice-admin/src/app/app.routes.ts`
- `projects/backoffice-admin/src/app/pages/accounts-page.component.ts`
- `projects/backoffice-admin/src/app/pages/accounts-page.component.html`
- `projects/backoffice-admin/src/app/pages/accounts-page.component.scss`
- `projects/shared/src/lib/services/backoffice.service.ts`
- `projects/shared/src/lib/models/user.model.ts`
- `FASE_5B_CLIENTES_BACKOFFICE_RESULTADO.md`

## Decision `/accounts` y `/users`

- `/accounts`: pantalla real de clientes.
- `/users`: alias/redirect a `/accounts`.
- No hay dependencia runtime a tabla `users`.
- No se usa `profiles.role`.

## Queries usadas

Clientes:

```ts
supabase
  .from('profiles')
  .select('id,email,full_name,razon_social,ruc,phone,credits,total_spent,is_active,created_at,updated_at')
  .order('created_at', { ascending: false })
```

Excluir admins:

```ts
supabase
  .from('admins')
  .select('id')
```

Detalle recargas:

```ts
supabase
  .from('recharges')
  .select('id,sms_credits,amount,payment_method,operation_code,status,created_at')
  .eq('user_id', profileId)
  .order('created_at', { ascending: false })
```

Detalle mensajes:

```ts
supabase
  .from('sms_messages')
  .select('id,recipient,message,segments,cost,status,created_at,sent_at,error_message')
  .eq('user_id', profileId)
  .order('created_at', { ascending: false })
```

Update seguro:

```ts
supabase
  .from('profiles')
  .update({
    full_name,
    razon_social,
    ruc,
    phone,
    is_active
  })
  .eq('id', profileId)
```

## Campos editables

- `full_name`
- `razon_social`
- `ruc`
- `phone`
- `is_active`

Validaciones:

- `ruc`: vacio o 11 digitos.
- `phone`: vacio o `+51XXXXXXXXX`.

## Campos prohibidos

- `id`
- `email`
- `credits`
- `total_spent`
- cualquier dato de `auth.users`

Angular no cambia creditos ni totales.

## Filtros implementados

- Busqueda por nombre, email, razon social, RUC o telefono.
- Estado: todos / activos / inactivos.
- Orden base: `created_at desc`.

## Detalle cliente

Modal/panel con:

- datos de perfil.
- creditos actuales.
- total gastado.
- ultimas recargas.
- ultimos mensajes.
- conteos:
  - recargas pendientes.
  - recargas aprobadas.
  - mensajes enviados.
  - mensajes fallidos.

## Activar/desactivar

- Accion actualiza solo `profiles.is_active`.
- Usa confirmacion `window.confirm`.
- Mensaje visual: cliente inactivo no podra entrar al dashboard cliente.
- No borra clientes.

## BackofficeService

Metodos agregados:

- `listClients()`
- `getClientDetail(profileId)`
- `updateClientBasicInfo(profileId, payload)`
- `setClientActive(profileId, isActive)`
- `listClientRecharges(profileId)`
- `listClientMessages(profileId)`

Todos usan SELECT o UPDATE seguro. No insert/delete. No service role.

## Errores / riesgos

- Si RLS no permite admin update en `profiles`, UI mostrara error claro.
- `profiles.update` en frontend queda limitado por codigo a campos no criticos; DB debe mantener RLS admin.
- Email no se edita porque requiere decision de sync con `auth.users`.
- Conteos usan SELECT de recargas/mensajes del cliente; si volumen crece, conviene RPC/aggregate en fase futura.

## SQL adicional RLS

No se ejecuto SQL.

Si ambiente no tiene policy admin para update de `profiles`, recomendacion minima:

```sql
create policy "profiles_update_own_or_admin"
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());
```

Nota: proteger columnas criticas (`credits`, `total_spent`) idealmente con RPC, permisos de columna o triggers. Angular no las envia.

## Pruebas manuales recomendadas

1. Entrar a backoffice `/accounts`.
2. Confirmar clientes reales desde `profiles`.
3. Confirmar admins no aparecen.
4. Buscar por email, RUC y telefono.
5. Filtrar activos/inactivos.
6. Abrir detalle cliente.
7. Confirmar recargas y mensajes recientes.
8. Editar nombre/razon social/RUC/telefono.
9. Probar RUC invalido.
10. Probar telefono invalido.
11. Desactivar cliente, confirmar que no entra al dashboard cliente.
12. Reactivar cliente.
13. Entrar a `/users`, confirmar redireccion a `/accounts`.

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

Revision adicional:

- `BackofficeService` tiene `profiles.update`, pero solo en multilinea y solo campos permitidos:
  `full_name`, `razon_social`, `ruc`, `phone`, `is_active`.
- No update de `credits`.
- No update de `total_spent`.

## Siguiente fase recomendada

FASE 5C: hardening admin para clientes: auditoria de cambios, policy/permissions de columnas criticas, paginacion server-side y agregados RPC para detalle si volumen crece.
