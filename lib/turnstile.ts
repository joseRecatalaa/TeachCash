/**
 * CAPTCHA invisible (Cloudflare Turnstile). SOLO NAVEGADOR.
 *
 * `obtenerTokenCaptcha()` devuelve un token de un solo uso que se manda junto a
 * cada operación de auth (crear invitado, entrar, registrarse, recuperar). Lo
 * comprueba Supabase con la clave secreta, que vive en su panel y no aquí.
 *
 * El widget es invisible: no hay casilla ni semáforos. Cloudflare decide en
 * segundo plano y, en el peor caso, tarda un par de segundos.
 */

type Turnstile = {
  render: (
    contenedor: HTMLElement,
    opciones: {
      sitekey: string
      callback: (token: string) => void
      'error-callback': () => void
      'timeout-callback': () => void
      'expired-callback': () => void
    },
  ) => string
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: Turnstile
  }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

let carga: Promise<Turnstile> | null = null

function cargarScript(): Promise<Turnstile> {
  carga ??= new Promise<Turnstile>((resolver, rechazar) => {
    if (window.turnstile) return resolver(window.turnstile)
    const script = document.createElement('script')
    script.src = SCRIPT
    script.async = true
    script.onload = () =>
      window.turnstile ? resolver(window.turnstile) : rechazar(new Error('Turnstile no cargó'))
    script.onerror = () => {
      // Se olvida la promesa fallida: el siguiente intento vuelve a probar.
      carga = null
      rechazar(new Error('No se pudo cargar la verificación anti-bots'))
    }
    document.head.appendChild(script)
  })
  return carga
}

export async function obtenerTokenCaptcha(): Promise<string> {
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  if (!sitekey) throw new Error('Falta NEXT_PUBLIC_TURNSTILE_SITE_KEY en .env.local')

  const turnstile = await cargarScript()
  // Un widget por token: los tokens son de un solo uso y caducan a los 5 min,
  // así que guardar uno para luego solo da fallos difíciles de explicar.
  const contenedor = document.createElement('div')
  document.body.appendChild(contenedor)

  return new Promise<string>((resolver, rechazar) => {
    let id = ''
    const terminar = () => {
      if (id) turnstile.remove(id)
      contenedor.remove()
    }
    const error = () => {
      terminar()
      rechazar(new Error('No hemos podido comprobar que no eres un robot'))
    }
    id = turnstile.render(contenedor, {
      sitekey,
      callback: (token) => {
        terminar()
        resolver(token)
      },
      'error-callback': error,
      'timeout-callback': error,
      'expired-callback': error,
    })
  })
}
