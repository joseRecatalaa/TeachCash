/**
 * Ocultar a simple vista lo que viaja al navegador: el contenido de un nivel
 * del Camino del héroe, con sus soluciones.
 *
 * Por qué: el navegador necesita las soluciones para corregir al momento, y en
 * claro se leían en la pestaña de red (en "ordenar" y "emparejar", el propio
 * orden de llegada ya era la solución).
 *
 * Lo que NO es: cifrado. La clave viaja al lado del bloque, porque el navegador
 * tiene que poder abrirlo; quien se ponga a investigar puede. Ni falta que
 * hace: nadie gana nada con ello más que estrellas en su propia partida, y
 * quien CORRIGE y da las estrellas sigue siendo el servidor (regla dura 6).
 *
 * Cómo: JSON → UTF-8 → XOR con una clave nueva en cada visita → base64. Sin
 * dependencias y sin `Buffer`, para que corra igual en el servidor y en el
 * navegador. Cuesta microsegundos.
 */

/** Delante del JSON: si al revelar no está, la clave no era la buena. */
const MARCA = 'TC1:'

const codificador = new TextEncoder()
const descodificador = new TextDecoder('utf-8', { fatal: true })

/** Una clave al azar, distinta en cada llamada. */
export function claveNueva(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return aBase64(bytes)
}

export function ocultar(valor: unknown, clave: string): string {
  const texto = MARCA + JSON.stringify(valor)
  return aBase64(mezclar(codificador.encode(texto), bytesDeClave(clave)))
}

export function revelar<T>(bloque: string, clave: string): T {
  const texto = descodificador.decode(mezclar(deBase64(bloque), bytesDeClave(clave)))
  if (!texto.startsWith(MARCA)) throw new Error('No se ha podido abrir el contenido')
  return JSON.parse(texto.slice(MARCA.length)) as T
}

function bytesDeClave(clave: string): Uint8Array {
  if (!clave) throw new Error('Falta la clave')
  return codificador.encode(clave)
}

/** XOR byte a byte con la clave repetida. Aplicado dos veces, deja el original. */
function mezclar(datos: Uint8Array, clave: Uint8Array): Uint8Array {
  const salida = new Uint8Array(datos.length)
  for (let i = 0; i < datos.length; i++) salida[i] = datos[i] ^ clave[i % clave.length]
  return salida
}

function aBase64(bytes: Uint8Array): string {
  let binario = ''
  for (const b of bytes) binario += String.fromCharCode(b)
  return btoa(binario)
}

function deBase64(texto: string): Uint8Array {
  const binario = atob(texto)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  return bytes
}
