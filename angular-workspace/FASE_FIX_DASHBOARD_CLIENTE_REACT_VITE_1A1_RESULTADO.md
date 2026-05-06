# FASE FIX - Dashboard cliente Angular igual a React/Vite con data real

## Estado final

LISTO.

## Archivo React/Vite usado como referencia

- `../sms/src/pages/Dashboard.tsx`

## Diferencias encontradas

- Angular tenía 5 cards; React/Vite usa 4 cards superiores.
- Angular mostraba orden distinto de métricas.
- Angular no tenía icono `check circle` para Entregados.
- Angular mostraba gráfica CSS equivalente, pero menos parecida al layout con ejes del diseño React/Vite.
- Angular ya usaba data real desde Supabase; no se detectaron mocks en dashboard.

## Archivos Angular modificados

- `projects/sms-client/src/app/dashboard/pages/dashboard-overview-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/dashboard-overview-page.component.html`
- `projects/sms-client/src/app/dashboard/pages/dashboard-overview-page.component.scss`

## Iconos corregidos

- Total Enviados: paper plane / send.
- Entregados: check circle.
- Fallidos: x circle.
- Saldo disponible: credit card.

## Cards corregidas

Orden final igual al diseño React/Vite:

1. Total Enviados
2. Entregados
3. Fallidos
4. Saldo disponible

## Gráficas corregidas

- `SMS por día (últimos 7 días)` mantiene barras de enviados y entregados.
- `Tasa de entrega` mantiene línea de entregados.
- Se agregaron labels/ejes visuales para acercar la gráfica al diseño React/Vite.
- No se agregó librería nueva; se mantiene implementación CSS/SVG.

## Métricas con data real

- Saldo disponible: `profiles.credits`.
- Equivalente soles: `profiles.credits * 0.08`.
- Total Enviados: `sms_messages.status in ('sent', 'delivered')`.
- Entregados: `sms_messages.status = 'delivered'`.
- Fallidos: `sms_messages.status = 'failed'`.
- SMS por día: mensajes reales del usuario por `created_at`, últimos 7 días.
- Entregados por día: mensajes reales `status = 'delivered'`.
- Mensajes recientes: últimos 5 `sms_messages` reales del usuario.

## Datos mock

- No se encontraron textos mock en `projects/sms-client/src/app/dashboard`.
- No se agregaron datos hardcodeados.
- No se inventan entregados: solo se cuentan si existen como `delivered`.

## Resultado build

OK.

```text
npm run build
sms-client OK
backoffice-admin OK
```

Nota: Node local muestra advertencia por versión impar `v25.9.0`, pero build finaliza correctamente.

## Resultado git diff

```text
3 files changed, 136 insertions(+), 78 deletions(-)
```

## Resultado rg

Sin coincidencias.

```bash
rg "Tu pedido|Oferta especial|Codigo de verificacion|Gracias por tu compra|FRT|FORTUNA20|mock|hardcode|fake" projects/sms-client/src/app/dashboard -n || true
rg "from\\('users'\\)|user:users|profiles\\.role|\\.role" projects supabase || true
rg "from\\('sms_messages'\\).*insert|from\\('profiles'\\).*update|profiles\\.credits.*=" projects || true
rg "service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret" projects || true
```
