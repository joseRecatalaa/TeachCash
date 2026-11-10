import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 bloquea por defecto las peticiones a recursos de desarrollo
  // (/_next/static/chunks, /_next/hmr) que no vengan del host con el que se
  // arrancó el servidor, que es localhost. Al abrir la app por la IP de la red
  // local, TODOS los chunks quedan bloqueados: el HTML del servidor llega, pero
  // el JS de cliente no. Refine nunca arranca y las páginas se quedan cargando
  // para siempre, sin ningún error en consola — solo avisos en el log del dev
  // server. Por eso está aquí la IP de la LAN.
  // Solo afecta a `next dev` y es una red local privada: no expone nada.
  // eslint-disable-next-line sonarjs/no-hardcoded-ip
  allowedDevOrigins: ["192.168.1.20", "192.168.1.*"],

  // Sin "X-Powered-By: Next.js": decir qué servidor corre es darle trabajo
  // hecho a quien busca una vulnerabilidad conocida de esa versión.
  poweredByHeader: false,

  // Cabeceras de seguridad en todas las respuestas. La Content Security Policy
  // no está aquí: lleva un nonce por petición y la pone `proxy.ts` (lib/csp.ts).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Solo HTTPS durante dos años, subdominios incluidos. En localhost el
          // navegador la ignora.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          // Que nadie pueda meter la aplicación en un iframe (clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Los enlaces salientes no se llevan la ruta (ni un ?next= o un token).
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Ninguna API del navegador que la app no use. `browsing-topics`: que
          // el navegador no saque intereses publicitarios de quien la visita.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
          },
          // Una ventana abierta desde otra web (window.open) no se queda con
          // una referencia a la nuestra. Turnstile va en iframe, no en popup,
          // así que no le afecta.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          // Otra web no puede cargar nuestras respuestas como recurso (un <img>
          // o un <script> que apunte aquí con la cookie puesta): sin esto, un
          // ataque tipo Spectre podría leerlas desde su proceso. Turnstile no
          // se ve afectado: es su iframe el que se carga aquí, no al revés.
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          // Que el navegador no resuelva por adelantado los dominios de los
          // enlaces: es una fuga de qué se está viendo hacia el DNS.
          { key: "X-DNS-Prefetch-Control", value: "off" },
          // Ni Flash ni Acrobat pueden leer políticas de dominio cruzado de aquí.
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
        ],
      },
    ];
  },

  experimental: {
    serverActions: {
      // Tope del cuerpo de una Server Action (OWASP API4). Next pone 1 MB; lo
      // más grande que manda esta app es un movimiento con 1.000 caracteres de
      // notas o las respuestas de un nivel, unos pocos KB. Un cuerpo más grande
      // solo puede venir de un script, y parsearlo es memoria y CPU gratis
      // para quien lo manda. Si algún día se suben ficheros (extractos), se
      // sube esto con ellos.
      bodySizeLimit: "256kb",
    },
  },

  // El contenido del Camino del héroe son JSON que se leen con `fs` en el
  // servidor (src/infrastructure/heroe/contenido.ts). Nadie los importa, así
  // que el trazado del build no los ve: sin esto, un despliegue empaquetado
  // arranca sin ellos. En todas las rutas porque una Server Action se puede
  // llamar desde cualquier página.
  outputFileTracingIncludes: {
    "/**": ["./content/heroe/**/*.json"],
  },

  // cacheComponents queda desactivado a propósito: saldos y movimientos son datos
  // por usuario que cambian con cada mutación. Ver skill nextjs-app-conventions.
};

export default nextConfig;
