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
