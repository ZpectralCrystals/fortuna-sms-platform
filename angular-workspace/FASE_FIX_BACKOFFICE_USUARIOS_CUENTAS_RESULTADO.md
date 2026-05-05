# FASE FIX - Backoffice Usuarios / Cuentas

## Causa encontrada

- Sidebar tenía dos items visibles:
  - `Usuarios` -> `/users`
  - `Cuentas` -> `/accounts`
- Ruta `/users` redirigía a `/accounts`.
- Resultado: click en `Usuarios` terminaba en `/accounts`; `routerLinkActive` marcaba `Cuentas`.
- Ambos módulos representaban gestión de clientes/perfiles basada en `profiles`.

## Archivos modificados

- `projects/backoffice-admin/src/app/app.routes.ts`
- `projects/backoffice-admin/src/app/layouts/admin-layout.component.ts`
- `FASE_FIX_BACKOFFICE_USUARIOS_CUENTAS_RESULTADO.md`

## Ruta final de Usuarios

`/users` queda como ruta real visible del módulo de clientes/perfiles.

```ts
{ path: 'users', component: AccountsPageComponent }
```

Usa `AccountsPageComponent` porque es pantalla actual completa de gestión de clientes con `profiles`.

## Qué pasó con Cuentas

`Cuentas` queda oculto del sidebar para evitar duplicidad visual.

Ruta legacy `/accounts` queda compatible, pero redirige a `/users`:

```ts
{ path: 'accounts', redirectTo: 'users', pathMatch: 'full' }
```

No se borró `AccountsPageComponent`.

## Seguridad

- No se creó tabla `users`.
- No se agregó `from('users')`.
- No se usó `profiles.role`.
- No se tocó Supabase.
- No se tocó SMS.
- No se tocó recargas/inventario.

## Resultado build

`npm run build`: OK.

Builds:

- `sms-client`: OK
- `backoffice-admin`: OK

Nota: Node.js `v25.9.0` muestra warning por versión impar no LTS. No bloquea build.

## Resultado git diff --check

OK.

## Resultado rg

Comando:

```bash
rg "from\\('users'\\)|user:users|profiles\\.role|\\.role" projects || true
```

Resultado: sin hallazgos.

## Estado final

LISTO.

Click en `Usuarios` permanece en `/users`, active state marca `Usuarios`, `Cuentas` ya no aparece duplicado en sidebar.
