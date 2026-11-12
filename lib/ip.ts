/**
 * La IP de quien llama, para los límites y el registro.
 *
 * `x-real-ip` primero porque es la que ponen los proxies de despliegue
 * (Vercel, nginx) sobre la que traía la petición; si no, la primera de
 * `x-forwarded-for`. Las dos las puede escribir el cliente si no hay un proxy
 * delante que las pise, y por eso ningún límite que importe cuenta SOLO por IP:
 * los intentos de contraseña cuentan además por cuenta, que no se puede falsear.
 *
 * Recibe las cabeceras y no las lee él: así lo usan igual el proxy (que tiene
 * la petición) y las Server Actions (que tienen `headers()`).
 */
export function ipDe(cabeceras: { get(nombre: string): string | null }): string {
  const real = cabeceras.get('x-real-ip')?.trim()
  if (real) return real
  return cabeceras.get('x-forwarded-for')?.split(',')[0]?.trim() || 'desconocida'
}
