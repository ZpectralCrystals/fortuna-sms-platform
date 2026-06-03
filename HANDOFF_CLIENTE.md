# Fortuna SMS - Handoff cliente

## Estado funcional

- SMS individual operativo mediante Supabase Edge Function.
- SMS multiple operativo mediante `send-sms-batch`.
- API publica `api-send-sms` operativa con `X-API-Key`.
- Clientes/RUC gestionados con modelo empresa.
- Saldo comercial basado en ledger.
- Recargas disponibles.
- Inventario admin basado en compras locales y recargas aprobadas.
- Dashboard admin operativo.
- API keys proveedor por RUC integradas via Edge Functions admin.

## Estado controlado

- Desde Fichero carga, valida y envia via `send-sms-batch`.
- Mensajes personalizados de Excel se sanitizan para compatibilidad proveedor.
- Envio personalizado queda condicionado por aceptacion del proveedor.

## Admin final

Cuenta admin:

```text
smsfortuna@fortuna.com.pe
```

No incluir password en Git.

## Base limpia esperada

Estado de entrega comercial:

- inventario: `0`
- recargas: `0`
- clientes: `0`
- historial SMS: `0`
- api keys: `0`

## Supabase

- Project ref: `ewltnrfqwkhimnyqfrrw`
- URL: `https://ewltnrfqwkhimnyqfrrw.supabase.co`

Proyecto Supabase ya fue transferido al cliente.

## Secrets

No hay claves reales en este documento.

Configurar secrets reales solo en Supabase:

- `SUPABASE_SERVICE_ROLE_KEY`
- credenciales proveedor SMS
- tokens de operacion si aplica

No guardar service role, DB password, access token ni provider password en Git.

## Deploy frontend

AWS Amplify debe usar repo raiz y `amplify.yml`.

Build:

```bash
cd angular-workspace
npm ci
npm run build
```

Output:

```text
angular-workspace/dist/sms-client
```

## Pendientes del cliente

- Confirmar credenciales proveedor.
- Probar SMS real controlado.
- Confirmar politica de API keys publicas.
- Mantener `SMS_PROVIDER_MODE=production` en Supabase solo cuando proveedor real este listo.
