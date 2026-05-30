# Fase 04-C - Fix admin RUC

Fecha: 2026-05-30  
Proyecto: Fortuna SMS  
Repo: `/Volumes/MAC/MAC Ext/Desktop/Fortuna sms`

## 1. Resumen ejecutivo

Fix local preparado para edición RUC desde admin.

Problema confirmado:

- Admin guardaba datos del cliente vía RPC legacy `admin_update_client_profile`.
- Ese flujo actualizaba `profiles`.
- `send-sms` usa `companies.ruc` vía `company_id`.
- Resultado: UI mostraba RUC nuevo, pero envío seguía usando RUC viejo de `companies`.

Corrección:

- Nueva RPC `admin_update_profile_company_ruc`.
- Admin service ahora llama RPC nueva.
- RPC actualiza `profiles` y `companies` en la misma operación.
- No toca `send-sms`.
- No toca provider.
- No activa production.

## 2. Archivos creados

- `angular-workspace/supabase/migrations/20260530071447_admin_update_profile_company_ruc.sql`

## 3. Archivos modificados

- `angular-workspace/projects/shared/src/lib/services/backoffice.service.ts`

No se modificó:

- `send-sms`
- adapter proveedor
- API keys
- SMS múltiple
- Excel

## 4. Flujo anterior

Archivo:

- `angular-workspace/projects/backoffice-admin/src/app/pages/accounts-page.component.ts`

Flujo:

1. Admin edita cliente.
2. `saveClient()` arma payload.
3. Llama `backofficeService.updateClientBasicInfo(...)`.
4. Service llamaba `admin_update_client_profile`.
5. Luego recargaba detalle desde DB.

Problema:

- RPC legacy no sincronizaba `companies.ruc`.

## 5. Nueva RPC

Nombre:

```sql
public.admin_update_profile_company_ruc(
  p_actor_user_id uuid,
  p_profile_id uuid,
  p_full_name text,
  p_razon_social text,
  p_ruc text,
  p_phone text,
  p_is_active boolean
)
```

Reglas implementadas:

- `security definer`.
- `set search_path = public`.
- Valida admin con `public.admins.id = p_actor_user_id and is_active = true`.
- Valida RUC 11 dígitos.
- Valida teléfono `+51XXXXXXXXX` si existe.
- Bloquea si profile no existe.
- Bloquea si profile es admin.
- Bloquea si `profile.company_id is null`.
- Bloquea si company no existe.
- Bloquea si company tiene más de 1 usuario activo.
- Bloquea si nuevo RUC ya existe en otra company.
- Actualiza `companies.ruc`.
- Actualiza `companies.razon_social`.
- Actualiza `profiles.full_name`.
- Actualiza `profiles.razon_social`.
- Actualiza `profiles.ruc`.
- Actualiza `profiles.phone`.
- Actualiza `profiles.is_active`.
- No mueve ledger.
- No modifica `sms_messages` históricos.
- Inserta audit log si `profile_audit_logs` existe.

Errores claros:

- `NOT_AUTHORIZED`
- `INVALID_RUC`
- `INVALID_PHONE`
- `PROFILE_NOT_FOUND`
- `CANNOT_UPDATE_ADMIN_PROFILE`
- `PROFILE_COMPANY_REQUIRED`
- `COMPANY_NOT_FOUND`
- `COMPANY_HAS_MULTIPLE_ACTIVE_USERS_REQUIRES_MANUAL_REVIEW`
- `RUC_ALREADY_ASSIGNED_TO_OTHER_COMPANY_REQUIRES_MANUAL_MERGE`

## 6. Cambio admin service

Archivo:

- `angular-workspace/projects/shared/src/lib/services/backoffice.service.ts`

Antes:

```ts
this.supabase.instance.rpc('admin_update_client_profile', ...)
```

Ahora:

```ts
const actorUserId = await this.getCurrentUserId();
this.supabase.instance.rpc('admin_update_profile_company_ruc', {
  p_actor_user_id: actorUserId,
  ...
})
```

También se agregaron mensajes amigables para:

- profile sin company.
- company inexistente.
- company multiusuario activa.
- RUC asignado a otra company.

## 7. Recarga desde DB

El componente ya hacía recarga real:

- `refreshSelectedClient()`
- `loadClients()`

Se mantiene.

Después de guardar, UI vuelve a leer DB. No queda solo estado local.

## 8. Resultado esperado

Al editar RUC desde admin:

- `profiles.ruc = nuevo RUC`
- `profiles.razon_social = nueva razón social`
- `profiles.full_name` actualizado si aplica
- `profiles.phone` actualizado si aplica
- `companies.ruc = nuevo RUC`
- `companies.razon_social = nueva razón social`
- `send-sms` usa nuevo RUC porque resuelve por `company_id -> companies.ruc`

## 9. Validaciones locales

Ejecutado:

```bash
rg -n "admin_update_profile_company_ruc|admin_update_client_profile|COMPANY_HAS_MULTIPLE|RUC_ALREADY|PROFILE_COMPANY_REQUIRED|getCurrentUserId" ...
rg -n "services-fortuna\.com|SMS_PROVIDER_MODE\s*=\s*['\"]production|functions deploy|db push" ...
npm run build
git status --short
git diff --stat
git diff --name-only
```

Build:

- `npm run build`: OK.
- `sms-client`: OK.
- `backoffice-admin`: OK.

Nota:

- Node local `v25.9.0` muestra warning por versión impar/no LTS.
- Build no falló.

## 10. Comandos NO ejecutados

No se ejecutó:

- `supabase db push`
- `supabase db reset`
- `supabase functions deploy`
- SQL remoto
- Migration remota
- Backfill
- Proveedor real
- `curl`/`fetch`/HTTP a `services-fortuna.com`
- Cambio `SMS_PROVIDER_MODE=production`
- Activación API keys
- Activación SMS múltiple
- Activación Excel
- Borrado de datos
- `git commit`
- `git push`

## 11. Riesgos pendientes

- Migration local debe revisarse/aplicarse con aprobación antes de probar en remoto.
- Company con más de 1 usuario activo requiere revisión manual para cambio de RUC.
- RUC ya existente en otra company requiere merge manual.
- Ledger histórico queda en company actual; no se mueve.
- `sms_messages` históricos conservan RUC/response históricos.

## 12. Decisión recomendada

Fix local OK.

Siguiente:

1. Revisar migration.
2. Aplicar migration solo con aprobación.
3. Probar edición RUC en admin.
4. Confirmar:
   - `profiles.ruc = companies.ruc`
   - `send-sms` mock usa RUC nuevo
5. Mantener proveedor real apagado.
