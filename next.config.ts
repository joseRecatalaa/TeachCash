import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @libsql/client carga bindings nativos (.node) por dependencia opcional según
  // plataforma. Si el bundler intenta empaquetarlos, el build rompe.
  serverExternalPackages: ["@libsql/client"],

  // cacheComponents queda desactivado a propósito: saldos y movimientos son datos
  // por usuario que cambian con cada mutación. Ver skill nextjs-app-conventions.
};

export default nextConfig;
