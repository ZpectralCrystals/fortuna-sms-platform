# FASE 3D - QA tecnico pre SMS real

Fecha: 2026-05-02
Commit base revisado: `bde0485 feat: connect clean Supabase recharge and inventory flows`

## Estado final

PARCIAL para FASE 4 SMS real.

El codigo Angular queda estable por build y chequeos estaticos. Falta ejecutar prueba manual real con sesion cliente/admin contra Supabase limpio antes de activar SMS real.

## Hallazgos

- Cliente `/dashboard/recharges`: usa paquetes reales desde `sms_packages`, crea solicitudes en `recharges`, lista historial real del usuario y no modifica `profiles.credits`.
- Cliente: los creditos se leen desde `profiles`; se veran actualizados al recargar/navegar despues de aprobacion. No hay realtime ni polling en esta fase.
- Backoffice `/dashboard`: lee inventario desde `sms_inventory`, lista compras desde `inventory_purchases` y agrega inventario por RPC `admin_add_sms_inventory`.
- Backoffice `/recharges`: lista recargas reales con `profiles` y `sms_packages`, aprueba por RPC `admin_approve_recharge` y rechaza por RPC `admin_reject_recharge`.
- Seguridad: no se encontro `from('users')`, `user:users`, `profiles.role` ni `.role` en `projects`.
- Seguridad: no se encontraron updates directos a `recharges`, `profiles` o `sms_inventory` en `projects`.
- Operaciones criticas siguen por RPC; Angular no toca inventario, creditos ni estados de recarga con updates directos.

## Bugs corregidos

- Backoffice recargas: si `full_name` llega null/vacio, ahora muestra email; si tampoco hay email, muestra `Cliente sin nombre`.
- Backoffice recargas: modales de aprobar/rechazar usan el mismo fallback de cliente.
- Backoffice dashboard: el inventario directo de `sms_inventory` ahora se carga despues de stats para evitar que una respuesta tardia de stats pise los valores reales.
- Backoffice recargas: texto heredado de creacion manual ya no menciona FASE 3 como pendiente.

## Archivos modificados

- `projects/backoffice-admin/src/app/pages/dashboard-page.component.ts`
- `projects/backoffice-admin/src/app/pages/recharges-page.component.ts`
- `projects/backoffice-admin/src/app/pages/recharges-page.component.html`
- `FASE_3D_QA_PRE_SMS_RESULTADO.md`

## Chequeos ejecutados

```bash
npm run build
git diff --check
rg "from\\('users'\\)|user:users|profiles\\.role|\\.role" projects || true
rg "from\\('recharges'\\).*update|update\\(.*recharges|from\\('profiles'\\).*update|from\\('sms_inventory'\\).*update" projects || true
git diff --stat
```

## Resultado de chequeos

- `npm run build`: OK para `sms-client` y `backoffice-admin`.
- Warning no bloqueante: Node.js `v25.9.0` es version impar no LTS.
- `git diff --check`: OK, sin whitespace errors.
- Busqueda `users/profiles.role/.role`: sin resultados.
- Busqueda updates directos criticos: sin resultados.

## Pruebas manuales recomendadas

1. Cliente: login con cliente real, entrar a `/dashboard/recharges`, confirmar paquetes activos y precios.
2. Cliente: crear recarga con metodo de pago y codigo opcional; verificar mensaje de solicitud pendiente.
3. Cliente: validar historial con paquete, monto, metodo, codigo, estado y fechas.
4. Backoffice: login admin activo, entrar a `/dashboard`, validar inventario real y compras.
5. Backoffice: agregar compra de inventario por RPC y verificar que inventario/refrescos cambian.
6. Backoffice: entrar a `/recharges`, aprobar recarga pendiente con codigo de operacion y confirmar refresco.
7. Cliente: recargar pagina o volver al dashboard para confirmar creditos actualizados tras aprobacion.
8. Backoffice: rechazar otra recarga pendiente y verificar motivo/estado.
9. Probar errores RPC: inventario insuficiente, recarga ya procesada y admin no autorizado.

## Riesgos / pendientes

- No se ejecuto prueba manual de navegador contra Supabase real desde esta sesion.
- Cliente no tiene realtime/polling para creditos; requiere refresh/navegacion para ver aprobaciones hechas en backoffice.
- SMS real, API keys, Edge Functions y proveedor siguen fuera de alcance.

## Siguiente fase recomendada

Antes de FASE 4, ejecutar pruebas manuales anteriores en ambiente real. Luego implementar SMS real con Edge Functions/RPC seguras, sin secrets en frontend y sin service role en Angular.
