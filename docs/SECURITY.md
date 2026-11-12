# Seguridad de TeachCash

Qué protege la aplicación, contra qué, dónde está cada control en el código y
qué depende de una configuración que no vive en el repositorio.

Este documento recoge la auditoría de noviembre de 2026, hecha sobre el commit
`4e8cc7a` contra tres referencias:

1. **OWASP Top 10 2025** (A01–A10).
2. **OWASP API Security Top 10 2023** (API1–API10). Aquí "la API" son las
   Server Actions: cada export de un fichero `'use server'` es un endpoint
   POST público.
3. La skill **`cloudflare/security-audit-skill`**, con perfil `quick`:
   reconocimiento, tres cazadores, un crítico de cobertura y tres
   verificadores independientes, todo sobre el código fuente y sin ejecutarlo.

Si cambias algo de lo que se describe aquí, actualiza este documento en el
mismo cambio, como el resto de `docs/`.

> **Este documento es público** (el repositorio lo es). Aquí van los controles
> que existen y la configuración que hay que revisar, **nunca** un fallo que
> siga abierto ni cómo aprovecharlo. Un fallo sin arreglar se lleva en un aviso
> privado de GitHub (**Security → Advisories**) y entra aquí, como control,
> cuando ya está corregido.

---

## 1. Qué hay que proteger y de quién

| Activo | Por qué importa |
|---|---|
| Movimientos, categorías y patrimonio de cada persona | Son datos financieros personales. Que una persona vea los de otra es el peor fallo posible de la aplicación |
| La cuenta: sesión, email y contraseña | Quien se queda con la cuenta se queda con todo lo anterior |
| Estrellas y objetos del Camino del héroe | El servidor los calcula. Si se pueden escribir desde fuera, el juego deja de tener sentido |
| La base del plan gratuito de Supabase | Es compartida y tiene un tamaño limitado. Si alguien la llena, la aplicación cae para todos |

| Actor | Qué puede hacer sin romper nada |
|---|---|
| Cualquiera en Internet | Pedir páginas, crear un invitado si pasa el CAPTCHA, llamar a cualquier Server Action con `curl` y llamar a la API REST de Supabase con la clave pública |
| Un invitado o un usuario | Todo lo anterior, ahora con una sesión válida **suya** |
| Una web de terceros abierta en el mismo navegador | Mandar peticiones con la cookie de la víctima (CSRF), incrustar la app en un iframe, leer recursos entre orígenes |

**Fronteras de confianza:**

- navegador → `proxy.ts` (CSP y refresco de sesión, con límite por IP);
- Server Action → `sesionActiva()` (JWT verificado y sesión aún abierta) → repositorio, que filtra por `userId` en el `where`;
- servidor → Supabase Auth, que comprueba el CAPTCHA y guarda las contraseñas;
- Internet → la API REST de Supabase, protegida con RLS.

---

## 2. OWASP Top 10 2025

### A01 · Broken Access Control

| Control | Dónde |
|---|---|
| Toda Server Action resuelve la sesión antes de hacer nada; sin sesión, `No autorizado` | `ejecutar()` en `src/application/actions/resultado.ts` (regla dura 3) |
| El `userId` sale **solo** del JWT verificado, nunca de los argumentos | `lib/auth.ts` (`getClaims`) y `ejecutar` |
| Cada lectura y cada escritura filtra por `userId` **dentro del `where`**: no hay "leer y luego comprobar el dueño" | Todos los repositorios (regla dura 4). Lo prueban los tests de acceso cruzado de cada repositorio |
| El nombre del recurso se resuelve contra un mapa cerrado con `Object.hasOwn` (así `constructor` o `__proto__` no son recursos) | `repositoryOf` (`repositories/index.ts`), `getFormMetadata` |
| Ids UUID que pone la base; uno mal formado o ajeno responde lo mismo: "No encontrado" | `validarId` en `frontera.ts` |
| Un nivel bloqueado del héroe no se lee ni se envía | `heroe.repository.ts` |
| **RLS en todas las tablas, de solo lectura** para la API REST (ver API3/API4) | `soloLeerLoSuyo` en `db/schema.ts`, migraciones 0007 y 0008. Lo vigila `db/__tests__/rls.test.ts` |
| La redirección `?next=` solo acepta rutas propias (sin redirector abierto) | `lib/rutas.ts` (`rutaInterna`) |
| No hay roles ni rutas de administración: no hay escalada vertical posible | Diseño: todos los usuarios son iguales |

### A02 · Security Misconfiguration

| Control | Dónde |
|---|---|
| CSP con nonce por petición, `strict-dynamic`, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'` y `form-action 'self'` | `lib/csp.ts`, que pone `proxy.ts` |
| **La CSP cubre ahora también las rutas con extensión de imagen**. Antes, `/lo-que-sea.png` devolvía el 404 de la app (HTML con scripts) sin CSP | `proxy.ts` (`matcher`), con test en `src/__tests__/cabeceras.test.ts` |
| Cabeceras: HSTS de 2 años, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` y `Cross-Origin-Opener-Policy` | `next.config.ts` |
| **Nuevas**: `Cross-Origin-Resource-Policy: same-origin`, `X-DNS-Prefetch-Control: off`, `X-Permitted-Cross-Domain-Policies: none`, y `usb=()` y `browsing-topics=()` en `Permissions-Policy` | `next.config.ts` |
| Sin `X-Powered-By` | `poweredByHeader: false` |
| Sin CORS: no hay ninguna API HTTP que lo necesite. El CSRF de las Server Actions lo cierra Next, que compara `Origin` con `Host` | Next 16 |
| El entorno se valida al arrancar; una variable mal puesta para el servidor con un mensaje claro | `lib/env.ts`, `instrumentation.ts` |
| Ninguna clave secreta en la app: ni la `service_role` de Supabase ni la secret de Turnstile | `lib/supabase/config.ts`, `.env.example` |
| **Se quitaron cinco SVG de la plantilla de Next** que se servían sin usarse (`public/`) | Inventario, ver API9 |
| `pnpm dev` solo escucha en `localhost`; `allowedDevOrigins` solo afecta al servidor de desarrollo | `package.json`, `next.config.ts` |

### A03 · Software Supply Chain Failures

| Control | Dónde |
|---|---|
| Lockfile congelado en el CI (`--frozen-lockfile`) y versiones exactas | `.github/workflows/calidad.yml` |
| `pnpm audit` de producción **y** desarrollo en cada PR, con cero avisos; los overrides están documentados | `calidad.yml`, `pnpm-workspace.yaml` |
| Dependabot mensual y agrupado, con revisión humana antes de mezclar; las alertas de seguridad llegan al momento | `.github/dependabot.yml` |
| **Acciones de GitHub fijadas a su commit (SHA)** y no a un tag que se puede mover | `calidad.yml` |
| **`xlsx` vendorizado con hash de integridad**. Antes se descargaba del CDN de SheetJS **sin hash en el lockfile**: si alguien cambiaba ese tarball, se habría instalado sin que nadie se enterara. Ahora está en `vendor/xlsx-0.20.3.tgz`, comprobado byte a byte contra el que había instalado, y el lockfile lleva su `sha512` | `vendor/`, `package.json`, `pnpm-lock.yaml`, `.gitattributes` (`*.tgz binary`) |
| El CI corre con `permissions: contents: read` y `persist-credentials: false`, y no tiene secretos | `calidad.yml` |
| Secret scanning y push protection en el repositorio público | GitHub |

### A04 · Cryptographic Failures

| Control | Dónde |
|---|---|
| Las contraseñas las guarda Supabase Auth con bcrypt; la app nunca las ve en reposo | Supabase |
| JWT firmados con ES256 y verificados en el servidor con la clave pública (`getClaims`), sin creerse nunca la cookie (`getSession`) | `lib/auth.ts` |
| Cookies `httpOnly`, `SameSite=Lax` y `Secure` en producción; no hay cliente de Supabase en el navegador | `lib/supabase/config.ts` |
| HSTS y `upgrade-insecure-requests` cuando se entra por https | `next.config.ts`, `lib/csp.ts` |
| El nonce de la CSP sale de `crypto.getRandomValues` (128 bits) | `lib/csp.ts` |
| Las claves de los límites (email, IP) se guardan en memoria como SHA-256, no en claro | `lib/limite.ts` (`claveSegura`) |
| No hay criptografía propia: todo es de Supabase, Next o la plataforma | — |

### A05 · Injection

| Control | Dónde |
|---|---|
| SQL siempre parametrizado (Drizzle). Los pocos `sql\`\`` interpolan columnas o parámetros, nunca texto del usuario | Repositorios |
| Las columnas de orden salen de una lista cerrada | `columnaDeOrden` (`listado.ts`) |
| `ilike` con los comodines `%`, `_` y `\` escapados | `patronContiene` |
| Todo lo que llega se valida con Zod en el servidor | `frontera.ts` y el esquema de cada repositorio |
| React escapa al pintar; no hay `eval` ni `innerHTML`. El único `dangerouslySetInnerHTML` es un script fijo con nonce. Las marcas del contenido se analizan a nodos de React | `app/layout.tsx`, `lib/marcas.ts` |
| CSP sin `unsafe-inline` ni `unsafe-eval` para scripts en producción | `lib/csp.ts` |
| En un log no entra texto libre que venga de fuera: es JSON, y la IP se descarta si no parece una IP | `lib/log.ts` |

### A06 · Insecure Design

| Control | Dónde |
|---|---|
| Lo que da valor lo calcula el servidor: aciertos, estrellas, precio y saldo | Reglas duras 6 y 7 |
| Comprar va con candado por usuario (`pg_advisory_xact_lock`) para que no se gaste dos veces | `tienda.repository.ts` |
| Cuotas por usuario: 1.000 movimientos para un invitado, 50.000 para una cuenta y 200 categorías | `limites.types.ts` |
| Los invitados caducan a los 4 días y pasan por CAPTCHA | `db/sql/limpieza-invitados.sql`, `lib/turnstile.ts` |
| **Límite de peticiones** por usuario, por IP y por cuenta (ver API4) | `lib/limite.ts` |
| Pruebas de abuso en la suite: ids ajenos, `pageSize` gigante, respuestas basura y compras repetidas | `frontera.actions.test.ts`, repositorios |

### A07 · Authentication Failures

| Control | Dónde |
|---|---|
| Contraseña de 10 a 72 caracteres con mayúscula, minúscula, número y símbolo; la impone Supabase | `auth.actions.ts`, panel de Supabase |
| CAPTCHA (Turnstile) en invitado, login, registro, recuperación y en la reautenticación | `auth.actions.ts` |
| Sin enumeración: "email o contraseña incorrectos", y "te hemos enviado un enlace" tanto si el email existe como si no | `auth.actions.ts` |
| Cambiar la contraseña con la sesión abierta pide la actual, comprobada contra el email de la **sesión**, y lo mismo al borrar la cuenta | `cambiarPassword`, `borrarCuenta` |
| **Límite de intentos**: 20 operaciones de auth cada 10 min por IP y 10 intentos de contraseña cada 15 min **por cuenta**, vengan de la IP que vengan. Hacía falta porque Supabase limita por IP y solo ve la del servidor, la misma para todo el mundo | `lib/limite.ts`, `auth.actions.ts` |
| **Al cambiar la contraseña se cierran las demás sesiones** (`signOut({ scope: 'others' })`). Antes, una cookie robada seguía valiendo después de la recuperación | `cambiarPassword` |
| **Los enlaces de email salen de `APP_URL`**, no de las cabeceras. Con `curl` y un `Host` falso, "recuperar la contraseña de otra persona" podía pedir un enlace hacia el dominio del atacante (*password reset poisoning*). En producción `APP_URL` es obligatoria: sin ella el servidor no arranca (auditoría run-2: antes era opcional y el arreglo quedaba en nada). Fuera de producción, todo lo que no sea un origen http(s) limpio se rechaza | `origen()` en `auth.actions.ts`, `lib/env.ts` |
| **`/auth/confirm` acepta solo `?code=`** (PKCE, ligado al navegador que pidió el enlace). Se quitó la rama `?token_hash=`: permitía un *login CSRF*, es decir, meter a la víctima en la cuenta del atacante | `app/auth/confirm/route.ts` |
| Salir revoca el refresh token de esa sesión | `cerrarSesion` |
| **Una sesión cerrada deja de valer al momento**: toda Server Action comprueba que el `session_id` del token sigue en `auth.sessions`, así que salir, cambiar la contraseña o borrar la cuenta cortan también el token de acceso ya emitido | `sesionActiva` (`src/application/actions/sesion.ts`), `sesionViva` (`cuenta.repository.ts`) |
| Un token sin `session_id` no cuenta como sesión | `lib/auth.ts` |
| El access token dura 1 hora y el refresh token rota | Supabase |

### A08 · Software or Data Integrity Failures

| Control | Dónde |
|---|---|
| Hash de integridad para **todas** las dependencias, `xlsx` incluido; acciones de CI fijadas por SHA | A03 |
| El contenido del héroe es JSON del repo, validado con Zod al cargarlo y en el CI (`pnpm heroe:validar`); no se deserializa nada que llegue de fuera | `src/infrastructure/heroe/contenido.ts` |
| No se carga ninguna configuración remota en tiempo de ejecución | — |
| Turnstile se carga sin SRI porque Cloudflare cambia `api.js` sin versionarlo. Lo acota la CSP (`frame-src` y `script-src` con `strict-dynamic`) | `lib/turnstile.ts`, `lib/csp.ts` |

### A09 · Security Logging and Alerting Failures

| Control | Dónde |
|---|---|
| **Eventos de seguridad estructurados**: una línea JSON con `tipo: "seguridad"` para login (correcto y fallido), registro, recuperación, cambio de contraseña, borrado de cuenta, invitado, enlace de email, salida y cada bloqueo por límite | `registrarEvento` (`lib/log.ts`) |
| Sin datos personales en el log: ni emails, ni contraseñas, ni lo que se escribió. El usuario va por su UUID y la IP recortada (/24 en IPv4, /48 en IPv6) | `anonimizarIp` |
| Los errores del servidor van sin los `params` de Drizzle ni el `detail` de Postgres | `registrarError` |
| Eventos por `console.warn` y errores por `console.error`, separados para que un agregador alerte por cada tipo | `lib/log.ts` |

**Qué alertas montar** en el agregador de logs del despliegue:

- un pico de `{"evento":"login","resultado":"fallo"}`;
- cualquier `"resultado":"bloqueo"`;
- muchos `enlace_email`/`fallo` seguidos;
- `borrar_cuenta` en ráfaga.

### A10 · Mishandling of Exceptional Conditions

| Control | Dónde |
|---|---|
| Los errores esperados se devuelven como valor. Uno inesperado se registra y al cliente le llega "Se ha producido un error inesperado", sin pila ni SQL | `ejecutar`, `intentar` en `auth.actions.ts` |
| En producción, Next redacta las excepciones que llegan al cliente | Next |
| Fallar cerrado: un `amr` raro no cuenta como contraseña, un id raro es "No encontrado" y una sesión que no verifica es "sin sesión" | `lib/auth.ts`, `frontera.ts` |
| Atomicidad donde importa: compras con candado, patrimonio en una transacción, idempotencia de los movimientos con `UNIQUE` | Repositorios |
| Si revocar las otras sesiones falla, la contraseña ya está cambiada: se registra y no se deshace nada | `cambiarPassword` |

---

## 3. OWASP API Security Top 10 2023

| | Riesgo | Cómo se cubre |
|---|---|---|
| API1 | **BOLA** (acceder a objetos ajenos por id) | `userId` dentro del `where` en todo acceso; ids UUID; "No encontrado" igual para lo ajeno y lo inexistente. Tests de acceso cruzado por repositorio |
| API2 | **Autenticación rota** | Todo lo de A07: JWT verificado, CAPTCHA, límites por IP y por cuenta, reautenticación, revocación de sesiones y enlaces que no se pueden envenenar |
| API3 | **BOPLA** (leer o escribir propiedades de más) | Escritura: Zod con lista explícita de campos, sin esparcir `values` sobre la tabla (no hay *mass assignment*). Lectura: DTOs por pantalla, nunca la fila entera. **La API REST de Supabase ya no permite escribir en ninguna tabla**: antes, `categories`, `transactions` y `profiles` tenían `for all` |
| API4 | **Consumo sin límites** | **300 acciones/min por usuario** en `ejecutar`; **cuerpo de Server Action ≤ 256 KB** (`next.config.ts`); `pageSize` ≤ 100, **`page` ≤ 50.000**, filas sin paginar ≤ 5.000 y serie de saldo ≤ 731 días; cuotas por usuario. **El refresco de sesión del proxy, 120 por minuto e IP**: pasado el límite deja de llamar a Supabase, sin bloquear la página. El limitador tiene un tope de memoria (10.000 claves **por regla**) para no ser él mismo la denegación de servicio; al llenarse olvida primero las claves con menos cuenta y nunca una bloqueada mientras quede otra |
| API5 | **BFLA** (funciones que no deberías poder invocar) | No hay funciones de administración. Las acciones de cuenta (cambiar contraseña, borrar) comprueban el tipo de sesión **en el servidor**: un invitado no puede |
| API6 | **Flujos de negocio sin protección** | Crear invitado: CAPTCHA, filtro de bots por User-Agent y 10 por IP y hora. Comprar en la tienda: estrellas calculadas en el servidor y con candado. Partidas: corregidas en el servidor. Las estrellas no se pueden fabricar escribiendo por REST |
| API7 | **SSRF** | El servidor no pide ninguna URL que venga del usuario. Las únicas salidas son a Supabase, y la URL sale del entorno validado |
| API8 | **Configuración insegura** | Todo lo de A02 |
| API9 | **Inventario** | La API entera son los ficheros `src/application/actions/*.actions.ts` y un route handler (`/auth/confirm`). No hay versiones antiguas, ni rutas de depuración, ni staging público (los E2E van contra un proyecto aparte y en local). Se quitaron los estáticos de plantilla que no se usaban |
| API10 | **Consumo inseguro de APIs** | Las respuestas de Supabase se tratan como no fiables: los claims del JWT se comprueban por tipo uno a uno (`metodoDeEntrada` y `getSession`); un error de Auth sin traducir sale como genérico. No se consume ninguna otra API de terceros |

---

## 4. La auditoría de Cloudflare (`security-audit-skill`)

Resultado: **0 vulnerabilidades confirmadas** y **3 hipótesis `needs_validation`**,
es decir, fallos fundados en el código que dependían de una configuración fuera
del repositorio. Las tres se han cerrado en el código, para que dejen de
depender de esa configuración:

| Hallazgo | Qué decía | Qué se hizo |
|---|---|---|
| `auth-actions-origen-forwarded-header-redirect` | El enlace de recuperación se construía con `Origin`/`X-Forwarded-Host` de la petición: *password reset poisoning* si la lista de Redirect URLs de Supabase tenía un comodín alcanzable | `APP_URL` como origen fijo, y validación del origen cuando no está. Tests en `auth.actions.test.ts` |
| `auth-confirm-token-hash-login-csrf` | `?token_hash=` no está ligado al navegador: login CSRF | Rama quitada; solo `?code=` (PKCE). Volverá con una página de confirmación (ver Decisiones abiertas en AGENTS.md) |
| `rest-rls-bypasses-repository-quotas` | Por la API REST, cualquier sesión (incluido un invitado) podía escribir en `transactions`/`categories`/`profiles` sin cuotas ni topes de longitud y llenar la base gratuita | Políticas de solo lectura (migraciones 0007 y 0008) y un test que impide volver atrás |

Notas de endurecimiento que dejó, y su estado:

| Nota | Estado |
|---|---|
| Revocar las otras sesiones al cambiar la contraseña | ✅ Hecho |
| `xlsx` sin hash en el lockfile y acciones del CI con tags flotantes | ✅ Hecho |
| `page` sin tope | ✅ Hecho |

Una segunda pasada (perfil `standard`, run-2) dejó tres arreglos, ya hechos:
la comprobación de sesión viva (A07), el límite del refresco en el proxy y el
reparto de memoria del limitador (API4).

Los artefactos de la ejecución (`architecture.md`, `coverage-ledger.json`,
`findings.json` y `NEEDS-VALIDATION.md`) están fuera del repositorio, en
`~/security-audit-skill/TeachCash/run-1`. Ese run quedó como `incomplete` por
dos razones de forma: el entorno no dejó escribir dos de los informes, y en
Windows sus validadores necesitaron un envoltorio. Ninguna de las dos cambia
los hallazgos. Era un perfil `quick`: **no es una cobertura exhaustiva**, y
según la propia skill una pasada encuentra aproximadamente la mitad de lo que
encuentran varias. Conviene repetirla (`standard`) antes de abrir la app a más
gente.

---

## 5. Lo que depende de configuración fuera del repo

Hay controles que el código no puede imponer. Revísalos en cada entorno:
El paso a paso para producción (Vercel + Supabase) está en
`docs/plans/PLAN-DESPLIEGUE.md`.

**Despliegue**

- [ ] `APP_URL` con la URL pública, sin ruta. Sin ella, el servidor de producción no arranca.
- [ ] El proxy de delante (Vercel, nginx…) **sobrescribe** `x-real-ip`/`x-forwarded-for` con la IP real. Los límites por IP la necesitan.
- [ ] Con varias instancias: `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` compartida entre todas.
- [ ] Alertas en el agregador de logs sobre los eventos `tipo: "seguridad"` (A09).

**Supabase** (Authentication → …)

- [ ] **URL Configuration**: Site URL = `APP_URL` y Redirect URLs exactas en producción, **sin comodines**.
- [ ] **Captcha** activado (Turnstile, con su secret aquí y no en la app).
- [ ] **Secure password change** y **Secure email change** activados. `PUT /auth/v1/user` es un camino paralelo a la reautenticación de la app.
- [ ] Rotación de refresh tokens activada; JWT de 3.600 s como mucho.
- [ ] Contraseña mínima de 10 con los cuatro tipos de carácter; *leaked password protection* si el plan lo permite.
- [ ] **Aplicar las migraciones 0007 y 0008** (`pnpm db:migrate` y `pnpm db:migrate:e2e`). Hasta entonces, la API REST sigue dejando escribir.
- [ ] Data API: si un día no se usa ni para el ping, se puede desactivar entera.

**GitHub**

- [ ] Secret scanning, push protection, alertas de Dependabot y los checks obligatorios en `develop`.

---

## 6. Riesgos y trabajo pendiente

No se publican. Lo que esté abierto se lleva en avisos privados de GitHub
(**Security → Advisories**) y, al cerrarse, pasa a las tablas de arriba como un
control más. Las mejoras que no son un fallo (MFA, un límite compartido entre
instancias, un rol de base propio) están en "Decisiones abiertas" de
`AGENTS.md`.

---

## 7. Si algo pasa

1. **Contener**: con un endpoint comprometido, despliega con la acción desactivada o pausa el proyecto en Supabase.
2. **Rotar**: la contraseña de la base (`DATABASE_URL`), la publishable key y las claves de Turnstile. Revoca las sesiones desde el panel de Supabase (Auth → Users → Sign out).
3. **Investigar**: filtra los logs por `tipo: "seguridad"` y por el `userId` o la red afectados.
4. **Corregir con un test**: primero el test que reproduce el fallo en rojo, como cualquier bug (docs/TESTS.md), y añade aquí la medida.

**Reportar una vulnerabilidad**: abre un aviso privado en la pestaña
**Security → Report a vulnerability** del repositorio de GitHub, no un issue
público.
