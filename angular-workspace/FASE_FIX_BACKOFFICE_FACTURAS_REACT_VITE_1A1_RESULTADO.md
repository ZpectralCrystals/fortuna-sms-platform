# FASE FIX - Backoffice Facturas React/Vite 1:1

Fecha: 2026-05-07

## Estado final

**LISTO**

No requiere SQL. No requiere deploy Edge Function.

## Archivo React/Vite usado como referencia

- `../backoffice/src/pages/Invoices.tsx`

## Diferencias encontradas

Angular previo tenía:

- Texto de comprobantes internos.
- Filtros extra: búsqueda, fecha desde/hasta, método.
- Acción `Ver detalle`.
- Modal de detalle.
- Métricas con labels distintos.

React/Vite tiene:

- Título `Facturas`.
- Subtítulo `Recargas aprobadas y generación de reportes`.
- Botón `Exportar CSV`.
- Card filtros con `Año`, `Mes`, `Limpiar Filtros`.
- Cards: `Total Facturas`, `Total SMS Vendidos`, `Ingresos Totales`.
- Tabla `Listado de Facturas - {año}`.
- Columnas: FECHA, CLIENTE, EMPRESA, PAQUETE, SMS, MONTO, MÉTODO, CÓDIGO OP.
- Empty state simple.

## Qué se copió 1:1

- Estructura visual.
- Header.
- Botón verde export.
- Card filtros con 3 columnas.
- 3 métricas superiores.
- Título dinámico del listado.
- Tabla y columnas.
- Empty state.
- Iconos SVG equivalentes a lucide.
- Responsive base con una columna en mobile.

## Fuente de datos real

Fuente:

- `recharges`
- relación `profiles`
- relación `sms_packages`

Servicio usado:

- `RechargesService.listAdminRecharges()`

Regla:

- Solo `status = 'approved'`.
- No se creó tabla `invoices`.
- No se inventó data.

## Campos mostrados

- FECHA: `recharges.created_at`.
- CLIENTE: `profiles.full_name`; fallback `profiles.email`; fallback `-`.
- EMAIL: `profiles.email`.
- EMPRESA: `profiles.razon_social`; fallback `-`.
- PAQUETE: `sms_packages.name`; fallback `Paquete SMS`.
- SMS: `recharges.sms_credits`.
- MONTO: `recharges.amount`.
- MÉTODO: `recharges.payment_method`.
- CÓDIGO OP.: `recharges.operation_code`.

## Filtros

- Año: años reales presentes en `created_at` de recargas aprobadas.
- Mes: Todos los meses + Enero-Diciembre.
- Limpiar filtros: vuelve a año actual; si no existe, usa primer año disponible.

Métricas recalculan sobre filtro activo:

- Total Facturas.
- Total SMS Vendidos.
- Ingresos Totales.

## Exportar CSV

Exporta data filtrada actual.

Columnas:

- Fecha
- Cliente
- Email
- Empresa
- Paquete
- SMS
- Monto
- Método
- Código Operación

Nombre:

- `facturas-YYYY.csv`
- `facturas-YYYY-MM.csv` si hay mes seleccionado.

## Archivos modificados

- `projects/backoffice-admin/src/app/pages/invoices-page.component.ts`
- `projects/backoffice-admin/src/app/pages/invoices-page.component.html`

No se modificó SCSS porque estilos existentes ya coincidían con patrón React/Vite.

## SQL requerido

No.

## Deploy Edge requerido

No.

## Resultado build

Comando:

```bash
source ~/.nvm/nvm.sh
nvm use 22
rm -rf .angular/cache
npm run build
```

Resultado:

```text
sms-client: OK
backoffice-admin: OK
```

## Resultado git diff

```text
projects/backoffice-admin/src/app/pages/invoices-page.component.html | 108 ++++-------
projects/backoffice-admin/src/app/pages/invoices-page.component.ts   | 211 ++++++++++++---------
2 files changed, 163 insertions(+), 156 deletions(-)
```

## Resultado rg

```text
rg "from\\('users'\\)|user:users|profiles\\.role|\\.role" projects supabase || true
Sin resultados.

rg "from\\('sms_messages'\\).*insert|from\\('profiles'\\).*update|profiles\\.credits.*=|from\\('sms_inventory'\\).*update|from\\('recharges'\\).*update" projects || true
Sin resultados.

rg "service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret|Bearer ey|admin.fortuna|Fortun@" projects supabase || true
Resultados esperados:
- `SUPABASE_SERVICE_ROLE_KEY` solo en Edge Function.
- grants `service_role` solo en migraciones previas.
- `admin@fortuna.com.pe` como correo público/fallback.

rg "mock|fake|hardcode|lorem|demo data|datos de prueba" projects/backoffice-admin/src/app/pages/invoices-page* -n || true
Sin resultados.
```

## Estado final

**LISTO**
