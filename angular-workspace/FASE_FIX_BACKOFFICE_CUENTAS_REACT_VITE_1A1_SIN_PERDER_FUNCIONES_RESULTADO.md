# FASE FIX BACKOFFICE CUENTAS - React/Vite 1:1 sin perder funciones

## Referencia React/Vite

- Archivo encontrado: `../backoffice/src/pages/Clients.tsx`.
- No existe `../backoffice/src/pages/Accounts.tsx`; en React/Vite el menú `Cuentas` apunta a `clients`.
- Elementos usados como referencia:
  - buscador `Buscar clientes...`
  - grilla de cards
  - badge `Activo` / `Inactivo`
  - métricas `Balance SMS`, `Total Gastado`, `Recargas`
  - bloque `Desde`
  - colores azul, verde y morado por métrica

## Diferencias antes

- Angular mostraba una pantalla más administrativa con métricas superiores y filtro de estado.
- Las cards no seguían la estructura visual React/Vite.
- No se mostraba `Recargas` en la card de cuenta.

## Copiado visual 1:1

- Se mantuvo título `Cuentas`.
- Se dejó buscador con placeholder `Buscar clientes...`.
- Se reorganizó la vista principal como cards en grilla.
- Cada card muestra:
  - cliente/email/empresa
  - badge activo/inactivo
  - `Balance SMS`
  - `Total Gastado`
  - `Recargas`
  - `Desde`
- Se aplicaron iconos SVG equivalentes, spacing, cards, tonos y responsive siguiendo `Clients.tsx`.

## Funcionalidades Angular conservadas

- Lectura real de clientes desde `profiles`.
- Exclusión de admins usando `admins`.
- Detalle de cuenta con recargas, mensajes y auditoría.
- Edición segura usando RPC `admin_update_client_profile`.
- Activar/desactivar usando RPC `admin_set_client_active`.
- Modal de detalle/edición/auditoría conservado.
- Ruta `/accounts` independiente; no se redirige a Usuarios.

## Fuente real de datos

- `profiles`: email, nombre, razón social, RUC, teléfono, créditos, total gastado, estado y fecha.
- `recharges`: conteo real de recargas aprobadas por cliente.
- `sms_messages`: se conserva en el detalle existente.
- `profile_audit_logs`: se conserva en el detalle existente si existe.

## Buscador

Filtra en frontend sobre data cargada:
- nombre
- email
- razón social
- RUC
- teléfono

## Acciones y detalle

- Click en card o botón `Ver detalle` abre el modal real.
- `Editar datos` conserva validaciones.
- `Activar` / `Desactivar` conserva confirmación y RPC segura.
- No se agregaron botones falsos.

## SQL

- No requiere SQL.

## Deploy Edge Function

- No requiere deploy Edge Function.

## Archivos modificados

- `projects/backoffice-admin/src/app/pages/accounts-page.component.ts`
- `projects/backoffice-admin/src/app/pages/accounts-page.component.html`
- `projects/backoffice-admin/src/app/pages/accounts-page.component.scss`
- `projects/shared/src/lib/services/backoffice.service.ts`

## Build

- `npm run build`: OK con Node `v22.22.2`.
- `git diff --check`: OK.

## Resultado rg

- `from('users')|user:users|profiles.role|.role`: sin coincidencias.
- updates/insert directos prohibidos en backoffice/shared: sin coincidencias.
- `service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret|Bearer ey`: sin coincidencias.
- mocks/fakes prohibidos en accounts: sin coincidencias.

## Estado final

LISTO.
