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
