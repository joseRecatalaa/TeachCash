/*
 * Datos estructurados (schema.org en JSON-LD): lo que Google y los asistentes
 * leen para saber QUÉ es la página (una aplicación educativa gratuita, un
 * curso, unas preguntas frecuentes) sin tener que adivinarlo del texto.
 *
 * No es un script que se ejecute: el navegador no lo corre y la CSP no lo
 * bloquea. El `<` se escapa para que un texto con "</script>" no pueda cerrar
 * la etiqueta antes de tiempo.
 */

export function DatosEstructurados({ datos }: { datos: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(datos).replace(/</g, '\\u003c') }}
    />
  )
}
