# FASE 5E - Variables de plantilla y previsualización

## Estado final

LISTO.

Plantillas SMS ahora detectan variables automáticamente, guardan el arreglo `variables`, muestran chips y vista previa con ejemplos. `/dashboard/send` permite llenar variables, ver mensaje final y enviar solo el mensaje renderizado por Edge Function.

## Archivos modificados

- `projects/shared/src/lib/models/sms.model.ts`
- `projects/shared/src/lib/services/sms.service.ts`
- `projects/sms-client/src/app/dashboard/pages/templates-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/templates-page.component.html`
- `projects/sms-client/src/app/dashboard/pages/templates-page.component.scss`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.html`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.scss`

## Cómo se detectan variables

Regex usada:

```ts
/\{([a-zA-Z0-9_-]+)\}/g
```

Detecta variables con:

- letras
- números
- guion bajo
- guion medio

Ejemplo:

```text
Hola {nombre}, tu código es {codigo}
```

Resultado:

```json
["nombre", "codigo"]
```

## Cómo se guardan variables

`SmsService.createTemplate()` y `SmsService.updateTemplate()` calculan variables desde `content` antes de guardar.

Payload guardado:

```ts
{
  name,
  content,
  category,
  variables: extractTemplateVariables(content)
}
```

Esto evita depender de variables escritas manualmente por usuario.

## Preview en templates

Templates page muestra:

- chips de variables detectadas
- texto `Sin variables` si no hay
- bloque `Vista previa`

Valores ejemplo:

- `{nombre}` -> `Juan`
- `{codigo}` -> `123456`
- `{empresa}` -> `Fortuna`
- `{fecha}` -> `02/05/2026`
- `{monto}` -> `S/ 50.00`
- desconocidas -> `Ejemplo`

## Preview en send

Al seleccionar plantilla activa:

1. carga contenido base en textarea
2. detecta variables
3. muestra inputs dinámicos
4. calcula vista previa final
5. calcula caracteres, segmentos y créditos con mensaje final
6. al enviar manda mensaje final a `send-sms`

Ejemplo:

```text
Base: Hola {nombre}, tu código es {codigo}
nombre = Gustavo
codigo = 123456
Final: Hola Gustavo, tu código es 123456
```

## Validaciones implementadas

- Si mensaje vacío: bloquea envío.
- Si teléfono inválido: bloquea envío.
- Si plantilla tiene variables vacías: bloquea envío con:

```text
Completa todas las variables de la plantilla antes de enviar.
```

- Si usuario edita textarea: variables se recalculan desde contenido actual.
- No se envía automáticamente al seleccionar plantilla.

## Qué quedó fuera de alcance

- proveedor SMS real
- API keys
- envío múltiple
- campañas
- reemplazo automático con datos de contactos
- backoffice templates
- cambios DB adicionales

## Seguridad

Se mantuvo:

- sin tabla `users`
- sin permisos por `profiles`
- sin `service_role` en Angular
- sin secrets en Angular
- sin insert directo a `sms_messages`
- sin update directo de créditos

## Pruebas manuales recomendadas

1. Crear plantilla: `Hola {nombre}, tu código es {codigo}.`
2. Confirmar chips `nombre`, `codigo`.
3. Confirmar vista previa con `Juan` y `123456`.
4. Editar contenido y agregar `{empresa}`.
5. Confirmar variable nueva y preview actualizada.
6. Ir a `/dashboard/send` desde `Usar en envío`.
7. Confirmar inputs dinámicos.
8. Dejar una variable vacía y probar envío: debe bloquear.
9. Completar variables y enviar SMS test.
10. Confirmar historial registra mensaje final, no plantilla base.

## Riesgos pendientes

- Plantillas antiguas con `variables` vacío siguen funcionando porque la UI recalcula desde `content`.
- Valores de ejemplo son fijos; no usan datos reales del perfil/contacto.
- Segmentación usa regla simple de 160 caracteres; DB/RPC puede tener cálculo final propio.

## Siguiente fase recomendada

FASE 5F: preparar envío múltiple con plantillas y variables por fila, todavía sin proveedor real.
