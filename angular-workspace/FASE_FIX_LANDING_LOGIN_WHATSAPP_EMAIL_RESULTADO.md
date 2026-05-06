# FASE FIX - Landing login, WhatsApp y email confirmacion

## Estado final

LISTO.

Se agrego CTA `Iniciar sesión` en landing, se cambio widget WhatsApp a glifo oficial reconocible y se dejo email template final para Supabase Auth.

## Archivos modificados

- `projects/sms-client/src/app/public/home-page.component.html`
- `projects/sms-client/src/app/public/home-page.component.scss`
- `projects/sms-client/src/app/public/components/whatsapp-widget/whatsapp-widget.component.html`
- `projects/sms-client/src/app/public/components/whatsapp-widget/whatsapp-widget.component.scss`
- `projects/sms-client/src/app/auth/register-page.component.html`
- `projects/sms-client/src/app/auth/register-page.component.scss`
- `projects/sms-client/src/app/auth/register-page.component.ts`
- `projects/sms-client/src/app/auth/login-page.component.html`
- `projects/sms-client/src/app/auth/login-page.component.scss`
- `projects/shared/src/lib/services/auth.service.ts`

## Ruta usada para Iniciar sesión

Ruta cliente:

```text
/login
```

Se agrego en header landing junto a `Comenzar`:

- `Iniciar sesión` -> `/login`
- `Comenzar` -> `/register`

## Logo WhatsApp

Se reemplazo icono genérico por glifo WhatsApp tipo oficial:

- glifo blanco
- boton circular verde `#25d366`
- mismo comportamiento del widget
- sin libreria nueva
- sin tocar flujo de planes/consulta/soporte

## Mensaje final en app post registro

Titulo:

```text
Cuenta creada correctamente
```

Mensaje:

```text
Te enviamos un correo de verificación. Revisa tu bandeja de entrada o spam y confirma tu correo para activar tu cuenta. Después de validar tu correo podrás iniciar sesión en SMS Fortuna.
```

Boton:

```text
Ir a iniciar sesión
```

## Email template Supabase

Ruta:

```text
Supabase Dashboard -> Authentication -> Email Templates -> Confirm signup
```

Asunto:

```text
Confirma tu correo para activar tu cuenta en SMS Fortuna
```

Body HTML:

```html
<div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6; max-width: 560px; margin: 0 auto;">
  <h2 style="color: #2563eb; margin-bottom: 16px;">Activa tu cuenta en SMS Fortuna</h2>
  <p>Hola,</p>
  <p>Gracias por registrarte en <strong>SMS Fortuna</strong>.</p>
  <p>Para activar tu cuenta y comenzar a usar la plataforma, confirma tu correo haciendo clic en el siguiente botón:</p>
  <p style="margin: 28px 0;">
    <a
      href="{{ .ConfirmationURL }}"
      style="background: #2563eb; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 700; display: inline-block;"
    >
      Confirmar mi correo
    </a>
  </p>
  <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
  <p style="word-break: break-all; color: #2563eb;">{{ .ConfirmationURL }}</p>
  <p>Si tú no creaste esta cuenta, puedes ignorar este mensaje.</p>
  <p>Saludos,<br>Equipo SMS Fortuna</p>
</div>
```

## Validaciones

- `npm run build`: OK
- `git diff --check`: OK
- `git diff --stat`: OK
