# FASE FIX - Gráfica dashboard cliente curva React/Vite

## Estado final

LISTO.

## Referencia React/Vite

- `../sms/src/pages/Dashboard.tsx`

## Técnica usada por React/Vite

React/Vite usa `recharts`:

```tsx
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={chartData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip />
    <Line type="monotone" dataKey="entregados" stroke="#10B981" strokeWidth={2} name="Entregados" />
  </LineChart>
</ResponsiveContainer>
```

## Cómo se replicó en Angular

- No se instaló librería nueva.
- Se replicó visual con SVG propio dentro del componente permitido.
- Curva real: path SVG con curvas cúbicas suaves, equivalente visual a `type="monotone"`.
- Puntos redondos visibles.
- Grid dashed tenue.
- Eje Y numérico.
- Labels de días abajo.
- Tooltip limpio al hover/focus.
- Color verde `#10B981`.
- Altura `300px`, misma que React/Vite.

## Cambio semántico obligatorio

React/Vite decía `Tasa de entrega` y `Entregados`.
Angular ahora dice:

```text
Mensajes enviados por día
```

Tooltip:

```text
Enviados: N
N SMS
```

Sin porcentajes. Sin delivery. Sin textos de entrega.

## Data real

Fuente:

- `sms_messages` del usuario autenticado.

Cálculo por día, últimos 7 días:

```text
count(status = sent) + count(status futuro de entrega si existe)
```

No usa mocks. No usa datos React/Vite hardcodeados.

## Archivos modificados

- `projects/sms-client/src/app/dashboard/pages/dashboard-overview-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/dashboard-overview-page.component.html`
- `projects/sms-client/src/app/dashboard/pages/dashboard-overview-page.component.scss`

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
3 files changed, 345 insertions(+), 213 deletions(-)
```

## Resultado rg

Sin resultados:

```bash
rg "Tasa de entrega|Tasa de éxito|Entregados|Entregado|delivery|delivered" projects/sms-client/src/app/dashboard/pages/dashboard-overview-page* -n || true
rg "mock|fake|hardcode|Oferta especial|Codigo de verificacion|Gracias por tu compra|FRT|FORTUNA20" projects/sms-client/src/app/dashboard -n || true
rg "from\\('users'\\)|user:users|profiles\\.role|\\.role" projects supabase || true
rg "from\\('sms_messages'\\).*insert|from\\('profiles'\\).*update|profiles\\.credits.*=" projects || true
rg "service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret" projects || true
```
