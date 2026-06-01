# Fase 04-F - Ocultar Alertas SMS admin

## 1. Resumen

Se oculto visualmente `Alertas SMS` del menu lateral admin.

No se borro logica, componentes, rutas ni archivos de alertas. La funcionalidad queda congelada fuera del sidebar mediante feature flag local.

## 2. Archivos modificados

- `angular-workspace/projects/sms-client/src/app/admin/layout/admin-layout.component.ts`
- `angular-workspace/projects/backoffice-admin/src/app/layouts/admin-layout.component.ts`

## 3. Menu lateral actualizado

Se agrego:

```ts
const SHOW_SMS_ALERTS_NAV = false;
```

La lista completa queda en `allNavigation`, pero la lista visible del sidebar usa:

```ts
readonly navigation = this.allNavigation.filter((item) => item.visible !== false);
```

`Alertas SMS` queda configurado con:

```ts
visible: SHOW_SMS_ALERTS_NAV
```

Como el flag esta en `false`, no aparece en el sidebar.

Opciones conservadas:

- Dashboard
- Usuarios
- Recargas
- Cuentas
- Mensajes
- API Keys
- Facturas
- Marketing

## 4. Ruta de Alertas SMS

La ruta no se borro.

Rutas existentes conservadas:

- `sms-client`: `/admin/alerts`
- `backoffice-admin`: `/alerts`

Decision: dejar la ruta viva para no romper build ni imports actuales. Solo queda sin acceso desde menu lateral.

`pageTitle` sigue consultando `allNavigation`, por lo que si alguien entra directo a la ruta, el titulo puede seguir resolviendo `Alertas SMS`.

## 5. Build

Comando ejecutado:

```bash
npm run build
```

Resultado: OK.

Compilo:

- `sms-client`
- `backoffice-admin`

Nota: Node mostro advertencia por version impar `v25.9.0`; no bloqueo build.

## 6. Riesgos pendientes

- Si alguien conoce la URL directa, la pagina de alertas sigue accesible bajo guard admin.
- Si se quiere bloqueo total futuro, redirigir ruta a dashboard en una fase aparte.
- No se valido visual con sesion admin activa desde browser; el cambio compila y filtra `navigation`.

## 7. Decision recomendada

Fase 04-F lista.

Mantener `SHOW_SMS_ALERTS_NAV = false` hasta reactivar alertas de forma controlada.
