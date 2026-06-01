# Fase 04-J - Fix inventario disponible real

## 1. Resumen

Se corrigio el calculo de `Inventario Disponible` para usar fuente local real:

```text
inventory_purchases.quantity - recharges.sms_credits approved
```

Con los datos reales indicados:

```text
total_inventory_sms = 31904
approved_sms_sold = 3300
inventory_available_sms = 28604
```

El dashboard debe mostrar:

- `Inventario Disponible`: `28,604`
- subtitulo: `Total: 31,904 SMS`

## 2. Archivos modificados

- `angular-workspace/projects/shared/src/lib/services/backoffice.service.ts`
- `angular-workspace/projects/sms-client/src/app/admin/pages/dashboard-page.component.ts`
- `angular-workspace/projects/backoffice-admin/src/app/pages/dashboard-page.component.ts`

Templates revisados:

- `angular-workspace/projects/sms-client/src/app/admin/pages/dashboard-page.component.html`
- `angular-workspace/projects/backoffice-admin/src/app/pages/dashboard-page.component.html`

## 3. Fuente inventario

Se usa solo fuente local:

- `inventory_purchases.quantity`
- `recharges.sms_credits`
- `recharges.status = 'approved'`

No se usa:

- `provider_balance_snapshots`
- `admin-sync-provider-balance`
- `/sms/consultar/proveedor`

## 4. Calculo implementado

En `BackofficeService.getInventoryState()`:

```text
total_sms = SUM(inventory_purchases.quantity)
sold_sms = SUM(recharges.sms_credits WHERE status = 'approved')
available_sms = max(total_sms - sold_sms, 0)
```

Se agrego lectura paginada con `range()` para no depender del limite default de Supabase.

Se agrego parse numerico defensivo para strings numericos.

Si falla una query:

- `console.warn(...)` sin secretos
- retorna `0`
- cards no quedan vacias

## 5. Dashboard admin

Ambos dashboards usan misma logica:

- `sms-client` admin
- `backoffice-admin`

Se agrego `loadDashboard()`:

- carga stats
- carga historial compras
- recarga inventario local

Despues de `Comprar SMS`, el flujo llama `loadDashboard()` y evita dejar valores viejos en memoria.

## 6. Render card

La card sigue renderizando siempre:

```html
{{ formatNumber(inventoryAvailableSms) }}
Total: {{ formatNumber(inventoryTotalSms) }} SMS
```

Nombres confirmados:

- `inventoryAvailableSms`
- `inventoryTotalSms`
- `approvedSmsSold`

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

## 8. Restricciones cumplidas

No se modifico:

- `send-sms`
- proveedor
- Edge Functions
- DB
- migrations
- `SMS_PROVIDER_MODE`
- API keys
- SMS multiple
- Excel

No se llamo:

- `services-fortuna.com`
- endpoint proveedor

## 9. Riesgos pendientes

- Validacion visual final requiere sesion admin real en browser.
- Si RLS bloquea `inventory_purchases` o `recharges`, se vera `0` y console.warn mostrara error seguro.
- Si el negocio quiere excluir recargas no comerciales, conviene mover formula a RPC/read model admin.

## 10. Decision recomendada

Fase 04-J lista.

Probar en `/admin/dashboard` con sesion admin:

- `Inventario Disponible = 28,604`
- `Total: 31,904 SMS`
- luego comprar SMS y confirmar que `Total` sube sin refresh manual.
