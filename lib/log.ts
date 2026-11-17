/**
 * Registro de errores del servidor, sin los datos de la persona.
 *
 * Un error de Drizzle trae en el mensaje los PARÁMETROS de la consulta
 * ("Failed query: insert … \nparams: -4590,Farmacia,…"): importes,
 * descripciones y notas. Y el error de Postgres que lleva dentro trae en
 * `detail` la fila entera ("Failing row contains (…)"). Un log se guarda más
 * tiempo que el dato, lo lee más gente y acaba en servicios de terceros, así
 * que nada de eso entra: se registra QUÉ falló y DÓNDE, no CON QUÉ.
 *
 * Todo `catch` que registre un error en el servidor pasa por aquí, no por
 * `console.error` a pelo.
 */

export type ErrorDescrito = {
  nombre: string
  mensaje: string
  /** SQLSTATE de Postgres o código de Supabase Auth, si lo hay. */
  codigo?: string
  /** Solo las líneas `at …`: la primera de la pila repite el mensaje entero. */
  pila?: string[]
  causa?: ErrorDescrito
}

const LINEAS_DE_PILA = 5
const NIVELES_DE_CAUSA = 3

/** El mensaje sin la parte `params:` que añade Drizzle. */
const sinParametros = (mensaje: string): string => mensaje.split(/\n?params:/)[0].trim()

/**
 * Lo que se puede registrar de un error. `detail`, `params`, `query` como
 * propiedad y cualquier otro campo se quedan fuera A PROPÓSITO: no se copia el
 * objeto y se borra lo peligroso, se copia solo lo que se sabe inocuo.
 */
export function describirError(err: unknown, nivel = 0): ErrorDescrito {
  if (!(err instanceof Error)) {
    return { nombre: err === null ? 'null' : typeof err, mensaje: String(err) }
  }

  const { code, cause } = err as { code?: unknown; cause?: unknown }
  const descrito: ErrorDescrito = { nombre: err.name, mensaje: sinParametros(err.message) }
  if (typeof code === 'string' || typeof code === 'number') descrito.codigo = String(code)

  const pila = err.stack
    ?.split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('at '))
    .slice(0, LINEAS_DE_PILA)
  if (pila?.length) descrito.pila = pila

  if (cause !== undefined && nivel < NIVELES_DE_CAUSA) {
    descrito.causa = describirError(cause, nivel + 1)
  }
  return descrito
}

/** Registra un error en el log del servidor. `contexto` dice desde dónde. */
export function registrarError(contexto: string, err: unknown): void {
  console.error(`[${contexto}]`, JSON.stringify(describirError(err)))
}

// ─── Eventos de seguridad ────────────────────────────────────────────────────

/**
 * Lo que pasó y con qué resultado. `fallo` es un intento rechazado (contraseña
 * mala, CAPTCHA, sin sesión); `bloqueo` lo para un límite de peticiones.
 */
export type ResultadoEvento = 'ok' | 'fallo' | 'bloqueo'

export type DatosEvento = {
  /** El `sub` del JWT verificado: un UUID, no identifica a nadie por sí solo. */
  userId?: string
  /** Se guarda recortada (`anonimizarIp`). */
  ip?: string
  /** Por qué falló, con un código propio. Nunca el texto que escribió nadie. */
  motivo?: string
  /** Desde qué acción, para las que comparten evento (`limite`). */
  contexto?: string
}

/**
 * La IP sin su parte final: el /24 en IPv4 y el /48 en IPv6. Basta para ver
 * que mil intentos vienen de la misma red y no basta para señalar a una
 * persona, que es lo que pide el RGPD a un log que se guarda meses. Lo que no
 * parece una IP no se copia: la cabecera de la que sale la puede escribir
 * quien hace la petición, y un log no es sitio para texto libre ajeno.
 */
export function anonimizarIp(ip: string): string {
  const v4 = /^(?:::ffff:)?(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}$/i.exec(ip)
  if (v4) return `${v4[1]}.${v4[2]}.${v4[3]}.0`
  if (/^[\da-f:]+$/i.test(ip) && ip.includes(':')) {
    // Los tres primeros grupos, saltando el hueco de una forma comprimida
    // (`2001:db8::1`). Una que empieza por `::` (`::1`) no tiene red que guardar.
    const red = ip.split(':').slice(0, 3).filter(Boolean)
    return ip.startsWith('::') ? '::' : `${red.join(':')}::`
  }
  return 'desconocida'
}

/**
 * Registra un evento de seguridad: entrar, crear cuenta, cambiar o recuperar
 * la contraseña, borrar la cuenta, crear un invitado o chocar con un límite.
 *
 * Una línea JSON con `tipo: "seguridad"` para que un agregador de logs la
 * filtre y alerte (picos de `login`/`fallo`, cualquier `bloqueo`) sin tener que
 * entender texto libre. Mismo criterio que `registrarError`: QUÉ y QUIÉN, nunca
 * el email, la contraseña ni lo que la persona escribió.
 *
 * Va por `console.warn` y no por `console.error`: no es un fallo del servidor,
 * y mezclarlos haría saltar las alertas de errores con cada contraseña mal
 * escrita.
 */
export function registrarEvento(
  evento: string,
  resultado: ResultadoEvento,
  datos: DatosEvento = {},
): void {
  const { ip, ...resto } = datos
  const linea = {
    tipo: 'seguridad',
    evento,
    resultado,
    momento: new Date().toISOString(),
    ...resto,
    ...(ip === undefined ? {} : { ip: anonimizarIp(ip) }),
  }
  console.warn(JSON.stringify(linea))
}
