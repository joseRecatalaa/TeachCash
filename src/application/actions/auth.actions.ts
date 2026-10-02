'use server'

/**
 * Server Actions de autenticación: invitado, entrar, crear cuenta, recuperar y
 * cambiar la contraseña, salir.
 *
 * Como todo `'use server'`, cada export es un endpoint POST público (regla dura
 * 3). Por eso todo lo que llega se valida con Zod aquí, aunque el formulario ya
 * lo haya comprobado, y nada de lo que llega decide QUIÉN es el usuario: eso
 * sale siempre de la cookie verificada (`getSession`).
 *
 * Tres criterios que atraviesan el fichero:
 *   - **No se revela si un email existe.** "Te hemos enviado un enlace" sale
 *     igual exista o no la cuenta, y un login fallido dice "email o contraseña
 *     incorrectos" sin decir cuál de los dos. Distinguirlos permitiría a
 *     cualquiera averiguar quién usa la aplicación.
 *   - **Los errores se devuelven, no se lanzan**, como en `entity.actions.ts`.
 *   - **El CAPTCHA lo comprueba Supabase**, no este fichero: aquí solo se le
 *     pasa el token. Así no hay ninguna clave secreta en la aplicación.
 */

import { headers } from 'next/headers'
import type { AuthError } from '@supabase/supabase-js'
import { z } from 'zod'
import { getSession, type Session } from '@/lib/auth'
import { crearClienteSupabase } from '@/lib/supabase/server'
import { asegurarCatalogoInicial } from '@/src/infrastructure/repositories/categorias.repository'
import { fechaAltaUsuario } from '@/src/infrastructure/repositories/cuenta.repository'
import { VIDA_INVITADO_DIAS, type CuentaDto } from '@/src/types/cuenta.types'
import type { ActionResult } from './entity.actions'

// ─────────────────────────────────────────────────────────────────────────────
// Validación
// ─────────────────────────────────────────────────────────────────────────────

// Primero se limpia y después se valida. `z.email().trim()` haría al revés:
// comprobaría el formato ANTES de quitar espacios, y un email pegado con un
// espacio al final se rechazaría como inválido.
const email = z
  .string('Escribe un email válido')
  .trim()
  .toLowerCase()
  .pipe(z.email('Escribe un email válido').max(254, 'Email demasiado largo'))

/**
 * La misma política que hay configurada en Supabase. Aquí es cortesía: avisa
 * antes del viaje. Quien la impone de verdad es Supabase, que es donde no se
 * puede saltar.
 */
const passwordNueva = z
  .string()
  .min(10, 'Mínimo 10 caracteres')
  .max(72, 'Máximo 72 caracteres')
  .regex(/[a-z]/, 'Incluye al menos una minúscula')
  .regex(/[A-Z]/, 'Incluye al menos una mayúscula')
  .regex(/[0-9]/, 'Incluye al menos un número')
  .regex(/[^a-zA-Z0-9]/, 'Incluye al menos un símbolo')

const captchaToken = z.string().min(1, 'Falta la verificación anti-bots')

const IniciarSesion = z.object({
  email,
  password: z.string().min(1, 'Escribe tu contraseña').max(72),
  captchaToken,
})
const Registrarse = z.object({ email, captchaToken })
const SolicitarRecuperacion = z.object({ email, captchaToken })
const CambiarPassword = z
  .object({ password: passwordNueva, repetir: z.string() })
  .refine((v) => v.password === v.repetir, {
    path: ['repetir'],
    message: 'Las contraseñas no coinciden',
  })

// ─────────────────────────────────────────────────────────────────────────────
// Mensajes
// ─────────────────────────────────────────────────────────────────────────────

// Sin `export`: un fichero 'use server' solo puede exportar funciones async.
const MENSAJES = {
  credenciales: 'Email o contraseña incorrectos',
  sinConfirmar: 'Confirma tu email antes de entrar: busca el enlace en tu correo',
  enlaceEnviado:
    'Si el email es correcto, te hemos enviado un enlace. Revisa también la carpeta de spam.',
  captcha: 'No hemos podido comprobar que no eres un robot. Recarga la página e inténtalo otra vez.',
  limite: 'Demasiados intentos. Espera unos minutos y vuelve a probar.',
  inesperado: 'Se ha producido un error inesperado',
  noAutorizado: 'No autorizado',
  yaTienesCuenta: 'Ya has iniciado sesión con una cuenta',
  bot: 'Acceso automatizado no permitido',
} as const

/** Lo que no tiene traducción propia se registra y sale como genérico. */
function traducir(error: AuthError, contexto: string): string {
  switch (error.code) {
    case 'captcha_failed':
      return MENSAJES.captcha
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return MENSAJES.limite
    case 'weak_password':
      return 'Esa contraseña es demasiado débil o ha aparecido en filtraciones. Elige otra.'
    case 'same_password':
      return 'La contraseña nueva tiene que ser distinta de la actual'
    case 'reauthentication_needed':
      return 'Por seguridad, cambia la contraseña desde «¿Has olvidado tu contraseña?»'
    default:
      console.error(`[auth.actions] ${contexto}`, error.code, error.message)
      return MENSAJES.inesperado
  }
}

const fallo = (error: string, fieldErrors?: Record<string, string>): ActionResult<never> => ({
  ok: false,
  error,
  fieldErrors,
})

function erroresDeCampo(error: z.ZodError): ActionResult<never> {
  const campos: Record<string, string> = {}
  for (const issue of error.issues) {
    const campo = String(issue.path[0] ?? '')
    if (campo && !campos[campo]) campos[campo] = issue.message
  }
  // El token del CAPTCHA no es un campo que la persona pueda corregir.
  if (campos.captchaToken) return fallo(MENSAJES.captcha)
  const unicos = Object.values(campos)
  return fallo(unicos.length === 1 ? unicos[0] : 'Revisa los campos marcados', campos)
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Desde dónde se está usando la aplicación, para construir los enlaces de los
 * emails. Supabase solo acepta destinos de su lista de "Redirect URLs", así que
 * una cabecera manipulada no consigue mandar el enlace a otro dominio.
 */
async function origen(): Promise<string> {
  const h = await headers()
  const declarado = h.get('origin')
  if (declarado) return declarado
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const protocolo = h.get('x-forwarded-proto') ?? 'https'
  return `${protocolo}://${host}`
}

/**
 * Lo que identifica a un bot que ejecuta JavaScript (rastreadores, navegadores
 * automatizados, previsualizadores de enlaces). No para a un atacante decidido
 * —para eso está el CAPTCHA—, pero evita que el rastreador de Google, que sí
 * ejecuta JavaScript, cree un invitado cada vez que pasa.
 */
const AGENTE_BOT =
  /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|embedly|whatsapp|telegram/i

/** La cuenta que ve la interfaz, a partir de la sesión verificada. */
async function cuentaDe(session: Session | null): Promise<CuentaDto> {
  if (!session) return { tipo: 'ninguna' }
  if (!session.user.esInvitado && session.user.email) {
    return { tipo: 'usuario', email: session.user.email }
  }
  const alta = (await fechaAltaUsuario(session.user.id)) ?? new Date()
  const caducaEl = new Date(alta.getTime() + VIDA_INVITADO_DIAS * 24 * 60 * 60 * 1000)
  return { tipo: 'invitado', caducaEl: caducaEl.toISOString() }
}

async function intentar<T>(
  contexto: string,
  operacion: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    return await operacion()
  } catch (err) {
    console.error(`[auth.actions] ${contexto}`, err)
    return fallo(MENSAJES.inesperado)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Acciones
// ─────────────────────────────────────────────────────────────────────────────

/** Quién es quien pregunta. Lo usa el layout al pintar y la Navbar al refrescar. */
export async function getCuenta(): Promise<ActionResult<CuentaDto>> {
  return intentar('getCuenta', async () => ({ ok: true, data: await cuentaDe(await getSession()) }))
}

/**
 * Crea la sesión de invitado. La llama el cliente al arrancar si no hay sesión.
 *
 * Si ya hay una, no crea otra: devuelve la que hay. Así, dos pestañas que
 * arrancan a la vez no dejan un invitado huérfano.
 */
export async function iniciarInvitado(token: unknown): Promise<ActionResult<CuentaDto>> {
  return intentar('iniciarInvitado', async () => {
    const actual = await getSession()
    if (actual) return { ok: true, data: await cuentaDe(actual) }

    const agente = (await headers()).get('user-agent') ?? ''
    if (!agente || AGENTE_BOT.test(agente)) return fallo(MENSAJES.bot)

    const parsed = captchaToken.safeParse(token)
    if (!parsed.success) return fallo(MENSAJES.captcha)

    const supabase = await crearClienteSupabase()
    const { data, error } = await supabase.auth.signInAnonymously({
      options: { captchaToken: parsed.data },
    })
    if (error || !data.user) return fallo(error ? traducir(error, 'invitado') : MENSAJES.inesperado)

    await asegurarCatalogoInicial(data.user.id)
    return {
      ok: true,
      data: await cuentaDe({ user: { id: data.user.id, email: null, esInvitado: true } }),
    }
  })
}

/**
 * Entrar con email y contraseña.
 *
 * Si quien entra era un invitado, su sesión se sustituye por la de la cuenta:
 * los datos de invitado NO se pasan a la cuenta (la página lo avisa antes) y
 * el invitado queda huérfano hasta que el job de limpieza lo borra.
 */
export async function iniciarSesion(values: unknown): Promise<ActionResult<CuentaDto>> {
  return intentar('iniciarSesion', async () => {
    const parsed = IniciarSesion.safeParse(values)
    if (!parsed.success) return erroresDeCampo(parsed.error)
    const { email, password, captchaToken } = parsed.data

    const supabase = await crearClienteSupabase()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    })
    if (error) {
      if (error.code === 'invalid_credentials') return fallo(MENSAJES.credenciales)
      // Solo puede salir con la contraseña correcta, así que no revela nada que
      // quien escribe no sepa ya.
      if (error.code === 'email_not_confirmed') return fallo(MENSAJES.sinConfirmar)
      return fallo(traducir(error, 'iniciarSesion'))
    }

    return { ok: true, data: { tipo: 'usuario', email: data.user.email ?? email } }
  })
}

/**
 * Crear cuenta. Se pide solo el email: la contraseña se elige al volver del
 * enlace de confirmación (`/CambiarPassword`).
 *
 * Siendo invitado, la cuenta se crea SOBRE el invitado (`updateUser`): mismo
 * usuario, mismo id, y por tanto todos sus movimientos y categorías siguen
 * ahí sin copiar nada. Supabase no deja poner contraseña a un anónimo hasta que
 * confirma el email, y por eso son dos pasos.
 */
export async function registrarse(values: unknown): Promise<ActionResult<{ mensaje: string }>> {
  return intentar('registrarse', async () => {
    const parsed = Registrarse.safeParse(values)
    if (!parsed.success) return erroresDeCampo(parsed.error)
    const { email, captchaToken } = parsed.data

    const session = await getSession()
    if (session && !session.user.esInvitado) return fallo(MENSAJES.yaTienesCuenta)

    const supabase = await crearClienteSupabase()
    const destino = `${await origen()}/auth/confirm?next=/CambiarPassword`

    const { error } = session
      ? await supabase.auth.updateUser({ email }, { emailRedirectTo: destino })
      : // Sin sesión ninguna (la de invitado no llegó a crearse): alta normal.
        // La contraseña es aleatoria y desechable, la cambia al confirmar.
        await supabase.auth.signUp({
          email,
          password: `${crypto.randomUUID()}Aa1!`,
          options: { emailRedirectTo: destino, captchaToken },
        })

    // Que el email ya esté registrado se trata como un éxito: decirlo
    // revelaría quién tiene cuenta.
    if (error && error.code !== 'email_exists' && error.code !== 'user_already_exists') {
      return fallo(traducir(error, 'registrarse'))
    }
    return { ok: true, data: { mensaje: MENSAJES.enlaceEnviado } }
  })
}

/** "He olvidado mi contraseña". Responde lo mismo exista o no la cuenta. */
export async function solicitarRecuperacion(
  values: unknown,
): Promise<ActionResult<{ mensaje: string }>> {
  return intentar('solicitarRecuperacion', async () => {
    const parsed = SolicitarRecuperacion.safeParse(values)
    if (!parsed.success) return erroresDeCampo(parsed.error)

    const supabase = await crearClienteSupabase()
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${await origen()}/auth/confirm?next=/CambiarPassword`,
      captchaToken: parsed.data.captchaToken,
    })
    if (error && (error.code === 'captcha_failed' || error.code?.startsWith('over_'))) {
      return fallo(traducir(error, 'solicitarRecuperacion'))
    }
    if (error) console.error('[auth.actions] solicitarRecuperacion', error.code, error.message)
    return { ok: true, data: { mensaje: MENSAJES.enlaceEnviado } }
  })
}

/**
 * Fijar o cambiar la contraseña. Solo para usuarios con email confirmado: es el
 * destino del enlace de confirmación y del de recuperación, que dejan la sesión
 * ya iniciada.
 */
export async function cambiarPassword(values: unknown): Promise<ActionResult<CuentaDto>> {
  return intentar('cambiarPassword', async () => {
    const session = await getSession()
    if (!session || session.user.esInvitado) return fallo(MENSAJES.noAutorizado)

    const parsed = CambiarPassword.safeParse(values)
    if (!parsed.success) return erroresDeCampo(parsed.error)

    const supabase = await crearClienteSupabase()
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
    if (error) return fallo(traducir(error, 'cambiarPassword'))

    return { ok: true, data: await cuentaDe(session) }
  })
}

/**
 * Salir. Revoca el refresh token de ESTA sesión en Supabase y borra las
 * cookies: con la cookie robada ya no se puede refrescar. Después, el cliente
 * crea un invitado nuevo y vacío.
 */
export async function cerrarSesion(): Promise<ActionResult<null>> {
  return intentar('cerrarSesion', async () => {
    const supabase = await crearClienteSupabase()
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) return fallo(traducir(error, 'cerrarSesion'))
    return { ok: true, data: null }
  })
}
