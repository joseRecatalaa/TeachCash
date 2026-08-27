import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @libsql/client carga bindings nativos (.node) por dependencia opcional según
  // plataforma. Si el bundler intenta empaquetarlos, el build rompe.
  serverExternalPackages: ["@libsql/client"],

  // Next 16 bloquea por defecto las peticiones a recursos de desarrollo
  // (/_next/static/chunks, /_next/hmr) que no vengan del host con el que se
  // arrancó el servidor, que es localhost. Al abrir la app por la IP de la red
  // local, TODOS los chunks quedan bloqueados: el HTML del servidor llega, pero
  // el JS de cliente no. Refine nunca arranca y las páginas se quedan cargando
  // para siempre, sin ningún error en consola — solo avisos en el log del dev
  // server. Por eso está aquí la IP de la LAN.
  allowedDevOrigins: ["192.168.200.15", "192.168.200.*"],

  // cacheComponents queda desactivado a propósito: saldos y movimientos son datos
  // por usuario que cambian con cada mutación. Ver skill nextjs-app-conventions.
};

export default nextConfig;
