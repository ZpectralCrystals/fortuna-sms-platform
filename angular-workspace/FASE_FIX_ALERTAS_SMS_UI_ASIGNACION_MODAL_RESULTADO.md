# FASE FIX ALERTAS SMS - UI asignación SMS internos

## Estado final

LISTO.

## Qué se corrigió

- Sección “Cuenta interna de alertas” quedó como card profesional.
- Labels y valores separados:
  - Nombre
  - Email
  - Saldo disponible
  - Estado
- Botón `Asignar SMS` ahora usa estilo azul del Backoffice, no botón HTML básico.
- Empty state de cuenta interna queda limpio con CTA `Crear/Configurar cuenta interna`.
- Modal `Asignar SMS internos` queda con card, backdrop, header, botón cerrar, inputs y acciones ordenadas.

## Flujo modal

Botón:

- `type="button"`
- llama `openAllocateInternalSmsModal()`
- no hace submit accidental
- no recarga página

Confirmación:

- valida cantidad > 0
- bloquea submit mientras `allocating`
- llama RPC:

```ts
admin_allocate_internal_sms({
  p_profile_id,
  p_sms_amount,
  p_reason
})
```

Éxito:

- cierra modal
- refresca cuenta interna con `loadInternalAccount()`
- actualiza saldo visible
- muestra `SMS internos asignados correctamente.`

Error:

- queda dentro del modal en `allocationError`
- no ensucia el mensaje global de la card

## No tocado

- SQL
- RPCs
- API pública
- API Keys
- `send-sms`
- provider
- lógica real de alertas
- `low_balance_config`
- `internal_accounts`
- `internal_sms_allocations`
- updates directos a `profiles`

## Archivos modificados

- `projects/backoffice-admin/src/app/pages/alerts-page.component.html`
- `projects/backoffice-admin/src/app/pages/alerts-page.component.scss`
- `projects/backoffice-admin/src/app/pages/alerts-page.component.ts`

## Build

Comando:

```bash
source ~/.nvm/nvm.sh
nvm use 22
rm -rf .angular/cache
npm run build
```

Resultado:

- `sms-client` OK
- `backoffice-admin` OK

## git diff --check

OK.

## git diff --stat

Resultado global del repo en este momento:

```text
alerts-page.component.html       | 145 +++++
alerts-page.component.scss       | 663 +++++++++++++++++++++
alerts-page.component.ts         | 206 +++++++
api-keys-page.component.html     |  85 ++-
api-keys-page.component.scss     | 150 +++--
api-keys-page.component.ts       |   6 +
6 files changed, 1168 insertions(+), 87 deletions(-)
```

Nota: stat incluye cambios previos de `api-keys-page*` ya presentes en worktree.

## Validaciones seguridad

```bash
rg "from\\('profiles'\\).*update|profiles\\.credits.*=" projects/backoffice-admin projects/shared || true
```

Resultado: sin hallazgos.

```bash
rg "service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret|Bearer ey" projects/backoffice-admin projects/shared || true
```

Resultado: sin hallazgos.

## Estado

LISTO.
