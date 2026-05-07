# FASE FIX - Backoffice Usuarios React/Vite 1:1

Fecha: 2026-05-07

## Estado final

**LISTO**

No requiere SQL. No requiere deploy Edge Function.

## Archivo React/Vite usado como referencia

- `../backoffice/src/pages/Users.tsx`

## Diferencias antes

Angular tenía:

- Tabla sin columna Acciones.
- Botón Agregar Usuario removido.
- Activar/Desactivar removido.
- Carga directa desde `profiles`.

React/Vite tenía:

- Buscador.
- Botón `Agregar Usuario`.
- Tabla con columnas: USUARIO, EMPRESA, TELÉFONO, BALANCE SMS, ESTADO, ACCIONES.
- Badges Activo/Inactivo.
- Botón Activar/Desactivar.
- Iconos Search, UserPlus, MessageSquare, Power/PowerOff.

## Qué se copió 1:1

- Layout toolbar.
- Buscador con icono.
- Botón superior `Agregar Usuario`.
- Tabla completa con 6 columnas.
- Badge de estado verde/rojo.
- Acción Activar/Desactivar.
- Iconos SVG equivalentes a lucide.
- Empty state `No hay usuarios registrados`.
- Loading spinner.
- Espaciado/card/table estilo React.

## Fuente real de data

Servicio:

- `BackofficeService.listClients()`

Tablas leídas:

- `profiles`
- `admins` para excluir administradores

No usa:

- tabla `users`
- `profiles.role`
- mock data

## Campos usados de `profiles`

- `id`
- `email`
- `full_name`
- `razon_social`
- `ruc`
- `phone`
- `credits`
- `is_active`
- `created_at`

Mapeo:

- USUARIO: `full_name`; email debajo.
- EMPRESA: `razon_social`; fallback `ruc`; fallback `-`.
- TELÉFONO: `phone`; fallback `-`.
- BALANCE SMS: `credits`.
- ESTADO: `is_active`.

## Buscador

Filtro frontend sobre data real cargada.

Busca por:

- nombre
- email
- empresa
- teléfono

## Agregar Usuario

Botón visible para copiar React/Vite.

Estado:

- Deshabilitado.
- Tooltip: `La creación de usuarios desde Backoffice se implementará en una fase posterior.`

Motivo:

- No hay backend seguro para crear `auth.users` desde Angular.
- No se usa Supabase Admin ni `service_role`.
- No se crea usuario falso.

## Activar / Desactivar

Acción real habilitada.

Usa RPC segura existente vía:

- `BackofficeService.setClientActive(...)`
- RPC `admin_set_client_active`

Garantías:

- Valida admin en SQL.
- Actualiza solo `profiles.is_active`.
- No toca créditos.
- No toca `auth.users`.
- Registra auditoría si `profile_audit_logs` existe.

## Archivos modificados

- `projects/backoffice-admin/src/app/pages/users-page.component.ts`
- `projects/backoffice-admin/src/app/pages/users-page.component.html`
- `projects/backoffice-admin/src/app/pages/users-page.component.scss`

## SQL requerido

No.

## Resultado build

Comando:

```bash
source ~/.nvm/nvm.sh
nvm use 22
rm -rf .angular/cache
npm run build
```

Resultado:

```text
sms-client: OK
backoffice-admin: OK
```

## Resultado rg

```text
rg "from\\('users'\\)|user:users|profiles\\.role|\\.role" projects supabase || true
Sin resultados.

rg "from\\('profiles'\\).*update|profiles\\.credits.*=|from\\('sms_messages'\\).*insert" projects/backoffice-admin projects/shared || true
Sin resultados.

rg "service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret|Bearer ey" projects/backoffice-admin projects/shared || true
Sin resultados.

rg "mock|fake|hardcode|QA Backoffice|QA Interno|Usuario de Prueba|Luis Pérez|Carlos Rodríguez|María González|Ana Martínez|StartupPE|Innovatech|TechCorp|Digital Solutions|qa.backoffice|999111222" projects/backoffice-admin/src/app/pages/users-page* -n || true
Sin resultados.
```

## Estado final

**LISTO**
