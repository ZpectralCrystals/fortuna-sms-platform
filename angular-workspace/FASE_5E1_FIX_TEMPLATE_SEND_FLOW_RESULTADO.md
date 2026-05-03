# FASE 5E.1 - Fix flujo de plantillas en envío SMS

## Estado final

LISTO.

`/dashboard/send` ahora separa modo manual y modo plantilla. Si hay plantilla seleccionada, el texto base no se edita desde envío; usuario solo llena valores de variables y el sistema envía la vista previa final renderizada.

## Problema corregido

Antes, seleccionar una plantilla dejaba editable el textarea base. Usuario podía cambiar `{empresa}` por `{fdfsdfsdf}` y generar variables nuevas inconsistentes. También podía quedar bloqueado el envío aunque visualmente pareciera completo.

## Decisión UX aplicada

- Sin plantilla: textarea editable, envío manual normal.
- Con plantilla: mensaje base readonly, inputs dinámicos para variables, preview final readonly.
- Para cambiar texto base: editar plantilla en `/dashboard/templates`.
- Para escribir libremente: botón `Quitar plantilla y escribir manualmente`.

## Archivos modificados

- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.ts`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.html`
- `projects/sms-client/src/app/dashboard/pages/send-sms-page.component.scss`
- `FASE_5E1_FIX_TEMPLATE_SEND_FLOW_RESULTADO.md`

## Cómo funciona modo manual

Estado principal:

- `manualMessage`
- sin `selectedTemplate`
- sin `templateVariableValues`

El textarea es editable. El mensaje final es:

```ts
manualMessage.trim()
```

Caracteres, segmentos y créditos usan ese mensaje.

## Cómo funciona modo plantilla

Estado principal:

- `selectedTemplateId`
- `selectedTemplate`
- `templateBaseContent`
- `templateVariableValues`
- `renderedFinalMessage`

El contenido base sale de:

```ts
selectedTemplate.content
```

Variables salen de:

```ts
selectedTemplate.variables
```

Fallback:

```ts
extractTemplateVariables(selectedTemplate.content)
```

El contenido base se muestra readonly. Usuario solo edita valores.

## Cómo se valida el envío

`getSendDisabledReason()` devuelve motivo claro:

- `Ingresa un número válido.`
- `El mensaje no puede estar vacío.`
- `Completa las variables: nombre, codigo.`
- `Completa todas las variables de la plantilla.`
- `Créditos insuficientes...`
- `Envío múltiple se implementará en siguiente fase`

Botón enviar usa:

```ts
[disabled]="sending || !!sendDisabledReason"
```

## Cómo se construye mensaje final

Antes de enviar:

```ts
const message = getMessageToSend();
```

En modo plantilla:

```ts
renderTemplate(templateBaseContent, templateVariableValues).trim()
```

En modo manual:

```ts
manualMessage.trim()
```

Luego:

```ts
smsService.sendSingle({ recipient, message })
```

No se envía `templateBaseContent` con placeholders.

## Botón quitar plantilla

`Quitar plantilla y escribir manualmente`:

- limpia `selectedTemplate`
- limpia `selectedTemplateId`
- limpia variables
- conserva el contenido renderizado actual como `manualMessage`

Motivo: usuario no pierde lo ya llenado.

## Qué quedó fuera de alcance

- proveedor SMS real
- API keys
- envío múltiple
- campañas
- edición de plantillas desde send
- cambios DB
- Edge Function

## Pruebas manuales recomendadas

1. Crear plantilla: `Hola {nombre}, tu código es {codigo}.`
2. Ir a `/dashboard/send`.
3. Seleccionar plantilla.
4. Confirmar que mensaje base no se puede editar.
5. Confirmar inputs `nombre`, `codigo`.
6. Intentar enviar con variable vacía: debe bloquear y listar variable faltante.
7. Completar variables y confirmar preview final.
8. Enviar SMS test; historial debe guardar mensaje final.
9. Pulsar `Quitar plantilla y escribir manualmente`.
10. Confirmar textarea editable con texto renderizado.

## Seguridad

Sin cambios en arquitectura:

- no `users`
- no permisos por `profiles`
- no `service_role` en Angular
- no secrets
- no insert directo a `sms_messages`
- no update directo a `profiles`
- no cambios a créditos desde Angular
