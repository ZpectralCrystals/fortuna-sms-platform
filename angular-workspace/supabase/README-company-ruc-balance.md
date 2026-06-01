# Fortuna SMS - Modelo empresa/RUC/saldo

Estado: Fase 03-A local. No ejecutar migrations ni deploy sin revisión humana.

## Modelo

- `companies`: una empresa por RUC único.
- `company_users`: vincula varios usuarios a una empresa.
- `company_balance_transactions`: ledger comercial local. Es la fuente de verdad del saldo cliente/RUC.
- `provider_balance_transactions`: registro local de recargas al proveedor operativo.
- `provider_balance_snapshots`: snapshots read-only del saldo proveedor consultado.

`profiles.credits` queda como campo legacy temporal. Las nuevas RPCs sincronizan ese valor como espejo para compatibilidad, pero no debe tomarse como fuente comercial.

## Bono inicial

- 10 SMS una sola vez por `companies.ruc`.
- Valor referencial: 10 x S/ 0.08 = S/ 0.80.
- Control: `companies.starter_bonus_granted_at`.
- RPC: `internal_grant_starter_bonus_for_company`.
- Signup: `handle_new_user()` crea/reutiliza empresa si el RUC es válido, vincula `company_users`, asigna `profiles.company_id` y llama el bono solo si la empresa aún no tiene `starter_bonus_granted_at`.

## Preflight de columnas

La migration `20260529143000_company_ruc_balance_model.sql` valida tablas base y columnas críticas antes de modificar schema. Si falta una columna, aborta con:

```text
COMPANY_RUC_PREFLIGHT_MISSING_COLUMNS
```

No crea schema falso. Antes de correrla se debe confirmar schema live/dump.

## Backfill companies desde profiles

Archivo:

```text
angular-workspace/supabase/sql/backfill_companies_from_profiles.sql
```

Hace:

- crea `companies` desde `profiles.ruc` válido y único
- usa `razon_social` disponible
- pobla `company_users`
- pobla `profiles.company_id`
- deja saldo inicial pendiente
- incluye SELECTs before/after
- termina con `rollback` por defecto

No ejecutar sin backup, revisión humana y decisión de saldo legacy.

## Saldo proveedor

- Registrar: Edge Function `admin-register-provider-balance`.
- Consultar snapshot: Edge Function `admin-sync-provider-balance`.
- Endpoints proveedor usados solo dentro de Edge Functions:
  - `POST /v1/api/sms/registrar/proveedor`
  - `GET /v1/api/sms/consultar/proveedor`

## Saldo cliente/RUC

- Registrar: Edge Function `admin-register-client-balance`.
- Consultar/comparar: Edge Function `admin-sync-client-balance`.
- Endpoints proveedor usados solo dentro de Edge Functions:
  - `POST /v1/api/sms/registrar/saldo`
  - `GET /v1/api/sms/consultar/saldo/{ruc}`

## SMS individual

`send-sms` valida sesión Supabase, resuelve empresa/RUC con `internal_begin_company_sms_send_attempt`, llama adapter proveedor con:

```text
POST /v1/api/sms/individual/{ruc}
```

Luego completa con:

- `internal_complete_company_sms_send_success`
- `internal_complete_company_sms_send_failed`

No expone respuesta cruda del proveedor al frontend.

## Adapter proveedor

Archivo:

```text
angular-workspace/supabase/functions/_shared/sms-provider-current.ts
```

Modo:

- `SMS_PROVIDER_MODE=production`: llama proveedor real.
- Cualquier otro valor: mock local, sin llamada externa.
- `prod`, `dev`, `test`, vacío o undefined NO llaman proveedor real.

El adapter no guarda tokens, no loguea tokens, normaliza `Bearer`, y sanitiza claves sensibles.

## Reconciliación provider OK/local fail

Si proveedor responde OK pero la RPC local falla, `send-sms` responde sin ocultar divergencia:

```json
{
  "success": false,
  "reconciliation_required": true,
  "reconciliation_reason": "provider_sent_local_completion_failed"
}
```

Acción operativa:

1. Buscar `attempt_id`, `company_id`, `ruc` en logs Edge.
2. Consultar provider por evidencia externa si aplica.
3. Completar ledger local con revisión manual.
4. No reintentar a ciegas con la misma operación si provider ya aplicó envío/recarga.

## Precheck legacy

Archivo:

```text
angular-workspace/supabase/sql/precheck_company_migration.sql
```

Uso previsto:

```sql
-- Ejecutar manualmente en SQL editor/psql antes de migrar datos.
\i angular-workspace/supabase/sql/precheck_company_migration.sql
```

Reporta total de perfiles, RUC válido/inválido, RUC duplicados, usuarios por RUC, `SUM(credits)`, `MAX(credits)` y posibles bonos duplicados. No modifica datos.

## No ejecutar todavía

No ejecutar en esta fase:

- `supabase db push`
- `supabase db reset`
- `supabase functions deploy`
- llamadas reales a `services-fortuna.com`
- migración de datos legacy sin revisar el precheck
- `backfill_companies_from_profiles.sql` sin aprobación

## Congelado

Quedan congelados hasta nueva aprobación:

- `api-send-sms`: responde `503 FEATURE_FROZEN`
- API keys
- SMS múltiple
- plantilla Excel
