# Plan de despliegue: TeachCash en producción

Pasos para publicar TeachCash en Internet con las medidas de seguridad de
`docs/SECURITY.md` activas. Se sigue en orden, marcando cada casilla. Cada paso
dice **dónde** se hace y **cómo se comprueba** que quedó bien.

## Cómo queda montado

```
Navegador ──https──► Vercel (Next.js: páginas + Server Actions)
                        │
                        ├──► Supabase Postgres  (datos, por Drizzle)
                        └──► Supabase Auth      (sesiones, emails, CAPTCHA)
Cloudflare Turnstile ◄── el navegador pide el token; Supabase lo comprueba
```

- **Supabase** ya tiene la base de datos y la autenticación (proyecto en
  eu-west-3, París). Aquí solo hay que configurarlo para producción.
- **Vercel** ejecuta la aplicación de Next.js. Supabase no puede hacerlo: sus
  Edge Functions son Deno y no ejecutan un servidor de Next. Vercel tiene plan
  gratuito (Hobby, para uso no comercial: un proyecto de máster encaja) y
  región en París, al lado de la base.
- **Cloudflare Turnstile** sigue como está; solo hay que darle el dominio nuevo.

**Rama de producción: `main`.** Es la que ya recibe lo que pasó el CI en
`develop` (ver `calidad.yml`).

---

## Fase 0 · Código listo en `main`

- [ ] Mezclar en `develop` la rama de la auditoría de seguridad, por PR, con el
      CI en verde.
- [ ] Abrir la PR `develop` → `main` y mezclarla.
- [ ] En local, antes de seguir:
      `pnpm typecheck && pnpm lint && pnpm test && pnpm test:tz && pnpm build`.

---

## Fase 1 · Base de datos (Supabase)

### 1.1 Aplicar todas las migraciones

Las migraciones 0007 y 0008 dejan la API REST de Supabase en solo lectura.
Hasta que se apliquen, cualquiera con su propia sesión puede escribir en
movimientos, categorías y patrimonio saltándose las cuotas.

```bash
pnpm db:migrate        # proyecto principal (lee .env.local)
pnpm db:migrate:e2e    # proyecto de los E2E (lee .env.e2e)
```

- [ ] Hecho en los dos proyectos.
- [ ] **Comprobación**: en Supabase → SQL Editor, esta consulta tiene que
      devolver **solo filas con `cmd = SELECT`**. Una fila con `ALL`, `INSERT`,
      `UPDATE` o `DELETE` significa que falta una migración.

  ```sql
  select tablename, policyname, cmd from pg_policies where schemaname = 'public';
  ```

### 1.2 Limpieza de invitados

Los invitados caducan a los 4 días y los borra un job de `pg_cron`.

- [ ] Database → Extensions → **pg_cron** activada.
- [ ] **Comprobación**: `select jobname, schedule from cron.job;` devuelve
      `limpieza-invitados | 0 * * * *`. Si no sale, ejecuta una vez en el SQL
      Editor el contenido de `db/sql/limpieza-invitados.sql`.

### 1.3 Copias de seguridad

- [ ] Database → Backups: mira qué incluye tu plan. Si no hay copias que puedas
      descargar, haz una antes de abrir la app y después de cada migración:
      `pg_dump "$DATABASE_URL_MIGRATIONS" > copia-AAAA-MM-DD.sql`. Guárdala
      fuera del repo: contiene datos personales.

---

## Fase 2 · Aplicación (Vercel)

### 2.1 Crear el proyecto

- [ ] https://vercel.com → *Add New* → *Project* → importar el repositorio de
      GitHub.
- [ ] Framework: **Next.js** (lo detecta solo). Comandos por defecto: Vercel
      usa pnpm porque lo lee de `packageManager` en `package.json`, e instala
      con el lockfile congelado.
- [ ] Settings → General → **Node.js Version: 24.x**, la misma que en local y
      en el CI.
- [ ] Settings → Functions → **Function Region: París (`cdg1`)**. Si la app
      corre lejos de la base, cada consulta paga el viaje.
- [ ] Settings → Git → **Production Branch: `main`**.

### 2.2 Que solo se despliegue `main`

Cada rama crearía un *preview* conectado a la base de **producción**, con una
URL nueva que habría que dar de alta en Supabase (justo los comodines que no
queremos).

- [ ] Settings → Git → **Ignored Build Step** → *Custom*:

  ```bash
  if [ "$VERCEL_GIT_COMMIT_REF" = "main" ]; then exit 1; else exit 0; fi
  ```

  (`exit 0` = no construir, `exit 1` = construir.)
- [ ] Settings → Deployment Protection: deja activada la protección de los
      previews que vengan de antes.

### 2.3 Variables de entorno

En Settings → Environment Variables, todas con el ámbito **Production**
únicamente:

| Variable | Valor | De dónde sale |
|---|---|---|
| `DATABASE_URL` | URI del **Transaction pooler** (puerto **6543**) | Supabase → Connect → Connection string. La misma que en `.env.local` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<proyecto>.supabase.co`, **sin** `/rest/v1` | Supabase → Project Settings → Data API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` | Supabase → Project Settings → API Keys |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | La *site key* del widget | Cloudflare → Turnstile |
| `APP_URL` | `https://<tu-dominio>`, sin barra ni ruta | Ver 2.4. Origen de los enlaces de los emails |

**Lo que NO va en Vercel:**

- `DATABASE_URL_MIGRATIONS`: las migraciones se lanzan desde tu equipo.
- La *secret key* (`service_role`) de Supabase: la app no la usa y no debe tenerla.
- La *secret key* de Turnstile: vive en el panel de Supabase.

### 2.4 Primer despliegue y `APP_URL`

- [ ] *Deploy*. Si el build falla con "Variables de entorno no válidas", el
      mensaje dice cuál está mal (`lib/env.ts`).
- [ ] Apunta la URL que da Vercel (`https://teachcash-xxxx.vercel.app`) o, si
      tienes dominio propio, añádelo en Settings → Domains y usa ese.
- [ ] Pon esa URL en `APP_URL` y vuelve a desplegar (Deployments → ⋯ →
      *Redeploy*). Hasta entonces, los enlaces de los emails se construyen con
      las cabeceras de la petición.

> En Vercel no hace falta `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`: todas las
> funciones de un despliegue salen del mismo build. Solo hace falta en un
> autoalojado con varias instancias.

> Vercel pone la IP real del visitante en `x-real-ip` y no deja pasar la que
> mande el cliente. Es lo que necesitan los límites por IP (`lib/limite.ts`).
> En otro hosting habría que configurarlo a mano.

---

## Fase 3 · Autenticación (Supabase → Authentication)

Los nombres de las secciones pueden variar un poco según la versión del panel.

### 3.1 URLs

- [ ] **URL Configuration → Site URL** = el mismo valor que `APP_URL`.
- [ ] **URL Configuration → Redirect URLs**, solo URLs **exactas, sin `*` ni
      `**`**:
  - `https://<tu-dominio>/auth/confirm` (producción)
  - `http://localhost:3000/auth/confirm` (para seguir desarrollando en local)
  - Quita la de la IP de tu red local (`192.168.1.x`) si ya no la usas.

  Un comodín es justo lo que permitiría mandar un enlace de recuperación a un
  dominio ajeno.

### 3.2 Contraseñas y cambios de cuenta

- [ ] **Sign In / Providers → Email**:
  - **Confirm email**: ON.
  - **Secure password change**: ON. Sin él, alguien con una sesión robada
    podría cambiar la contraseña llamando a Supabase directamente, sin pasar
    por la app, que es la que pide la actual.
  - **Secure email change**: ON.
- [ ] Política de contraseñas: **mínimo 10** caracteres, con minúsculas,
      mayúsculas, números y símbolos (la misma que valida `auth.actions.ts`).
- [ ] *Leaked password protection*: actívala si tu plan la incluye.

### 3.3 Anti-bots y sesiones

- [ ] **Attack Protection → Captcha**: ON, proveedor **Turnstile**, con la
      *secret key* del widget.
- [ ] **Sessions**: rotación de refresh tokens ON; caducidad del JWT ≤ 3600 s
      (son los valores por defecto).
- [ ] **Rate Limits**: deja los de fábrica. La app pone los suyos encima.

### 3.4 Usuarios anónimos

- [ ] **Sign In / Providers → Allow anonymous sign-ins**: ON. Sin esto no
      nacen los invitados y la app no se puede usar sin cuenta.

---

## Fase 4 · CAPTCHA (Cloudflare Turnstile)

- [ ] Cloudflare → Turnstile → tu widget → **Hostnames**: añade el dominio de
      producción (`teachcash-xxxx.vercel.app` o el tuyo). Sin él, Turnstile no
      da token en producción y **no se puede crear ningún invitado**.
- [ ] Deja `localhost` si sigues desarrollando con el mismo widget.

---

## Fase 5 · Emails (solo para abrir el registro a otras personas)

Sin SMTP propio, Supabase manda **2 emails por hora** y **solo a los miembros
del equipo del proyecto**. Para ti basta para probar; para cualquier otra
persona, registrarse o recuperar la contraseña **no funciona**. Los invitados
sí funcionan, porque no usan email.

- [ ] Si vas a abrirla: crea una cuenta en un proveedor SMTP con plan gratuito
      (Resend, Brevo…) y verifica tu dominio de envío.
- [ ] Supabase → Authentication → **Emails → SMTP Settings**: los datos del
      proveedor.
- [ ] Puedes traducir las plantillas al español, pero mantén el enlace
      `{{ .ConfirmationURL }}`, que es el flujo `?code=`. **No las cambies a
      `token_hash`**: `/auth/confirm` ya no lo acepta porque permitía un login
      CSRF (ver `docs/SECURITY.md`).

---

## Fase 6 · Comprobar que todo funciona

Con la URL de producción en `$URL`.

### 6.1 Cabeceras y CSP

```bash
curl -sI "$URL/" | grep -iE "content-security-policy|strict-transport|x-frame|cross-origin-resource|permissions-policy"
curl -sI "$URL/no-existe.png" | grep -i content-security-policy
```

- [ ] Las dos llevan `Content-Security-Policy` con un `nonce-…` distinto en
      cada petición, y la primera trae también las otras cabeceras.
- [ ] `curl -sI "$URL/" | grep -i x-powered-by` no devuelve nada.

### 6.2 La API REST no deja escribir

```bash
curl -s -X POST "https://<proyecto>.supabase.co/rest/v1/categories" \
  -H "apikey: <publishable key>" -H "Content-Type: application/json" \
  -d '{"name":"x"}'
```

- [ ] Responde con un error de permisos (código `42501`), no con un `201`.

### 6.3 Flujos en el navegador

- [ ] Abrir la app en una ventana privada: aparece como invitado y puede anotar
      un movimiento.
- [ ] Crear cuenta con tu email → llega el enlace → apunta a
      **`APP_URL`/auth/confirm** → eliges contraseña.
- [ ] Salir y volver a entrar con la contraseña.
- [ ] Iniciar sesión en dos navegadores, cambiar la contraseña en uno → en el
      otro, la sesión deja de valer en la siguiente acción (como mucho una hora,
      lo que dura el token de acceso).
- [ ] "He olvidado mi contraseña" → el enlace apunta a `APP_URL`.
- [ ] Diez contraseñas mal seguidas → la undécima responde "Demasiados intentos".

### 6.4 Logs de seguridad

- [ ] Vercel → proyecto → **Logs**, busca `"tipo":"seguridad"`: tienen que
      salir los `login` (con su `ok`/`fallo`), `invitado` y el `limite` de la
      prueba anterior, con la IP acabada en `.0` y **sin ningún email**.

---

## Fase 7 · Mantenimiento

| Qué | Cuándo | Cómo |
|---|---|---|
| Desplegar | Cada mezcla en `main` | Automático. Antes, las migraciones nuevas (`pnpm db:migrate`) **antes** de mezclar si el código las necesita |
| Volver atrás | Si un despliegue sale mal | Vercel → Deployments → el anterior → **Instant Rollback**. Las migraciones no se deshacen solas: escribe una nueva |
| Supabase despierto | Lunes y jueves | `ping-supabase.yml`, que ya existe. Con tráfico real deja de hacer falta, pero no estorba |
| Dependencias | Mensual | PRs de Dependabot a `develop`; CI y `pnpm audit` en verde antes de mezclar |
| `xlsx` | De vez en cuando | Mirar https://cdn.sheetjs.com; al subir, sustituir el `.tgz` de `vendor/` y `pnpm install` |
| Repetir la auditoría | Antes de abrir la app a más gente | La skill `security-audit`, perfil `standard` |
| Revisar la configuración | Tras tocar el panel de Supabase o de Vercel | Las casillas de las fases 3 y 4 |

---

## Limitaciones conocidas de este montaje

- **Límites de peticiones por instancia.** Vercel reparte las peticiones entre
  varias instancias de la función, cada una con su propia memoria, así que el
  límite real es más alto que el configurado. El CAPTCHA y el límite por cuenta
  siguen frenando el abuso de contraseñas. Si hiciera falta uno exacto: Redis
  (Upstash, con plan gratuito). Ver Decisiones abiertas en `AGENTS.md`.
- **Logs con retención corta en el plan gratuito**, y sin envío a un sistema
  externo (*log drains*), que es lo que permitiría alertas automáticas. Mientras
  tanto, revisa los eventos de seguridad a mano tras cualquier sospecha.
- **Vercel Hobby es para uso no comercial.** Si TeachCash pasa a tener
  ingresos, hay que pasar a Pro.
- **Supabase gratuito** pausa el proyecto tras 7 días sin uso (lo evita el
  ping) y tiene un tamaño de base limitado (lo protegen las cuotas por usuario
  y la API REST en solo lectura).
