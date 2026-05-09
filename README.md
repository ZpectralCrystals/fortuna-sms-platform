# Fortuna SMS Platform

Plataforma unificada para envío, administración y monitoreo de SMS.

Fortuna SMS Platform centraliza la operación comercial de SMS: panel cliente,
backoffice administrativo, recargas, inventario, API pública, API Keys,
reportes, facturación, alertas y métricas operativas.

## Estado del proyecto

- App Angular unificada.
- Cliente y backoffice en una sola aplicación.
- Backoffice integrado bajo `/admin`.
- Panel cliente integrado bajo `/dashboard`.
- Preparado para AWS Amplify.
- Supabase integrado como backend principal.
- API pública SMS implementada.
- Edge Functions implementadas para envío SMS y API pública.
- Build final de producción: `dist/sms-client`.

## Módulos principales

- Landing pública.
- Autenticación.
- Dashboard cliente.
- Envío SMS individual.
- Envío SMS masivo.
- Envío desde archivo.
- Plantillas SMS.
- Historial de mensajes.
- Recargas.
- API Keys.
- Backoffice admin.
- Usuarios y cuentas.
- Inventario.
- Facturas.
- Marketing.
- Alertas SMS.
- Auditoría de mensajes.

## Stack técnico

- Angular.
- TypeScript.
- Supabase.
- Supabase Edge Functions.
- PostgreSQL.
- AWS Amplify.
- Node.js 22.

## Arquitectura

La aplicación principal de producción vive en:

```txt
angular-workspace/projects/sms-client
```

Dentro de `sms-client` conviven:

- Sitio público.
- Flujo de autenticación.
- Panel cliente en `/dashboard`.
- Backoffice administrativo en `/admin`.

El código compartido vive en:

```txt
angular-workspace/projects/shared
```

`backoffice-admin` se conserva como proyecto legacy temporal de referencia,
pero el backoffice operativo está integrado en `sms-client`.

## Estructura del repo

```txt
fortuna-sms-platform/
├── angular-workspace/
│   ├── projects/
│   │   ├── sms-client/
│   │   ├── shared/
│   │   └── backoffice-admin/   # legacy temporal
│   ├── supabase/
│   │   ├── functions/
│   │   └── migrations/
│   ├── angular.json
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   └── amplify.yml
└── .gitignore
```

## Requisitos

- Node.js 22.
- npm.
- Angular CLI disponible vía `npx ng` o scripts npm.
- Proyecto Supabase configurado.
- Variables de entorno configuradas en el entorno de despliegue.

## Instalación local

```bash
cd angular-workspace
npm install
```

## Desarrollo local

Levantar la aplicación principal:

```bash
npm start
```

Equivalente:

```bash
npm run start:sms
```

Levantar el backoffice legacy temporal, si se necesita revisar referencia:

```bash
npm run start:backoffice
```

## Build

Compilar todo el workspace Angular:

```bash
npm run build
```

Compilar solo la app cliente/backoffice unificada:

```bash
npm run build:client
```

Compilar solo el proyecto legacy temporal:

```bash
npm run build:admin
```

Build completo explícito:

```bash
npm run build:all
```

La salida de producción principal se genera en:

```txt
angular-workspace/dist/sms-client
```

## Supabase

El proyecto usa Supabase para:

- Autenticación.
- PostgreSQL.
- Perfiles de clientes.
- Recargas.
- Inventario SMS.
- Historial de mensajes.
- API Keys.
- Auditoría.
- Edge Functions.

Funciones principales:

```txt
angular-workspace/supabase/functions/send-sms
angular-workspace/supabase/functions/api-send-sms
```

Migraciones:

```txt
angular-workspace/supabase/migrations
```

## Deploy

El proyecto está preparado para AWS Amplify mediante:

```txt
angular-workspace/amplify.yml
```

El build esperado para producción es:

```bash
cd angular-workspace
npm install
npm run build
```

La app principal a publicar es:

```txt
dist/sms-client
```

## Seguridad y configuración

- No versionar secretos.
- No subir API Keys privadas.
- No exponer `service_role` en Angular.
- Configurar credenciales y variables sensibles desde Supabase/AWS.
- Mantener Edge Functions como capa segura para operaciones privilegiadas.

## Notas de mantenimiento

- `sms-client` es la aplicación final de producción.
- `/admin` contiene el backoffice integrado.
- `/dashboard` contiene el panel cliente.
- `projects/shared` concentra modelos, servicios y lógica reutilizable.
- `backoffice-admin` queda como legacy temporal hasta su retiro definitivo.

## Estado actual

Proyecto listo para presentarse en GitHub con raíz limpia y workspace Angular
centralizado.
