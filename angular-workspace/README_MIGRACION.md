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

- Crear rutas o páginas públicas reales para `/privacy` y `/terms` si se requiere contenido legal navegable.
- Crear rutas públicas para `/about` y `/blog` antes de activar esos links.
