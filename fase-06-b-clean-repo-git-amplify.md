# Fase 06-B - Limpieza repo Git/Amplify

## 1. Resumen

Repo preparado para Git y AWS Amplify sin ejecutar DB, migrations, deploy ni cambios remotos.

Graphify estaba disponible en `graphify-out/GRAPH_REPORT.md`; se uso como contexto, luego se valido todo contra archivos reales.

Estado clave:

- App deploy unica: `sms-client`.
- Build normal: `npm run build` -> `ng build sms-client`.
- Output real: `angular-workspace/dist/sms-client/index.html`.
- `backoffice-admin` queda legacy con script separado.
- Supabase local conserva migrations/functions.
- Evidencias/backups/dumps/logs/grafo quedan ignorados.

## 2. Archivos modificados

- `.gitignore`
- `angular-workspace/package.json`
- `amplify.yml`
- `Back Sms Fortuna.postman_collection_v3.json` local sanitizado, ignorado por Git.

Archivos creados:

- `.env.example`
- `README_DEPLOY.md`
- `HANDOFF_CLIENTE.md`
- `fase-06-b-clean-repo-git-amplify.md`

Cambios de index:

- `handoff-evidence/` removido del tracking con `git rm --cached -r handoff-evidence`.
- Archivos siguen en disco local.

## 3. Archivos ignorados

`.gitignore` ahora cubre:

- `node_modules/`
- `dist/`
- `.angular/`
- `.DS_Store`
- `.env`, `.env.*`
- `*.local`
- `*.log`
- `coverage/`
- `handoff-transfer/`
- `handoff-evidence/`
- `sms-fortuna-backup/`
- `graphify-out/`
- `graphify-watch.pid`
- `graphify-watch.log`
- `graphify-service.sh`
- `*.dump`
- `*.backup`
- `*.bak`
- `*.tmp`
- `*.pid`
- `*.sqlite`
- `*.db`
- `supabase/.branches/`
- `supabase/.temp/`
- `.supabase/`
- Postman private/secret dirs
- colecciones Postman
- informes internos `fase-*.md`

No se ignoran:

- `angular-workspace/supabase/migrations/`
- `angular-workspace/supabase/functions/`
- `angular-workspace/projects/`
- `angular-workspace/package.json`
- `angular-workspace/package-lock.json`
- `angular-workspace/angular.json`
- `amplify.yml`
- `README.md`
- `README_DEPLOY.md`
- `HANDOFF_CLIENTE.md`

## 4. Archivos sensibles detectados

Detectado y tratado:

- `handoff-evidence/` estaba trackeado.
- `handoff-transfer/supabase-before-transfer.dump` existe local, ignorado.
- `graphify-watch.log` existe local, ignorado.
- `graphify-watch.pid` existe local, ignorado.
- `Back Sms Fortuna.postman_collection_v3.json` tenia Bearer tokens. Se sanitizo.

Secret scan sobre archivos trackeados mostro solo falsos positivos:

- nombres de env vars (`SUPABASE_SERVICE_ROLE_KEY`, `SMS_PROVIDER_PASSWORD`, etc.)
- rol SQL literal `service_role`
- prefijo generado `fs_live_` dentro de migration
- texto documental, no valor real

No se imprimio ningun secreto completo.

## 5. Secretos removidos o enmascarados

Postman local:

- Bearer tokens reemplazados por `{{auth_token}}`.
- `X-API-KEY` reemplazado por `{{api_key}}`.
- URL base reemplazada por `{{base_url}}`.
- variables agregadas: `base_url`, `auth_token`, `api_key`, `idempotency_key`, `telefono`, `mensaje`.

`.env.example` contiene solo placeholders:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_PROJECT_REF`
- `SMS_PROVIDER_MODE=production`

No contiene:

- service role real
- DB password real
- provider password real
- Supabase access token real
- API keys reales

## 6. Build single app

`angular-workspace/package.json`:

```json
"build": "ng build sms-client"
```

Scripts legacy conservados:

```json
"build:admin": "ng build backoffice-admin"
"build:all": "ng build sms-client && ng build backoffice-admin"
```

Build ejecutado:

```bash
cd angular-workspace
npm run build
```

Resultado:

- OK.
- Compilo solo `sms-client`.
- Output: `angular-workspace/dist/sms-client`.
- `index.html`: `angular-workspace/dist/sms-client/index.html`.
- Warning Node `v25.9.0` version impar no LTS, sin fallo.

## 7. Amplify

`amplify.yml` raiz listo:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd angular-workspace
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: angular-workspace/dist/sms-client
    files:
      - '**/*'
  cache:
    paths:
      - angular-workspace/node_modules/**/*
```

Rewrite SPA requerido en Amplify:

- target `/index.html`
- status `200`

## 8. README/Handoff

Creado `README_DEPLOY.md`:

- requisitos
- `npm ci`
- `npm run build`
- output Amplify
- rewrite Angular
- Supabase ref/URL
- no subir `.env` reales
- `SMS_PROVIDER_MODE=production`

Creado `HANDOFF_CLIENTE.md`:

- estado funcional
- estado controlado de Desde Fichero
- admin final `smsfortuna@fortuna.com.pe`
- base limpia esperada
- reglas de secrets
- deploy frontend

## 9. Git status

Estado resumido:

- `.gitignore` modificado.
- `angular-workspace/package.json` modificado.
- `handoff-evidence/*` removido del tracking.
- `.env.example` nuevo.
- `README_DEPLOY.md` nuevo.
- `HANDOFF_CLIENTE.md` nuevo.
- `amplify.yml` nuevo.

Archivos locales ignorados:

- `handoff-transfer/`
- `handoff-evidence/`
- `graphify-out/`
- `graphify-watch.log`
- `graphify-watch.pid`
- `sms-fortuna-backup/`
- `dist/`
- `node_modules/`

## 10. Comandos ejecutados

```bash
git status --short
find . -maxdepth 3 -type d ...
sed -n ... .gitignore
sed -n ... angular-workspace/package.json
sed -n ... amplify.yml
find angular-workspace/dist -maxdepth 4 -type f -name index.html
git ls-files | rg ...
rg -l "fs_live_|sbp_|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_ACCESS_TOKEN|PGPASSWORD|SMS_PROVIDER_PASSWORD|SMS_PROVIDER_USERNAME|service_role|postgresql://|password=|eyJ" ...
git rm --cached -r handoff-evidence
git check-ignore -v handoff-transfer/supabase-before-transfer.dump
git check-ignore -v handoff-evidence/functions-list-final.txt
cd angular-workspace && npm run build
git diff --stat
git diff --cached --stat
```

No ejecutado:

- `supabase db reset`
- migrations
- SQL remoto
- deploy
- cambio de secrets
- llamadas al proveedor

## 11. Pendientes manuales

- Revisar `git status --short`.
- Confirmar que `handoff-evidence/` debe quedar fuera del repo.
- Confirmar si se quiere commitear `README_DEPLOY.md` y `HANDOFF_CLIENTE.md`.
- Rotar tokens si los Bearer de Postman fueron reales y estuvieron compartidos.
- Usar Node LTS en Amplify/CI.
- Configurar rewrite SPA en Amplify.
- Configurar secrets reales solo en Supabase, nunca en Git.

## 12. Comandos recomendados para commit

```bash
git status --short
git add .gitignore angular-workspace/package.json amplify.yml .env.example README_DEPLOY.md HANDOFF_CLIENTE.md
git add -u handoff-evidence
git diff --cached --stat
git commit -m "chore: prepare repo for amplify deploy"
```

Si se desea incluir este informe aunque este ignorado:

```bash
git add -f fase-06-b-clean-repo-git-amplify.md
```
