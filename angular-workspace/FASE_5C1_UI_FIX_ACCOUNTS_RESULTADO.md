# FASE 5C.1 - Fix UI/UX de accounts

Fecha: 2026-05-02

## Estado final

LISTO.

`/accounts` queda mas compacto, claro y consistente. Edicion separada visualmente del detalle. Validacion de telefono acepta `+51956062256`.

## Problemas corregidos

- Badge `Activo/Inactivo` reducido a pill chico, sin romper layout.
- Detalle cliente compacto, con header claro, metricas livianas y secciones ordenadas.
- Edicion ya no queda mezclada con detalle: al editar, el modal cambia a vista limpia de formulario.
- Email usa `overflow-wrap: anywhere` sin cortes feos de layout.
- Cards principales mas bajas y compactas.
- Auditoria vacia muestra: `Aún no hay cambios auditados para este cliente.`
- Auditoria con datos muestra accion, admin, fecha y resumen de campos cambiados.
- Telefono `+51956062256` validado OK.
- Servicio normaliza telefono con `trim()` y elimina espacios internos antes de llamar RPC.

## Archivos modificados

- `projects/backoffice-admin/src/app/pages/accounts-page.component.ts`
- `projects/backoffice-admin/src/app/pages/accounts-page.component.html`
- `projects/backoffice-admin/src/app/pages/accounts-page.component.scss`
- `projects/shared/src/lib/services/backoffice.service.ts`
- `FASE_5C1_UI_FIX_ACCOUNTS_RESULTADO.md`

## Mejoras UI

- Lista principal:
  - tarjetas compactas.
  - menos metadata visible.
  - creditos/gastado alineados.
  - accion principal `Ver detalle`.
  - estado como badge chico.

- Modal detalle:
  - header limpio: nombre, email, empresa/RUC, estado.
  - acciones principales separadas.
  - metricas en grid compacto.
  - perfil en grid pequeño.
  - recargas y mensajes en dos columnas.
  - auditoria al final.
  - mejor scroll y responsive.

- Modal edicion:
  - vista separada dentro del modal.
  - formulario compacto.
  - error arriba del formulario.
  - nota de campos no editables.

## Validacion telefono

Frontend:

```ts
const phone = value.trim().replace(/\s+/g, '');
/^\+51\d{9}$/
```

Servicio:

```ts
p_phone: this.normalizePhone(payload.phone)
```

Backend/RPC existente:

```sql
^\+51[0-9]{9}$
```

Prueba local:

```text
+51956062256 -> true
+51 956062256 -> normaliza a +51956062256 -> true
```

## Auditoria

- Se refresca al guardar porque `saveClient()` llama `refreshSelectedClient()`.
- `getClientDetail()` carga `listClientAuditLogs(profileId, 5)`.
- Si no hay logs, muestra empty state agradable.
- Si admin no resuelve nombre/email, muestra `Admin`.

## Seguridad mantenida

- Sigue usando RPC:
  - `admin_update_client_profile`
  - `admin_set_client_active`
- No vuelve update directo a `profiles`.
- No toca `credits`.
- No toca `total_spent`.
- No service role ni secrets en Angular.
- No users.
- No permissions nuevas.

## Pruebas manuales recomendadas

1. Abrir `/accounts`.
2. Verificar cards compactas y badge normal.
3. Abrir detalle cliente.
4. Verificar email legible.
5. Cambiar a editar.
6. Guardar telefono `+51956062256`.
7. Guardar telefono con espacios `+51 956062256`.
8. Probar telefono invalido.
9. Guardar cambio y confirmar mensaje success.
10. Verificar auditoria reciente actualizada.
11. Verificar responsive en ancho movil.

## Validaciones ejecutadas

```bash
npm run build
git diff --check
git diff --stat
rg "from\\('users'\\)|user:users|profiles\\.role|\\.role" projects supabase || true
rg "service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret" projects || true
rg "from\\('profiles'\\).*update|profiles\\.credits.*=|total_spent.*=" projects || true
```

Resultado:

- Build OK.
- `git diff --check` OK.
- Los 3 `rg` pedidos sin resultados.
