# ESTADO ACTUAL DEL PROYECTO

## Apps actuales

### Portal cliente actual

Ubicacion:

```text
sms/
```

Estado:

- Proyecto actual existente.
- No fue movido.
- No fue modificado.

### Backoffice actual

Ubicacion:

```text
backoffice/
```

Estado:

- Proyecto actual existente.
- No fue movido.
- No fue modificado.

## Workspace Angular

Ubicacion:

```text
angular-workspace/
```

Contenido:

- `sms-client`: base Angular para portal cliente.
- `backoffice-admin`: base Angular para panel administrativo.
- `shared`: modelos, servicios, validadores y helpers compartidos.

Estado:

- Base Angular creada.
- Rutas iniciales configuradas.
- Guards base creados.
- Servicios base creados.
- Logica compleja aun no migrada.

## Reportes

Ubicacion:

```text
docs/01-reportes-qa/
```

Incluye:

- Auditoria completa.
- Reportes funcionales.
- Reportes QA visuales y funcionales.
- Versiones Word para cliente.
- Resumen ejecutivo.

## Evidencias

Ubicacion:

```text
docs/02-evidencias/
```

Organizacion:

- `sms/`: evidencias del portal cliente.
- `backoffice/`: evidencias del panel administrativo.
- `general/`: evidencias generales y temporales sin tocar `node_modules`.

## Planificacion

Ubicacion:

```text
docs/00-planificacion/
```

Incluye:

- Plan de migracion Angular.
- Cambios realizados en la base Angular.
- Plan de tareas del proyecto.

## Presentaciones

Ubicacion:

```text
docs/03-presentaciones/
```

Incluye:

- Presentacion QA en PowerPoint.
- Presentacion QA en PDF.

## Temporales y duplicados

Ubicacion:

```text
docs/04-temporales/
```

Uso:

- Guardar duplicados previos sin borrar informacion.
- Mantener trazabilidad de archivos anteriores.

Nota:

- `docs/qa_tmp/` contiene `node_modules`, por eso no se movio.

## Siguiente paso recomendado

Conectar Angular con Supabase dev:

1. Crear environments dev para `sms-client` y `backoffice-admin`.
2. Configurar `supabaseUrl` y `supabaseAnonKey` sin subir secretos sensibles.
3. Inicializar `SupabaseService` desde cada app.
4. Conectar primero login y session guard.
5. Validar rutas privadas con usuario real de prueba.
6. Migrar flujo SMS por etapas: dashboard, envio, historial, creditos y recargas.
7. Migrar backoffice por etapas: dashboard, usuarios, recargas, sincronizacion, alertas y kit de integracion.
