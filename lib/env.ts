/**
 * Las variables de entorno, validadas.
 *
 * Una variable que falta o está mal copiada no debe descubrirse en la primera
 * petición de alguien, como un error genérico: tiene que parar el arranque con
 * un mensaje que diga cuál es y qué hacer. `instrumentation.ts` llama a
 * `validarEntorno()` al arrancar el servidor, y el resto del código lee las
 * variables de aquí, ya comprobadas, en vez de `process.env` a pelo.
 *
 * Dos grupos, y no se mezclan:
 *   - **Públicas** (`NEXT_PUBLIC_*`): Next las copia en el bundle del navegador.
 *     Se leen con `process.env.NEXT_PUBLIC_…` ESCRITO ENTERO Y LITERAL: Next
 *     solo sustituye en build los accesos que puede ver tal cual, y un
 *     `process.env[nombre]` llegaría vacío al cliente.
 *   - **De servidor**: nunca salen del servidor. Aquí no hay, ni debe haber,
 *     ninguna clave secreta de Supabase (`service_role`): la app no la necesita.
 *
 * `DATABASE_URL_MIGRATIONS` va aparte: solo la usa `pnpm db:migrate`, y exigirla
 * al servidor obligaría a tenerla donde no hace falta.
 *
 * Sin alias `@/` y sin `server-only`: lo importa `db/client.ts`, que también
 * ejecuta Node a pelo (`db/migrate.mts`), sin bundler que resuelva alias.
 */

import { z } from 'zod'

const AYUDA = 'Copia .env.example a .env.local y rellénalo.'

const falta = (iss: { input?: unknown }, siNo: string) =>
  iss.input === undefined || iss.input === '' ? 'Falta' : siNo

const obligatoria = z.string({ error: (iss) => falta(iss, 'Tiene que ser texto') }).min(1, 'Falta')

const urlPostgres = z.url({
  protocol: /^postgres(ql)?$/,
  error: (iss) => falta(iss, 'Tiene que ser una URL postgresql://… (Supabase → Connect)'),
})

const EsquemaPublico = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .url({
      protocol: /^https?$/,
      error: (iss) => falta(iss, 'Tiene que ser la URL del proyecto, https://….supabase.co'),
    })
    // Sin ruta: el panel enseña también la de la API de datos (`…/rest/v1/`), y
    // con ella supabase-js pide `…/rest/v1/auth/v1/…`. Supabase responde
    // "Invalid path specified in request URL" y el invitado no nace, con un
    // error genérico en pantalla y nada que apunte aquí. Zod 4 ejecuta el
    // `refine` aunque la URL ya haya fallado: de ahí el `canParse`, para que
    // una URL mal escrita dé SU mensaje y no una excepción de `new URL`.
    .refine((url) => !URL.canParse(url) || new URL(url).pathname === '/', {
      error: 'Tiene que ser la URL del proyecto sin ruta, https://….supabase.co (no la de /rest/v1)',
    }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: obligatoria,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: obligatoria,
})

const EsquemaServidor = z.object({ DATABASE_URL: urlPostgres })

const EsquemaMigraciones = z.object({ DATABASE_URL_MIGRATIONS: urlPostgres })

export type EntornoPublico = z.infer<typeof EsquemaPublico>
export type EntornoServidor = z.infer<typeof EsquemaServidor>

/** Los problemas de un grupo, uno por línea, o `[]` si está bien. */
function problemas(esquema: z.ZodType, valores: Record<string, unknown>): string[] {
  const r = esquema.safeParse(valores)
  return r.success ? [] : r.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`)
}

function fallar(lineas: string[]): never {
  throw new Error(`Variables de entorno no válidas:\n${lineas.join('\n')}\n${AYUDA}`)
}

function leer<T>(esquema: z.ZodType<T>, valores: Record<string, unknown>): T {
  const r = esquema.safeParse(valores)
  if (!r.success) fallar(problemas(esquema, valores))
  return r.data as T
}

// Literales, uno a uno: ver la cabecera.
const valoresPublicos = () => ({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
})

const valoresServidor = () => ({ DATABASE_URL: process.env.DATABASE_URL })

export const entornoPublico = (): EntornoPublico => leer(EsquemaPublico, valoresPublicos())

export const entornoServidor = (): EntornoServidor => leer(EsquemaServidor, valoresServidor())

export const entornoMigraciones = (): z.infer<typeof EsquemaMigraciones> =>
  leer(EsquemaMigraciones, { DATABASE_URL_MIGRATIONS: process.env.DATABASE_URL_MIGRATIONS })

/**
 * Comprueba los dos grupos de la app de una vez y, si algo falla, lanza UN
 * error con todos los problemas: arreglarlos de uno en uno, arrancando cada
 * vez, es justo lo que esto quiere evitar.
 */
export function validarEntorno(): void {
  const todos = [
    ...problemas(EsquemaPublico, valoresPublicos()),
    ...problemas(EsquemaServidor, valoresServidor()),
  ]
  if (todos.length > 0) fallar(todos)
}
