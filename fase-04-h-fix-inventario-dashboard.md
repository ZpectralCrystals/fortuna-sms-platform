# Fase 04-H - Fix inventario dashboard

## 1. Resumen

Se corrigio `Inventario Disponible` para usar inventario local de compras SMS.

La card ya no depende de:

- `admin-sync-provider-balance`
- `/sms/consultar/proveedor`
- `provider_balance_snapshots`

Origen actual:

- compras locales guardadas en `inventory_purchases`
- recargas aprobadas en `recharges`

## 2. Flujo Comprar SMS revisado

Dashboard admin:

- boton `Comprar SMS`
- modal de compra
- `handlePurchase()`
- `BackofficeService.addSmsInventory(...)`
- RPC local `admin_add_sms_inventory`
- tabla local `inventory_purchases`

Mensaje de exito:

```text
Compra de SMS agregada al inventario exitosamente
```

Despues de guardar, el componente ejecuta:

- `loadStats()`
- `loadPurchases()`
- `loadInventory()`

Eso permite actualizar card sin refresh manual.

## 3. Calculo corregido

Formula aplicada:

```text
total_inventory_sms = SUM(inventory_purchases.quantity)
approved_sms_sold = SUM(recharges.sms_credits WHERE status = 'approved')
inventory_available_sms = max(total_inventory_sms - approved_sms_sold, 0)
```

Valores card:

- `Inventario Disponible` = `available_sms`
- subtitulo `Total` = `total_sms`

## 4. Archivos modificados

- `angular-workspace/projects/shared/src/lib/services/backoffice.service.ts`

Archivos revisados sin cambio funcional nuevo en esta fase:

- `angular-workspace/projects/sms-client/src/app/admin/pages/dashboard-page.component.ts`
- `angular-workspace/projects/sms-client/src/app/admin/pages/dashboard-page.component.html`
- `angular-workspace/projects/backoffice-admin/src/app/pages/dashboard-page.component.ts`
- `angular-workspace/projects/backoffice-admin/src/app/pages/dashboard-page.component.html`

## 5. Dashboard admin

Se mantiene:

- `Comprar SMS` visible
- `Historial de Compras` visible
- cards con defaults seguros en `0`
- recarga posterior a compra mediante `loadStats()`, `loadPurchases()` y `loadInventory()`

## 6. Proveedor no usado

No se llama automaticamente:

- `admin-sync-provider-balance`
- `/sms/consultar/proveedor`
- `provider_balance_snapshots`

No se llamo `services-fortuna.com`.

No se modifico `SMS_PROVIDER_MODE`.

## 7. Build

Comando ejecutado:

```bash
npm run build
```

Resultado: OK.

Compilo:

- `sms-client`
- `backoffice-admin`

Nota: Node mostro advertencia por version impar `v25.9.0`; no bloqueo build.

## 8. Riesgos pendientes

- Si existen recargas aprobadas historicas sin compra local equivalente, el disponible puede quedar `0` por la proteccion `max(..., 0)`.
- La formula usa todas las recargas aprobadas locales. Si luego se necesita excluir cuentas internas/admins, conviene centralizar filtro comercial en una RPC/read model.
- Validacion visual final requiere sesion admin activa.

## 9. Decision recomendada

Fase 04-H lista.

Recomendacion: probar compra desde `/admin/dashboard`; la card debe subir segun SMS agregados y mostrar total local comprado.
