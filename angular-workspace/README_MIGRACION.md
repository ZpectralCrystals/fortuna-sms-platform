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
