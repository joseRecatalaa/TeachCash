/**
 * Las preguntas frecuentes de la portada.
 *
 * Están aquí, y no escritas en el JSX, porque se pintan DOS veces: en la página
 * y en los datos estructurados (`FAQPage`) que leen Google y los asistentes. Si
 * divergieran, Google lo trata como contenido engañoso. Una sola lista, y las
 * dos salen de ella.
 *
 * Todo lo que dicen tiene que ser verdad en el producto. Si cambia algo de lo
 * que cuentan (los días del invitado, que sea gratis), se cambia aquí.
 */

import { VIDA_INVITADO_DIAS } from '@/src/types/cuenta.types'

export interface Pregunta {
  pregunta: string
  respuesta: string
}

export const PREGUNTAS: readonly Pregunta[] = [
  {
    pregunta: '¿Es gratis de verdad?',
    respuesta:
      'Sí. El juego, los cursos y el gestor de gastos son gratuitos. No hay plan de pago, ni anuncios, ni nada que desbloquear con dinero: las estrellas solo se ganan aprendiendo.',
  },
  {
    pregunta: '¿Tengo que registrarme?',
    respuesta: `No. Al empezar entras como invitado y juegas desde el primer minuto. Lo que hace un invitado se borra a los ${VIDA_INVITADO_DIAS} días; si quieres conservarlo, crea una cuenta con tu email y se queda contigo.`,
  },
  {
    pregunta: '¿Necesito saber algo de economía?',
    respuesta:
      'Nada. Se empieza desde cero, por lo que entra y lo que sale cada mes, y se sube a tu ritmo hasta el ahorro, las deudas o la inversión. Los ejemplos son de la vida diaria y los protagoniza Pepito, que se equivoca para que no te equivoques tú.',
  },
  {
    pregunta: '¿Me vais a decir en qué invertir?',
    respuesta:
      'No. TeachCash es contenido educativo, no asesoramiento financiero. Te explica cómo funcionan las cosas para que decidas tú, y no recomienda ningún banco, fondo ni producto.',
  },
  {
    pregunta: '¿De dónde salen las cifras?',
    respuesta:
      'De fuentes oficiales de España: el Banco de España, la CNMV, el INE, la Seguridad Social, el Tesoro Público o el BOE. Cada dato de las lecciones lleva su fuente al lado.',
  },
  {
    pregunta: '¿Qué pasa con mis datos?',
    respuesta:
      'Solo los ves tú: nada se comparte con otras personas ni se usa para publicidad. Puedes borrar tu cuenta, y todo lo tuyo con ella, cuando quieras.',
  },
  {
    pregunta: '¿Tengo que instalar algo?',
    respuesta: 'No. Funciona en el navegador del móvil, de la tablet o del ordenador.',
  },
]
