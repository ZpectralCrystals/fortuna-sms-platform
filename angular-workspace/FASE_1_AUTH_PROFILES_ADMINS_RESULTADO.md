# FASE 1 - Auth, Profiles y Admins

## Archivos modificados

- `projects/shared/src/lib/services/auth.service.ts`
- `projects/shared/src/lib/models/user.model.ts`
- `projects/backoffice-admin/src/app/layouts/admin-layout.component.ts`
- `projects/backoffice-admin/src/app/pages/accounts-page.component.ts`
- `projects/backoffice-admin/src/app/pages/users-page.component.ts`
- `projects/backoffice-admin/src/app/pages/recharges-page.component.ts`
- `projects/sms-client/src/app/guards/client-auth.guard.ts`
- `projects/sms-client/src/app/layouts/dashboard-layout.component.ts`

## Usos de `users` encontrados

Runtime Angular antes del cambio:

- `projects/backoffice-admin/src/app/pages/users-page.component.ts`: `from('users')`.
- `projects/backoffice-admin/src/app/pages/recharges-page.component.ts`: `from('users')`.
- `projects/backoffice-admin/src/app/pages/recharges-page.component.ts`: relación `user:users(full_name, email, company)`.

Documentación legacy encontrada:

- `README_MIGRACION.md`: menciones históricas a `users`, `from('users')` y `user:users(...)`.

Resultado post-cambio:

- No queda `from('users')` en código Angular.
- No queda `user:users(...)` en código Angular.
- No queda `users(...)` en código Angular.
- Quedan menciones documentales legacy en `README_MIGRACION.md`; no son runtime.

## Cambios a `profiles`

- `UsersPageComponent` ahora lista clientes desde `profiles`.
- `UsersPageComponent` mapea `credits` como balance SMS.
- `UsersPageComponent` usa `razon_social`/`ruc` como empresa visible.
- `UsersPageComponent` excluye admins leyendo `admins.id`.
- `AccountsPageComponent` sigue leyendo `profiles`, pero ya no selecciona `role`.
- `RechargesPageComponent` carga clientes activos desde `profiles`.
- `RechargesPageComponent` cambia relación `user:users(...)` por `user:profiles(full_name, email, razon_social, ruc)`.
- `DashboardLayoutComponent` usa `AuthService.getCurrentProfile()` y deja de pedir `company_name`.
- `ClientAuthGuard` exige fila activa en `profiles` para entrar al dashboard cliente.
- `UserProfile` compartido deja de exponer `role`.

## Cambios a `admins`

- `AuthService.getCurrentAdmin()` valida sesión actual contra `admins.id = auth.users.id`.
- `AuthService.getCurrentAdmin()` exige `admins.is_active = true`.
- `AuthService.isAdmin()` depende solo de `admins`, no de `profiles.role`.
- `AdminLayoutComponent` lee nombre/correo desde `admins`, no desde metadata de Auth.
- `AdminGuard` ya usaba `AuthService.isAdmin()`; queda apuntando a validación `admins`.

## Login cliente actual

1. Cliente hace login normal con `supabase.auth.signInWithPassword`.
2. `ClientAuthGuard` llama `AuthService.hasClientProfile()`.
3. `AuthService` obtiene sesión actual.
4. `AuthService` busca `profiles.id = auth.users.id` con `is_active = true`.
5. Si existe perfil activo, entra al dashboard.
6. Dashboard lee datos del perfil desde `profiles`.

## Login admin actual

1. Admin hace login normal con `supabase.auth.signInWithPassword`.
2. Backoffice login llama `AuthService.isAdmin()`.
3. `AuthService` busca `admins.id = auth.users.id` con `is_active = true`.
4. Si no existe admin activo, se hace logout y se bloquea backoffice.
5. `AdminGuard` repite la validación en rutas protegidas.
6. Layout admin lee nombre/correo desde `admins`.

## Dependencias pendientes

- Acciones reales de recarga siguen bloqueadas para fase siguiente.
- Creación/activación real de clientes desde backoffice sigue bloqueada para fase siguiente.
- SMS real no tocado.
- API keys no tocadas.
- Inventario no tocado.
- `README_MIGRACION.md` conserva notas legacy sobre `users`.
- Si el Supabase real aún tiene RPCs que calculan clientes con `profiles.role`, conviene ajustarlos en una fase DB explícita. Esta fase no agregó migraciones ni tocó SQL.

## Pruebas manuales recomendadas

- Login cliente válido: entrar a `/dashboard` y ver nombre, empresa y saldo desde `profiles`.
- Login cliente sin fila en `profiles`: debe redirigir a `/login`.
- Login cliente con `profiles.is_active = false`: debe redirigir a `/login`.
- Login admin activo: entrar a `/dashboard` backoffice.
- Login usuario no admin en backoffice: debe cerrar sesión y mostrar "Tu cuenta no tiene acceso al backoffice."
- Login admin con `admins.is_active = false`: debe bloquear backoffice.
- Backoffice `/users`: debe listar perfiles cliente, sin admins.
- Backoffice `/accounts`: debe listar perfiles cliente, sin usar `role`.
- Backoffice `/recharges`: debe cargar perfiles en selector y relación de recargas contra `profiles`.

## Errores o riesgos detectados

- Node usado en build: `v25.9.0`; Angular advierte que versiones impares no son LTS.
- La relación `user:profiles(...)` en recargas depende de FK `recharges.user_id -> profiles.id`; el esquema final la declara, pero hay que validar contra Supabase real.
- `README_MIGRACION.md` tiene referencias legacy que pueden confundir futuras fases.
- `supabase_final/schema_final.sql` contiene `profiles.role` y RPC `get_dashboard_stats()` usando `p.role`; no se tocó por restricción de no agregar migraciones en esta fase.

## Siguiente fase recomendada

FASE 2: normalizar flujos operativos contra el esquema limpio:

- Crear recargas reales contra `recharges`.
- Aprobar/rechazar recargas con RPCs seguras.
- Ajustar dashboard/RPCs para contar clientes sin depender de `profiles.role`.
- Definir alta segura de clientes desde backoffice usando Supabase Auth + trigger de `profiles`.
