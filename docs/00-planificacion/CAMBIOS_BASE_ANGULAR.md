# Cambios realizados - Base Angular

## Objetivo

Se creo una base Angular nueva para iniciar migracion sin eliminar ni modificar los proyectos actuales `sms` y `backoffice`.

## Estructura nueva

```text
angular-workspace/
  angular.json
  package.json
  tsconfig.json
  projects/
    sms-client/
    backoffice-admin/
    shared/
```

## Aplicaciones creadas

- `sms-client`: nueva app Angular para portal cliente.
- `backoffice-admin`: nueva app Angular para panel administrativo.

## Carpeta compartida creada

```text
projects/shared/src/lib/
  models/
  services/
  validators/
  helpers/
```

## Rutas base configuradas en `sms-client`

- `/`
- `/login`
- `/register`
- `/forgot-password`
- `/dashboard`
- `/dashboard/send`
- `/dashboard/history`
- `/dashboard/analytics`
- `/dashboard/templates`
- `/dashboard/api-keys`
- `/dashboard/recharges`

## Rutas base configuradas en `backoffice-admin`

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

## Guards creados

- `ClientAuthGuard`: protege rutas privadas de `sms-client`.
- `AdminGuard`: protege rutas operativas de `backoffice-admin`.

## Servicios base creados

- `AuthService`
- `SmsService`
- `CreditsService`
- `ApiKeysService`
- `RechargesService`
- `BackofficeService`
- `SupabaseService`

## Modelos, helpers y validadores creados

- Modelos: auth, usuario, SMS, recargas, API keys.
- Helpers: formato de fecha, creditos y API key.
- Validadores: email y formato RUC Peru.

## Notas importantes

- No se elimino `sms`.
- No se elimino `backoffice`.
- No se migro logica compleja.
- No se copiaron secretos ni credenciales.
- Los servicios quedan como stubs para migracion controlada.
- Los environments quedan vacios para configurar Supabase luego.

## Como correr luego de instalar dependencias

```bash
cd angular-workspace
npm install
npm run start:sms
npm run start:backoffice
```

## Verificacion realizada

```bash
cd angular-workspace
npm install
npm run build
```

Resultado:

- `sms-client` compila correctamente.
- `backoffice-admin` compila correctamente.
- Angular mostro advertencia porque el entorno usa Node `v25.9.0`, version impar no LTS. Para produccion se recomienda Node LTS.
- `npm install` reporto vulnerabilidades en dependencias/tooling. No se aplico `npm audit fix` para evitar cambios automaticos o breaking changes en esta base inicial.
