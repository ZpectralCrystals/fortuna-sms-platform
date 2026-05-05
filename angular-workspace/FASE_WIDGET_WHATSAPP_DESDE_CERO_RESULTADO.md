# FASE - Widget flotante WhatsApp desde cero

## Archivos creados

- `projects/sms-client/src/app/public/components/whatsapp-widget/whatsapp-widget.component.ts`
- `projects/sms-client/src/app/public/components/whatsapp-widget/whatsapp-widget.component.html`
- `projects/sms-client/src/app/public/components/whatsapp-widget/whatsapp-widget.component.scss`
- `FASE_WIDGET_WHATSAPP_DESDE_CERO_RESULTADO.md`

## Archivos modificados

- `projects/sms-client/src/app/public/home-page.component.ts`
- `projects/sms-client/src/app/public/home-page.component.html`
- `projects/sms-client/src/app/public/about-page.component.ts`
- `projects/sms-client/src/app/public/about-page.component.html`

## Dónde se integró

- Home pública:
  - `home-page.component.ts` importa `WhatsappWidgetComponent`.
  - `home-page.component.html` renderiza `<app-whatsapp-widget></app-whatsapp-widget>`.
- About pública:
  - `about-page.component.ts` importa `WhatsappWidgetComponent`.
  - `about-page.component.html` renderiza `<app-whatsapp-widget></app-whatsapp-widget>`.

No se integró en:

- dashboard cliente
- backoffice
- login privado
- backend
- Supabase
- Edge Functions

## Comportamiento implementado

- Widget inicia cerrado.
- Botón flotante fijo abajo a la derecha.
- `z-index: 9999`.
- Click abre panel.
- X cierra panel.
- Panel muestra header:
  - `SMS Fortuna`
  - `Normalmente responde en minutos`
- Mensaje inicial:
  - `Hola! Bienvenido a SMS Fortuna. Selecciona una opción para ayudarte rápidamente.`
  - Hora: `Ahora`
- Menú principal:
  - `Planes de recarga`
  - `Consulta personalizada`
  - `Soporte técnico`
- `Planes de recarga` cambia a vista interna, no abre WhatsApp directo.
- Vista planes tiene `Volver`, lista de planes, footer IGV.
- Click plan abre WhatsApp nueva pestaña.
- Mobile usa ancho `calc(100vw - 32px)` y scroll interno.

## Mensajes WhatsApp exactos

Número:

```text
https://wa.me/51982165728?text=...
```

Mensajes:

- `Hola, quiero información sobre el plan de S/ 50 de SMS Fortuna con 530 SMS incluidos.`
- `Hola, quiero información sobre el plan popular de S/ 100 de SMS Fortuna con 1,060 SMS incluidos.`
- `Hola, quiero información sobre el plan de S/ 200 de SMS Fortuna con 2,120 SMS incluidos.`
- `Hola, quiero información sobre el plan de S/ 500 de SMS Fortuna con 5,300 SMS incluidos.`
- `Hola, quiero información sobre el plan de S/ 1,000 de SMS Fortuna con 10,600 SMS incluidos.`
- `Hola, quiero una consulta personalizada para contratar SMS Fortuna para mi empresa.`
- `Hola, necesito soporte técnico con mi cuenta SMS Fortuna.`

Codificación:

- Widget usa `encodeURIComponent(message)`.

## Cómo probar en navegador

1. Abrir landing pública Home.
2. Confirmar botón flotante abajo derecha.
3. Click botón.
4. Confirmar panel con header, mensaje inicial y tres opciones.
5. Click `Planes de recarga`.
6. Confirmar vista interna con 5 planes.
7. Click `Volver`.
8. Click cada plan y verificar texto en WhatsApp.
9. Click `Consulta personalizada` y verificar texto.
10. Click `Soporte técnico` y verificar texto.
11. Repetir en About pública.
12. Confirmar que widget no aparece en dashboard/backoffice/login privado.

## Resultado build

`npm run build`: OK.

Builds:

- `sms-client`: OK
- `backoffice-admin`: OK

Nota: Node.js `v25.9.0` muestra warning no LTS. No bloquea.

## Resultado git diff --check

OK.

## Resultado git diff --stat

```text
 .../backoffice-admin/src/app/app.routes.ts         |   3 +-
 .../src/app/public/about-page.component.html       |   4 +-
 .../src/app/public/about-page.component.ts         |  12 +-
 .../src/app/public/home-page.component.html        |   6 +-
 .../src/app/public/home-page.component.ts          |  21 ++-
 .../supabase/functions/send-sms/index.ts           | 181 +++++++++++++++++++++
 6 files changed, 220 insertions(+), 7 deletions(-)
```

Nota: stat incluye cambios previos no relacionados (`app.routes.ts`, `send-sms/index.ts`). Widget tocó solo archivos públicos y creó `components/whatsapp-widget`.

## Resultado rg

Comando:

```bash
rg "whatsapp|WhatsApp|wa.me|982165728|982 165 728" projects/sms-client/src/app/public -n
```

Resultado:

- Encuentra widget nuevo.
- Encuentra integración en Home/About.
- Encuentra `wa.me` con `encodeURIComponent`.
- Encuentra número `51982165728` / `+51 982 165 728`.

Comando:

```bash
rg "Me gustaria|Me gustaría|Podrian|Podrían|realizar la compra|precios personalizados" projects/sms-client/src/app/public || true
```

Resultado: sin hallazgos.

## Capturas sugeridas a validar manualmente

- Home desktop: botón flotante cerrado abajo derecha.
- Home desktop: panel abierto en menú principal.
- Home desktop: vista planes.
- Home mobile: panel cabe en pantalla y hace scroll interno.
- About desktop: botón flotante visible.
- WhatsApp abierto con plan S/ 100 y texto exacto.
- WhatsApp abierto con soporte técnico y texto exacto.

## Estado final

LISTO.
