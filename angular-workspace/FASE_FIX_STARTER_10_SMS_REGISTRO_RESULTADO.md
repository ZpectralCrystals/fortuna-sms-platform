# FASE FIX - Starter 10 SMS al registrar cliente

## Estado final

LISTO.

## Cómo se crea el perfil actualmente

- Angular llama `supabase.auth.signUp()` desde `AuthService.register()`.
- Angular envía metadata del cliente (`full_name`, `razon_social`, `company_name`, `ruc`, `phone`).
- Angular no inserta ni actualiza `profiles` durante registro.
- La creación real de `profiles` debe quedar en Supabase mediante trigger sobre `auth.users`.

## Estado anterior del bono

- En migraciones locales no había trigger de creación de `profiles`.
- No había evidencia local de que el perfil recibiera automáticamente `credits = 10`.
- `profiles.credits` se lee como cantidad de SMS disponibles.

## Solución aplicada

- Se creó migración incremental `supabase/migrations/20260508100000_starter_credits_on_signup.sql`.
- La migración establece defaults:
  - `profiles.credits default 10`
  - `profiles.total_spent default 0`
- La migración crea/reemplaza `public.handle_new_user()` para insertar perfiles nuevos con:
  - `credits = 10`
  - `total_spent = 0`
  - `is_active = true`
- El trigger usa `ON CONFLICT (id) DO NOTHING` para no duplicar bono si el perfil ya existe.
- No se actualizan usuarios existentes automáticamente.

## Archivos modificados

- `projects/sms-client/src/app/auth/register-page.component.html`
- `supabase/migrations/20260508100000_starter_credits_on_signup.sql`
- `FASE_FIX_STARTER_10_SMS_REGISTRO_RESULTADO.md`

## SQL requerido en Supabase

Sí. Aplicar migración:

```bash
supabase db push
```

O ejecutar manualmente el contenido de:

```text
supabase/migrations/20260508100000_starter_credits_on_signup.sql
```

## SQL opcional para usuarios de prueba existentes

No ejecutar masivamente. Solo si se quiere corregir un perfil de prueba concreto:

```sql
update public.profiles
set credits = 10,
    total_spent = 0,
    updated_at = now()
where id = '<profile_uuid>'
  and credits = 0
  and total_spent = 0;
```

## Edge Function

No requiere deploy de Edge Function.

## Mensaje de registro

Pantalla de éxito mantiene verificación de correo y agrega:

```text
Tu cuenta Starter incluye 10 SMS gratis para probar el servicio.
```

## Cómo probar registro nuevo

1. Aplicar migración en Supabase.
2. Registrar cliente nuevo desde `/register`.
3. Confirmar que se muestra mensaje de verificación y bono Starter.
4. Revisar `public.profiles`:

```sql
select id, email, credits, total_spent
from public.profiles
where email = '<nuevo_correo>';
```

Resultado esperado:

```text
credits = 10
total_spent = 0
```

## Resultado build

OK.

```text
npm run build
sms-client OK
backoffice-admin OK
```

Nota: Node local muestra advertencia por versión impar `v25.9.0`, pero build finaliza correctamente.

## Resultado rg

OK, sin coincidencias.

```bash
rg "from\\('users'\\)|user:users|profiles\\.role|\\.role" projects supabase || true
rg "from\\('profiles'\\).*update|profiles\\.credits.*=" projects || true
rg "service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret" projects || true
```

## Resultado git diff

```text
git diff --check
OK
```

`git diff --stat` no incluye archivos nuevos no trackeados hasta agregarlos a git. El stat actual también incluye cambios previos pendientes en auth/landing/WhatsApp.
