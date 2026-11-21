# Despliegue de TeachCash

TeachCash está en producción en **https://www.teachcash.es**. Este documento
cuenta cómo está montado, cómo llega un cambio desde el código hasta la web y
cómo se comprueba que todo sigue en orden.

El paso a paso con el que se montó, casilla a casilla y con cada valor de cada
panel, está en [`plans/PLAN-DESPLIEGUE.md`](plans/PLAN-DESPLIEGUE.md). Si algún
día hay que repetir el despliegue en otro proyecto, ese es el documento a seguir.

---

## De un vistazo

| | |
|---|---|
| **URL de producción** | https://www.teachcash.es |
| **Presentación** | https://www.teachcash.es/presentacion |
| **Hosting de la aplicación** | Vercel, plan Hobby, funciones en París (`cdg1`) |
| **Base de datos y autenticación** | Supabase, plan gratuito, región `eu-west-3` (París) |
| **Anti-bots** | Cloudflare Turnstile, en modo invisible |
| **Emails** | Resend por SMTP, desde `no-reply@teachcash.es` |
| **Dominio** | `teachcash.es`, registrado en DonDominio |
| **Rama de producción** | `main`: cada merge se despliega solo |
| **Coste** | Solo el dominio (unos 8 € el primer año). Todo lo demás, en planes gratuitos |

## Cómo está montado

```
                 ┌───────────── www.teachcash.es ─────────────┐
Navegador ─https─►  Vercel · Next.js 16                        │
   │             │  páginas + Server Actions (París, cdg1)     │
   │             └──────┬──────────────────────┬───────────────┘
   │                    │ Drizzle (pooler)     │ @supabase/ssr
   │                    ▼                      ▼
   │             Supabase Postgres       Supabase Auth ──SMTP──► Resend ──► email
   │             (datos, RLS, pg_cron)   (sesiones, CAPTCHA)
   │                                           ▲
   └──── pide el token ──► Cloudflare Turnstile┘ (Supabase lo comprueba)
```

**Vercel** ejecuta la aplicación de Next.js. Supabase no podría: sus Edge
Functions son Deno y no ejecutan un servidor de Next. Las funciones corren en
París, al lado de la base, para que cada consulta no pague un viaje largo.

**Supabase** pone la base de datos Postgres y la autenticación. La aplicación
habla con Postgres **directamente por Drizzle**, a través del *Transaction
pooler* (con `prepare: false`), y usa `supabase-js` solo para Auth.

**Cloudflare Turnstile** da el token anti-bots en el navegador al crear un
invitado, entrar o registrarse, y es Supabase quien lo comprueba. **Resend**
envía los emails de Supabase Auth (confirmar la cuenta, recuperar la contraseña)
desde el dominio propio: sin un SMTP propio, Supabase solo envía 2 emails por
hora y solo a los miembros del equipo del proyecto.

**DonDominio** tiene el dominio y sus DNS. `teachcash.es` y
`teachcash.vercel.app` redirigen (308) a `www.teachcash.es`, que es la única
dirección de la aplicación.

## Cómo llega un cambio a producción

```
rama de trabajo ──PR──► develop ──PR──► main ──► Vercel despliega solo
                  │                       │
                  CI en verde             CI ya pasado en develop
```

Cada cambio se hace en una rama y entra en `develop` por una pull request. En
cada una, el **CI de GitHub Actions** (`.github/workflows/calidad.yml`) pasa los
tipos, el lint, los tests con sus umbrales de cobertura, la suite entera en otro
huso horario, el `build` y `pnpm audit`, y `develop` no deja mezclar nada que no
esté en verde.

Para publicar, se abre una pull request de `develop` a `main` y se mezcla con un
*merge commit*. **Vercel construye y despliega `main` automáticamente.** Las
demás ramas no se construyen nunca (lo impide un *Ignored Build Step*), porque
un *preview* se conectaría a la base de producción.

Además, cada commit pasa en local por **Husky**: ESLint sobre lo que entra y el
chequeo de tipos.

> **Si el cambio trae una migración**, se aplica en Supabase **antes** de
> mezclar en `main`, desde el equipo de desarrollo y por el *Session pooler*
> (`pnpm db:migrate`). El código nuevo no debe llegar a producción antes que su
> esquema.

### Volver atrás

Si un despliegue sale mal: Vercel → Deployments → el despliegue anterior →
**Instant Rollback**. Es inmediato. Las migraciones no se deshacen solas: si
hace falta, se escribe una nueva que revierta.

## Variables de entorno en producción

Están en Vercel → Settings → Environment Variables, todas con ámbito
**Production**:

| Variable | Qué es |
|---|---|
| `DATABASE_URL` | Conexión a Postgres por el *Transaction pooler* (puerto 6543). Marcada como *Sensitive* |
| `NEXT_PUBLIC_SUPABASE_URL` | La URL del proyecto de Supabase, sin `/rest/v1` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | La clave pública de Supabase. Es pública por diseño: lo que protege los datos es RLS |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | La clave pública del widget de Turnstile |
| `APP_URL` | `https://www.teachcash.es`. Obligatoria: sin ella el servidor no arranca, y es el origen de los enlaces de los emails |

**Lo que no está en Vercel, a propósito:** `DATABASE_URL_MIGRATIONS`, porque
las migraciones se lanzan desde el equipo de desarrollo y no desde el servidor;
la *secret key* (`service_role`) de Supabase, que la aplicación no necesita y no
debe tener, y la *secret key* de Turnstile, que vive en el panel de Supabase,
que es quien comprueba el token.

Al arrancar, `instrumentation.ts` valida todas las variables (`lib/env.ts`). Si
falta una o está mal, el servidor no arranca y el error dice cuál.

## La base de datos en producción

El esquema evoluciona con **migraciones de Drizzle** (`db/migrations/`), que se
aplican con `pnpm db:migrate`.

Todas las tablas tienen **RLS de solo lectura**: la API REST de Supabase, que
cualquiera puede llamar con la clave pública, solo deja leer lo propio y no
tiene permisos de escritura (`REVOKE`). La aplicación escribe con su propio rol
y filtra por el `userId` de la sesión dentro de cada consulta.

Un job de **`pg_cron`** (`db/sql/limpieza-invitados.sql`) borra cada hora los
invitados de más de 4 días, con todos sus datos. Y un **freno por tamaño**
protege el plan gratuito: por encima de 400 MB (el límite es 500), la aplicación
deja de crear invitados, movimientos y categorías, pero se puede seguir leyendo,
editando y borrando.

Como el plan gratuito pausa el proyecto tras 7 días sin uso, el workflow
`ping-supabase.yml` lo consulta los lunes y los jueves para mantenerlo despierto.

## Seguridad en producción

Todo va por **HTTPS** con HSTS, y cada petición lleva una **Content Security
Policy con nonce** (la pone `proxy.ts`), el resto de cabeceras de seguridad y
ninguna `x-powered-by`. Las **cookies de sesión** son `httpOnly` y `secure`.

El **CAPTCHA es obligatorio** en Supabase Auth: sin un token válido de
Turnstile no se crea un invitado ni se prueba una contraseña. Hay **límites de
peticiones** por usuario, por IP y por cuenta, y funcionan porque Vercel escribe
la IP real del visitante y no deja falsificarla. Las **Redirect URLs** de
Supabase son exactas, sin comodines, y las **contraseñas** piden 10 caracteres
como mínimo y confirmación por email.

El detalle, punto por punto de OWASP, está en [`SECURITY.md`](SECURITY.md).

## Cómo comprobar que funciona

Desde cualquier terminal:

```bash
# La web responde y lleva la CSP con nonce y las cabeceras de seguridad
curl -sI https://www.teachcash.es/ | grep -iE "content-security-policy|strict-transport|x-frame"

# La API REST de Supabase no deja escribir: tiene que responder un error 42501
curl -s -X POST "https://<proyecto>.supabase.co/rest/v1/categories" \
  -H "apikey: <publishable key>" -H "Content-Type: application/json" -d '{"name":"x"}'
```

Y en el navegador, en una ventana privada: abrir www.teachcash.es, pulsar
**Jugar gratis** y comprobar que nace el invitado y se puede jugar un nivel o
anotar un movimiento.

## Mantenimiento

| Qué | Cuándo | Cómo |
|---|---|---|
| Desplegar | En cada merge a `main` | Automático. Las migraciones, antes |
| Dependencias | Cada mes | PRs de Dependabot a `develop`, con el CI y `pnpm audit` en verde |
| Tamaño de la base | Cada semana | Supabase → Reports → Database |
| Renovar el dominio | Antes del 18-11-2027, cada año | DonDominio, renovación manual |
| Plantillas de email | Al cambiar una en `docs/emails/` | Pegarla de nuevo en Supabase: no lee el repo |

## Límites conocidos

Son los de los planes gratuitos, suficientes para un proyecto que empieza.
**Resend envía 100 emails al día**: pasado el tope, quien se registre ese día no
recibe la confirmación. **Los límites de peticiones se cuentan en memoria por
instancia**, así que con mucho tráfico cada instancia de Vercel lleva su propia
cuenta (la salida sería un almacén común, como Redis). Los **logs** se guardan
poco tiempo y no hay alertas automáticas. Y **Vercel Hobby es para uso no
comercial**: si TeachCash tuviera ingresos, habría que pasar al plan Pro.

## Desplegar una copia propia

En resumen (el detalle, en [`plans/PLAN-DESPLIEGUE.md`](plans/PLAN-DESPLIEGUE.md)):

Primero, un proyecto en **Supabase**: se aplican las migraciones
(`pnpm db:migrate`), se activa `pg_cron` y se crea el job de limpieza de
invitados. En su Auth se activan los usuarios anónimos y el CAPTCHA con
Turnstile, y se ponen la Site URL y la Redirect URL exacta de `/auth/confirm`.

Después, un widget de **Cloudflare Turnstile** invisible con el dominio de
producción, y el repositorio importado en **Vercel** con la rama de producción
`main`, la región de París, el *Ignored Build Step* y las cinco variables de
entorno, `APP_URL` incluida **antes** del primer despliegue.

Para que pueda registrarse cualquiera hacen falta además un dominio propio,
**Resend** como SMTP y las plantillas de `docs/emails/`. Al terminar, se
comprueba con las pruebas de arriba.
