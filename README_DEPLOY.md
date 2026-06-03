# Fortuna SMS - Deploy Git/Amplify

## Requisitos

- Node.js LTS recomendado.
- npm.
- Acceso al proyecto Supabase del cliente.

## Instalar dependencias

```bash
cd angular-workspace
npm ci
```

## Build local

```bash
cd angular-workspace
npm run build
```

`npm run build` compila solo `sms-client`.

Salida esperada:

```text
angular-workspace/dist/sms-client
```

`backoffice-admin` queda como legacy. No forma parte del build normal.

## AWS Amplify

Usar `amplify.yml` en la raiz del repo.

Artifacts:

```yaml
baseDirectory: angular-workspace/dist/sms-client
```

Configurar rewrite SPA:

```text
Source address: </^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map)$)([^.]+$)/>
Target address: /index.html
Type: 200 (Rewrite)
```

## Supabase

- Project ref: `ewltnrfqwkhimnyqfrrw`
- URL: `https://ewltnrfqwkhimnyqfrrw.supabase.co`

No subir `.env` reales al repo.

Usar `.env.example` solo como plantilla.

Secrets reales se configuran desde Supabase Dashboard/CLI, nunca en Git.

## Edge Functions

Funciones existen en:

```text
angular-workspace/supabase/functions
```

No desplegar desde Amplify. Amplify solo despliega frontend Angular.

## Modo proveedor

Estado final esperado:

```text
SMS_PROVIDER_MODE=production
```

No incluir usuario, password, service role, DB URL ni access tokens en archivos versionados.

## Verificacion antes de commit

```bash
git status --short
git diff --stat
rg -n "fs_live_|sbp_|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_ACCESS_TOKEN|PGPASSWORD|SMS_PROVIDER_PASSWORD|SMS_PROVIDER_USERNAME|service_role|postgresql://|password=|eyJ" . -g '!node_modules' -g '!dist' -g '!handoff-transfer' -g '!handoff-evidence' -g '!sms-fortuna-backup' -g '!graphify-out'
```

Si aparece secreto real, reemplazar por placeholder antes de commit.
