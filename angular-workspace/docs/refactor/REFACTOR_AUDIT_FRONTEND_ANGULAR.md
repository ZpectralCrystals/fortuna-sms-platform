# Auditoría Senior Frontend Angular - Fortuna SMS

## 1. Resumen ejecutivo

La migración visual React/Vite -> Angular está completa y compila. El workspace tiene dos apps Angular standalone (`sms-client` y `backoffice-admin`) y una librería local `shared`.

El proyecto es refactorizable, pero requiere refactor gradual. El estado actual prioriza fidelidad visual sobre arquitectura: casi todos los componentes usan `template` y `styles` inline dentro del `.ts`, muchas páginas superan 600-1500 líneas, hay lógica de datos mezclada con UI, SVGs inline repetidos, helpers duplicados y servicios compartidos en su mayoría stub.

No hay bloqueadores de build. Sí hay riesgos altos antes de producción: escrituras directas desde frontend en algunas páginas del cliente, acceso Supabase repartido en componentes, dependencia de tablas no definitivas y poca separación entre capa visual, estado y datos.

Recomendación central: no refactorizar todo junto. Primero extraer layout/base visual y componentes compartidos pequeños, luego página por página, siempre con build y comparación visual.

## 2. Estado actual del workspace

### Workspace

- Ruta: `angular-workspace/`.
- Angular: `@angular/* 18.2.13`.
- Apps:
  - `projects/sms-client`
  - `projects/backoffice-admin`
- Librería local:
  - `projects/shared`
- Alias TS:
  - `@sms-fortuna/shared` -> `projects/shared/src/public-api.ts`
- `strict: true` y `strictTemplates: true` activos en `tsconfig.json`.
- No existe script de lint en `package.json`.
- Build verificado:
  - `npm run build`: OK.
  - `ng build sms-client`: OK.
  - `ng build backoffice-admin`: OK.
- Observación build:
  - Node `v25.9.0` muestra warning por versión impar, no bloquea.

### sms-client

Rutas públicas:

- `/`
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/about`
- `/blog`
- `/blog/:slug`
- `/privacy`
- `/terms`

Rutas privadas bajo `/dashboard` con `ClientAuthGuard`:

- `/dashboard`
- `/dashboard/send`
- `/dashboard/history`
- `/dashboard/analytics`
- `/dashboard/templates`
- `/dashboard/api-keys`
- `/dashboard/recharges`

Observaciones:

- Páginas públicas y dashboard ya están migradas visualmente.
- Varias páginas del dashboard sí leen Supabase.
- Algunas páginas hacen escrituras directas desde frontend.
- Layout `dashboard-layout.component.ts` lee `profiles` para balance.
- Muchos componentes contienen HTML + CSS + TS en un solo archivo.

### backoffice-admin

Rutas:

- `/login`
- `/dashboard`
- `/users`
- `/recharges`
- `/accounts`
- `/messages`
- `/api-keys`
- `/alerts`
- `/invoices`
- `/marketing`
- `/sync`
- `/integration-kit`

Protección:

- Todas las rutas internas pasan por `AdminGuard`.
- `AdminGuard` usa `AuthService.isAdmin()`.

Observaciones:

- La migración visual del backoffice está completa.
- Varias páginas recientes están en modo visual seguro, sin backend real.
- `dashboard`, `accounts`, `users`, `recharges` todavía contienen lecturas/RPCs reales o intentos seguros de lectura.
- `recharges` aún referencia tablas que no existen en Supabase dev actual (`users`, `sms_packages`, `sms_inventory`, `recharges`).

## 3. Hallazgos por severidad

### Críticos

#### 1. Escrituras directas desde frontend en `sms-client`

- Problema: algunas rutas cliente todavía hacen operaciones `insert`, `update` o `delete` directamente contra Supabase.
- Evidencia / archivo afectado:
  - `angular-workspace/projects/sms-client/src/app/dashboard/pages/templates-page.component.ts`
    - `.from('templates').insert(...)`
    - `.from('templates').update(...)`
    - `.from('templates').delete()`
  - `angular-workspace/projects/sms-client/src/app/dashboard/pages/api-keys-page.component.ts`
    - lee `api_keys.key` desde frontend.
    - copia API key con `navigator.clipboard.writeText(apiKey.key)`.
- Riesgo: bypass de reglas de negocio, exposición de secretos, dependencia excesiva de RLS, difícil auditoría.
- Recomendación: congelar escrituras críticas. Mover creación/revocación de API keys y mutación de plantillas a backend/RPC/Edge Function segura antes de producción.

#### 2. API keys visibles en navegador cliente

- Problema: `sms-client` lee columna `key` de `api_keys` y permite copiarla.
- Evidencia / archivo afectado:
  - `angular-workspace/projects/sms-client/src/app/dashboard/pages/api-keys-page.component.ts`
  - `select('id, user_id, name, key, is_active, created_at, last_used_at')`
  - `navigator.clipboard.writeText(apiKey.key)`
- Riesgo: exposición de claves reales en frontend; si se guardan en texto plano, riesgo severo.
- Recomendación: no exponer API keys completas. Usar `keyPreview`, hash backend y secreto visible solo al crear.

#### 3. Componentes gigantes dificultan refactor seguro

- Problema: demasiadas responsabilidades por archivo.
- Evidencia / archivo afectado:
  - `sms-client/src/app/public/home-page.component.ts`: 1587 líneas.
  - `sms-client/src/app/dashboard/pages/recharges-page.component.ts`: 1474 líneas.
  - `backoffice-admin/src/app/pages/recharges-page.component.ts`: 1344 líneas.
  - `backoffice-admin/src/app/pages/dashboard-page.component.ts`: 1320 líneas.
  - `sms-client/src/app/dashboard/pages/send-sms-page.component.ts`: 1151 líneas.
- Riesgo: cambios pequeños rompen diseño o lógica; difícil review; duplicación crece.
- Recomendación: extraer por fases: layout, primitives visuales, luego formularios/tablas/modales por página.

### Altos

#### 4. HTML, CSS y TypeScript están mezclados

- Problema: componentes usan `template: \`` y `styles: [\`` extensos dentro del `.ts`.
- Evidencia / archivo afectado:
  - No existen `.html`, `.scss` o `.css` por componente; solo `src/styles.css` global por app.
  - Ejemplos: `admin-layout.component.ts`, `dashboard-layout.component.ts`, todas las páginas grandes.
- Riesgo: refactor visual difícil, alto conflicto de merge, test visual más costoso.
- Recomendación: extraer primero componentes compartidos con templates propios; luego mover gradualmente HTML/CSS de páginas grandes, una página por PR.

#### 5. Servicios shared son mayormente stubs

- Problema: capa `shared/services` existe pero no concentra lógica real.
- Evidencia / archivo afectado:
  - `api-keys.service.ts`: TODO y retorna `[]`/`null`.
  - `backoffice.service.ts`: TODO y retorna `null`.
  - `credits.service.ts`: TODO y retorna `0`.
  - `recharges.service.ts`: TODO y retorna `[]`/`null`.
  - `sms.service.ts`: TODO y `Not implemented`.
- Riesgo: componentes acceden directo a Supabase; contratos de datos duplicados; lógica no testeable.
- Recomendación: en Fase 5 crear servicios reales por dominio y dejar páginas como presentacionales/containers.

#### 6. Uso inconsistente del paquete shared

- Problema: algunas imports usan alias y otras rutas relativas hacia `shared`.
- Evidencia / archivo afectado:
  - Alias: `import { AuthService } from '@sms-fortuna/shared'`.
  - Relativo: `../../../../shared/src/lib/services/auth.service`.
  - `main.ts` de ambas apps importa `SupabaseService` con ruta relativa.
- Riesgo: acoplamiento al layout físico del repo; refactor de librería más frágil.
- Recomendación: normalizar a `@sms-fortuna/shared` después de estabilizar layout, sin tocar comportamiento.

#### 7. Tipos locales duplicados y `any`

- Problema: interfaces viven dentro de páginas y se usan casts a `any`.
- Evidencia / archivo afectado:
  - `backoffice-admin/src/app/pages/accounts-page.component.ts`: `profile: any`, `admin: any`.
  - `backoffice-admin/src/app/pages/dashboard-page.component.ts`: `const statsData = data as any`.
  - `backoffice-admin/src/app/pages/recharges-page.component.ts`: `user: any`, `packageOption: any`, `recharge: any`.
- Riesgo: errores de esquema no detectados por TypeScript; cambios Supabase rompen en runtime.
- Recomendación: crear `models/backoffice/*` y `models/client/*`; mapear respuestas Supabase con adapters tolerantes.

#### 8. Backoffice mezcla pantallas visuales seguras con pantallas conectadas parcialmente

- Problema: algunas páginas tienen backend bloqueado, otras leen RPC/tablas reales, y otras leen tablas no existentes.
- Evidencia / archivo afectado:
  - Visual seguras: `messages`, `api-keys`, `alerts`, `invoices`, `marketing`, `sync`, `integration-kit`.
  - Conectadas/parciales: `dashboard`, `accounts`, `users`, `recharges`.
  - `recharges` lee `users`, `sms_packages`, `sms_inventory`, `recharges`.
- Riesgo: QA confuso; comportamiento distinto por página; falsa sensación de producción lista.
- Recomendación: documentar estado por página y crear capa `BackofficeDataFacade` con flags/contratos claros.

### Medios

#### 9. Estados loading/error/empty repetidos

- Problema: cada página implementa su propio spinner, empty-state, error-state.
- Evidencia / archivo afectado:
  - `loading-state`, `spinner`, `empty-state`, `empty-icon`, `modal-backdrop` aparecen en múltiples páginas.
- Riesgo: inconsistencias visuales; refactor rompe 1:1 si no hay primitives.
- Recomendación: crear `LoadingStateComponent`, `EmptyStateComponent`, `AlertMessageComponent`, `ModalShellComponent`.

#### 10. Helpers de formato duplicados

- Problema: `formatNumber`, `formatCurrency`, `formatDate` se repiten por página aunque existen helpers en `shared`.
- Evidencia / archivo afectado:
  - `accounts-page.component.ts`
  - `dashboard-page.component.ts`
  - `recharges-page.component.ts`
  - `invoices-page.component.ts`
  - `alerts-page.component.ts`
  - `marketing-page.component.ts`
  - `dashboard-overview-page.component.ts`
  - `sms-client/recharges-page.component.ts`
- Riesgo: formatos inconsistentes (`es-PE`, `es-ES`, `S/` manual vs `Intl`).
- Recomendación: ampliar `shared/helpers/format.helper.ts` con moneda, número, fecha corta/larga; migrar usos gradualmente.

#### 11. Iconos SVG inline repetidos

- Problema: cada página copia SVGs lucide inline.
- Evidencia / archivo afectado:
  - Backoffice completo: layout, dashboard, recharges, api-keys, alerts, invoices, marketing, sync, integration-kit.
- Riesgo: peso de código, inconsistencias de tamaño/stroke, difícil cambiar icono global.
- Recomendación: crear `AppIconComponent` con `name`, `size`, `className` o directiva interna. Mantener SVG paths exactos.

#### 12. Layouts duplican patrones entre apps

- Problema: `DashboardLayoutComponent` y `AdminLayoutComponent` resuelven sidebar, mobile menu, topbar, logout y datos de usuario de forma separada.
- Evidencia / archivo afectado:
  - `sms-client/src/app/layouts/dashboard-layout.component.ts`: 672 líneas.
  - `backoffice-admin/src/app/layouts/admin-layout.component.ts`: 720 líneas.
- Riesgo: fixes de navegación/logout deben duplicarse.
- Recomendación: no unificar visual aún. Primero extraer helpers de navegación/logout y primitives (`SidebarShell`, `TopbarShell`) si no rompen diseño.

#### 13. Modelos shared no representan esquema real actual

- Problema: `UserProfile` usa `companyName`, pero Supabase real confirmado usa `razon_social`, `ruc`, `credits`, `total_spent`.
- Evidencia / archivo afectado:
  - `shared/src/lib/models/user.model.ts`
  - `accounts-page.component.ts` mapea `profiles.razon_social`, `ruc`, `credits`.
  - `AuthService.register()` envía `razon_social` y también `company_name`.
- Riesgo: tipos no alineados con DB; errores de mapeo.
- Recomendación: crear `Profile` real y `AdminProfile`; deprecar `companyName` como campo UI, no DB.

### Bajos

#### 14. Archivos `.DS_Store` dentro del workspace

- Problema: existen `.DS_Store` en `angular-workspace/`, `projects/`, `src/app/`.
- Evidencia:
  - `angular-workspace/.DS_Store`
  - `angular-workspace/projects/.DS_Store`
  - `angular-workspace/projects/sms-client/src/app/.DS_Store`
- Riesgo: ruido local si no está ignorado; bajo impacto funcional.
- Recomendación: confirmar `.gitignore`, limpiar en fase final, no mezclar con refactor funcional.

#### 15. Validadores mínimos

- Problema: `email.validator.ts` y `ruc.validator.ts` son funciones simples; no hay integración Angular Forms como `ValidatorFn`.
- Evidencia / archivo afectado:
  - `shared/src/lib/validators/email.validator.ts`
  - `shared/src/lib/validators/ruc.validator.ts`
- Riesgo: duplicación de validaciones en formularios.
- Recomendación: convertir luego a validators Angular, sin bloquear Fase 2.

## 4. Archivos o módulos prioritarios

1. `angular-workspace/projects/backoffice-admin/src/app/layouts/admin-layout.component.ts`
   - Motivo: base visual de todo backoffice; contiene sidebar/topbar/logout/routing.

2. `angular-workspace/projects/sms-client/src/app/layouts/dashboard-layout.component.ts`
   - Motivo: base visual cliente; comparte problemas con admin layout.

3. `angular-workspace/projects/shared/src/lib/helpers/format.helper.ts`
   - Motivo: helper pequeño, bajo riesgo, reduce duplicación masiva.

4. `angular-workspace/projects/backoffice-admin/src/app/pages/dashboard-page.component.ts`
   - Motivo: 1320 líneas, RPC real, modal, tablas, helpers, alto valor.

5. `angular-workspace/projects/backoffice-admin/src/app/pages/recharges-page.component.ts`
   - Motivo: 1344 líneas, lectura de tablas no existentes, modales, filtros.

6. `angular-workspace/projects/sms-client/src/app/dashboard/pages/recharges-page.component.ts`
   - Motivo: 1474 líneas, pagos visuales, WhatsApp, lectura real, lógica de cálculo.

7. `angular-workspace/projects/sms-client/src/app/dashboard/pages/send-sms-page.component.ts`
   - Motivo: 1151 líneas, tabs, parsing local, resumen, validaciones.

8. `angular-workspace/projects/sms-client/src/app/public/home-page.component.ts`
   - Motivo: 1587 líneas, muy grande, pero menor riesgo backend. Refactor visual posterior.

## 5. Componentes compartidos recomendados

Aplican realmente según código encontrado:

- `page-header`
  - Aplica: backoffice `dashboard`, `messages`, `api-keys`, `alerts`, `invoices`, `marketing`, `sync`, `integration-kit`; sms dashboard pages.

- `card`
  - Aplica: casi todas las páginas. Debe ser visual-neutral con radius/border/shadow configurables.

- `stat-card`
  - Aplica: dashboards, messages, alerts, invoices, marketing, sync.

- `button`
  - Aplica: botones primarios/secundarios/destructivos. Riesgo medio por fidelidad visual.

- `badge`
  - Aplica: estados SMS, recargas, API keys, sync logs, users.

- `modal`
  - Aplica: users, recharges, dashboard purchase, accounts detail, templates, api keys.

- `empty-state`
  - Aplica: messages, accounts, recharges, integration-kit, history, templates.

- `loading-state`
  - Aplica: casi todas las páginas conectadas o visual seguras.

- `filter-bar`
  - Aplica: recharges, messages, invoices, history.

- `data-table`
  - Aplica: recharges, messages, invoices, sync, alerts, history.

- `app-icon`
  - Aplica: backoffice completo; reduce SVG inline repetido.

- `sidebar` / `topbar`
  - Aplica con cuidado. No unificar visual entre apps al inicio; extraer shells internos por app primero.

No recomendado todavía:

- Un `layout` compartido único para `sms-client` y `backoffice-admin`.
  - Razón: diseños tienen proporciones, paletas y comportamientos distintos.

## 6. Servicios y capas recomendadas

### Existentes

- `AuthService`
  - Conectado realmente.
  - Maneja login, register, forgot/reset password, logout, session, admin check.
  - Debe refactorizarse para formateo, errores y tipos, pero no primero.

- `SupabaseService`
  - Conectado realmente.
  - Wrapper mínimo para `createClient`.
  - Útil, pero faltan facades por dominio.

- `ApiKeysService`
  - Stub.

- `BackofficeService`
  - Stub.

- `CreditsService`
  - Stub.

- `RechargesService`
  - Stub.

- `SmsService`
  - Stub.

### Recomendados

- `AuthFacade`
  - Encapsular sesión, restore, current user, current profile, admin status.

- `ProfileService`
  - Lectura de `profiles`, balance, total_spent, datos cliente.

- `DashboardDataService`
  - Cliente y backoffice separados o con namespaces.

- `BackofficeAccountsService`
  - Lectura de `profiles`, exclusión admins, mappers.

- `BackofficeRechargesService`
  - Hoy debe quedar visual/lectura segura; luego backend/RPC.

- `MessagesService`
  - Lectura futura de `sms_messages`, stats, filtros server-side si aplica.

- `ReportsService`
  - Facturas, marketing, analytics.

- `TemplatesService`
  - Reemplazar escrituras directas en `sms-client/templates`.

- `ApiKeysFacade`
  - Crear/revocar API keys por backend seguro; nunca exponer key real salvo creación.

- `ConfigService`
  - Alertas, sync, integration kit settings cuando existan contratos.

## 7. Estructura objetivo recomendada

Estructura aplicable al estado real, sin salto grande:

```text
projects/shared/src/lib/
  core/
    supabase/
    auth/
  models/
    auth/
    profile/
    sms/
    recharge/
    backoffice/
  services/
    auth.service.ts
    supabase.service.ts
    profile.service.ts
    templates.service.ts
    api-keys.service.ts
    reports.service.ts
  ui/
    icon/
    button/
    card/
    badge/
    modal/
    table/
    empty-state/
    loading-state/
  helpers/
  validators/

projects/sms-client/src/app/
  layout/
  auth/
  public/
  dashboard/
    pages/
    components/
    services/

projects/backoffice-admin/src/app/
  layout/
  auth/
  pages/
  components/
    page-header/
    stat-card/
    filter-bar/
    modal-shell/
  services/
  models/
```

Nota: no mover todo de inmediato. Primero crear `components/` dentro de cada app. Mover a `shared/ui` solo cuando dos apps usen mismo componente sin romper diseño.

## 8. Plan de refactor por fases

### Fase 2: Layout base

- Objetivo: estabilizar shell visual y navegación sin tocar páginas.
- Archivos probables:
  - `backoffice-admin/src/app/layouts/admin-layout.component.ts`
  - `sms-client/src/app/layouts/dashboard-layout.component.ts`
- Riesgo: medio. Sidebar/mobile/logout puede romper navegación.
- Validación requerida:
  - `git status --short`
  - `npm run build`
  - prueba manual rutas principales y logout.

### Fase 3: Componentes compartidos visuales

- Objetivo: extraer primitives de bajo riesgo.
- Archivos probables:
  - nuevo `backoffice-admin/src/app/components/loading-state`
  - nuevo `backoffice-admin/src/app/components/empty-state`
  - nuevo `backoffice-admin/src/app/components/stat-card`
  - nuevo `shared/src/lib/ui/icon` solo si conviene.
- Riesgo: bajo-medio; riesgo principal es pixel drift.
- Validación requerida:
  - `ng build backoffice-admin`
  - screenshots antes/después por página tocada.

### Fase 4: Páginas grandes una por una

- Objetivo: bajar tamaño y aislar UI/lógica.
- Orden recomendado:
  1. `backoffice-admin/pages/dashboard-page.component.ts`
  2. `backoffice-admin/pages/recharges-page.component.ts`
  3. `sms-client/dashboard/pages/recharges-page.component.ts`
  4. `sms-client/dashboard/pages/send-sms-page.component.ts`
  5. `sms-client/public/home-page.component.ts`
- Riesgo: alto si se hacen varias juntas.
- Validación requerida:
  - build app afectada.
  - navegación de ruta.
  - estados loading/empty/error.
  - comparación visual.

### Fase 5: Servicios y modelos

- Objetivo: sacar Supabase directo de páginas y formalizar contratos.
- Archivos probables:
  - `shared/src/lib/models/*`
  - `shared/src/lib/services/*`
  - páginas que hoy usan `SupabaseService` directo.
- Riesgo: medio-alto por datos reales.
- Validación requerida:
  - tests manuales con sesión real.
  - `npm run build`.
  - revisión de no introducir escrituras críticas.

### Fase 6: Limpieza de estilos

- Objetivo: reducir CSS duplicado sin romper diseño.
- Archivos probables:
  - componentes extraídos.
  - `styles.css` por app si se crean tokens mínimos.
- Riesgo: medio por pixel drift.
- Validación requerida:
  - screenshots desktop/mobile.
  - rutas backoffice completas.
  - rutas cliente dashboard completas.

### Fase 7: Validación final

- Objetivo: cerrar refactor con checklist estable.
- Archivos probables:
  - documentación.
  - ajustes menores.
- Riesgo: bajo.
- Validación requerida:
  - `git status --short`
  - `npm run build`
  - `ng build sms-client`
  - `ng build backoffice-admin`
  - QA visual rutas críticas.

## 9. Qué NO tocar todavía

- No tocar Supabase config ni environments.
- No cambiar rutas públicas ni privadas.
- No cambiar guards.
- No activar escrituras bloqueadas en backoffice visual seguro.
- No conectar `messages`, `api-keys`, `alerts`, `invoices`, `marketing`, `sync`, `integration-kit` a backend real.
- No unificar layouts de cliente y backoffice en un único layout compartido.
- No mover todas las páginas a una nueva estructura en un solo paso.
- No reemplazar SVGs inline globalmente sin snapshot visual.
- No cambiar textos visuales migrados.
- No tocar diseño 1:1 sin comparación visual.
- No agregar librerías UI nuevas.
- No agregar lint en esta fase.

## 10. Checklist antes y después de cada refactor

Antes:

```bash
git status --short
npm run build
ng build sms-client
ng build backoffice-admin
```

Durante:

```bash
git diff --check
git status --short
```

Después:

```bash
git status --short
npm run build
ng build sms-client
ng build backoffice-admin
```

Validación manual mínima:

- Login cliente.
- Login admin.
- Refresh en ruta privada directa.
- Navegación sidebar cliente.
- Navegación sidebar backoffice.
- Logout cliente/admin.
- Estado vacío/loading/error de página tocada.
- Comparación visual desktop/mobile.

No usar:

```bash
npm run lint
```

Motivo: no existe script `lint` configurado todavía.

## 11. Recomendación final

Primer refactor real recomendado: extraer helpers visuales y de formato de bajo riesgo antes de tocar páginas grandes.

Orden exacto sugerido:

1. Normalizar imports de `shared` a `@sms-fortuna/shared` solo en archivos pequeños (`main.ts`, auth pages), sin cambiar lógica.
2. Ampliar `shared/helpers/format.helper.ts` con `formatCurrency`, `formatNumber`, `formatDateTime`.
3. Crear `LoadingStateComponent` y `EmptyStateComponent` dentro de `backoffice-admin/src/app/components/`.
4. Aplicar esos dos componentes solo a una página visual segura pequeña, por ejemplo `invoices-page.component.ts`.
5. Validar build y comparación visual.

No empezar por `home-page.component.ts`, `recharges-page.component.ts` o `dashboard-page.component.ts`. Son demasiado grandes para primer refactor y mezclan diseño, estado y datos.
