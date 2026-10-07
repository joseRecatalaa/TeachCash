import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 bloquea por defecto las peticiones a recursos de desarrollo
  // (/_next/static/chunks, /_next/hmr) que no vengan del host con el que se
  // arrancó el servidor, que es localhost. Al abrir la app por la IP de la red
  // local, TODOS los chunks quedan bloqueados: el HTML del servidor llega, pero
  // el JS de cliente no. Refine nunca arranca y las páginas se quedan cargando
  // para siempre, sin ningún error en consola — solo avisos en el log del dev
  // server. Por eso está aquí la IP de la LAN.
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
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          // Una ventana abierta desde otra web (window.open) no se queda con
          // una referencia a la nuestra. Turnstile va en iframe, no en popup,
          // así que no le afecta.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },

  // cacheComponents queda desactivado a propósito: saldos y movimientos son datos
  // por usuario que cambian con cada mutación. Ver skill nextjs-app-conventions.
};

export default nextConfig;
