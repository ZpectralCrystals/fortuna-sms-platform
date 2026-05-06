# FASE FIX - Registro y validacion de correo

## Estado final

LISTO.

Se mejoro flujo de registro cliente para explicar que debe confirmar su correo antes de iniciar sesion.

## Archivos modificados

- `projects/sms-client/src/app/auth/register-page.component.ts`
- `projects/sms-client/src/app/auth/register-page.component.html`
- `projects/sms-client/src/app/auth/register-page.component.scss`
- `projects/sms-client/src/app/auth/login-page.component.html`
- `projects/sms-client/src/app/auth/login-page.component.scss`
- `projects/shared/src/lib/services/auth.service.ts`

## Mensaje implementado

Titulo:

> Cuenta creada correctamente

Mensaje:

> Te enviamos un correo de verificación. Revisa tu bandeja de entrada o spam y confirma tu correo para activar tu cuenta.

> Después de validar tu correo podrás iniciar sesión en SMS Fortuna.

Boton:

> Ir a iniciar sesión

## Flujo de registro

1. Cliente completa formulario.
2. Angular valida campos basicos: RUC, telefono, password.
3. `AuthService.register()` llama `supabase.auth.signUp()`.
4. Si Supabase responde OK, no se redirige automaticamente.
5. La UI reemplaza formulario por pantalla de exito y verificacion.
6. Usuario debe abrir correo, confirmar cuenta y luego iniciar sesion.

## Login

Se agrego texto pequeño:

> ¿Ya validaste tu correo? Inicia sesión con tus credenciales.

## Errores en español

`AuthService` ahora traduce errores frecuentes:

- correo ya registrado
- password debil
- email invalido
- demasiados intentos
- credenciales incorrectas
- correo no confirmado

## Instrucciones Supabase Auth Email Template

Ir a:

`Supabase Dashboard → Authentication → Emails / Email Templates → Confirm signup`

Asunto sugerido:

```text
Confirma tu correo para activar tu cuenta en SMS Fortuna
```

Contenido sugerido:

```text
Hola,

Gracias por registrarte en SMS Fortuna.

Para activar tu cuenta y empezar a usar la plataforma, confirma tu correo haciendo clic en el siguiente botón:

{{ .ConfirmationURL }}

Si tú no creaste esta cuenta, puedes ignorar este mensaje.

Equipo SMS Fortuna
```

Importante:

- No hardcodear links en Angular.
- Supabase genera `{{ .ConfirmationURL }}`.
- Angular solo muestra mensaje posterior al registro.

## Resultado build

`npm run build`: OK.

## Resultado rg

Sin coincidencias para:

- `from('users')`
- `user:users`
- `profiles.role`
- `.role`
- `service_role`
- `SUPABASE_SERVICE_ROLE_KEY`
- `sb_secret`
