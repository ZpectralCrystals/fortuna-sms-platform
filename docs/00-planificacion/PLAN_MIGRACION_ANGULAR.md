# PLAN MIGRACION ANGULAR - SMS FORTUNA

## 1. Objetivo del documento

Este documento consolida diagnostico tecnico inicial de los proyectos actuales `sms` y `backoffice` antes de iniciar migracion a Angular.

El alcance de esta revision es solo analisis. No se modifica codigo, no se migran pantallas y no se borran archivos.

## 2. Resumen ejecutivo

Actualmente existen dos aplicaciones separadas:

- `sms`: portal cliente y plataforma principal de envio de SMS.
- `backoffice`: panel administrativo y operativo.

Ambas aplicaciones estan construidas con React + Vite + TypeScript y consumen Supabase directamente desde frontend. Tambien existen Edge Functions en ambos proyectos para envio SMS, sincronizacion, recargas, alertas, API keys y kit de integracion.

Para migrar a Angular conviene separar claramente:

- capa visual Angular;
- servicios Angular para consumo API/Supabase;
- guards de autenticacion;
- modulos por dominio;
- modelos tipados compartidos;
- capa de integracion con Supabase y Edge Functions;
- posible backend dedicado en siguiente etapa si se decide sacar logica critica del frontend.

La migracion no debe ser solo "copiar pantallas". Antes conviene mapear flujos y dependencias porque hoy hay logica critica repartida entre componentes React, tablas Supabase, RPCs y Edge Functions.

## 3. Estructura actual de proyectos

### 3.1 Proyecto `sms`

Estructura relevante detectada:

```text
sms/
  package.json
  vite.config.ts
  tsconfig.json
  tsconfig.app.json
  tailwind.config.js
  index.html
  .env
  public/
  dist/
  src/
    main.tsx
    App.tsx
    contexts/
      AuthContext.tsx
    lib/
      supabase.ts
    utils/
      format.ts
    components/
      ProtectedRoute.tsx
      AdminProtectedRoute.tsx
      Hero.tsx
      Features.tsx
      Benefits.tsx
      Pricing.tsx
      Footer.tsx
      CTA.tsx
      HowItWorks.tsx
      UseCases.tsx
      UsagePolicy.tsx
    layouts/
      DashboardLayout.tsx
      AdminLayout.tsx
      SuperAdminLayout.tsx
    pages/
      Landing.tsx
      About.tsx
      Privacy.tsx
      Terms.tsx
      Blog.tsx
      BlogPost.tsx
      Login.tsx
      Register.tsx
      Dashboard.tsx
      SendSMS.tsx
      History.tsx
      Analytics.tsx
      Templates.tsx
      ApiKeys.tsx
      Recharges.tsx
      admin/
      super-admin/
  supabase/
    migrations/
    functions/
      send-sms/
      notify-backoffice/
      sync-user-backoffice/
      recharge-webhook/
      balance-update/
```

### 3.2 Proyecto `backoffice`

Estructura relevante detectada:

```text
backoffice/
  package.json
  vite.config.ts
  tsconfig.json
  tsconfig.app.json
  tailwind.config.js
  index.html
  .env
  dist/
  src/
    main.tsx
    App.tsx
    contexts/
      AuthContext.tsx
    lib/
      supabase.ts
      formatters.ts
    types/
      database.ts
    components/
      Login.tsx
      Layout.tsx
    pages/
      Dashboard.tsx
      Users.tsx
      Recharges.tsx
      Clients.tsx
      Messages.tsx
      ApiKeys.tsx
      Sync.tsx
      Invoices.tsx
      Marketing.tsx
      Alerts.tsx
      IntegrationKit.tsx
  supabase/
    migrations/
    functions/
      send-sms/
      sms-webhook/
      verify-api-key/
      send-low-balance-alerts/
      sync-users/
      sync-packages/
      upload-integration-kit/
      recharge-webhook/
      request-recharge/
      query-recharge/
      sync-recharge-status/
      notify-balance-update/
      platform-api-users/
      platform-api-recharges/
      platform-notify-webhook/
      create-admin/
```

## 4. Framework actual usado

| Proyecto | Framework UI actual | Build tool | Lenguaje | Router | Estilos | Backend actual |
|---|---|---|---|---|---|---|
| `sms` | React 18 | Vite | TypeScript | `react-router-dom` | Tailwind CSS | Supabase + Edge Functions |
| `backoffice` | React 18 | Vite | TypeScript | estado interno en `App.tsx`, sin router URL real | Tailwind CSS | Supabase + Edge Functions |

## 5. Rutas y paginas principales de `sms`

Las rutas salen de `sms/src/App.tsx`.

| Ruta | Pagina React actual | Tipo | Observacion para Angular |
|---|---|---|---|
| `/` | `Landing` | publica | migrar como `public/landing` |
| `/about` | `About` | publica | pagina informativa |
| `/privacy` | `Privacy` | publica/legal | pagina legal |
| `/terms` | `Terms` | publica/legal | pagina legal |
| `/blog` | `Blog` | publica | depende de tablas blog |
| `/blog/:slug` | `BlogPost` | publica | usa RPC `increment_blog_post_views` |
| `/login` | `Login` | auth | login cliente |
| `/register` | `Register` | auth | registro cliente, contiene datos empresa/RUC |
| `/dashboard` | `Dashboard` | privada | requiere `ProtectedRoute` |
| `/dashboard/send` | `SendSMS` | privada | envio individual, multiple y archivo |
| `/dashboard/history` | `History` | privada | historial mensajes |
| `/dashboard/analytics` | `Analytics` | privada | metricas/graficos |
| `/dashboard/templates` | `Templates` | privada | CRUD plantillas |
| `/dashboard/api-keys` | `ApiKeys` | privada | API keys cliente |
| `/dashboard/recharges` | `Recharges` | privada | recargas cliente |
| `/admin` | `AdminDashboard` | admin | usa `AdminProtectedRoute` |
| `/admin/users` | `AdminUsers` | admin | usuarios |
| `/admin/recharges` | `AdminRecharges` | admin | recargas |
| `/admin/messages` | `AdminMessages` | admin | mensajes |
| `/admin/stats` | `AdminStats` | admin | estadisticas |
| `/admin/blog` | `AdminBlog` | admin | gestion blog |
| `/admin/blog/new` | `AdminBlogEditor` | admin | editor blog |
| `/admin/blog/edit/:id` | `AdminBlogEditor` | admin | editor blog |
| `/super-admin/login` | `SuperAdminLogin` | super admin | login separado |
| `/super-admin/dashboard` | `SuperAdminDashboard` | super admin | dashboard |
| `/super-admin/recharges` | `SuperAdminRecharges` | super admin | recargas |
| `/super-admin/users` | `SuperAdminUsers` | super admin | usuarios |

## 6. Rutas y paginas principales de `backoffice`

`backoffice` no usa `react-router-dom`. Usa `currentPage` en `App.tsx` y cambia pantallas desde `Layout.tsx`.

| Page key | Pagina React actual | Nombre visible | Observacion para Angular |
|---|---|---|---|
| `dashboard` | `Dashboard` | Dashboard | conviene ruta Angular `/dashboard` |
| `users` | `Users` | Usuarios | `/users` |
| `recharges` | `Recharges` | Recargas | `/recharges` |
| `clients` | `Clients` | Cuentas | `/clients` |
| `messages` | `Messages` | Mensajes | `/messages` |
| `api-keys` | `ApiKeys` | API Keys | `/api-keys` |
| `alerts` | `Alerts` | Alertas SMS | `/alerts` |
| `invoices` | `Invoices` | Facturas | `/invoices` |
| `marketing` | `Marketing` | Marketing | `/marketing` |
| `sync` | `Sync` | Sincronizacion | `/sync` |
| `integration-kit` | `IntegrationKit` | Kit Integracion | `/integration-kit` |
| sin page key | `Login` | Login | `/login` |

Recomendacion de migracion: implementar routing real Angular para backoffice. Esto mejora refresh, URL directa, navegacion, permisos y deep links.

## 7. Dependencias importantes

### 7.1 `sms`

Dependencias principales:

| Dependencia | Uso actual | Equivalente / decision Angular |
|---|---|---|
| `react`, `react-dom` | UI actual | reemplazar por Angular |
| `react-router-dom` | rutas SPA | Angular Router |
| `@supabase/supabase-js` | Auth, DB, Edge Functions | mantener en Angular service o mover a backend |
| `lucide-react` | iconos | `lucide-angular`, Angular Material Icons o Heroicons |
| `recharts` | graficos analytics | `ng2-charts`, `ngx-echarts` o ApexCharts Angular |
| `xlsx` | carga/descarga Excel | mantener `xlsx` en Angular o mover parsing al backend |
| `tailwindcss` | estilos | puede mantenerse con Angular |
| `vite` | build React | Angular CLI/Vite interno de Angular segun version |

### 7.2 `backoffice`

Dependencias principales:

| Dependencia | Uso actual | Equivalente / decision Angular |
|---|---|---|
| `react`, `react-dom` | UI actual | reemplazar por Angular |
| `@supabase/supabase-js` | Auth, DB, RPC, Functions | mantener en Angular services o mover a backend |
| `lucide-react` | iconos | `lucide-angular`, Angular Material Icons o Heroicons |
| `tailwindcss` | estilos | puede mantenerse con Angular |
| `vite` | build React | Angular CLI/Vite interno de Angular segun version |

## 8. Conexiones a Supabase

### 8.1 `sms`

Archivo: `sms/src/lib/supabase.ts`

- Usa `createClient` desde `@supabase/supabase-js`.
- Lee:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Proyecto Supabase detectado en `.env`:
  - `https://pkoshvsjqyrokeltejjg.supabase.co`
- Tambien existe en `.env`:
  - `SMR_API_KEY`
  - `SMR_API_SECRET`

Nota importante: hay secretos y claves en archivos `.env` dentro del repositorio. Antes de migrar a Angular o desplegar, se deben rotar y mover a gestor de secretos.

### 8.2 `backoffice`

Archivo: `backoffice/src/lib/supabase.ts`

- Usa `createClient<Database>`.
- Lee:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Proyecto Supabase detectado en `.env`:
  - `https://ibkjdaurgesxqavlgcsr.supabase.co`

Observacion importante: `sms` y `backoffice` apuntan a proyectos Supabase distintos. Para Angular se debe decidir si se mantienen separados temporalmente o si se consolida un backend/API comun.

## 9. Edge Functions detectadas

### 9.1 Edge Functions en `sms`

| Funcion | Ruta local | Uso detectado / proposito |
|---|---|---|
| `send-sms` | `sms/supabase/functions/send-sms/index.ts` | envio SMS contra proveedor SMR |
| `notify-backoffice` | `sms/supabase/functions/notify-backoffice/index.ts` | notificar recargas a backoffice |
| `sync-user-backoffice` | `sms/supabase/functions/sync-user-backoffice/index.ts` | sincronizar usuario nuevo con backoffice |
| `recharge-webhook` | `sms/supabase/functions/recharge-webhook/index.ts` | recibir eventos de recarga |
| `balance-update` | `sms/supabase/functions/balance-update/index.ts` | actualizacion de saldo/balance |

### 9.2 Edge Functions en `backoffice`

| Funcion | Ruta local | Uso detectado / proposito |
|---|---|---|
| `send-sms` | `backoffice/supabase/functions/send-sms/index.ts` | envio SMS desde backoffice/proveedor |
| `sms-webhook` | `backoffice/supabase/functions/sms-webhook/index.ts` | webhooks de entrega SMS |
| `verify-api-key` | `backoffice/supabase/functions/verify-api-key/index.ts` | validacion API key |
| `send-low-balance-alerts` | `backoffice/supabase/functions/send-low-balance-alerts/index.ts` | alertas saldo bajo |
| `sync-users` | `backoffice/supabase/functions/sync-users/index.ts` | sincronizacion usuarios Corporate API |
| `sync-packages` | `backoffice/supabase/functions/sync-packages/index.ts` | sincronizacion paquetes Corporate API |
| `upload-integration-kit` | `backoffice/supabase/functions/upload-integration-kit/index.ts` | listar/subir kit integracion |
| `recharge-webhook` | `backoffice/supabase/functions/recharge-webhook/index.ts` | webhook recargas |
| `request-recharge` | `backoffice/supabase/functions/request-recharge/index.ts` | solicitud recarga |
| `query-recharge` | `backoffice/supabase/functions/query-recharge/index.ts` | consulta recarga |
| `sync-recharge-status` | `backoffice/supabase/functions/sync-recharge-status/index.ts` | sync estado recarga |
| `notify-balance-update` | `backoffice/supabase/functions/notify-balance-update/index.ts` | notificar cambios de balance |
| `platform-api-users` | `backoffice/supabase/functions/platform-api-users/index.ts` | API plataforma usuarios |
| `platform-api-recharges` | `backoffice/supabase/functions/platform-api-recharges/index.ts` | API plataforma recargas |
| `platform-notify-webhook` | `backoffice/supabase/functions/platform-notify-webhook/index.ts` | notificaciones plataforma |
| `create-admin` | `backoffice/supabase/functions/create-admin/index.ts` | crear administradores |

## 10. Tablas y entidades principales detectadas

### 10.1 Entidades `sms`

Tablas detectadas en migraciones:

| Tabla | Proposito |
|---|---|
| `profiles` | perfil usuario, datos empresa, rol, creditos |
| `recharges` | recargas cliente |
| `campaigns` | campanas SMS |
| `sms_messages` | mensajes enviados/fallidos |
| `templates` | plantillas de SMS |
| `api_keys` | claves API cliente |
| `blog_categories` | categorias blog |
| `blog_posts` | posts blog |
| `webhook_config` | configuracion webhooks |
| `webhook_logs` | logs webhooks |

Campos relevantes agregados a `profiles`:

- `role`
- `is_active`
- `email`
- `razon_social`
- `ruc`

### 10.2 Entidades `backoffice`

Tablas detectadas en migraciones:

| Tabla | Proposito |
|---|---|
| `users` | clientes/usuarios administrados |
| `admins` | administradores backoffice |
| `sms_packages` | paquetes SMS |
| `recharges` | recargas operativas |
| `sms_inventory` | inventario SMS |
| `inventory_purchases` | compras de inventario |
| `inventory_transactions` | movimientos de inventario |
| `api_keys` | claves API gestionadas desde backoffice |
| `sms_messages` | mensajes del sistema |
| `sms_delivery_webhooks` | webhooks entrega SMS |
| `sms_quotas` | cuotas SMS |
| `provider_config` | config proveedor SMS |
| `sms_provider_config` | config proveedor SMS adicional |
| `platform_sync_config` | configuracion sync Corporate API |
| `sync_logs` | logs sincronizacion |
| `external_package_mapping` | mapeo paquetes externos |
| `external_recharge_mapping` | mapeo recargas externas |
| `recharge_status_events` | eventos de estado recarga |
| `low_balance_config` | config alertas saldo bajo |
| `low_balance_alerts` | historial alertas saldo bajo |
| `integration_api_keys` | credenciales integracion plataforma |
| `integration_webhooks` | webhooks integracion |
| `integration_logs` | logs integracion |

## 11. Flujos criticos detectados

### 11.1 Registro

Proyecto principal: `sms`

Archivos:

- `sms/src/pages/Register.tsx`
- `sms/src/contexts/AuthContext.tsx`
- `sms/supabase/functions/sync-user-backoffice/index.ts`
- migraciones `profiles` y trigger `handle_new_user`

Flujo actual:

1. Usuario llena formulario con nombre, razon social, RUC, telefono, correo y password.
2. `signUp()` usa `supabase.auth.signUp`.
3. Luego frontend inserta manualmente en `profiles`.
4. Luego llama Edge Function `sync-user-backoffice`.

Riesgo para Angular:

- No migrar tal cual sin revisar duplicidad de perfil.
- Conviene crear `AuthService`, `RegisterFacade` y `CompanyValidationService`.
- Validacion RUC debe quedar en service/backend, no solo formulario.

### 11.2 Login

Proyectos:

- `sms`
- `backoffice`

Archivos:

- `sms/src/pages/Login.tsx`
- `sms/src/contexts/AuthContext.tsx`
- `backoffice/src/components/Login.tsx`
- `backoffice/src/contexts/AuthContext.tsx`

Flujo actual:

- `sms`: login con `supabase.auth.signInWithPassword`, luego carga `profiles`.
- `backoffice`: login con `supabase.auth.signInWithPassword`, luego valida que usuario exista en tabla `admins`.

Riesgo para Angular:

- Crear guards separados:
  - `AuthGuard`
  - `AdminGuard`
  - `GuestGuard`
- Centralizar sesion en `AuthStore` o service con Signals/RxJS.

### 11.3 Recuperacion de contraseña

Proyecto principal: `sms`

Estado detectado:

- En `sms/src/pages/Login.tsx`, enlace "Olvidaste tu contrasena" usa `href="#"`.
- No se detecta pagina/ruta real de recuperacion.

Recomendacion Angular:

- Crear rutas:
  - `/forgot-password`
  - `/reset-password`
- Crear `PasswordRecoveryComponent`.
- Usar `supabase.auth.resetPasswordForEmail` o endpoint backend.

### 11.4 Envio SMS

Proyecto principal: `sms`

Archivos:

- `sms/src/pages/SendSMS.tsx`
- `sms/supabase/functions/send-sms/index.ts`
- tabla `sms_messages`
- tabla `campaigns`

Flujo actual:

1. Usuario selecciona modo individual, multiple o fichero.
2. Frontend calcula costo.
3. Frontend llama `functions/v1/send-sms`.
4. Frontend inserta registros en `sms_messages`.
5. Frontend actualiza `profiles.credits` y `profiles.total_spent`.

Riesgo para Angular:

- No trasladar descuento de saldo al componente Angular.
- En Angular debe quedar solo UI + llamada a servicio.
- Logica de envio/costo/debito debe ir a backend o service server-side.

### 11.5 Consumo de creditos

Proyecto principal: `sms`

Archivos:

- `sms/src/pages/SendSMS.tsx`
- `sms/src/pages/Recharges.tsx`
- `sms/src/lib/supabase.ts`
- tabla `profiles`

Estado actual:

- `credits` vive en `profiles`.
- UI lo presenta como creditos/SMS.
- En envio se descuenta `totalCost` calculado en frontend.

Riesgo para Angular:

- Crear modelo claro `Balance`, `CreditLedger` o `Wallet`.
- Evitar calculo definitivo en frontend.
- En Angular solo mostrar estimado y resultado final recibido del servidor.

### 11.6 API Keys

Proyectos:

- `sms`
- `backoffice`

Archivos:

- `sms/src/pages/ApiKeys.tsx`
- `backoffice/src/pages/ApiKeys.tsx`
- `backoffice/supabase/functions/verify-api-key/index.ts`
- tablas `api_keys`, `integration_api_keys`

Flujo actual:

- `sms`: genera API key en frontend con prefijo `fsk_` y guarda en tabla `api_keys`.
- `backoffice`: genera API key con prefijo `sk_`, gestiona estado y expiracion.
- `verify-api-key` valida keys desde backoffice.

Riesgo para Angular:

- Unificar contrato de API keys.
- No generar keys en browser.
- Crear `ApiKeysService`.
- Definir modelo unico para cliente/admin.

### 11.7 Recargas

Proyectos:

- `sms`
- `backoffice`

Archivos:

- `sms/src/pages/Recharges.tsx`
- `sms/supabase/functions/notify-backoffice/index.ts`
- `backoffice/src/pages/Recharges.tsx`
- Edge Functions de recarga en ambos proyectos.

Flujo actual `sms`:

1. Usuario selecciona paquete fijo.
2. Inserta recarga en tabla `recharges`.
3. Llama `notify-backoffice`.
4. Muestra alerta para enviar constancia por WhatsApp.

Flujo actual `backoffice`:

- Admin crea/aprueba/rechaza recargas.
- Usa inventario SMS y RPC `deduct_sms_from_inventory`.

Riesgo para Angular:

- Separar `RechargeService` cliente y `AdminRechargeService`.
- Definir estado unico de recarga.
- Evitar notificaciones silenciosas entre apps.

### 11.8 Sincronizacion backoffice

Proyecto principal: `backoffice`

Archivos:

- `backoffice/src/pages/Sync.tsx`
- `backoffice/supabase/functions/sync-users/index.ts`
- `backoffice/supabase/functions/sync-packages/index.ts`
- tablas `platform_sync_config`, `sync_logs`, `external_package_mapping`

Flujo actual:

- Pantalla carga estado con RPC `get_sync_status`.
- Botones llaman Edge Functions `sync-users` y `sync-packages`.
- Configuracion se guarda en tabla `platform_sync_config`.

Recomendacion Angular:

- Crear modulo `sync`.
- Crear `SyncService`.
- Crear modelos `SyncConfig`, `SyncLog`, `SyncStats`.
- Usar rutas reales:
  - `/sync`
  - `/sync/config`
  - `/sync/logs`

### 11.9 Alertas SMS

Proyecto principal: `backoffice`

Archivos:

- `backoffice/src/pages/Alerts.tsx`
- `backoffice/supabase/functions/send-low-balance-alerts/index.ts`
- tablas/RPC:
  - `low_balance_config`
  - `low_balance_alerts`
  - `get_low_balance_config`
  - `get_alert_statistics`
  - `get_recent_alerts`
  - `update_low_balance_config`

Flujo actual:

- UI carga configuracion y estadisticas por RPC.
- Admin puede modificar configuracion.
- Boton envia alertas llamando Edge Function.

Recomendacion Angular:

- Crear modulo `alerts`.
- Crear `AlertsService`.
- Separar configuracion, historial y ejecucion manual.
- Normalizar errores visibles.

### 11.10 Kit de integracion

Proyecto principal: `backoffice`

Archivos:

- `backoffice/src/pages/IntegrationKit.tsx`
- `backoffice/supabase/functions/upload-integration-kit/index.ts`
- migracion `create_integration_kits_storage.sql`

Flujo actual:

- Lista archivos llamando Edge Function `upload-integration-kit` con `GET`.
- Sube ZIP llamando misma funcion con `POST`.
- Muestra URL publica de storage.

Recomendacion Angular:

- Crear modulo `integration-kit`.
- Crear `IntegrationKitService`.
- Implementar upload con progreso.
- Diferenciar error real vs lista vacia.
- Preferir signed URLs si se endurece seguridad.

## 12. Observaciones tecnicas relevantes para migracion

### 12.1 Dos apps, dos Supabase

`sms` y `backoffice` apuntan a proyectos Supabase distintos. La migracion Angular debe decidir:

1. Mantener dos conexiones temporalmente.
2. Crear backend/API puente.
3. Consolidar modelo de datos en fase posterior.

Para migracion visual rapida, opcion 1 es viable. Para produccion estable, opcion 2 o 3 es mejor.

### 12.2 Logica de negocio en frontend

Detectado en `sms`:

- creacion manual de perfiles;
- calculo de costo SMS;
- insercion de mensajes;
- descuento de creditos;
- generacion de API keys;
- creacion de recargas.

En Angular se debe evitar repetir este patron cuando haya backend disponible.

### 12.3 Backoffice sin routing real

`backoffice` usa estado local `currentPage`, no rutas URL. En Angular conviene migrar directamente a Angular Router.

### 12.4 Edge Functions como dependencia fuerte

Varias pantallas dependen de `functions/v1`. En Angular deben encapsularse en services, no llamarse directo desde componentes.

### 12.5 Tipos y entidades duplicadas

Hay modelos parecidos con nombres distintos:

- `sms.profiles` vs `backoffice.users`
- `sms.api_keys` vs `backoffice.api_keys` vs `integration_api_keys`
- `sms.recharges` vs `backoffice.recharges`
- `sms.sms_messages` vs `backoffice.sms_messages`

Para Angular conviene crear modelos separados inicialmente y documentar mapping.

## 13. Propuesta de estructura Angular recomendada

### 13.1 Opcion recomendada: monorepo Angular con dos apps

```text
angular-workspace/
  angular.json
  package.json
  tsconfig.base.json
  apps/
    sms/
      src/
        app/
          app.routes.ts
          app.config.ts
          core/
          shared/
          features/
    backoffice/
      src/
        app/
          app.routes.ts
          app.config.ts
          core/
          shared/
          features/
  libs/
    core/
      auth/
      supabase/
      http/
      models/
      utils/
    ui/
      components/
      layout/
      forms/
    domain/
      sms/
      recharges/
      api-keys/
      users/
      sync/
      alerts/
      integration-kit/
```

Ventaja:

- comparte modelos, services y UI base;
- mantiene despliegues separados;
- permite migrar `sms` y `backoffice` por fases;
- facilita guards, interceptors y tipado comun.

### 13.2 Estructura Angular para app `sms`

```text
apps/sms/src/app/
  app.routes.ts
  core/
    auth/
      auth.service.ts
      auth.store.ts
      auth.guard.ts
      admin.guard.ts
    supabase/
      supabase.client.ts
    config/
      environment.tokens.ts
  shared/
    components/
      footer/
      header/
      loading-state/
      error-state/
    pipes/
    validators/
  layout/
    dashboard-layout/
    admin-layout/
    super-admin-layout/
  features/
    public/
      landing/
      about/
      privacy/
      terms/
      blog/
      blog-post/
    auth/
      login/
      register/
      forgot-password/
      reset-password/
    dashboard/
      dashboard-home/
      send-sms/
      history/
      analytics/
      templates/
      api-keys/
      recharges/
    admin/
      dashboard/
      users/
      recharges/
      messages/
      stats/
      blog/
      blog-editor/
    super-admin/
      login/
      dashboard/
      recharges/
      users/
```

### 13.3 Estructura Angular para app `backoffice`

```text
apps/backoffice/src/app/
  app.routes.ts
  core/
    auth/
      admin-auth.service.ts
      admin-auth.guard.ts
    supabase/
      supabase.client.ts
    layout/
      shell.component.ts
  shared/
    components/
      data-table/
      status-badge/
      confirm-dialog/
      empty-state/
      error-state/
    pipes/
      currency-pe.pipe.ts
      date-pe.pipe.ts
  features/
    auth/
      login/
    dashboard/
    users/
    recharges/
    clients/
    messages/
    api-keys/
    alerts/
    invoices/
    marketing/
    sync/
      sync-home/
      sync-config/
      sync-logs/
    integration-kit/
```

### 13.4 Librerias compartidas recomendadas

```text
libs/core/
  supabase/
    supabase-client.factory.ts
    supabase-token.service.ts
  auth/
    session.model.ts
    role.model.ts
  models/
    profile.model.ts
    user.model.ts
    recharge.model.ts
    sms-message.model.ts
    campaign.model.ts
    api-key.model.ts
    sync.model.ts
    alert.model.ts
  utils/
    format-number.ts
    phone-normalizer.ts
    validators.ts

libs/domain/
  sms/
    sms.service.ts
    sms-cost.service.ts
  recharges/
    recharge.service.ts
    admin-recharge.service.ts
  api-keys/
    api-keys.service.ts
  sync/
    sync.service.ts
  alerts/
    alerts.service.ts
  integration-kit/
    integration-kit.service.ts

libs/ui/
  components/
    page-header/
    sidebar/
    metric-card/
    data-table/
    modal/
    form-field/
    file-upload/
```

## 14. Mapeo React a Angular sugerido

| React actual | Angular recomendado |
|---|---|
| `AuthContext` | `AuthService` + `AuthStore` con Signals/RxJS |
| `ProtectedRoute` | `CanActivateFn` guard |
| `AdminProtectedRoute` | `AdminGuard` |
| `DashboardLayout` | layout component con `router-outlet` |
| `Layout` backoffice con `currentPage` | Angular shell + rutas hijas |
| `useState/useEffect` | component state + Signals/RxJS |
| llamadas `supabase.from` en componente | services Angular |
| llamadas `fetch(functions/v1)` en componente | services Angular con `HttpClient` |
| `react-router-dom` | Angular Router |
| `recharts` | `ng2-charts`, `ngx-echarts` o ApexCharts |
| `lucide-react` | `lucide-angular` o icon set Angular |

## 15. Orden de migracion recomendado

### Fase 0: Preparacion

- Crear workspace Angular.
- Definir si sera monorepo con dos apps.
- Configurar Tailwind.
- Configurar environments por app.
- Crear clientes Supabase separados.
- Crear modelos TypeScript base.

### Fase 1: Auth y layout

- Migrar login `sms`.
- Migrar login `backoffice`.
- Implementar guards.
- Migrar layouts principales.
- Crear rutas Angular reales.

### Fase 2: Pantallas publicas `sms`

- Landing.
- About.
- Privacy.
- Terms.
- Blog.
- Blog post.

### Fase 3: Dashboard cliente `sms`

- Dashboard.
- Send SMS.
- History.
- Analytics.
- Templates.
- API Keys.
- Recharges.

### Fase 4: Backoffice operativo

- Dashboard.
- Users.
- Recharges.
- Clients.
- Messages.
- API Keys.
- Invoices.
- Marketing.

### Fase 5: Integraciones complejas

- Sync.
- Alerts.
- Integration Kit.
- Edge Functions wrappers.
- Manejo de errores reales.

### Fase 6: QA y cierre

- Pruebas de rutas.
- Pruebas de auth.
- Pruebas de formularios.
- Pruebas de flujos criticos.
- Comparacion React vs Angular.
- Smoke test contra Supabase/Edge Functions.

## 16. Riesgos principales para la migracion Angular

| Riesgo | Impacto | Recomendacion |
|---|---|---|
| Migrar logica defectuosa tal cual | se conservan bugs actuales | migrar por dominio, no por archivo |
| Dos proyectos Supabase | duplicidad de modelos y auth | encapsular cada conexion en service separado |
| Backoffice sin rutas reales | refresh/deep links no existen | crear router Angular desde inicio |
| Logica critica en componentes | deuda se replica en Angular | mover a services y luego backend |
| API keys generadas en frontend | riesgo seguridad | aislar en service y planificar backend |
| Credenciales en `.env` versionado | riesgo seguridad | rotar y sacar secretos del repo |
| Edge Functions con errores actuales | flujos seguiran fallando | documentar contratos y errores antes de migrar |
| Tablas duplicadas `profiles/users` | mapeo confuso | crear modelos separados y mapping explicito |

## 17. Checklist previo a iniciar migracion

- Confirmar version Angular objetivo.
- Confirmar si sera monorepo con dos apps.
- Confirmar estrategia Tailwind/Angular Material/componentes propios.
- Definir si Supabase se consumira directo desde Angular en fase inicial.
- Rotar secretos expuestos.
- Documentar contratos de Edge Functions.
- Congelar rutas actuales como baseline.
- Crear inventario de componentes React reutilizables como referencia visual.
- Definir prioridad: `sms` primero o `backoffice` primero.
- Preparar QA comparativo React vs Angular.

## 18. Recomendacion final

Recomendacion tecnica inicial:

1. Crear workspace Angular monorepo con dos apps: `sms` y `backoffice`.
2. Mantener Tailwind para acelerar paridad visual.
3. Migrar primero auth, routing y layouts.
4. Encapsular Supabase y Edge Functions en services Angular.
5. No copiar logica critica de componentes React sin revisar.
6. Migrar `sms` dashboard y backoffice por modulos.
7. Mantener documentado cada flujo critico con su tabla, RPC o Edge Function usada.
8. Planificar una segunda fase para sacar logica transaccional sensible a backend/API.

La migracion a Angular es viable, pero debe hacerse como migracion funcional por dominios, no como conversion mecanica de JSX a templates Angular. El punto mas importante es no arrastrar problemas actuales de saldo, API keys, recargas, sincronizacion y errores silenciosos hacia la nueva base Angular.
