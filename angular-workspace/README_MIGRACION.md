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
