# FASE 5D - Plantillas SMS conectadas al envío

## Estado final

LISTO para uso en modo test después de aplicar la migración SQL en Supabase.

La UI del cliente ahora permite listar, crear, editar, eliminar y usar plantillas SMS propias. El envío individual puede cargar una plantilla activa y precargar el mensaje sin enviarlo automáticamente.

## Archivos modificados

- `projects/shared/src/lib/models/sms.model.ts`
- `projects/shared/src/lib/services/sms.service.ts`
- `projects/sms-client/src/app/dashboard/pages/templates-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/templates-page.component.html`
- `projects/sms-client/src/app/dashboard/pages/templates-page.component.scss`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.ts`
- `supabase/migrations/20260502_create_sms_templates.sql`

## Migración SQL creada

Archivo:

- `supabase/migrations/20260502_create_sms_templates.sql`

Debe ejecutarse en Supabase antes de probar la pantalla si la tabla `templates` aún no existe o si falta alguna columna.

Comando recomendado:

```bash
supabase db push
```

Alternativa manual:

```bash
supabase migration up
```

## Estructura usada para `templates`

Tabla esperada:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references public.profiles(id) on delete cascade`
- `name text not null`
- `content text not null`
- `category text not null default 'general'`
- `variables jsonb default '[]'::jsonb`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Categorías permitidas:

- `general`
- `marketing`
- `cobranza`
- `recordatorio`
- `soporte`
- `otro`

RLS:

- cliente ve solo sus plantillas
- cliente crea solo con `user_id = auth.uid()`
- cliente actualiza solo sus plantillas
- cliente elimina solo sus plantillas
- admin puede ver todas mediante `public.is_admin()`

## Queries usadas

Listar plantillas propias:

```ts
supabase.from('templates')
  .select('id, user_id, name, content, category, variables, is_active, created_at, updated_at')
  .eq('user_id', userId)
  .order('updated_at', { ascending: false })
```

Listar plantillas activas para `/dashboard/send`:

```ts
supabase.from('templates')
  .select('id, user_id, name, content, category, variables, is_active, created_at, updated_at')
  .eq('user_id', userId)
  .eq('is_active', true)
  .order('name', { ascending: true })
```

Crear:

```ts
supabase.from('templates').insert({
  user_id,
  name,
  content,
  category,
  variables
})
```

Editar:

```ts
supabase.from('templates')
  .update({ name, content, category, variables, updated_at })
  .eq('id', id)
  .eq('user_id', userId)
```

Eliminar:

```ts
supabase.from('templates')
  .delete()
  .eq('id', id)
  .eq('user_id', userId)
```

## Funcionalidades implementadas

- Listado real de plantillas propias.
- Creación de plantilla con nombre, categoría, contenido y variables detectadas.
- Edición de nombre, categoría y contenido.
- Eliminación con confirmación.
- Búsqueda por nombre, contenido o categoría.
- Filtro por categoría.
- Estado vacío y loading state.
- Contador de caracteres.
- Segmentos estimados con regla de 160 caracteres.
- Fechas de creación y actualización.
- Botón `Usar en envío` desde `/dashboard/templates`.
- Selector de plantillas activas en `/dashboard/send`.

## Uso de plantilla en `/dashboard/send`

Desde `/dashboard/templates`, el botón `Usar en envío` navega a:

```text
/dashboard/send?templateId=<id>
```

La pantalla de envío carga plantillas activas, busca el `templateId` y precarga el contenido en el textarea del mensaje. No envía automáticamente.

## Validaciones

Frontend:

- nombre requerido
- contenido requerido
- contenido máximo sugerido: 480 caracteres
- categoría requerida
- segmentos estimados por cada 160 caracteres

Base de datos:

- nombre no vacío
- contenido no vacío
- categoría dentro de la lista permitida
- RLS por usuario autenticado

## Qué no se tocó

- proveedor SMS real
- API keys
- secrets
- envío múltiple
- recargas
- inventario
- cuentas/backoffice
- envío directo a `sms_messages`
- actualización directa de créditos
- tabla `users`

## Pruebas manuales recomendadas

1. Aplicar migración en Supabase.
2. Entrar como cliente a `/dashboard/templates`.
3. Crear plantilla `Recordatorio` con contenido corto.
4. Confirmar que aparece en la lista.
5. Buscar por texto del contenido.
6. Filtrar por categoría.
7. Editar nombre y contenido.
8. Eliminar una plantilla con confirmación.
9. Crear otra plantilla activa.
10. Pulsar `Usar en envío`.
11. Confirmar que `/dashboard/send` precarga el mensaje.
12. Enviar SMS test y confirmar que el flujo sigue pasando por Edge Function.

## Riesgos pendientes

- Si Supabase real tenía una tabla `templates` legacy con categorías antiguas, la migración agrega la nueva restricción como `not valid` para no romper filas previas.
- Si `public.is_admin()` no existe en el ambiente, la policy admin debe ajustarse antes de aplicar la migración.
- La sustitución automática de variables como `{nombre}` queda pendiente.

## Siguiente fase recomendada

FASE 5E: variables de plantilla, previsualización con datos de prueba y preparación para envío múltiple sin tocar proveedor real todavía.
