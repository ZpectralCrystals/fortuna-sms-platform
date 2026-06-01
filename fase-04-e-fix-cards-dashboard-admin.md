# Fase 04-E - Fix cards dashboard admin

## 1. Resumen

Se corrigieron las 4 cards superiores del dashboard admin visible en `/admin/dashboard`.

Problema observado: las secciones inferiores cargaban datos, pero las cards superiores quedaban como cajas blancas. La causa probable estaba en el render dinamico de `statCards` con `@for`, `@switch` y clases dinamicas. Para evitar cards vacias, se reemplazo el bloque superior por markup explicito y getters con defaults seguros.

Resultado esperado: las cards siempre muestran titulo, valor y subtitulo, incluso si el servicio falla o devuelve datos incompletos.

## 2. Archivos modificados

- `angular-workspace/projects/sms-client/src/app/admin/pages/dashboard-page.component.ts`
- `angular-workspace/projects/sms-client/src/app/admin/pages/dashboard-page.component.html`
- `angular-workspace/projects/backoffice-admin/src/app/pages/dashboard-page.component.ts`
- `angular-workspace/projects/backoffice-admin/src/app/pages/dashboard-page.component.html`

Archivo revisado sin cambio nuevo en esta fase:

- `angular-workspace/projects/shared/src/lib/services/backoffice.service.ts`

## 3. Causa tecnica

El dashboard si cargaba datos parcialmente porque las secciones inferiores mostraban metricas de mensajes.

El riesgo estaba concentrado en las cards superiores:

- render dependiente de `statCards`
- iconos por `@switch`
- clases por `[ngClass]`
- valores armados dentro del getter

Si alguna parte del bloque fallaba o quedaba sin binding valido, la card podia quedar visualmente vacia.

## 4. Defaults implementados

Se agregaron getters seguros para que las cards superiores nunca reciban `undefined`, `null` o `NaN`:

- `inventoryAvailableSms = 0`
- `inventoryTotalSms = 0`
- `totalRevenue = 0`
- `approvedSmsSold = 0`
- `pendingRecharges = 0`
- `totalUsers = 0`
- `activeUsers = 0`

Tambien se agrego `safeMetric()` para normalizar cualquier valor no numerico a `0`.

## 5. Cards restauradas

Las 4 cards superiores ahora renderizan siempre:

- Inventario Disponible
- Ingresos
- Recargas Pendientes
- Total Usuarios

Los valores salen desde getters seguros y mantienen formato `es-PE`.

## 6. Boton Comprar SMS ocultado

El acceso visual a `Comprar SMS` queda oculto con:

- `SHOW_SMS_PURCHASE_CONTROLS = false`
- boton protegido por `@if (showSmsPurchaseControls)`
- modal protegido por `@if (showSmsPurchaseControls && showPurchaseModal)`
- `openPurchaseModal()` retorna sin accion si el flag esta apagado

No se borraron rutas ni flujo legacy.

## 7. Logs seguros

Se agrego `console.debug()` solo en entorno no production:

- `dashboard stats loaded`
- `inventory loaded`

El log solo imprime metricas numericas del dashboard. No imprime secrets, tokens, URLs privadas ni payloads crudos.

## 8. Backend y proveedor

No se modifico backend.

No se modifico DB.

No se modificaron Edge Functions.

No se llamo `services-fortuna.com`.

No se cambio `SMS_PROVIDER_MODE`.

No se activo production.

No se tocaron API keys, SMS multiple ni Excel.

## 9. Build

Comando ejecutado:

```bash
npm run build
```

Resultado: OK.

El build compilo:

- `sms-client`
- `backoffice-admin`

Nota: Node mostro advertencia por version impar `v25.9.0`; no bloqueo build.

## 10. Validacion local browser

Se intento abrir:

```text
http://localhost:4200/admin/dashboard
```

Resultado: la app redirigio a:

```text
http://localhost:4200/login
```

Motivo: no habia sesion admin activa en el browser local. Por eso la validacion visual directa de las cards queda pendiente con login admin real.

Senal positiva: el build compila y el template ya contiene las 4 cards estaticas con defaults seguros.

## 11. Riesgos pendientes

- Validar visualmente en `http://localhost:4200/admin/dashboard` con sesion admin real.
- Si inventario proveedor no tiene snapshot ni mock disponible, la card muestra `0`, no queda vacia.
- `Historial de Compras` queda visible porque no rompe el dashboard y no activa compra directa.

## 12. Decision recomendada

Fase 04-E queda lista para revision visual.

Recomendacion: abrir `/admin/dashboard`, confirmar que las 4 cards superiores muestran texto/numeros y que `Comprar SMS` no aparece.
