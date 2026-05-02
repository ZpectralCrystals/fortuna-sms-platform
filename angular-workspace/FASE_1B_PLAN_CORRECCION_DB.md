# FASE 1B - Plan de correccion DB

## Estado base

No se ejecuto ningun cambio en Supabase. Este plan depende de correr `FASE_1B_DIAGNOSTICO_SUPABASE.sql` en el Supabase real limpio.

## OK

- Angular FASE 1 ya no usa `from('users')` en runtime.
- Cliente usa `profiles`.
- Admin usa `admins`.
- Permisos backoffice no usan `profiles.role`.
- `supabase_final/schema_final.sql` no crea `public.users`.
- `supabase_final/schema_final.sql` modela `recharges.user_id -> profiles.id`.
- `supabase_final/schema_final.sql` modela `api_keys` con `key_hash`, `key_prefix`, `key_suffix`.
- `supabase_final/schema_final.sql` modela `sms_provider_config` sin `api_key` ni `api_secret`.

## Advertencia

- `ANALISIS_SMS_LEGACY_PARA_ANGULAR.md` no fue encontrado.
- `ANALISIS_BACKOFFICE_LEGACY_PARA_ANGULAR.md` no fue encontrado.
- Migraciones legacy contienen varias referencias a `users`, `profiles.role`, `api_keys.key`, `provider_config.api_key`, `sms_provider_config.api_key/api_secret` y tablas de integracion.
- `SUPABASE_FINAL_UNIFICADO.md` fue escrito antes del cierre de FASE 1 y menciona que Angular todavia usaba `from('users')`; eso ya quedo corregido.

## Critico

Marcar critico si el diagnostico real encuentra:

- `public.users` existe.
- Alguna FK apunta a `public.users`.
- `recharges.user_id` apunta a `users.id` en vez de `profiles.id`.
- `api_keys.key` o `api_keys.api_key` existe como plaintext.
- `sms_provider_config.api_key` o `sms_provider_config.api_secret` existe.
- Tablas legacy existen con secrets: `provider_config`, `integration_api_keys`, `platform_sync_config`.
- RPCs usados por FASE 2 dependen de `profiles.role`.
- RLS de `profiles` o `admins` esta deshabilitado.

## No tocar todavia

- No crear tabla `users`.
- No borrar tabla ni columna.
- No ejecutar `DROP`.
- No ejecutar `ALTER`.
- No cargar backups viejos.
- No aplicar migraciones legacy.
- No copiar integraciones legacy.
- No tocar SMS real.
- No tocar API keys reales.
- No tocar datos reales.
- No guardar secrets en tablas.

## Corregir antes de FASE 2

Requerido antes de construir recargas funcionales:

- Confirmar `profiles` y `admins` existen.
- Confirmar `admins.id = auth.users.id`.
- Confirmar `profiles.id = auth.users.id`.
- Confirmar `users` no existe en DB real.
- Confirmar `recharges.user_id` referencia `profiles.id`.
- Confirmar no hay FK a `users`.
- Confirmar RLS activo en `profiles` y `admins`.
- Confirmar policies:
  - `profiles`: self read/update + admin read/update via `is_admin()`.
  - `admins`: self read + admin/superadmin management controlado.
- Reemplazar cualquier RPC necesaria que use `profiles.role`.
- Ajustar `get_dashboard_stats()` si usa `p.role = 'client'`.
- Confirmar `api_keys` no tiene plaintext key.
- Confirmar `sms_provider_config` no tiene secrets.

## Corregir despues de FASE 2

Puede esperar si no bloquea recargas:

- Limpieza documental de `README_MIGRACION.md`.
- Eliminar o archivar migraciones legacy fuera del flujo de despliegue.
- Blog DB opcional.
- Campanias/marketing opcional.
- Alertas bajo saldo funcionales.
- Sync/integraciones externas.
- Webhook logs/auditoria avanzada.
- Storage de integration kit.

## Plan si aparece `users`

No hacer cambios inmediatos.

1. Confirmar si tiene datos reales.
2. Confirmar FK entrantes/salientes.
3. Confirmar si alguna RPC activa la usa.
4. Congelar FASE 2 hasta decidir migracion no destructiva.
5. Preparar script de correccion revisado aparte, nunca automatico en FASE 1B.

## Plan si aparece `profiles.role`

No usarla.

1. Listar RPCs/policies que la referencian.
2. Prioridad alta: `get_dashboard_stats()` y cualquier RPC usada por recargas/dashboard.
3. Cambiar conteo cliente a exclusion por `admins` o criterio explicito no-role.
4. Mantener permisos admin solo con `admins`.

## Plan si aparece `api_keys.key`

Bloquea FASE 2 si API keys reales entran al alcance.

1. No mostrar keys desde frontend.
2. Diseniar `key_hash`, `key_prefix`, `key_suffix`.
3. Edge Function genera plaintext una sola vez.
4. `send-sms` valida hash server-side.

## Plan si aparecen secrets en tablas

Bloquea SMS real.

1. No leer secrets desde Angular.
2. Mover secretos a environment de Edge Functions en fase dedicada.
3. Dejar tablas solo con config no secreta.

## Criterio final

LISTO para FASE 2 si diagnostico real cumple:

- Core tables presentes.
- `users` ausente.
- FK recargas a `profiles`.
- RLS profiles/admins activo.
- No plaintext API keys.
- No provider secrets en tablas.
- RPCs necesarias sin `profiles.role`.

Con los artefactos locales actuales, estado preliminar: PARCIAL.

Motivo:

- Modelo final va bien en Angular.
- `schema_final.sql` aun contiene `profiles.role`.
- `get_dashboard_stats()` aun usa `p.role = 'client'`.
- DB real falta validar con SQL.
