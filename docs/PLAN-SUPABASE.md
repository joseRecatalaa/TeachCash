# Plan: TeachCash → Supabase (Postgres) + multiusuario con login seguro

> **Para retomar en una sesión nueva** (también desde otro ordenador): lee
> primero "Estado a 2026-10-02" y "Siguiente paso".
>
> Cómo quiere trabajar el usuario: los pasos MANUALES (paneles de Supabase,
> Cloudflare…) se dan **de uno en uno**, esperando su "ok" antes del siguiente,
> y las respuestas son cortas y directas. Usa el plan **gratuito** de Supabase:
> no proponer nada de pago.
>
> En un ordenador nuevo: `git pull`, `pnpm install` y crear `.env.local` (no
> está en git; el usuario lo copia de su gestor de contraseñas o lo rehace con
> `.env.example` y el panel de Supabase).

## Estado a 2026-10-05

**El plan principal está TERMINADO.** Fases 0–2 fusionadas en `develop` (PR #6),
T9 hecha por el usuario y Fase 4 (documentación) escrita. Lo que queda abajo
(T6, Fases 5 y 6) es opcional o aplazado y está anotado también en
"Decisiones abiertas" de `AGENTS.md`.

- **T9 — limpieza de invitados: HECHA (2026-10-05).** `pg_cron` activado,
  `db/sql/limpieza-invitados.sql` ejecutado (job id 1) y `limpieza-invitados`
  comprobado en la lista de jobs.
- **Fase 4 — documentación: HECHA (2026-10-05).** `AGENTS.md`, `README.md` y
  las skills `finance-data-model`, `server-action-safety` y `testing-finance`
  ya hablan de Postgres/Supabase, PGlite y Supabase Auth. Las plantillas de
  Plop ya estaban adaptadas.

## Estado a 2026-10-02

Rama **`feat/supabase-auth`** (sale de `develop`; fusionada después como PR #6). Commits:

| Commit | Qué |
|---|---|
| `a2163bb` | Fase 0+1: SQLite → Postgres (Supabase), tests sobre PGlite |
| `2bdfa96` | Fase 2: Supabase Auth, modo invitado, login/registro, Turnstile |
| `8448ae1` | Cookies de sesión `httpOnly` (secure en producción) |
| `c6ed9af` | `pnpm dev` escucha solo en `localhost` |

Verificado: `typecheck`, `lint`, `build` y 198 tests (`test` y `test:tz`) en verde.
Migración aplicada en Supabase (`pnpm db:migrate`): tablas, RLS, políticas y FKs comprobadas.

**Probado por el usuario en el navegador (T7), todo OK:**
invitado automático al entrar → anotar gasto → "Crea una cuenta" → email →
elegir contraseña → mismos datos y círculo con la inicial → ventana privada =
invitado nuevo vacío → login con la cuenta = ve sus datos → cerrar sesión sin
ver datos previos. Security Advisor: 0 errores; avisos esperados
("Anonymous Sign-Ins Allowed" ×2, "Leaked Password Protection" de pago).

**Panel ya configurado por el usuario:** proyecto Supabase (región eu-west-3),
`.env.local` con las 5 variables, Auth (email+confirmación, contraseña ≥10 con
requisitos, anónimos ON, rate limit anónimos 30/h, rotación refresh tokens,
JWT ECC P-256, Site URL y Redirect URLs de localhost), Turnstile (widget
invisible para `localhost`, secret en Supabase → Attack Protection).

Incidencias resueltas al probar: la Publishable key estaba mal copiada
("Invalid API key") y "Allow anonymous sign-ins" no se había guardado.

## Siguiente paso

Nada obligatorio. Cuando el usuario quiera: T6 (SMTP), Fase 5, Fase 6 o el
módulo nuevo ("Después").

## Hecho (referencia)

### T9 — Limpieza de invitados (usuario)
- T9.1 Supabase → Database → Extensions → activar **pg_cron**.
- T9.2 SQL Editor → pegar y ejecutar `db/sql/limpieza-invitados.sql` (job
  horario que borra anónimos con más de 4 días; sus datos caen por cascada).
- T9.3 Comprobar en Integrations → Cron → Jobs que existe `limpieza-invitados`.

### Fase 4 — Documentación (Claude)
- `AGENTS.md`:
  - Stack: Postgres en Supabase, postgres-js, PGlite en tests, Supabase Auth, Turnstile. Fuera SQLite/libsql.
  - Comandos: fuera `db:seed`; `db:migrate` lee `.env.local`; `dev` solo en localhost.
  - Primer arranque: `pnpm install` → `.env.local` desde `.env.example` → `pnpm db:migrate` → `pnpm dev`.
  - Regla dura 3: el `userId` sale del `sub` del JWT verificado con `getClaims()`.
  - "Tests": PGlite con stub de `auth` (usuarios, `auth.uid()`, roles); `USER_A`/`USER_B` en `db/testing.ts`.
  - Decisiones tomadas: Supabase Auth + invitados anónimos (4 días); RLS como red, no como mecanismo principal; Drizzle directo y no supabase-js para datos; ids `text` con UUID por la base (no `uuid`) para que un id mal formado dé "No encontrado"; pantallas de auth fuera de `GenericForm`; empezar de cero sin migrar SQLite; plantillas de email por defecto hasta tener SMTP.
  - Trampas nuevas: `ilike` (no `like`); `.mapWith(Number)` en todo agregado; `prepare: false` por el Transaction pooler; migraciones por el Session pooler (5432); `queryClient.clear()` al cambiar de usuario; `z.email().trim()` valida antes de recortar (usar `z.string().trim().pipe(z.email())`); un fichero `'use server'` solo exporta funciones async; Turnstile/Redirect URLs/allowedDevOrigins atados al host.
  - Fuera la "Decisión abierta" de auth; la de Google OAuth como abierta.
- `README.md`: arranque nuevo.
- Skills `finance-data-model`, `server-action-safety`, `testing-finance`: quitar SQLite y `userId` fijo.
- `plop-templates`: el repositorio ya está adaptado; revisar el resto (tipos de esquema en comentarios).

## Pendiente (opcional o aplazado)

### T6 — SMTP propio (usuario, cuando abra la app a otros)
Necesario para que lleguen emails a quien no es del equipo del proyecto y para
pasar del límite de 2 emails/hora.
- Cuenta en Resend (u otro), verificar dominio (SPF, DKIM), credenciales SMTP.
- Supabase → Authentication → Emails → SMTP Settings; subir el rate limit de emails.
- Con SMTP ya se pueden editar las plantillas: ponerlas en español con enlaces
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=…&next=…`
  (confirm signup → `type=email&next=/`; reset → `type=recovery&next=/CambiarPassword`;
  change email → `type=email_change&next=/CambiarPassword`). Con `token_hash` el
  enlace funciona desde cualquier dispositivo; hoy (flujo `code`, plantillas por
  defecto en inglés) solo en el mismo navegador. `/auth/confirm` ya acepta los dos.

### Fase 5 — Endurecimiento (opcional)
- Ping semanal (GitHub Actions) para que el proyecto gratuito no se pause tras 7 días sin uso.
- MFA TOTP. CSP con nonce (adaptar el script inline del splash). "Borrar mi cuenta".
- Fusionar datos de invitado al iniciar sesión en una cuenta existente (hoy se avisa y no se fusionan).

### Fase 6 — Login con Google (aplazado por decisión del usuario)
Credenciales en Google Cloud Console + proveedor en Supabase + `linkIdentity`
para convertir un invitado en cuenta de Google.

### Después
El **módulo nuevo** que el usuario anunció, con `pnpm generate:crud` (tablas
nuevas con `idColumn()`, `userIdColumn()`, `createdAtColumn()`, `soloSuyo()` y
`.enableRLS()` de `db/schema.ts`).

---

## Arquitectura implementada (referencia)

```
Navegador ──cookie httpOnly (JWT + refresh, @supabase/ssr)──►
  CuentaProvider    sin sesión → Turnstile → iniciarInvitado() → usuario anónimo + catálogo
  proxy.ts          solo refresca la sesión; no redirige
  Server Action     getSession() → getClaims() verifica ES256 → userId = sub
  Repositorio       where user_id = userId
  Drizzle (postgres-js, prepare:false) ──Transaction pooler 6543──► Supabase Postgres
                                         └ RLS user_id = auth.uid() (red para la API REST)
```

Ficheros clave:
- Datos: `db/schema.ts`, `db/client.ts`, `db/index.ts` (`server-only`), `db/migrate.mts`, `db/testing.ts`, `db/migrations/0000_inicial.sql`, `db/sql/limpieza-invitados.sql`.
- Auth: `lib/auth.ts`, `lib/supabase/{config,server,proxy}.ts`, `lib/rutas.ts`, `lib/turnstile.ts`, `proxy.ts`, `app/auth/confirm/route.ts`, `src/application/actions/auth.actions.ts`, `src/infrastructure/repositories/cuenta.repository.ts`, `src/types/cuenta.types.ts`.
- UI: `src/application/providers/CuentaProvider.tsx` (+ `providers.tsx`, `onError` global → sesión perdida), `src/presentation/components/Cuenta/{CuentaMenu,AvisoInvitado}.tsx`, `src/presentation/components/Auth/*`, `app/{Login,Registro,RecuperarPassword,CambiarPassword}/page.tsx`.
- `categorias.repository.ts`: `asegurarCatalogoInicial(userId)` sustituye a `db/seed.mts` (borrado).

Variables (`.env.example`): `DATABASE_URL` (6543), `DATABASE_URL_MIGRATIONS` (5432),
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
Nunca la secret/service_role en la app. Claude no lee `.env.local`; para diagnosticar
comprueba variables sin imprimir sus valores.

Plan gratuito de Supabase: ~50k MAU (los invitados cuentan), 500 MB, 2 emails/h
sin SMTP propio, pausa tras 7 días sin uso, sin backups descargables (hacer
`pg_dump` antes de migraciones destructivas), sin leaked-password protection.

## Verificación de cada cambio
`pnpm typecheck && pnpm lint && pnpm test && pnpm test:tz` y `pnpm build` si se
tocan rutas. Si la suite completa se cuelga (pasó una vez con PGlite en varios
workers), lanzarla de nuevo o fichero a fichero.
