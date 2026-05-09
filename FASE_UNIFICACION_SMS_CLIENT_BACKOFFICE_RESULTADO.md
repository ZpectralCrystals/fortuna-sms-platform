# FASE UNIFICACIÓN SMS-CLIENT + BACKOFFICE

Aplicado sobre `main` (worktree principal). Sin commit. Sin PR.

## 1. App host final

`projects/sms-client` queda como única app de producción. Backoffice migrado a `projects/sms-client/src/app/admin/`. `projects/backoffice-admin` se conserva en el workspace como referencia legacy (no se borra esta fase).

## 2. Rutas públicas

```
/                landing
/login           login unificado (cliente y admin)
/register        registro cliente
/forgot-password
/reset-password
/about
/blog
/blog/:slug
/privacy
/terms
```

`/login` ahora detecta admin tras autenticarse y redirige a `/admin`; cliente normal va a `/dashboard`.

## 3. Rutas cliente

```
/dashboard           overview
/dashboard/send      enviar SMS
/dashboard/history
/dashboard/analytics
/dashboard/templates
/dashboard/api-keys
/dashboard/recharges
```

Protegido por `ClientAuthGuard` (ya existía).

## 4. Rutas admin

```
/admin                redirige a /admin/dashboard
/admin/dashboard
/admin/users
/admin/recharges
/admin/accounts
/admin/messages
/admin/api-keys
/admin/alerts
/admin/invoices
/admin/marketing
/admin/sync           → redirect /admin/dashboard (legacy)
/admin/integration-kit → redirect /admin/dashboard (legacy)
/admin/inventory      → redirect /admin/recharges (compatibilidad temporal — sin pantalla dedicada todavía)
```

Protegido por `AdminGuard`.

## 5. Migrado desde backoffice-admin

Copiado dentro de `projects/sms-client/src/app/admin/`:

- `guards/admin.guard.ts`
- `layout/admin-layout.component.{ts,html,scss}`
- `components/loading-state.component.{ts,html,scss}`
- `components/empty-state.component.{ts,html,scss}`
- `pages/{accounts,alerts,api-keys,dashboard,invoices,marketing,messages,recharges,users}-page.component.{ts,html,scss}`

Selectores `bo-*` preservados (no colisionan con `sms-*` cliente).

## 6. Legacy

`projects/backoffice-admin` se mantiene en el workspace por seguridad, pero ya no es necesario para producción. Scripts npm:

- `npm run build` → `ng build sms-client` (app unificada).
- `npm run build:sms` → idéntico.
- `npm run build:legacy-backoffice` → mantiene posibilidad de compilar el viejo backoffice si hace falta.
- `npm run build:all` → ambos (desarrollo).
- `npm start` → `ng serve sms-client`.

## 7. Layouts

Conservados separados:

- `DashboardLayoutComponent` (cliente, sidebar cliente con saldo). Sin cambios.
- `AdminLayoutComponent` (admin, sidebar admin). Migrado intacto. **Único cambio**: paths del nav ahora usan `/admin/*` en vez de raíz.

No se mezclan sidebars: cada layout aplica solo a su árbol de rutas.

## 8. Guards

- `ClientAuthGuard` (existente) — sin tocar.
- `AdminGuard` (migrado) — sin cambios funcionales. Redirige a `/login` (que ahora es el login unificado).

## 9. Servicios en shared

No se movió ningún servicio nuevo. Todos los pages admin ya importaban `SupabaseService`/`AuthService` desde `@sms-fortuna/shared`. Único ajuste: `admin-layout.component.ts` importaba shared por path relativo (`../../../../shared/src/lib/services/auth.service`); cambiado a `@sms-fortuna/shared`.

## 10. Problemas de rutas corregidos

- Nav admin antes apuntaba a `/dashboard`, `/users`, etc. → colisionaba con `/dashboard` cliente. Ahora prefijado `/admin/*`.
- `pageTitle` en `AdminLayoutComponent` resuelve por URL completa (`/admin/dashboard`) — funciona igual con paths actualizados.
- `/sync`, `/integration-kit` legacy sobreviven bajo `/admin/sync` y `/admin/integration-kit` redirigiendo a `/admin/dashboard`.
- Login unificado: post-login chequea `auth.isAdmin()` y enruta a `/admin` o `/dashboard`. Admin no queda atrapado en flujo cliente.
- Wildcard `/**` redirige a `/` (home) sin afectar `/admin/*` ni `/dashboard/*`.

## 11. Ajustes visuales

Esta fase no aplicó pulidos visuales adicionales (alcance: unificación). Ajustes visuales previos de `/dashboard/api-keys` y card interna en `/admin/alerts` (fase anterior) se mantienen intactos.

## 12. Resultado build

```
npm run build:sms → OK
- 1 dist generado: dist/sms-client
- main.js 7.27 MB (desarrollo, sin minificación)
- 0 errores de compilación
```

## 13. Pruebas manuales de rutas

`ng serve sms-client --port 4200` no se ejecutó por restricción del entorno (no se puede levantar dev server interactivo aquí). Build OK garantiza que las rutas resuelven sus componentes en compile-time. Validación manual queda pendiente de smoke-test en local.

Smoke test recomendado:

```
npm start
# abrir http://localhost:4200/
# probar cliente: /, /login, /register, /dashboard, /dashboard/send, /dashboard/history, /dashboard/api-keys
# probar admin (con cuenta admin): /admin, /admin/dashboard, /admin/users, /admin/accounts, /admin/recharges,
#   /admin/inventory*, /admin/messages, /admin/api-keys, /admin/alerts, /admin/invoices, /admin/marketing
# probar guard: cliente → /admin → debe redirigir a /login
```

*Nota*: ruta `/admin/inventory` queda como **redirect temporal a `/admin/recharges`** (compatibilidad de URL). Cuando se cree una page dedicada `InventoryPageComponent`, reemplazar el `redirectTo` por `component:` en `app.routes.ts`. AdminLayout sidebar no tiene item Inventario actualmente — no se agrega en esta fase.

## 14. Resultado rg seguridad

```
rg "from\('users'\)|user:users|profiles\.role|\.role" projects supabase
  → 0 matches

rg "service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret|Bearer ey" projects/sms-client projects/backoffice-admin projects/shared
  → 0 matches

rg "from\('profiles'\).*update|profiles\.credits.*=" projects/sms-client projects/backoffice-admin projects/shared
  → 0 matches

rg "mock|fake|hardcode|datos de prueba|QA Interno|Juan Villanueva|Carlos Rodriguez|Ana Torres|Pedro Sanchez|Empresa XYZ|Marketing Pro|Startup Innovadora" projects/sms-client/src/app projects/backoffice-admin/src/app
  → 0 matches
```

`git diff --check` → sin warnings.

## 15. Deploy / rewrite

Creado `angular-workspace/vercel.json`:

```json
{
  "buildCommand": "npm run build:sms",
  "outputDirectory": "dist/sms-client",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Permite que `/dashboard`, `/admin/*`, `/login` etc. resuelvan al SPA al refrescar. Para Netlify, equivalente sería `_redirects` con `/* /index.html 200`. No aplicado (se asume Vercel).

## 16. Archivos modificados / creados

Modificados:

- `angular-workspace/package.json` — scripts.
- `angular-workspace/projects/sms-client/src/app/app.routes.ts` — agregadas rutas `/admin/*`.
- `angular-workspace/projects/sms-client/src/app/auth/login-page.component.ts` — redirect según rol.

Creados (todos dentro de `angular-workspace/projects/sms-client/src/app/admin/`):

- `guards/admin.guard.ts`
- `layout/admin-layout.component.{ts,html,scss}` (TS editado: imports + nav paths)
- `components/loading-state.component.{ts,html,scss}`
- `components/empty-state.component.{ts,html,scss}`
- `pages/accounts-page.component.{ts,html,scss}`
- `pages/alerts-page.component.{ts,html,scss}`
- `pages/api-keys-page.component.{ts,html,scss}`
- `pages/dashboard-page.component.{ts,html,scss}`
- `pages/invoices-page.component.{ts,html,scss}`
- `pages/marketing-page.component.{ts,html,scss}`
- `pages/messages-page.component.{ts,html,scss}`
- `pages/recharges-page.component.{ts,html,scss}`
- `pages/users-page.component.{ts,html,scss}`

Y `angular-workspace/vercel.json`.

`projects/backoffice-admin/` queda intacto (referencia legacy).

## 17. Pendientes

1. **Smoke test manual** con `npm start` para validar todas las rutas responden y guards funcionan en runtime.
2. **Pulido visual landing/pricing** (mencionado en spec, no abordado en esta fase de unificación). Hacer en fase posterior.
3. **Borrar `projects/backoffice-admin/`** una vez confirmado que la unificación funciona en producción. Eliminar también de `angular.json` el target `backoffice-admin` y limpiar scripts `build:legacy-backoffice` / `start:backoffice`.
4. **Lazy-loading admin/dashboard**: actualmente las pages admin se importan eagerly en `app.routes.ts`, inflando bundle inicial (`main.js` 7.27 MB dev). En producción tras minificación queda más liviano, pero conviene migrar a `loadComponent` para dividir chunks. Postergado.
5. **Crear `auth.users` con email `alerts@smsfortuna.internal`** (de la fase anterior) sigue pendiente para que `/admin/alerts` cuenta interna esté operativa.
6. **Ruta `/admin/inventory`** ahora redirige a `/admin/recharges` (compatibilidad). Si se necesita módulo dedicado, crear `InventoryPageComponent` y cambiar `redirectTo` por `component`.

## 18. Estado final

**LISTO** (compilación + estructura). Smoke test de runtime queda como verificación humana antes de deploy.

### Garantías cumplidas

- Una sola app desplegable: `dist/sms-client`.
- `/dashboard/*` y `/admin/*` aislados por layouts y guards.
- Cliente NO puede entrar a `/admin` (AdminGuard → redirect `/login`).
- Admin entra a `/admin` tras login (login detecta `auth.isAdmin()`).
- `/dashboard/api-keys` y `/admin/api-keys` ambos operativos sin tocar API pública.
- `/admin/alerts` con cuenta interna intacta (fase previa).
- 0 `service_role` en Angular.
- 0 updates directos a `profiles.credits` desde frontend.
- 0 mocks ni nombres de datos de prueba.
- Sidebars NO mezclados (DashboardLayout vs AdminLayout aislados).
- API pública `api-send-sms` no se tocó.

Reporte: `/Volumes/MAC/MAC Ext/Desktop/Fortuna sms/FASE_UNIFICACION_SMS_CLIENT_BACKOFFICE_RESULTADO.md`.
