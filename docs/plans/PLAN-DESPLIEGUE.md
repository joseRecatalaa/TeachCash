# Plan de despliegue: TeachCash en producción

Pasos para publicar TeachCash en Internet con las medidas de seguridad de
`docs/SECURITY.md` activas. Se sigue en orden, marcando cada casilla. Cada paso
dice **dónde** se hace y **cómo se comprueba** que quedó bien.

> **Estado (18-11-2026): en producción en https://www.teachcash.es.** Las
> casillas marcadas están hechas y comprobadas. Las que quedan sin marcar son
> lo pendiente: copias de seguridad (1.4), dos comprobaciones de Auth (3.2 y
> 3.3), parte de los flujos en el navegador (6.3) y los logs de seguridad
> (6.4). Los valores reales de cada paso (dominio, región, límites) están en
> su sitio. Si se repite el despliegue en otro proyecto, se sigue este orden.

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
- **DonDominio** tiene el dominio `teachcash.es` (renovación manual, caduca el
  18-11-2027) y sus DNS. **Resend** envía los emails de Supabase Auth por SMTP
  (plan gratuito: 100 al día).

**Rama de producción: `main`.** Es la que ya recibe lo que pasó el CI en
`develop` (ver `calidad.yml`).

---

## Fase 0 · Código listo en `main`

- [x] Mezclar en `develop` la rama de la auditoría de seguridad, por PR, con el
      CI en verde.
- [x] Mezclar también `fix/seguridad-antes-de-publicar` (auditoría run-2):
      `APP_URL` obligatoria en producción, la API REST sin permisos de
      escritura (`REVOKE`) y las fechas de los filtros validadas. Incluye una
      migración: después toca 1.1.
- [x] Abrir la PR `develop` → `main` y mezclarla.
- [x] En local, antes de seguir:
      `pnpm typecheck && pnpm lint && pnpm test && pnpm test:tz && pnpm build`.

---

## Fase 1 · Base de datos (Supabase)

### 1.1 Aplicar todas las migraciones

Las migraciones 0007 a 0009 dejan la API REST de Supabase en solo lectura.
Aplícalas antes de publicar la app.

```bash
pnpm db:migrate        # proyecto principal (lee .env.local)
pnpm db:migrate:e2e    # proyecto de los E2E (lee .env.e2e)
```

- [x] Hecho en los dos proyectos.
- [x] **Comprobación**: en Supabase → SQL Editor, esta consulta tiene que
      devolver **solo filas con `cmd = SELECT`**. Una fila con `ALL`, `INSERT`,
      `UPDATE` o `DELETE` significa que falta una migración.

  ```sql
  select tablename, policyname, cmd from pg_policies where schemaname = 'public';
  ```
- [x] **Comprobación** de la migración del `REVOKE`: esta consulta tiene que
      devolver **cero filas**. Cualquier fila es un permiso de escritura que
      `anon` o `authenticated` aún conservan.

  ```sql
  select c.relname as tabla, r.rolname as rol, p.privilegio
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  cross join pg_roles r
  cross join unnest(array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) as p(privilegio)
  where n.nspname = 'public' and c.relkind in ('r', 'p')
    and r.rolname in ('anon', 'authenticated')
    and has_table_privilege(r.oid, c.oid, p.privilegio);
  ```

  No uses `information_schema.role_table_grants`: solo enseña los permisos
  que ve el usuario conectado, y desde el MCP en solo lectura
  (`supabase_read_only_user`) devuelve cero filas aunque falte la migración.
  Pasó en la primera comprobación: dio "todo bien" con la 0009 sin aplicar.

### 1.2 Limpieza de invitados

Los invitados caducan a los 4 días y los borra un job de `pg_cron`.

- [x] Database → Extensions → **pg_cron** activada.
- [x] **Comprobación**: `select jobname, schedule from cron.job;` devuelve
      `limpieza-invitados | 0 * * * *`. Si no sale, ejecuta una vez en el SQL
      Editor el contenido de `db/sql/limpieza-invitados.sql`.

### 1.3 Comprobaciones con Claude y el MCP de Supabase

Claude puede hacer por ti las comprobaciones de la base de esta fase si le
conectas el MCP de Supabase. Conéctalo **en solo lectura y limitado al
proyecto**, para que no pueda cambiar nada de producción ni por error
(`<ref>` es el identificador del proyecto, el que sale en la URL del panel):

```bash
claude mcp add --transport http supabase "https://mcp.supabase.com/mcp?project_ref=<ref>&read_only=true"
```

Pide el inicio de sesión de Supabase en el navegador. Después, pídele a Claude
que compruebe:

- [x] **Que el rol de la app puede leer `auth.sessions`.** Es la más
      importante: toda Server Action comprueba ahí que la sesión sigue abierta
      (`sesionViva`). Si no puede leerla, nadie puede hacer nada en la app.
- [x] Las migraciones aplicadas y las dos consultas de 1.1.
- [x] El job de limpieza de invitados de 1.2.
- [x] Cuánto ocupa la base (`pg_database_size`), lejos de los 400 MB del freno
      general (`MAX_TAMANO_BASE`).
- [x] Los avisos de seguridad del propio Supabase (*advisors*).

El MCP no llega a los ajustes de Authentication (Fase 3): esos se revisan a
mano en el panel.

### 1.4 Copias de seguridad

- [ ] Database → Backups: mira qué incluye tu plan. Si no hay copias que puedas
      descargar, haz una antes de abrir la app y después de cada migración:
      `pg_dump "$DATABASE_URL_MIGRATIONS" > copia-AAAA-MM-DD.sql`. Guárdala
      fuera del repo: contiene datos personales.

---

## Fase 2 · Aplicación (Vercel)

### 2.1 Crear el proyecto

- [x] https://vercel.com → *Add New* → *Project* → importar el repositorio de
      GitHub. El panel separa **Create Project** de **Deploy**: pulsa solo
      *Create Project* y deja el despliegue para 2.4, con las variables ya
      puestas. **No añadas la integración de Supabase** que ofrece ahí: mete
      variables por su cuenta, la *secret key* (`service_role`) incluida.
      El proyecto se llama `teach-cash`.
- [x] Framework: **Next.js** (lo detecta solo). Comandos por defecto: Vercel
      usa pnpm porque lo lee de `packageManager` en `package.json`, e instala
      con el lockfile congelado.
- [x] Settings → General → **Node.js Version: 24.x**, la misma que en local y
      en el CI.
- [x] Settings → Functions → **Function Region: París (`cdg1`)**. Si la app
      corre lejos de la base, cada consulta paga el viaje.
- [x] **Production Branch: `main`** (en el panel actual, Settings →
      Environments → Production). Al importar, el panel enseña `develop`
      porque es la rama por defecto en GitHub; la de producción la detectó
      sola como `main`. Compruébalo en Overview: "push to the main branch".

### 2.2 Que solo se despliegue `main`

Cada rama crearía un *preview* conectado a la base de **producción**, con una
URL nueva que habría que dar de alta en Supabase (justo los comodines que no
queremos).

- [x] Settings → Build and Deployment → **Ignored Build Step** → *Custom*
      (el botón *Save* se queda gris tras guardar: recarga para comprobarlo):

  ```bash
  if [ "$VERCEL_GIT_COMMIT_REF" = "main" ]; then exit 1; else exit 0; fi
  ```

  (`exit 0` = no construir, `exit 1` = construir.)
- [x] Settings → Deployment Protection: deja activada la protección de los
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
| `APP_URL` | `https://<tu-dominio>`, sin barra ni ruta | Ver 2.4. Origen de los enlaces de los emails. Hoy, `https://www.teachcash.es` |

`DATABASE_URL` se marca **Sensitive**. Las tres `NEXT_PUBLIC_*` hacen saltar el
aviso *Keep This Value Private* si se crean como secretas: se pulsa **Change to
Config**. Son públicas por diseño (van en el JavaScript del navegador) y lo
que protege los datos es RLS, no que nadie conozca la clave *publishable*. **No
se les quita el prefijo**: el código las lee con ese nombre.

**Lo que NO va en Vercel:**

- `DATABASE_URL_MIGRATIONS`: las migraciones se lanzan desde tu equipo.
- La *secret key* (`service_role`) de Supabase: la app no la usa y no debe tenerla.
- La *secret key* de Turnstile: vive en el panel de Supabase.

### 2.4 Primer despliegue y `APP_URL`

- [x] **`APP_URL` va ANTES del primer despliegue.** Sin ella la app no arranca
      en producción (`validarEntorno`, desde `instrumentation.ts`), así que no
      sirve desplegar primero y ponerla después. La URL se sabe antes: es la
      que sale en Settings → Domains (`https://<proyecto>.vercel.app`, o el
      dominio propio si ya lo tienes).
- [x] El primer despliegue se lanza a mano: Deployments → **Create
      Deployment** → rama `main`. Si el build falla con "Variables de entorno
      no válidas", el mensaje dice cuál está mal (`lib/env.ts`).
- [x] Cada vez que cambie `APP_URL` (al pasar al dominio propio, por ejemplo),
      vuelve a desplegar: Deployments → ⋯ → *Redeploy*.

> En Vercel no hace falta `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`: todas las
> funciones de un despliegue salen del mismo build. Solo hace falta en un
> autoalojado con varias instancias.

> Vercel pone la IP real del visitante en `x-real-ip` y no deja pasar la que
> mande el cliente. Es lo que necesitan los límites por IP (`lib/limite.ts`).
> En otro hosting habría que configurarlo a mano.

- [x] **Comprobación** de lo anterior, porque la auditoría no puede verlo desde
      el código. Se hizo sin logs, con el propio límite: 22 llamadas a la
      acción `solicitarRecuperacion` (POST a `/RecuperarPassword` con su
      cabecera `Next-Action`, que se saca del JavaScript de esa página), un
      email `@example.invalid` y un CAPTCHA falso, cada una con una IP falsa
      distinta en `X-Real-IP` y `X-Forwarded-For`. La 21 respondió
      "Demasiados intentos" (`LIMITE_AUTH_IP`, 20 cada 10 min): Vercel
      sobrescribe las dos cabeceras. Si el límite no salta nunca, la IP se
      puede falsificar y no hay que dejar la app publicada. Deja tu propia IP
      sin poder entrar 10 minutos.

---

## Fase 3 · Autenticación (Supabase → Authentication)

Los nombres de las secciones pueden variar un poco según la versión del panel.

### 3.1 URLs

- [x] **URL Configuration → Site URL** = el mismo valor que `APP_URL`.
- [x] **URL Configuration → Redirect URLs**, solo URLs **exactas, sin `*` ni
      `**`**:
  - `https://<tu-dominio>/auth/confirm` (producción)
  - `http://localhost:3000/auth/confirm` (para seguir desarrollando en local)
  - Quita la de la IP de tu red local (`192.168.1.x`) si ya no la usas.

  Un comodín es justo lo que permitiría mandar un enlace de recuperación a un
  dominio ajeno.

### 3.2 Contraseñas y cambios de cuenta

- [x] **Sign In / Providers → Email**:
  - **Confirm email**: ON.
  - **Secure password change**: ON. Sin él, alguien con una sesión robada
    podría cambiar la contraseña llamando a Supabase directamente, sin pasar
    por la app, que es la que pide la actual.
  - **Secure email change**: ON.
- [ ] **Comprobación de Secure password change**, en el proyecto de los E2E
      y nunca en producción: con una cuenta de prueba que haya entrado con
      contraseña hace menos de 24 h, llama a `PUT /auth/v1/user` con
      `{"password": "..."}` y su propio token de acceso. Si cambia la contraseña
      sin pedir un nonce, Supabase exime a las sesiones recientes y el ajuste no
      protege lo que dice arriba.
- [x] **MFA (TOTP): desactivado** mientras la app no lo use. La app decide si
      pide la contraseña actual mirando el método de entrada **más reciente**
      del token (`lib/auth.ts`). Con TOTP activo, quien tenga una sesión robada
      puede añadirle un factor y la app deja de pedírsela.
- [x] Política de contraseñas: **mínimo 10** caracteres, con minúsculas,
      mayúsculas, números y símbolos (la misma que valida `auth.actions.ts`).
- [ ] *Leaked password protection*: actívala si tu plan la incluye.

### 3.3 Anti-bots y sesiones

- [x] **Attack Protection → Captcha**: ON, proveedor **Turnstile**, con la
      *secret key* del mismo widget cuya *site key* está en Vercel. Estaba
      APAGADO, y sin él cualquiera podía crear invitados o probar
      contraseñas llamando a Supabase directamente, sin pasar por Turnstile.
      **Comprobación**, sin crear nada:

  ```bash
  curl -s -X POST "https://<proyecto>.supabase.co/auth/v1/token?grant_type=password" \
    -H "apikey: <publishable key>" -H "Content-Type: application/json" \
    -d '{"email":"nadie@example.invalid","password":"x"}'
  ```

  Tiene que responder `captcha_failed`. Si responde `invalid_credentials`, el
  CAPTCHA está apagado. Antes de activarlo, la app ya mandaba el token en todos
  los flujos (invitado, login, registro, recuperar y reautenticar): no rompe
  nada.
- [x] **Sessions**: rotación de refresh tokens ON; caducidad del JWT ≤ 3600 s
      (son los valores por defecto).
- [x] **JWT Keys**: la clave activa tiene que ser **ES256** (asimétrica): la
      app verifica el token con la clave pública, y comprueba aparte en la base
      que la sesión sigue abierta.
- [x] **Rate Limits**: deja los de fábrica, pero **apunta sus valores**
      (*token refresh*, *anonymous sign-ins*, *sign-ups and sign-ins*).
      Supabase los cuenta por IP y ve la IP de Vercel, la misma para todos los
      usuarios: en la práctica son un único cupo compartido. Compáralos con lo
      que la app deja pasar por visitante (10 invitados/h, 20 operaciones de
      auth cada 10 min y 120 refrescos de sesión por minuto, por IP). Si con
      dos o tres visitantes se llega al de Supabase, súbelos.

  De fábrica eran 150 refrescos cada 5 min, **30 invitados por hora** y **30
  registros + logins cada 5 min**. Con el cupo compartido, 30 invitados por
  hora dejaba fuera a una clase entera probando la app a la vez: se subieron
  a **150 invitados/h** y **100 registros + logins cada 5 min**. Es seguro
  porque el CAPTCHA frena antes a los bots. Los refrescos se quedaron igual.
- [ ] En **Auth → Logs**, confirma que las peticiones de la app llegan desde
      una sola IP o desde muy pocas (las de Vercel).

### 3.4 Usuarios anónimos

- [x] **Sign In / Providers → Allow anonymous sign-ins**: ON. Sin esto no
      nacen los invitados y la app no se puede usar sin cuenta.

---

## Fase 4 · CAPTCHA (Cloudflare Turnstile)

- [x] Cloudflare → Turnstile → tu widget → **Hostnames**: añade el dominio de
      producción, sin `https://` ni barra. Sin él, Turnstile no da token en
      producción y **no se puede crear ningún invitado**: la app enseña "No
      hemos podido comprobar que no eres un robot" (`lib/turnstile.ts`; con
      "Recarga la página…" detrás, el que falla es Supabase, no Turnstile).
      El widget es el de la *site key* que lleva el JavaScript desplegado, y
      solo tenía `localhost`. Hoy lleva `www.teachcash.es` y
      `teachcash.vercel.app`.
- [x] Deja `localhost` si sigues desarrollando con el mismo widget.

---

## Fase 5 · Emails (solo para abrir el registro a otras personas)

Sin SMTP propio, Supabase manda **2 emails por hora** y **solo a los miembros
del equipo del proyecto**. Para ti basta para probar; para cualquier otra
persona, registrarse o recuperar la contraseña **no funciona**. Los invitados
sí funcionan, porque no usan email.

> Los tres arreglos de código que pedía la auditoría `standard` (run-2) antes
> de abrir el registro ya están hechos (ver `docs/SECURITY.md`).

Un proveedor SMTP solo envía a cualquiera desde un **dominio propio
verificado** (`*.vercel.app` no admite registros DNS, y mandar como `@gmail.com`
rompe DMARC y acaba en spam). Por eso esta fase empieza comprando uno.

### 5.1 Dominio propio

- [x] Comprar `teachcash.es` en DonDominio: **solo el dominio**, sin hosting,
      SSL ni correo (el hosting y el HTTPS los pone Vercel). Unos 8 € el
      primer año con IVA y unos 6 € la renovación. Renovación en **Manual**.
- [x] Vercel → Domains → **Add Existing** → `teachcash.es`, con *Redirect apex
      domains to www* marcado: la app vive en **`www.teachcash.es`** y
      `teachcash.es` redirige (308).
- [x] DonDominio → teachcash.es → **Gestionar parking → Zona DNS**: borrar el
      `ANAME` de la raíz y el comodín `*.teachcash.es` del parking (mandaba
      cualquier subdominio a la página aparcada); crear un **A** con el host
      vacío hacia la IP que da Vercel y cambiar el **CNAME** de `www` al valor
      de Vercel. El resto de registros del parking no estorba.
- [x] Vercel → Domains → `teachcash.vercel.app` → *Redirect to Another Domain*
      → 308 → `www.teachcash.es`, para que la app tenga una sola dirección.
- [x] Pasar todo al dominio nuevo: `APP_URL` en Vercel (y *Redeploy*), el
      hostname en Turnstile, y en Supabase la Site URL y la Redirect URL de
      `/auth/confirm` (quitando la de `vercel.app`).

Un `.es` recién registrado tarda en verse: los DNS de DonDominio responden al
momento (`nslookup teachcash.es ns1.dondominio.com`), los públicos tardaron
cerca de una hora.

### 5.2 Resend y SMTP

- [x] Resend → Domains → *Add Domain* → `teachcash.es`, región **Ireland
      (eu-west-1)**. Sus 4 registros van a la Zona DNS de DonDominio: TXT
      `resend._domainkey` (DKIM), CNAME `rsend` y `send` (SPF) y TXT `_dmarc`
      con `v=DMARC1; p=none;`. En Host va solo el prefijo: DonDominio añade
      `.teachcash.es`. Después, *Verify DNS records*.
- [x] Resend → API Keys → una clave **Sending access**. Mientras el dominio
      no está verificado solo deja elegir *All domains*: vale, porque la
      cuenta no tiene otro.
- [x] Supabase → Authentication → **Emails → SMTP Settings**: host
      `smtp.resend.com`, puerto `465`, usuario `resend`, contraseña la clave de
      Resend, remitente `no-reply@teachcash.es` con nombre `TeachCash` (no hace
      falta buzón). Al activarlo, Supabase sube su límite de emails de 2 a 30
      por hora; el tope real es el de Resend, 100 al día.

### 5.3 Plantillas

- [x] Las plantillas en español están en **`docs/emails/`**, con su README: se
      pegan a mano en Supabase → Authentication → Emails → **Templates**
      (asunto y cuerpo). Mantienen el enlace `{{ .ConfirmationURL }}`, que es
      el flujo `?code=`. **No las cambies a `token_hash`**: `/auth/confirm` ya
      no lo acepta porque permitía un login CSRF (ver `docs/SECURITY.md`).

---

## Fase 6 · Comprobar que todo funciona

Con la URL de producción en `$URL`.

### 6.1 Cabeceras y CSP

```bash
curl -sI "$URL/" | grep -iE "content-security-policy|strict-transport|x-frame|cross-origin-resource|permissions-policy"
curl -sI "$URL/no-existe.png" | grep -i content-security-policy
```

- [x] Las dos llevan `Content-Security-Policy` con un `nonce-…` distinto en
      cada petición, y la primera trae también las otras cabeceras.
- [x] `curl -sI "$URL/" | grep -i x-powered-by` no devuelve nada.

### 6.2 La API REST no deja escribir

```bash
curl -s -X POST "https://<proyecto>.supabase.co/rest/v1/categories" \
  -H "apikey: <publishable key>" -H "Content-Type: application/json" \
  -d '{"name":"x"}'
```

- [x] Responde con un error de permisos (código `42501`), no con un `201`.

### 6.3 Flujos en el navegador

- [x] Abrir la app en una ventana privada: aparece como invitado y puede anotar
      un movimiento.
- [x] Crear cuenta con tu email → llega el enlace → apunta a
      **`APP_URL`/auth/confirm** → eliges contraseña.
- [ ] Salir y volver a entrar con la contraseña.
- [ ] Iniciar sesión en dos navegadores, cambiar la contraseña en uno → en el
      otro, la siguiente acción (anotar o editar un movimiento) ya no funciona.
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
| Revisar la configuración | Tras tocar el panel de Supabase o de Vercel | Las casillas de las fases 3 y 4 |
| Tamaño de la base | Semanal, y a diario si la app se abre a más gente | Supabase → Reports → Database |
| Job de limpieza de invitados | Tras restaurar una copia o recrear el proyecto | La comprobación de 1.2: el job vive fuera de las migraciones |
| Renovar `teachcash.es` | Antes del 18-11-2027, cada año | DonDominio, renovación **manual**. Si caduca, la app sigue en `teachcash.vercel.app` (quitando su redirección), pero sin emails: el dominio de envío es el mismo |
| Plantillas de email | Al cambiar una en `docs/emails/` | Pegarla otra vez en Supabase → Emails → Templates: Supabase no lee el repo |

---

## Limitaciones conocidas de este montaje

- **Límites de peticiones por instancia.** Cada instancia de la función lleva
  su propia memoria. Si hiciera falta un límite común: Redis (Upstash, con plan
  gratuito). Ver Decisiones abiertas en `AGENTS.md`.
- **Logs con retención corta en el plan gratuito**, y sin envío a un sistema
  externo (*log drains*), que es lo que permitiría alertas automáticas. Mientras
  tanto, revisa los eventos de seguridad a mano tras cualquier sospecha.
- **Resend gratuito envía 100 emails al día.** Pasado ese tope, quien se
  registre ese día no recibe la confirmación. Lo dice el panel de Resend; si se
  queda corto, su plan de pago.
- **Vercel Hobby es para uso no comercial.** Si TeachCash pasa a tener
  ingresos, hay que pasar a Pro.
- **Supabase gratuito** pausa el proyecto tras 7 días sin uso (lo evita el
  ping) y tiene un tamaño de base limitado: se vigila en la Fase 7.
