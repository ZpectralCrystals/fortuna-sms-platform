# FASE 7C - Cierre y validación de Templates SMS existentes

## Estado final

LISTO.

El módulo de Plantillas SMS ya existía. No se reconstruyó, no se duplicó tabla, no se creó módulo paralelo y no se tocó Supabase/Edge Function.

## Tabla usada

Tabla real usada:

```text
public.templates
```

No se encontró uso runtime de:

- `sms_templates`
- `message_templates`
- tabla `users`

Migración local relacionada:

- `supabase/migrations/20260502203500_create_sms_templates.sql`

La tabla `templates` apunta a:

```sql
user_id uuid not null references public.profiles(id) on delete cascade
```

RLS:

- cliente lee sus plantillas (`user_id = auth.uid()`)
- cliente crea sus plantillas (`user_id = auth.uid()`)
- cliente actualiza sus plantillas
- cliente elimina sus plantillas
- admin puede leer todas vía `public.is_admin()`

## Archivos revisados

- `projects/sms-client/src/app/dashboard/pages/templates-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/templates-page.component.html`
- `projects/sms-client/src/app/dashboard/pages/templates-page.component.scss`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.html`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.scss`
- `projects/shared/src/lib/services/sms.service.ts`
- `projects/shared/src/lib/models/sms.model.ts`
- `supabase/migrations/20260502203500_create_sms_templates.sql`

No existe `templates.service.ts` separado ni `template.model.ts` separado. La implementación vive en `SmsService` y `sms.model.ts`.

## Seguridad validada

- No usa `from('users')`.
- No usa `profiles.role`.
- No usa `service_role` en Angular.
- `listTemplates()` filtra por `user_id = auth.uid()`.
- `listActiveTemplates()` filtra por `user_id = auth.uid()` e `is_active = true`.
- `createTemplate()` fuerza `user_id` desde sesión actual.
- `updateTemplate()` actualiza solo `id` + `user_id` del usuario actual.
- `deleteTemplate()` elimina solo `id` + `user_id` del usuario actual.
- No inserta `sms_messages`.
- No actualiza `profiles.credits`.

## Pantalla Plantillas

Funcionalidad existente validada:

- listar plantillas propias.
- crear plantilla.
- editar plantilla.
- eliminar plantilla con confirmación.
- buscar por nombre, contenido o categoría.
- filtrar por categoría.
- mostrar variables detectadas.
- mostrar vista previa con valores de ejemplo.
- mostrar caracteres.
- mostrar segmentos estimados.
- mostrar estado vacío.

## Bugs encontrados

1. `Usar en envío` cargaba la plantilla en `/dashboard/send`, pero el mensaje base quedaba en modo plantilla rígido/readonly.
2. Variables quedaban como inputs obligatorios y podían bloquear envío si el usuario quería editar manualmente el texto.
3. Esto chocaba con el cierre solicitado: usar plantilla debe precargar mensaje, permitir edición manual y no enviar automáticamente.

## Bugs corregidos

En `/dashboard/send`:

- seleccionar plantilla ahora precarga `manualMessage` con `template.content`.
- textarea queda editable.
- contador caracteres/segmentos se recalcula desde mensaje editable.
- variables detectadas se muestran como chips informativos.
- placeholders `{variable}` ya no bloquean envío automáticamente.
- botón `Quitar plantilla` limpia el estado de plantilla, conservando texto actual.
- envío final usa el texto visible/editable en textarea.
- no se envía automáticamente.

## Estado de “Usar en envío”

Flujo final:

1. Cliente abre `/dashboard/templates`.
2. Click `Usar en envío`.
3. Navega a `/dashboard/send?templateId=<id>`.
4. `send-sms-page` carga plantilla activa del usuario.
5. Contenido se precarga en textarea editable.
6. Usuario puede modificar texto.
7. Contador caracteres/SMS se actualiza.
8. Envío individual real sigue usando Edge Function `send-sms`.

## SQL / Deploy

SQL adicional requerido: NO.

Deploy Edge Function requerido: NO.

## Resultado build

`npm run build`: OK.

Nota: aparece warning de Node v25 non-LTS, no bloquea build.

## Resultado rg

Validaciones obligatorias sin hallazgos:

- `from('users') | user:users | profiles.role | .role`: sin resultados.
- insert directo `sms_messages` / update `profiles.credits`: sin resultados.
- `service_role | SUPABASE_SERVICE_ROLE_KEY | sb_secret`: sin resultados.

## Pruebas manuales recomendadas

1. Abrir `/dashboard/templates`.
2. Crear plantilla con `{nombre}`.
3. Confirmar variables detectadas.
4. Confirmar vista previa con ejemplo.
5. Click `Usar en envío`.
6. Confirmar navegación a `/dashboard/send`.
7. Confirmar textarea editable con contenido precargado.
8. Editar `{nombre}` manualmente.
9. Confirmar contador caracteres/SMS cambia.
10. Enviar SMS individual.
11. Confirmar historial registra mensaje final editado.
