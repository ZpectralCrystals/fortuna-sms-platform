# FASE 8A.1 - Fix build Angular/esbuild

## Estado final

LISTO.

`npm run build` queda verde con Node 22.

## Causa probable

Crash no venía de TypeScript ni de app SMS.

Evidencia:

- `tsc -p projects/sms-client/tsconfig.app.json --noEmit` OK.
- `tsc -p projects/backoffice-admin/tsconfig.app.json --noEmit` OK.
- `ng build sms-client` fallaba.
- `ng build backoffice-admin` también fallaba.
- `esbuild` CLI directo funcionaba.
- `npm rebuild esbuild` no corrigió.

Causa probable: bug/crash del builder Angular `@angular-devkit/build-angular:application` con `esbuild` en este entorno macOS arm64 + Node 22.22.2. El crash aparecía justo después de compilar polyfills:

```txt
Abort trap: 6
```

En corrida previa también apareció:

```txt
fatal error: all goroutines are asleep - deadlock!
```

## Entorno confirmado

Antes:

```txt
node -v -> v25.9.0
npm -v -> 11.12.1
which node -> /opt/homebrew/bin/node
which npm -> /opt/homebrew/bin/npm
```

Con Node 22:

```txt
nvm use 22
node -v -> v22.22.2
npm -v -> 10.9.7
```

## Dependencias revisadas

```txt
@angular-devkit/build-angular@18.2.21
esbuild@0.23.0
vite@5.4.21 -> esbuild@0.21.5
xlsx@0.18.5
```

No se eliminó `node_modules`.
No se eliminó `package-lock.json`.
No se ejecutó `npm install`.

## Comandos ejecutados

```txt
node -v
npm -v
which node
which npm
source ~/.nvm/nvm.sh && nvm use 22
rm -rf .angular/cache
rm -rf dist
npm run build
npx ng build sms-client --verbose
npx ng build backoffice-admin --verbose
npx ng build sms-client --configuration development --verbose
npm ls esbuild
npm ls @angular-devkit/build-angular
npm ls xlsx
npm rebuild esbuild
tsc -p projects/sms-client/tsconfig.app.json --noEmit
tsc -p projects/backoffice-admin/tsconfig.app.json --noEmit
```

## Fallaba sms-client o backoffice

Fallaban ambos con builder `application`.

`sms-client`:

```txt
ng build sms-client
Abort trap: 6
```

`backoffice-admin`:

```txt
npx ng build backoffice-admin --verbose
polyfills.js OK
proceso termina con code -1
```

## Corrección aplicada

Se cambió build builder de ambos proyectos en `angular.json`:

Antes:

```json
"builder": "@angular-devkit/build-angular:application",
"browser": "projects/.../src/main.ts"
```

Después:

```json
"builder": "@angular-devkit/build-angular:browser",
"main": "projects/.../src/main.ts"
```

Motivo: `browser` builder usa pipeline webpack estable en Angular 18. Misma app, misma entrada, mismos assets/styles. No toca funcionalidad, Supabase, Edge Functions, SMS, auth, backoffice logic ni diseño.

## Archivos modificados

FASE 8A.1:

- `angular.json`

Worktree ya tenía cambios previos en Dashboard/Analytics de fases anteriores:

- `projects/sms-client/src/app/dashboard/pages/dashboard-overview-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/dashboard-overview-page.component.html`
- `projects/sms-client/src/app/dashboard/pages/dashboard-overview-page.component.scss`
- `projects/sms-client/src/app/dashboard/pages/analytics-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/analytics-page.component.html`
- `projects/sms-client/src/app/dashboard/pages/analytics-page.component.scss`

## Resultado final build

Comando:

```txt
source ~/.nvm/nvm.sh && nvm use 22 && rm -rf .angular/cache && rm -rf dist && npm run build
```

Resultado:

```txt
ng build sms-client -> OK
ng build backoffice-admin -> OK
```

Resumen:

```txt
sms-client initial total: 6.39 MB
backoffice-admin initial total: 4.93 MB
```

## Validaciones finales

```txt
git diff --check -> OK
git diff --stat -> OK
```

`git diff --stat` al cierre:

```txt
7 files changed, 793 insertions(+), 252 deletions(-)
```

Incluye cambios previos de Dashboard/Analytics más `angular.json`.

## Nota

Build actual usa configuración default `development`, igual que antes en `angular.json`. Producción no fue objetivo de esta fase.
