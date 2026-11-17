/**
 * Destinos de redirección que llegan de fuera (el `?next=` de un enlace de email).
 *
 * Sin esta comprobación, `/auth/confirm?next=https://banco-falso.com` sería un
 * redirector abierto: un enlace con NUESTRO dominio que acaba en otro sitio, que
 * es exactamente lo que necesita un phishing para parecer legítimo.
 */

/** Ruta interna segura o, si no lo es, la portada. */
export function rutaInterna(destino: string | null | undefined, porDefecto = '/'): string {
  if (!destino) return porDefecto
  // Tiene que ser una ruta absoluta de ESTE sitio:
  //   '//otro.com'  → el navegador lo lee como otro dominio.
  //   '/\otro.com'  → algunos navegadores normalizan '\' a '/'.
  //   'https://…'   → no empieza por '/'.
  if (!destino.startsWith('/') || destino.startsWith('//') || destino.startsWith('/\\')) {
    return porDefecto
  }
  // Ni caracteres de control (un salto de línea podría inyectar cabeceras).
  if (/[\u0000-\u001f\u007f]/.test(destino)) return porDefecto
  return destino
}
