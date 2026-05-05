# FASE 6F - Cleanup Backoffice Sync / Kit Integración

## Estado

LISTO.

## Objetivo

Ya no se usará segundo sistema ni sincronización externa. Se quitó acceso visible desde sidebar.

## Archivos modificados

- `projects/backoffice-admin/src/app/layouts/admin-layout.component.ts`
- `projects/backoffice-admin/src/app/app.routes.ts`

## Sincronización

Antes:

- Sidebar mostraba `Sincronización`.
- Ruta `/sync` cargaba `SyncPageComponent`.

Ahora:

- `Sincronización` no aparece en sidebar.
- `/sync` queda como ruta legacy segura y redirige a dashboard:

```ts
{ path: 'sync', redirectTo: 'dashboard', pathMatch: 'full' }
```

No se borró archivo del módulo.

## Kit Integración

Antes:

- Sidebar mostraba `Kit Integración`.
- Ruta `/integration-kit` cargaba `IntegrationKitPageComponent`.

Ahora:

- `Kit Integración` no aparece en sidebar.
- `/integration-kit` queda como ruta legacy segura y redirige a dashboard:

```ts
{ path: 'integration-kit', redirectTo: 'dashboard', pathMatch: 'full' }
```

No se borró archivo del módulo.

## Menús preservados

Se mantienen:

- Usuarios
- Cuentas
- Recargas
- Mensajes
- API Keys
- Alertas SMS
- Facturas
- Marketing

## Seguridad

- No se tocó Supabase.
- No se tocó backend.
- No se tocó SMS.
- No se borraron archivos legacy.

## Pruebas manuales

1. Abrir backoffice.
2. Confirmar sidebar no muestra `Sincronización`.
3. Confirmar sidebar no muestra `Kit Integración`.
4. Ir manualmente a `/sync`.
5. Confirmar redirige a `/dashboard`.
6. Ir manualmente a `/integration-kit`.
7. Confirmar redirige a `/dashboard`.
