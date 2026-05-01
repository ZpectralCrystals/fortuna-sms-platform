# Base Angular - SMS Fortuna

Este workspace contiene la base limpia para migrar los proyectos actuales `sms` y `backoffice` a Angular.

## Apps creadas

- `sms-client`: portal cliente.
- `backoffice-admin`: panel administrativo.

## Shared

Carpeta compartida:

- `projects/shared/src/lib/models`
- `projects/shared/src/lib/services`
- `projects/shared/src/lib/validators`
- `projects/shared/src/lib/helpers`

## Comandos sugeridos

```bash
cd angular-workspace
npm install
npm run start:sms
npm run start:backoffice
```

## Nota

Esta base no migra logica compleja. Solo deja rutas, guards, servicios vacios, modelos iniciales y estructura de trabajo.

## Migración Landing pública

### Archivos React revisados

- `sms/src/pages/Landing.tsx`
- `sms/src/components/Hero.tsx`
- `sms/src/components/Features.tsx`
- `sms/src/components/HowItWorks.tsx`
- `sms/src/components/Benefits.tsx`
- `sms/src/components/UsagePolicy.tsx`
- `sms/src/components/Pricing.tsx`
- `sms/src/components/CTA.tsx`
- `sms/src/components/Footer.tsx`

### Archivos Angular modificados o creados

- `projects/sms-client/src/app/public/home-page.component.ts`

### Decisiones tomadas

- La Landing pública se migró dentro de `HomePageComponent` standalone para evitar sobrearquitectura.
- Se usaron `CommonModule` y `RouterLink` como imports Angular necesarios.
- La ruta `/` ya apuntaba a `HomePageComponent`; no se modificaron rutas.
- Como Tailwind no está configurado en `sms-client`, los estilos se dejaron en `styles` del componente.
- CTAs de registro apuntan a `/register`; CTA de login apunta a `/login`.
- Link de documentación conserva navegación interna a `/dashboard/api-keys`, ruta existente protegida por guard.
- Links legales apuntan a `/privacy` y `/terms` según la Landing original.
- Blog y Sobre nosotros quedan no navegables con TODO en código porque no existen rutas públicas Angular.
- No se agregó lógica de negocio ni se tocaron servicios, guards, environments, Supabase ni backoffice.

### Assets copiados

- Ninguno. La Landing React no referenciaba imágenes externas desde `public` o `src/assets`; solo usaba estilos, SVG inline/data URI e iconos del stack React, reemplazados por marcadores visuales CSS/texto en Angular.

### Resultado del build

- Comando ejecutado: `cd angular-workspace && ng build sms-client`
- Resultado: exitoso.
- Observación: Node mostró advertencia por versión impar `v25.9.0`; no bloqueó el build.

### Pendientes detectados

- Rutas legales `/privacy` y `/terms` resueltas en la sección "Migración páginas legales".
- Ruta pública `/about` resuelta en la sección "Migración página About".
- Ruta pública `/blog` resuelta en la sección "Migración Blog público".

## Migración páginas legales

### Archivos React revisados

- `sms/src/pages/Privacy.tsx`
- `sms/src/pages/Terms.tsx`

### Archivos Angular creados

- `projects/sms-client/src/app/public/privacy-page.component.ts`
- `projects/sms-client/src/app/public/terms-page.component.ts`

### Rutas agregadas

- `/privacy`
- `/terms`

### Resultado del build

- Comando ejecutado: `cd angular-workspace && ng build sms-client`
- Resultado: exitoso.
- Observación: Node mostró advertencia por versión impar `v25.9.0`; no bloqueó el build.

### Pendientes detectados

- Ninguno para esta migración. Las páginas legales ya quedan disponibles desde los links de la Landing.

## Migración página About

### Archivo React revisado

- `sms/src/pages/About.tsx`

### Archivo Angular creado

- `projects/sms-client/src/app/public/about-page.component.ts`

### Ruta agregada

- `/about`

### Resultado del build

- Comando ejecutado: `cd angular-workspace && ng build sms-client`
- Resultado: exitoso.
- Observación: Node mostró advertencia por versión impar `v25.9.0`; no bloqueó el build.

### Pendientes detectados

- Ninguno para About.

### Corrección visual de About

- Se corrigió `/about` para respetar el diseño React/Bolt 1:1.
- Se restauró el hero con `fortuna-background.jpg`, overlay azul, mismas secciones, mismas tarjetas, misma imagen tecnológica y CTA final.
- El asset se ubicó en `projects/sms-client/src/assets/fortuna-background.jpg` y se sirve como `assets/fortuna-background.jpg`.
- Se mantuvo la navegación pública hacia `/`, `/register` y el link desde la Landing.
- Se agregó a `/about` el mismo footer usado en la Landing para mantener consistencia visual.

## Migración Blog público

### Archivos React revisados

- `sms/src/pages/Blog.tsx`
- `sms/src/pages/BlogPost.tsx`

### Archivos Angular creados

- `projects/sms-client/src/app/public/blog-page.component.ts`
- `projects/sms-client/src/app/public/blog-post-page.component.ts`

### Rutas agregadas

- `/blog`
- `/blog/:slug`

### Data real o estructura visual

- Se corrigió el Blog a migración 1:1 de la estructura React/Bolt.
- Se migró solo la estructura visual pública con estado vacío seguro.
- No se conectó a Supabase ni se hardcodeó contenido falso.
- El listado conserva el mismo estado vacío React: “No se encontraron artículos”.
- Las URLs de posts como `/blog/demo` respetan el comportamiento React sin data: redirigen a `/blog`.

### Dependencias Supabase detectadas

- Tabla `blog_posts`.
- Tabla `blog_categories`.
- RPC `increment_blog_post_views`.
- Filtros por categoría, búsqueda por título/extracto, slug de post, posts relacionados, métricas de vistas y metadatos SEO.

### Resultado del build

- Comando ejecutado: `cd angular-workspace && ng build sms-client`
- Resultado: exitoso.
- Observación: Node mostró advertencia por versión impar `v25.9.0`; no bloqueó el build.

### Pendientes para conectar blog real

- Crear o validar tablas `blog_posts` y `blog_categories` en Supabase dev.
- Crear o validar RPC `increment_blog_post_views`.
- Implementar servicio Angular de blog cuando exista esquema estable.
- Activar búsqueda, categorías, slug real, post detail, artículos relacionados y metadatos SEO dinámicos.

## Migración Dashboard cliente base

### Archivos React revisados

- `sms/src/layouts/DashboardLayout.tsx`
- `sms/src/pages/Dashboard.tsx`

### Archivos Angular modificados

- `projects/sms-client/src/app/layouts/dashboard-layout.component.ts`
- `projects/sms-client/src/app/dashboard/pages/dashboard-overview-page.component.ts`

### Qué se migró

- Layout privado base con sidebar, header móvil, navegación, tarjeta de saldo, panel de usuario y logout.
- Vista principal `/dashboard` con encabezado, CTA “Enviar SMS”, tarjetas KPI, paneles de gráficos y sección “Mensajes recientes”.
- Lectura segura de perfil básico y mensajes desde Supabase si las tablas responden.
- Estado vacío original para mensajes recientes: “Aún no has enviado ningún SMS”.

### Qué NO se migró todavía

- Send SMS real/backend.
- History.
- Analytics.
- Templates.
- API Keys.
- Recharges.
- Lógica real de envío, historial, analytics o recargas.

### Dependencias Supabase detectadas

- Tabla `profiles` para `full_name`, `company_name`, `razon_social` y `credits`.
- Tabla `sms_messages` para KPIs, gráficos y mensajes recientes.
- Sesión actual de Supabase para filtrar por usuario autenticado.

### Resultado del build

- Comando ejecutado: `cd angular-workspace && ng build sms-client`
- Resultado: exitoso.
- Observación: Node mostró advertencia por versión impar `v25.9.0`; no bloqueó el build.

### Pendientes reales

- Conectar las páginas privadas restantes cuando toque su migración.
- Validar visual 1:1 con sesión cliente real y datos reales de `sms_messages`.
- Reemplazar gráficos CSS por componente compartido solo durante refactor futuro, si aplica.

## Migración visual Login backoffice

### Archivo React revisado

- `backoffice/src/components/Login.tsx`

### Archivo Angular modificado

- `projects/backoffice-admin/src/app/auth/login-page.component.ts`

### Qué se migró visualmente

- Fondo degradado oscuro `slate`.
- Card blanca centrada con `rounded-2xl`, padding y sombra equivalente.
- Icono azul de mensaje con SVG inline equivalente a `MessageSquare`.
- Título `SMS Fortuna`.
- Subtítulo `Backoffice - Panel de Administración`.
- Campos `Email` y `Contraseña` con placeholders originales.
- Caja de error roja.
- Botón azul `Ingresar` y estado loading `Ingresando...`.

### Qué lógica se conservó

- Estado `email`, `password`, `loading` y `errorMessage`.
- Método `submit()`.
- Login con `AuthService.login()`.
- Validación admin con `AuthService.isAdmin()`.
- Logout con `AuthService.logout()` si la cuenta no es admin.
- Redirección exitosa a `/dashboard`.
- No se tocaron Supabase config, environments, guards, layout, páginas de backoffice ni `sms-client`.

### Resultado del build

- Comando ejecutado: `cd angular-workspace && ng build backoffice-admin`
- Resultado: exitoso.
- Observación: Node mostró advertencia por versión impar `v25.9.0`; no bloqueó el build.

### Pendientes si aplica

- Validación visual realizada en `http://127.0.0.1:4201/login`: coincide con el login React/Bolt migrado.
- Pendiente probar login con admin real y confirmar redirección a `/dashboard` porque no se proporcionaron credenciales.
- Pendiente probar usuario no admin y confirmar logout con mensaje de error porque no se proporcionaron credenciales.

## Migración visual Layout backoffice

### Archivo React revisado

- `backoffice/src/components/Layout.tsx`

### Archivo Angular modificado

- `projects/backoffice-admin/src/app/layouts/admin-layout.component.ts`

### Qué se migró visualmente

- Fondo general `bg-slate-50`.
- Sidebar oscuro `bg-slate-900`.
- Sidebar fijo en desktop y menú responsive básico en móvil.
- Logo con icono de mensaje azul.
- Título `SMS Fortuna` y subtítulo `Backoffice`.
- Navegación lateral con estados activos.
- Header superior blanco y sticky.
- Título dinámico según ruta actual.
- Área de contenido con padding y `router-outlet`.
- Bloque inferior de sidebar con nombre/correo admin.
- Botón `Cerrar sesión`.

### Rutas mapeadas

- `Dashboard` → `/dashboard`
- `Usuarios` → `/users`
- `Recargas` → `/recharges`
- `Cuentas` → `/accounts`
- `Mensajes` → `/messages`
- `API Keys` → `/api-keys`
- `Alertas SMS` → `/alerts`
- `Facturas` → `/invoices`
- `Marketing` → `/marketing`
- `Sincronización` → `/sync`
- `Kit Integración` → `/integration-kit`

### Qué lógica se conservó

- Componente `standalone: true`.
- Navegación con Angular Router, `RouterLink` y `RouterLinkActive`.
- `router-outlet` para páginas internas.
- Logout con `AuthService.logout()`.
- Redirección de logout a `/login`.
- Estado `loading` y `errorMessage`.
- Menú móvil con `mobileMenuOpen`.
- Lectura de email desde sesión Supabase si está disponible, con fallback `Administrador Principal` / `admin@fortuna.com.pe`.
- No se tocaron login, Supabase config, environments, guards, páginas internas ni `sms-client`.

### Resultado del build

- Comando ejecutado: `cd angular-workspace && ng build backoffice-admin`
- Resultado: exitoso.
- Observación: Node mostró advertencia por versión impar `v25.9.0`; no bloqueó el build.

### Pendientes si aplica

- Se abrió `http://127.0.0.1:4201/login` y el login carga correctamente.
- Se probó abrir `/dashboard` sin sesión admin y el guard redirige a `/login`.
- Probar login con admin real y confirmar entrada a `/dashboard` porque no se proporcionaron credenciales.
- Confirmar navegación visual de todas las rutas protegidas con sesión admin real.
- Confirmar logout desde sesión admin real.

## Migración Dashboard backoffice

### Archivo React revisado

- `backoffice/src/pages/Dashboard.tsx`

### Archivo Angular modificado

- `projects/backoffice-admin/src/app/pages/dashboard-page.component.ts`

### Qué se migró visualmente

- Estado loading con spinner centrado y altura equivalente `h-64`.
- Encabezado `Panel de Control` con botones `Historial de Compras` y `Comprar SMS`.
- Tarjetas KPI para inventario, ingresos, recargas pendientes y usuarios.
- Panel `Resumen del Sistema`.
- Panel `Estadísticas de Mensajería`.
- Sección expandible `Historial de Compras de SMS` con header gradiente slate, estado vacío, tabla y footer totalizador.
- Modal `Comprar SMS` con cálculo automático de cantidad, resumen azul, botones y estado `Procesando...`.

### Qué lecturas quedaron conectadas

- RPC `get_dashboard_stats` para métricas del dashboard.
- Tabla `inventory_purchases` con relación `admin:admins(full_name, email)` para historial.
- Sesión actual de Supabase para obtener el ID del admin que ejecuta la compra.
- Si falla `get_dashboard_stats` porque Supabase dev aún no tiene el esquema/RPC operativo, se muestran métricas en cero sin error técnico visible.
- Si falla la lectura de historial de compras por tabla, relación o RLS pendiente, se muestra estado vacío seguro y no error técnico visible.

### Qué RPCs usa

- `get_dashboard_stats` para lectura de métricas.
- `add_sms_to_inventory` como única escritura permitida para agregar SMS al inventario.

### Qué reglas de seguridad se aplicaron

- No hay inserts directos en `inventory_purchases`.
- No hay updates directos en inventario.
- No se modifica `profiles.credits`.
- No se modifican usuarios/clientes.
- No se llaman Edge Functions.
- Si no existe sesión/admin actual, el submit del modal se bloquea con mensaje controlado.
- Si la RPC falla, se muestra error controlado sin romper la pantalla.

### Resultado del build

- Comando ejecutado: `cd angular-workspace && ng build backoffice-admin`
- Resultado: exitoso.
- Observación: Node mostró advertencia por versión impar `v25.9.0`; no bloqueó el build.

### Pendientes si aplica

- Se intentó abrir `/dashboard`; el navegador mostró login por sesión/admin no validada en el entorno actual.
- Validar visual final en `/dashboard` con sesión admin real.
- Validar carga real de KPIs/historial contra Supabase dev.
- Probar RPC `add_sms_to_inventory` con admin real y confirmar refresh de stats/historial.

## Migración Users backoffice

### Archivo React revisado

- `backoffice/src/pages/Users.tsx`

### Archivo Angular modificado

- `projects/backoffice-admin/src/app/pages/users-page.component.ts`

### Qué se migró visualmente

- Estado loading con spinner centrado y altura equivalente `h-64`.
- Barra superior con buscador `Buscar usuarios...` y botón azul `Agregar Usuario`.
- Tabla en card blanca con borde `border-slate-200`.
- Columnas `Usuario`, `Empresa`, `Teléfono`, `Balance SMS`, `Estado` y `Acciones`.
- Filas con nombre, email, empresa, teléfono, balance SMS con icono, badge `Activo` / `Inactivo` y botón `Desactivar` / `Activar`.
- Modal `Agregar Nuevo Usuario` con campos `Nombre completo`, `Email`, `Empresa`, `Teléfono` y botones `Cancelar` / `Crear Usuario`.

### Qué lectura segura quedó conectada

- Lectura de tabla `users` con campos `id`, `email`, `full_name`, `company`, `phone`, `sms_balance`, `is_active` y `created_at`.
- Si la tabla no existe, falla por RLS o no hay data, se usa `users = []` y se muestra estado vacío seguro sin error técnico visible.
- Búsqueda local por `full_name`, `email` y `company`.

### Qué NO se conectó por seguridad

- No se insertan usuarios en `users`.
- No se actualiza `users.is_active`.
- No se crean usuarios en Supabase Auth.
- No se modifica `profiles`.
- No se llaman Edge Functions.
- `Crear Usuario` solo muestra `La creación segura de usuarios se conectará en la siguiente fase.`
- `Activar` / `Desactivar` solo muestra `La activación de usuarios se conectará en la siguiente fase.`

### Riesgos detectados del React original

- El React original insertaba usuarios directo en `users`.
- El React original actualizaba `users.is_active` directo.
- En Angular esas escrituras quedan bloqueadas temporalmente porque el flujo real debe definirse con Supabase Auth + profiles/users.

### Resultado del build

- Comando ejecutado: `cd angular-workspace && ng build backoffice-admin`
- Resultado: exitoso.
- Observación: Node mostró advertencia por versión impar `v25.9.0`; no bloqueó el build.

### Pendientes reales

- Se intentó abrir `/users`; el navegador mostró login por sesión/admin no validada en el entorno actual.
- Definir flujo seguro de creación de usuarios con Supabase Auth + profiles/users.
- Definir flujo seguro de activación/desactivación.
- Validar lectura real de `users` cuando el esquema/RLS esté listo en Supabase dev.

## Migración Recharges backoffice

### Archivo React revisado

- `backoffice/src/pages/Recharges.tsx`

### Archivo Angular modificado

- `projects/backoffice-admin/src/app/pages/recharges-page.component.ts`

### Qué se migró visualmente

- Estado loading con spinner centrado y altura equivalente `h-64`.
- Tarjeta `Inventario Global Disponible` con colores rojo, amber o verde según inventario.
- Filtros `Todas`, `Pendientes`, `Aprobadas` y `Rechazadas`.
- Botón `Nueva Recarga`.
- Tabla en card blanca con columnas `Usuario`, `Paquete`, `Cantidad`, `Monto`, `Método Pago`, `Fecha`, `Estado`, `Cód. Operación` y `Acciones`.
- Filas con usuario, paquete, SMS, monto, método, fecha `es-PE`, badge de estado, código de operación y acciones.
- Estado vacío `No hay recargas para mostrar`.
- Modal `Nueva Recarga`.
- Modal `Aprobar Recarga` con validación visual de código de operación.

### Qué lectura segura quedó conectada

- Lectura de `recharges` con relación `user:users(full_name, email, company)` y `package:sms_packages(name)`.
- Lectura de usuarios activos desde `users`.
- Lectura de paquetes activos desde `sms_packages`.
- Lectura de inventario desde `sms_inventory`.
- Si alguna tabla no existe, falla por RLS o no hay data, se usan fallbacks seguros y no se muestra error técnico visible.
- Filtros funcionan localmente sobre las recargas cargadas.

### Qué NO se conectó por seguridad

- No se insertan recargas en `recharges`.
- No se actualiza `recharges`.
- No se actualiza `users` ni `users.sms_balance`.
- No se modifica inventario.
- No se llama RPC `deduct_sms_from_inventory`.
- No se llaman Edge Functions.
- `Crear Recarga` solo muestra `La creación segura de recargas se conectará en la siguiente fase.`
- `Aprobar Recarga` valida código y luego muestra `La aprobación segura de recargas se conectará en la siguiente fase.`
- `Rechazar` solo muestra `El rechazo seguro de recargas se conectará en la siguiente fase.`

### Riesgos detectados del React original

- El React original aprobaba recargas modificando `recharges`.
- El React original actualizaba `users.sms_balance`.
- El React original usaba RPC `deduct_sms_from_inventory`.
- El React original insertaba nuevas recargas.
- En Angular esas acciones quedan bloqueadas temporalmente porque el flujo real debe definirse con backend/RPC seguro, inventario y RLS completos.

### Resultado del build

- Comando ejecutado: `cd angular-workspace && ng build backoffice-admin`
- Resultado: exitoso.
- Observación: Node mostró advertencia por versión impar `v25.9.0`; no bloqueó el build.

### Pendientes reales

- Se intentó abrir `/recharges`; el guard redirigió a `/login` por sesión/admin no validada en el entorno actual.
- Validar visual final en `/recharges` con sesión admin real.
- Definir backend/RPC seguro para creación, aprobación y rechazo.
- Completar inventario, RLS y relaciones en Supabase dev.
- Probar lectura real cuando existan tablas y permisos.

## Migración Accounts backoffice

### Archivo React revisado

- `backoffice/src/pages/Clients.tsx`

### Archivo Angular modificado

- `projects/backoffice-admin/src/app/pages/accounts-page.component.ts`

### Qué se migró visualmente

- En React la pantalla se llama `Clients`; en Angular se migró a la ruta `/accounts`.
- Estado loading con spinner centrado y altura equivalente `h-64`.
- Buscador con placeholder `Buscar clientes...`, icono de búsqueda y ancho máximo equivalente `max-w-md`.
- Grid `grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6`.
- Cards blancas con borde, sombra suave, hover y click para abrir detalle.
- Card de cliente con nombre, email, empresa opcional, badge `Activo` / `Inactivo`, bloques `Balance SMS`, `Total Gastado`, `Recargas` y fecha `Desde ...`.
- Modal de detalle con overlay oscuro, card blanca `max-w-2xl`, cierre con X y click fuera.
- Modal con datos del cliente, 3 tarjetas resumen, sección `Historial de Recargas`, listado reciente y estado vacío `No hay recargas registradas`.
- Estado vacío general `No se encontraron clientes`.

### Qué lectura segura quedó conectada

- Se corrigió la fuente de datos de `users` a `profiles` porque `public.users` no existe en Supabase dev.
- `profiles` es la fuente real actual de clientes registrados.
- Lectura segura desde `profiles` con columnas reales: `id`, `email`, `full_name`, `razon_social`, `ruc`, `phone`, `role`, `is_active`, `credits`, `total_spent`, `created_at`, `updated_at`.
- Se excluyen administradores leyendo `admins.auth_user_id` y filtrando perfiles cuyo `id` exista allí.
- También se excluye el usuario autenticado actual si su `id` aparece en `profiles`, para evitar mostrar el admin logueado en cuentas.
- Si falla la lectura de `admins`, la pantalla no rompe y usa fallback seguro.
- `recharges` todavía no existe en Supabase dev; por eso `Historial de Recargas` queda vacío y `totalRecharges` queda en 0.
- `totalSpent` sale de `profiles.total_spent`.
- Búsqueda local por `full_name`, `email`, `razon_social` y `ruc`.
- Si `profiles` falla por tabla, relación, RLS o datos pendientes, se muestra estado vacío seguro sin error técnico visible.

### Qué NO se conectó por seguridad

- No se insertan usuarios.
- No se actualizan usuarios.
- No se modifican balances.
- No se modifican recargas.
- No se llaman Edge Functions.
- No se llaman RPCs.
- La pantalla queda como lectura segura de clientes desde `profiles`.

### Dependencias Supabase detectadas

- Tabla `profiles`: `id`, `email`, `full_name`, `razon_social`, `ruc`, `phone`, `role`, `is_active`, `credits`, `total_spent`, `created_at`, `updated_at`.
- Tabla `admins`: `auth_user_id`.
- Tabla `recharges`: no existe todavía; no se usa por ahora.

### Resultado del build

- Comando ejecutado: `cd angular-workspace && ng build backoffice-admin`
- Resultado: exitoso.
- Observación: Node mostró advertencia por versión impar `v25.9.0`; no bloqueó el build.

### Pendientes reales

- Se intentó abrir `/accounts`; el entorno actual mostró login por sesión/admin no validada.
- Validar visual final en `/accounts` con sesión admin real.
- Validar que aparezcan clientes de `profiles` y que no aparezcan perfiles admin.
- Definir backend seguro antes de habilitar cualquier modificación futura de clientes, balances o recargas.

## Migración Messages backoffice

### Archivo React revisado

- `backoffice/src/pages/Messages.tsx`

### Archivo Angular modificado

- `projects/backoffice-admin/src/app/pages/messages-page.component.ts`

### Qué se migró visualmente

- Estado loading con altura equivalente `h-64` y texto `Cargando mensajes...`.
- Encabezado con icono morado de mensaje, título `Mensajes SMS` y subtítulo `Historial completo de mensajes enviados`.
- Tarjetas estadísticas `Total`, `Pendientes`, `Enviados`, `Entregados` y `Fallidos`.
- Panel de filtros con buscador, filtro de estado y filtro de fecha.
- Tabla en card blanca con borde, sombra suave y columnas `Cliente`, `Destinatario`, `Mensaje`, `Estado`, `Enviado` y `Entregado`.
- Filas preparadas para cliente, destinatario monoespaciado, mensaje truncado, error bajo mensaje, badge de estado y fechas `es-PE`.
- Estado vacío `No se encontraron mensajes`.

### Qué lectura quedó conectada

- Ninguna lectura real por ahora.
- `messages = []` y `filteredMessages = []` quedan inicializados localmente.
- Estadísticas calculan desde `messages` y muestran 0.
- Filtros funcionan localmente sobre el array actual.

### Qué NO se conectó por seguridad

- No se usa `from('users')` porque `public.users` no existe.
- No se usa relación `users(...)`.
- No se usa `sms_messages` porque todavía no existe en Supabase dev.
- No se insertan ni actualizan mensajes.
- No se modifican perfiles ni créditos.
- No se llama Edge Functions.
- No se llaman RPCs.
- No se envían SMS.

### Dependencias Supabase detectadas

- React original dependía de `sms_messages`.
- React original dependía de relación `users(full_name, email, company)`.
- En el esquema real actual solo existen `admins` y `profiles`, por eso la pantalla queda visual y local hasta que exista esquema de mensajes.

### Resultado del build

- Comando ejecutado: `cd angular-workspace && ng build backoffice-admin`
- Resultado: exitoso.
- Observación: Node mostró advertencia por versión impar `v25.9.0`; no bloqueó el build.

### Pendientes reales

- Definir tabla real de mensajes o vista segura compatible con `profiles`.
- Conectar lectura cuando existan `sms_messages`, RLS y relaciones reales.
- Validar visual final en `/messages` con sesión admin real.

## Migración visual API Keys backoffice

### Archivo React revisado

- `backoffice/src/pages/ApiKeys.tsx`

### Archivo Angular modificado

- `projects/backoffice-admin/src/app/pages/api-keys-page.component.ts`

### Qué se migró visualmente

- Header con icono emerald de key.
- Título `API Keys`.
- Subtítulo `Administrar claves de acceso a la API`.
- Botón `Nueva API Key`.
- Caja informativa azul `Información Importante`.
- Tabla con columnas `Cliente`, `Nombre`, `API Key`, `Estado`, `Último Uso`, `Expira` y `Acciones`.
- Estado vacío `No hay API keys creadas`.
- Modal `Crear Nueva API Key` con campos `Cliente`, `Nombre de la Key` y `Expiración (días)`.
- Texto auxiliar `0 = la key nunca expira`.
- Botones `Cancelar` y `Crear API Key`.
- Modal visual `API Key Creada` con bloque de key, botón `Copiar`, advertencia amber y botón `Entendido`.

### Qué NO se conectó por seguridad

- No se usa Supabase en esta pantalla.
- No se usa `from('api_keys')`.
- No se usa `from('users')`.
- No se insertan, actualizan ni eliminan registros.
- No se llaman RPCs.
- No se llaman Edge Functions.
- No se generan API keys reales.
- No se usa `Math.random`.
- No se copian keys reales al portapapeles.
- `apiKeys` y `users` inician vacíos.
- Acciones de crear, ver, copiar, activar/desactivar y eliminar quedan bloqueadas con mensaje controlado.

### Resultado del build

- Comando ejecutado: `cd angular-workspace && ng build backoffice-admin`
- Resultado: exitoso.
- Observación: Node mostró advertencia por versión impar `v25.9.0`; no bloqueó el build.

### Pendientes reales

- Definir tabla y RLS de API keys.
- Definir backend/RPC seguro para generar hash y secreto visible una sola vez.
- Definir flujo de revocación/activación sin exponer claves en texto plano.
- Conectar clientes reales cuando exista modelo seguro.

## Migración visual Alerts backoffice

### Archivo React revisado

- `backoffice/src/pages/Alerts.tsx`

### Archivo Angular modificado

- `projects/backoffice-admin/src/app/pages/alerts-page.component.ts`

### Qué se migró visualmente

- Estado loading con spinner centrado y altura equivalente `h-64`.
- Estado sin configuración con icono `AlertCircle` y texto `No se pudo cargar la configuración`.
- Header `Alertas de Saldo Bajo`, subtítulo `Sistema automático de notificaciones por SMS` y botón `Enviar Alertas Ahora`.
- Alerta verde de éxito con icono `CheckCircle`.
- Tarjetas estadísticas `Total Alertas`, `Hoy`, `Esta Semana` y `Usuarios Únicos`, todas en cero por defecto.
- Card `Configuración del Sistema` con iconos `Settings`, `Bell`, `BellOff`, switch visual, campos, checkboxes, textarea y botones.
- Card `Historial de Alertas` con icono `History`, tabla preparada y estado vacío `No hay alertas registradas`.
- Iconos lucide equivalentes implementados como SVG inline, sin dependencias nuevas.

### Qué NO se conectó por seguridad

- No se usa Supabase en esta pantalla.
- No se llaman RPCs de alertas.
- No se llama Edge Function `send-low-balance-alerts`.
- No se usa `import.meta.env.VITE_SUPABASE_URL`.
- No se usa sesión Supabase para enviar alertas.
- No se envían SMS ni correos.
- No se modifica configuración real.
- `recentAlerts` inicia vacío y estadísticas quedan en cero.
- `Guardar Configuración` y `Enviar Alertas Ahora` muestran mensajes controlados locales.

### Resultado del build

- Comando ejecutado: `cd angular-workspace && ng build backoffice-admin`
- Resultado: exitoso.
- Observación: Node mostró advertencia por versión impar `v25.9.0`; no bloqueó el build.

### Pendientes reales

- Definir backend/RPC seguro para leer y guardar configuración.
- Definir Edge Function segura para envío de alertas.
- Definir tablas, RLS y auditoría de historial.
- Conectar estadísticas reales cuando exista esquema operativo.

## Migración visual Invoices backoffice

### Archivo React revisado

- `backoffice/src/pages/Invoices.tsx`

### Archivo Angular modificado

- `projects/backoffice-admin/src/app/pages/invoices-page.component.ts`

### Qué se migró visualmente

- Estado loading con spinner centrado y altura equivalente `h-64`.
- Header `Facturas`, subtítulo `Recargas aprobadas y generación de reportes` y botón verde `Exportar CSV`.
- Card `Filtros` con icono `Filter`, select `Año`, select `Mes`, opción `Todos los meses`, meses completos y botón `Limpiar Filtros`.
- Tarjetas estadísticas `Total Facturas`, `Total SMS Vendidos` e `Ingresos Totales`, todas en cero por defecto.
- Iconos `FileText`, `Download`, `Filter` y `Calendar` como SVG inline equivalentes, más emoji `💰` igual al React original.
- Card `Listado de Facturas - {año}` o `Listado de Facturas - {mes} {año}`.
- Estado vacío `No hay facturas para el período seleccionado`.
- Tabla preparada con columnas `Fecha`, `Cliente`, `Empresa`, `Paquete`, `SMS`, `Monto`, `Método` y `Código Op.`.

### Qué NO se conectó por seguridad

- No se usa Supabase en esta pantalla.
- No se usa `from('recharges')`.
- No se llama RPC `get_invoices_by_period`.
- No se usan consultas `from(` ni `rpc(`.
- No se insertan, actualizan ni eliminan registros.
- No se llaman Edge Functions.
- No se modifican recargas, usuarios ni balances.
- No se generan facturas reales.
- `invoices` inicia vacío y el botón `Exportar CSV` queda deshabilitado sin datos.
- La exportación real queda bloqueada con mensaje controlado si se invoca.

### Resultado del build

- Comando ejecutado: `cd angular-workspace && ng build backoffice-admin`
- Resultado: exitoso.
- Observación: Node mostró advertencia por versión impar `v25.9.0`; no bloqueó el build.

### Pendientes reales

- Definir esquema operativo de facturas/recargas aprobadas.
- Definir RPC o backend seguro para reportes por período.
- Definir exportación CSV segura desde backend o lectura autorizada.
- Conectar datos reales cuando existan RLS, tablas y contratos finales.

## Migración Send SMS visual

### Archivo React revisado

- `sms/src/pages/SendSMS.tsx`

### Archivo Angular modificado

- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.ts`

### Qué se migró

- Pantalla `/dashboard/send` con tabs `Individual`, `Múltiple` y `Desde Fichero`.
- Campos, ejemplos, resumen de envío, cálculo visual estimado de costo, conteo de caracteres y cantidad de SMS.
- Carga local de `.txt`/`.csv` para modo múltiple y preview local para modo fichero.
- Validaciones visuales de teléfono, archivo vacío, tamaño máximo y créditos insuficientes.
- Botón principal seguro: valida localmente y muestra “El envío real se conectará en la siguiente fase.”

### Qué NO se conectó todavía

- No se llama Edge Function `send-sms`.
- No se insertan registros en `sms_messages`.
- No se crean ni actualizan campañas.
- No se descuenta saldo.
- No se actualiza `profiles.credits`.
- No se actualiza `profiles.total_spent`.
- No se migró la lectura real de plantillas.

### Riesgos detectados del flujo original

- El React original llamaba `functions/v1/send-sms` desde frontend.
- El React original calculaba y descontaba créditos desde cliente.
- El React original insertaba mensajes y actualizaba perfil desde cliente.
- El flujo real debe moverse a backend seguro con validación de saldo transaccional.

### Resultado del build

- Comando ejecutado: `cd angular-workspace && ng build sms-client`
- Resultado: exitoso.
- Observación: Node mostró advertencia por versión impar `v25.9.0`; no bloqueó el build.

### Pendientes reales para conectar envío SMS

- Diseñar endpoint/backend seguro para envío real.
- Validar saldo en backend antes de llamar al proveedor.
- Registrar mensajes y campañas en transacción o flujo idempotente.
- Descontar créditos solo tras confirmación segura del proveedor.
- Conectar plantillas reales cuando se migre `/dashboard/templates`.

## Migración visual Login cliente

### Archivo React revisado

- `sms/src/pages/Login.tsx`

### Archivo Angular modificado

- `projects/sms-client/src/app/auth/login-page.component.ts`

### Qué se migró

- Fondo degradado azul/cyan.
- Card blanca centrada con borde redondeado y sombra.
- Marca `SMS Fortuna`, icono de mensaje y subtítulo `Comunicación masiva`.
- Título `Inicia sesión`, link `Regístrate gratis`, campos, botón y link `¿Olvidaste tu contraseña?`.
- Estado visual de error con caja roja.

### Qué lógica se conservó

- `email`, `password`, `loading`, `errorMessage` y `submit()`.
- `AuthService.login()`.
- Redirección exitosa a `/dashboard`.
- Links internos a `/forgot-password` y `/register`.

### Resultado del build

- Comando ejecutado: `cd angular-workspace && ng build sms-client`
- Resultado: exitoso.
- Observación: Node mostró advertencia por versión impar `v25.9.0`; no bloqueó el build.

### Pendientes si aplica

- Probar login real y credenciales incorrectas con credenciales cliente disponibles.

## Migración History cliente

### Archivo React revisado

- `sms/src/pages/History.tsx`

### Archivo Angular modificado

- `projects/sms-client/src/app/dashboard/pages/history-page.component.ts`

### Qué se migró

- Encabezado `Historial de SMS` y acción `Exportar CSV`.
- Buscador por número o mensaje.
- Filtro por estado: todos, entregados, enviados, pendientes y fallidos.
- Listado visual de mensajes con icono de estado, chip de estado, fecha, hora de entrega, error y costo.
- Estado de carga y estado vacío `No se encontraron mensajes`.
- Exportación CSV local de los mensajes filtrados.

### Datos reales o estado vacío

- La pantalla lee `sms_messages` de Supabase usando sesión actual si la tabla responde.
- Si no hay sesión, tabla o lectura falla, muestra estado vacío sin error técnico al usuario.
- No modifica datos.

### Dependencias Supabase detectadas

- Sesión actual de Supabase.
- Tabla `sms_messages`.
- Campos usados: `id`, `user_id`, `to_phone`, `message`, `status`, `cost`, `created_at`, `delivered_at`, `error_message`.

### Resultado del build

- Comando ejecutado: `cd angular-workspace && ng build sms-client`
- Resultado: exitoso.
- Observación: Node mostró advertencia por versión impar `v25.9.0`; no bloqueó el build.

### Pendientes reales

- Probar visual 1:1 con sesión cliente y mensajes reales.
- Ajustar paginación solo si el React original evoluciona o si el volumen real lo exige.

## Migración visual Register cliente

### Archivo React revisado

- `sms/src/pages/Register.tsx`

### Archivos Angular modificados

- `projects/sms-client/src/app/auth/register-page.component.ts`
- `projects/shared/src/lib/models/auth.model.ts`
- `projects/shared/src/lib/services/auth.service.ts`

### Qué se migró

- Se corrigió la migración para respetar el formulario React/Bolt 1:1.
- Fondo degradado azul/cyan.
- Card blanca centrada con borde redondeado y sombra.
- Marca `SMS Fortuna`, icono de mensaje y subtítulo `Comunicación masiva`.
- Título `Crea tu cuenta`, link `Inicia sesión`, caja promocional `Obtén 10 SMS gratis al registrarte`, botón y links legales.
- Campos en el mismo orden del React original: `Nombre completo`, `Razón Social`, `RUC`, `Teléfono celular`, `Correo electrónico`, `Contraseña` y `Confirmar contraseña`.
- Estados visuales de error y éxito.

### Qué lógica se conservó

- `fullName`, `companyName`, `ruc`, `phone`, `email`, `password`, `confirmPassword`, `loading`, `errorMessage`, `successMessage` y `submit()`.
- `AuthService.register()`.
- Validación local de RUC de 11 dígitos, teléfono celular Perú, contraseña mínima de 6 caracteres y confirmación de contraseña.
- Links internos a `/login`, `/terms` y `/privacy`.

### Campos guardados actualmente

- `email` y `password` se envían a Supabase Auth.
- `fullName`, `companyName`, `ruc` y `phone` se envían como metadata de registro (`full_name`, `company_name`, `razon_social`, `ruc`, `phone`).
- Si el trigger de `profiles` consume esos metadatos y existen columnas compatibles, quedan disponibles para el profile.

### Resultado del build

- Comando ejecutado: `cd angular-workspace && ng build sms-client`
- Resultado: exitoso.
- Observación: Node mostró advertencia por versión impar `v25.9.0`; no bloqueó el build.

### Pendientes si aplica

- Confirmar si `profiles.phone` existe en Supabase dev. Si no existe, crear migración SQL queda pendiente para una fase posterior.
- Probar creación real de usuario y profile con credenciales de prueba autorizadas.

## Migración Analytics cliente

### Archivo React revisado

- `sms/src/pages/Analytics.tsx`

### Archivo Angular modificado

- `projects/sms-client/src/app/dashboard/pages/analytics-page.component.ts`

### Qué se migró

- Encabezado `Panel de Análisis` y subtítulo `Métricas y estadísticas detalladas de tus envíos`.
- Cuatro tarjetas KPI: `Total Enviados`, `Tasa de Entrega`, `SMS Fallidos` y `Gasto Total`.
- Estado de carga con spinner.
- Lectura segura de mensajes del usuario actual.
- Cálculo de `total`, `delivered`, `failed`, `pending`, `sent`, `totalCost`, `deliveryRate`, data diaria de 30 días, distribución por estado y tendencia mensual de 6 meses.
- Tres paneles de gráficos con estructura React/Bolt: `Envíos últimos 30 días`, `Distribución por Estado` y `Tendencia últimos 6 meses`.
- Gráficos representados con HTML/CSS/SVG simple porque Angular no tiene librería de charts instalada y no se instalaron dependencias nuevas.
- Estado vacío seguro sin errores técnicos cuando no hay mensajes, sesión o tabla disponible.

### Dependencias Supabase detectadas

- Sesión actual de Supabase Auth.
- Tabla `sms_messages`.
- Campos usados: `id`, `user_id`, `status`, `cost`, `created_at`.

### Resultado del build

- Comando ejecutado: `cd angular-workspace && ng build sms-client`
- Resultado: exitoso.
- Observación: Node mostró advertencia por versión impar `v25.9.0`; no bloqueó el build.

### Pendientes reales

- Validar visual 1:1 con sesión cliente real y datos reales de `sms_messages`.
- Sustituir gráficos HTML/CSS/SVG por librería de charts Angular solo en refactor futuro, si se decide instalar una dependencia.

## Migración Templates cliente

### Archivo React revisado

- `sms/src/pages/Templates.tsx`

### Archivo Angular modificado

- `projects/sms-client/src/app/dashboard/pages/templates-page.component.ts`

### Qué se migró

- Encabezado `Plantillas de Mensajes`, subtítulo `Crea y administra plantillas reutilizables` y botón `Nueva Plantilla`.
- Estado vacío con icono, texto `No tienes plantillas aún` y botón `Crear primera plantilla`.
- Cards de plantillas con nombre, categoría, contenido, cantidad de caracteres, fecha, botones editar/eliminar y botón `Usar plantilla`.
- Modal `Nueva Plantilla` / `Editar Plantilla` con campos `Nombre de la plantilla`, `Categoría`, `Contenido`, contador de caracteres, consejo de variables `{nombre}`, `{codigo}` y botones `Cancelar`, `Crear`, `Actualizar`, `Guardando...`.
- Categorías `marketing`, `transactional`, `notification` con etiquetas `Marketing`, `Transaccional`, `Notificación`.
- Botón `Usar plantilla` queda visual y muestra mensaje temporal discreto; no navega ni precarga envío todavía.

### Qué CRUD quedó conectado

- Lectura de plantillas del usuario actual desde `templates`.
- Creación de plantillas con `user_id`, `name`, `content`, `category`, `variables`.
- Edición de `name`, `content`, `category` filtrando por `id` y `user_id`.
- Eliminación filtrando por `id` y `user_id`, con confirmación previa.
- Si la tabla no existe o falla la lectura, se muestra estado vacío sin error técnico.

### Dependencias Supabase detectadas

- Sesión actual de Supabase Auth.
- Tabla `templates`.
- Campos usados: `id`, `user_id`, `name`, `content`, `category`, `variables`, `created_at`.

### Resultado del build

- Comando ejecutado: `cd angular-workspace && ng build sms-client`
- Resultado: exitoso.
- Observación: Node mostró advertencia por versión impar `v25.9.0`; no bloqueó el build.

### Pendientes reales

- Validar CRUD con sesión cliente real y tabla `templates` disponible en Supabase dev.
- Conectar `Usar plantilla` a `/dashboard/send` en fase posterior, sin inventar precarga ahora.

## Migración API Keys cliente

### Archivo React revisado

- `sms/src/pages/ApiKeys.tsx`

### Archivo Angular modificado

- `projects/sms-client/src/app/dashboard/pages/api-keys-page.component.ts`

### Qué se migró visualmente

- Encabezado `API Keys`, subtítulo `Administra tus claves de API para integración` y botón `Nueva API Key`.
- Caja informativa `Integración API` con texto explicativo y bloque de ejemplo de uso.
- Panel `Tus API Keys`, estado vacío `No tienes API keys aún` y botón `Crear primera API Key`.
- Listado de keys existentes con nombre, estado `Activa` / `Inactiva`, key enmascarada, mostrar/ocultar, copiar, fecha de creación, último uso y botón eliminar.
- Modal `Crear nueva API Key` con campo `Nombre de la API Key`, placeholder `Ej: Producción, Testing, App Móvil`, texto de ayuda y botones `Cancelar`, `Crear`.

### Qué NO se conectó por seguridad

- No se generan API keys reales en frontend.
- No se usa `Math.random()`.
- No se insertan API keys en Supabase.
- No se guardan keys en texto plano.
- El botón `Crear` muestra: `La generación segura de API keys se conectará en la siguiente fase.`
- El botón eliminar queda con confirmación y mensaje temporal de revocación segura pendiente; no elimina ni revoca registros.
- No se llaman Edge Functions.

### Riesgos detectados del React original

- Generaba API keys en frontend con `Math.random()`.
- Insertaba API keys en tabla `api_keys` desde cliente.
- Guardaba la key completa en texto plano.
- Eliminaba API keys desde cliente sin filtro explícito por `user_id`.

### Dependencias Supabase detectadas

- Sesión actual de Supabase Auth.
- Tabla `api_keys`.
- Campos usados para listado: `id`, `user_id`, `name`, `key`, `is_active`, `created_at`, `last_used_at`.

### Resultado del build

- Comando ejecutado: `cd angular-workspace && ng build sms-client`
- Resultado: exitoso.
- Observación: Node mostró advertencia por versión impar `v25.9.0`; no bloqueó el build.

### Pendientes reales para generación segura de API keys

- Crear backend seguro o Edge Function para generar keys con CSPRNG.
- Guardar solo hash o representación segura de la key.
- Mostrar la key completa solo una vez al crearla.
- Implementar revocación segura filtrada por usuario y con auditoría.
- Definir política RLS de `api_keys` antes de activar creación/revocación real.

## Migración Recharges cliente

### Archivo React revisado

- `sms/src/pages/Recharges.tsx`

### Archivo Angular modificado

- `projects/sms-client/src/app/dashboard/pages/recharges-page.component.ts`

### Qué se migró visualmente

- Encabezado `Recargas` y subtítulo `Administra tu saldo y recargas de SMS`.
- Tarjeta de saldo con `Créditos disponibles`, SMS disponibles y `Total gastado`.
- Caja `Tarifas por Operador (Precio Base)` con tarifas Movistar, Claro, Entel y Bitel.
- Paquetes S/ 50, S/ 100, S/ 200, S/ 500 y S/ 1000 con SMS, badge `Popular`, base imponible, IGV, total y recarga efectiva.
- Historial de recargas con título `Historial de recargas`, estado vacío `No hay recargas aún`, listado con ícono por estado, SMS, método, fecha, monto y estado `Completado`, `Fallido`, `Pendiente`.
- Modal `Confirmar recarga` con paquete, base imponible, IGV, total, métodos Yape, Plin y Transferencia Bancaria.
- Secciones de QR para Yape/Plin, datos bancarios Interbank, botones de copiar y acción manual de WhatsApp.

### Qué lectura segura quedó conectada

- Lee sesión actual de Supabase Auth.
- Lee `profiles.credits` y `profiles.total_spent` si existen.
- Lee historial desde `recharges` filtrando por `user_id` si la tabla existe.
- Si `profiles` o `recharges` fallan, muestra saldo 0 y estado vacío sin error técnico.

### Qué NO se conectó por seguridad

- No llama `notify-backoffice`.
- No llama Edge Functions.
- No inserta en `recharges`.
- No acredita SMS.
- No modifica `profiles.credits`.
- No modifica `profiles.total_spent`.
- El botón `Confirmar recarga` muestra: `La solicitud automática de recarga se conectará en la siguiente fase. Por ahora envía tu constancia por WhatsApp.`
- WhatsApp queda como acción manual del usuario con mensaje armado.

### Riesgos detectados del React original

- Insertaba solicitudes de recarga desde frontend.
- Llamaba Edge Function `notify-backoffice` desde cliente.
- Dependía de variables públicas de Supabase para notificar backoffice.
- Mostraba alerta de solicitud creada aunque el flujo real depende de validación manual de comprobante.

### Assets copiados

- `sms/public/whatsapp_image_2026-02-01_at_10.23.01_am.jpeg`
- Copiado a `projects/sms-client/src/assets/whatsapp_image_2026-02-01_at_10.23.01_am.jpeg`
- Referenciado como `assets/whatsapp_image_2026-02-01_at_10.23.01_am.jpeg`

### Dependencias Supabase detectadas

- Sesión actual de Supabase Auth.
- Tabla `profiles`: `credits`, `total_spent`.
- Tabla `recharges`: `id`, `user_id`, `amount`, `sms_credits`, `status`, `payment_method`, `created_at`.

### Resultado del build

- Comando ejecutado: `cd angular-workspace && ng build sms-client`
- Resultado: exitoso.
- Observación: Node mostró advertencia por versión impar `v25.9.0`; no bloqueó el build.

### Pendientes reales para activar recargas

- Diseñar flujo seguro con backoffice para crear y aprobar solicitudes.
- Crear backend o Edge Function segura para registrar solicitud y notificar backoffice.
- Validar comprobante antes de acreditar SMS.
- Acreditar `profiles.credits` y actualizar `profiles.total_spent` solo desde backend seguro.

## Mejora visual recuperación de contraseña

### Archivos Angular modificados

- `projects/sms-client/src/app/auth/forgot-password-page.component.ts`
- `projects/sms-client/src/app/auth/reset-password-page.component.ts`

### Criterio visual

- No existía una pantalla React/Vite 1:1 bien diseñada para recuperación o cambio de contraseña.
- Se alinearon ambas pantallas con la línea visual de Login/Register: fondo degradado azul/cyan, card blanca centrada, marca `SMS Fortuna`, icono de mensaje, subtítulo `Comunicación masiva`, inputs, botones y alertas compatibles.

### Lógica conservada

- `AuthService.forgotPassword()` queda sin cambios.
- `AuthService.resetPassword()` queda sin cambios.
- Se mantienen validaciones actuales de correo, contraseña mínima de 6 caracteres y confirmación de contraseña.
- Se mantiene redirección a `/login` después de reset exitoso.
- Se mantienen rutas `/forgot-password` y `/reset-password`.

### Resultado del build

- Comando ejecutado: `cd angular-workspace && ng build sms-client`
- Resultado: exitoso.
- Observación: Node mostró advertencia por versión impar `v25.9.0`; no bloqueó el build.
