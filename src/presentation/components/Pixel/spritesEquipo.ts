/*
 * El equipo del héroe PEQUEÑO (32x44): el que lleva por el Camino del héroe.
 *
 * Son las ocho piezas de `spritesGrande.ts` redibujadas a esta escala, no
 * reducidas: a 32x44 un guante son tres píxeles y una reducción se emborrona.
 * Cada pieza se apoya en las coordenadas de `sprites.ts` y el héroe NO cambia:
 * todo esto son capas que van encima o debajo de él. El orden de pintado está en
 * `PixelHero`.
 *
 * Algunas piezas son varias capas, porque tienen que acompañar a las poses:
 * - Las botas, tres fotogramas: los mismos que `PIERNAS`, `PIERNAS_PASO_1` y
 *   `PIERNAS_PASO_2`, con la bota levantada dos píxeles al andar.
 * - Los guantes, uno por mano (cada brazo se balancea por su cuenta) y un
 *   tercero sobre el puño en alto de `celebra`.
 *
 * Se lee igual que `sprites.ts`. El color del equipo sale de su calidad: las
 * cuatro claves `k K j J` las reapunta `data-calidad` en `pixel.module.css`, y
 * por eso un mismo dibujo vale para el cuero, el hierro y el oro.
 */

import type { TipoObjeto } from '@/lib/tienda'
import { PALETA_HEROE, type Paleta, type Sprite } from './sprites'

/** La del héroe más las cuatro del equipo. La comparten los dos héroes. */
export const PALETA_EQUIPO: Paleta = {
  ...PALETA_HEROE,
  k: 'equipo',
  K: 'equipo-sombra',
  j: 'equipo-luz',
  J: 'equipo-detalle',
}

/** Tapa el pelo y se para encima de las cejas: los ojos que miran arriba (`celebra`) siguen a la vista. */
export const EQUIPO_CASCO: Sprite = {
  x: 5,
  y: -1,
  filas: [
    '....oooooooooooooo....',
    '...okjjjkkJJkkkkkko...',
    '..okjjkkkkJJkkkkkKko..',
    '.okjjkkkkkJJkkkkkkKko.',
    'okjjkkkkkkJJkkkkkkKKko',
    'okjkkkkkkkJJkkkkkkkKko',
    'okjkkkkkkkkkkkkkkkkKko',
    'ojjjjjjjjjjjjjjjjjjjjo',
    'oKKJKKKJKKKKKKJKKKJKKo',
    'ojkooooooooooooooookKo',
    'ojko..............okKo',
    'ojko..............okKo',
    'okko..............okKo',
    '.oo................oo.',
  ],
}

/** Hombreras y peto. Encima del torso, debajo de los brazos; deja el cinturón a la vista. */
export const EQUIPO_ARMADURA: Sprite = {
  x: 3,
  y: 16,
  filas: [
    '..ooooo............ooooo..',
    '.ojjjkko..........okkkkko.',
    'ojjkkkkko........okkkkKKKo',
    'ojkkJkkko........okkkJKKKo',
    'oKKKKKKKooo....oooKKKKKKKo',
    '.ooooojjkkko..okkkKKooooo.',
    '.....ojjkkkkookkkkKKo.....',
    '.....ojjkkkkKKkkkkKKo.....',
    '.....ojjkkkJJJJkkkKKo.....',
    '.....ojjkkkJJJJkkkKKo.....',
    '.....ojjkkkkKKkkkkKKo.....',
    '.....ojjkkkkKKkkkkKKo.....',
    '.....oKKKKKKKKKKKKKKo.....',
    '......oooooooooooooo......',
  ],
}

/** El guante de la mano de la izquierda de la pantalla. */
export const EQUIPO_GUANTE_IZQ: Sprite = {
  x: 2,
  y: 26,
  filas: [
    '.oooooo.',
    'ojjjjjjo',
    'okkJJkko',
    'oKKKKKKo',
    '.ojkkKo.',
    '.ojkkKo.',
    '..oooo..',
  ],
}

/** El de la derecha de la pantalla. */
export const EQUIPO_GUANTE_DER: Sprite = {
  x: 22,
  y: 26,
  filas: [
    '.oooooo.',
    'ojjjjjjo',
    'okkJJkko',
    'oKKKKKKo',
    '.ojkkKo.',
    '.ojkkKo.',
    '..oooo..',
  ],
}

/** Sobre el puño en alto de `celebra` (`BRAZO_ARRIBA`). */
export const EQUIPO_GUANTE_ARRIBA: Sprite = {
  x: 1,
  y: 0,
  filas: [
    '..oooo..',
    '.ojjjKo.',
    '.ojkkKo.',
    '.ojkkKo.',
    'ojjjjjjo',
    'okkJJkko',
    'oKKKKKKo',
    '.oooooo.',
  ],
}

/** No respiran, como las piernas que cubren. */
export const EQUIPO_BOTAS: Sprite = {
  x: 5,
  y: 35,
  filas: [
    '...ooooooo..ooooooo...',
    '..ojjjjjjjoojjjjjjjo..',
    '..oKKKKKKKooKKKKKKKo..',
    '..ojkkkkKKooKKkkkkjo..',
    '..ojJJJJKKooKKJJJJjo..',
    '.oojkkkkKKooKKkkkkjoo.',
    'ojjjkkkkkkookkkkkkjjjo',
    'oKKKKKKKKKooKKKKKKKKKo',
    '.ooooooooo..ooooooooo.',
  ],
}

/** Con `PIERNAS_PASO_1`: la bota izquierda, dos píxeles en el aire. */
export const EQUIPO_BOTAS_PASO_1: Sprite = {
  x: 5,
  y: 33,
  filas: [
    '...ooooooo............',
    '..ojjjjjjjo...........',
    '..oKKKKKKKo.ooooooo...',
    '..ojkkkkKKoojjjjjjjo..',
    '..ojJJJJKKooKKKKKKKo..',
    '.oojkkkkKKooKKkkkkjo..',
    'ojjjkkkkkkooKKJJJJjo..',
    'oKKKKKKKKKooKKkkkkjoo.',
    '.ooooooooo.okkkkkkjjjo',
    '...........oKKKKKKKKKo',
    '............ooooooooo.',
  ],
}

/** Con `PIERNAS_PASO_2`: la derecha en el aire. */
export const EQUIPO_BOTAS_PASO_2: Sprite = {
  x: 5,
  y: 33,
  filas: [
    '............ooooooo...',
    '...........ojjjjjjjo..',
    '...ooooooo.oKKKKKKKo..',
    '..ojjjjjjjooKKkkkkjo..',
    '..oKKKKKKKooKKJJJJjo..',
    '..ojkkkkKKooKKkkkkjoo.',
    '..ojJJJJKKookkkkkkjjjo',
    '.oojkkkkKKooKKKKKKKKKo',
    'ojjjkkkkkko.ooooooooo.',
    'oKKKKKKKKKo...........',
    '.ooooooooo............',
  ],
}

/**
 * En la mano derecha de la pantalla, con la hoja en diagonal hacia fuera. Va
 * DETRÁS del brazo: la mano se cierra sobre el puño de la espada.
 */
export const EQUIPO_ESPADA: Sprite = {
  x: 21,
  y: 15,
  filas: [
    '...................o.',
    '..................ojo',
    '.................ojko',
    '................ojkKo',
    '...............ojkKo.',
    '..............ojkKo..',
    '.............ojkKo...',
    '............ojkKo....',
    '...........ojkKo.....',
    '..........ojkKo......',
    '.....o...ojkKo.......',
    '....oKo.ojkKo........',
    '.....oKojkKo.........',
    '.....oVJooo..........',
    '....oVVoKo...........',
    '...oVVo.oKo..........',
    '..oVVo...o...........',
    '.oJVo................',
    'oJJo.................',
    '.oo..................',
  ],
}

/** Como la espada: el mismo agarre y comparten el hueco del arma. */
export const EQUIPO_MARTILLO: Sprite = {
  x: 21,
  y: 13,
  filas: [
    '............o........',
    '...........oKo.......',
    '..........oKKjo......',
    '.........oKKkjjo.....',
    '........oKKkkkjjo....',
    '.........oKKkkJjjo...',
    '..........oKKkJJjjo..',
    '...........oKKkkkjjo.',
    '...........oVKKkkkKKo',
    '..........oVVoKKkKKo.',
    '.........oVVo.oKKKo..',
    '........oVVo...oKo...',
    '.......oVVo.....o....',
    '......oVVo...........',
    '.....oVVo............',
    '....oVVo.............',
    '...oVVo..............',
    '..oVVo...............',
    '.oVVo................',
    'oVVo.................',
    '.oo..................',
  ],
}

/** Delante de la mano izquierda de la pantalla; al celebrar, a la espalda. */
export const EQUIPO_ESCUDO: Sprite = {
  x: -5,
  y: 21,
  filas: [
    '.ooooooooooooooo.',
    'ojjjjjjjjjjjjjjjo',
    'ojkkkkkKKkkkkkKKo',
    'ojkkkkkKKkkkkkKKo',
    'ojkkkkkKKkkkkkKKo',
    'ojkkkkkKKkkkkkKKo',
    'ojkkkkjjjjkkkkKKo',
    'ojkkkkJJJJkkkkKKo',
    'ojkkkkJJJJkkkkKKo',
    'ojkkkkkKKkkkkkKKo',
    '.ojkkkkKKkkkkKKo.',
    '..ojkkkKKkkkKKo..',
    '...ojkkKKkkKKo...',
    '....ojkKKkKKo....',
    '.....ojKKKKo.....',
    '......oKKKo......',
    '.......oKo.......',
    '........o........',
  ],
}

/** Detrás de todo, las dos en un sprite. No pasan de la fila 5: no le añaden alto. */
export const EQUIPO_ALAS: Sprite = {
  x: -11,
  y: 5,
  filas: [
    '.ooo..............................................ooo.',
    'ojjjooo........................................ooojjjo',
    'ojjjjjjoo....................................oojjjjjjo',
    'okkkjjjjjoo................................oojjjjjkkko',
    'okkkkkkjjjjoo............................oojjjjkkkkkko',
    'oKKKkkkkkjjjjo..........................ojjjjkkkkkKKKo',
    'okkKKKKkkkkjjjoo......................oojjjkkkkKKKKkko',
    'okkKkkKKKkkkkjjjo....................ojjjkkkkKKKkkKkko',
    'okkKkkKkkKKkkkjjjo..................ojjjkkkKKkkKkkKkko',
    'okkKkkKkkKkKKkkkjjoo..............oojjkkkKKkKkkKkkKkko',
    'okkKkkKkkKkkKKkkkjjjo............ojjjkkkKKkkKkkKkkKkko',
    'okkKkkKkkKkkKkKKkkjjjo..........ojjjkkKKkKkkKkkKkkKkko',
    'okkKkkKkkKkkKkkKKkkkjjo........ojjkkkKKkkKkkKkkKkkKkko',
    'okkKkkKkkKkkKkkKkKkkkjjo......ojjkkkKkKkkKkkKkkKkkKkko',
    'okkKkkKkkKkkKkkKkkKKkkjjo....ojjkkKKkkKkkKkkKkkKkkKkko',
    'okkKkkKkkKkkKkkKkkKkKkkjo....ojkkKkKkkKkkKkkKkkKkkKkko',
    'okkKkkKkkKkkKkkKkkKkkKkko....okkKkkKkkKkkKkkKkkKkkKkko',
    'okkKkkKkkKkkKkkKkkKkkKKko....okKKkkKkkKkkKkkKkkKkkKkko',
    'okkKkkKkkKkkKkkKkkKkkKkKo....oKkKkkKkkKkkKkkKkkKkkKkko',
    'okkKkkKkkKkkKkkKkkKkkokko....okkokkKkkKkkKkkKkkKkkKkko',
    'okkKkkKkkKkkKkkKkkoko.oo......oo.okokkKkkKkkKkkKkkKkko',
    'okkKkkKkkKkkokkooo.o..............o.oookkokkKkkKkkKkko',
    'okkKkkKkkokkooo........................oookkokkKkkKkko',
    'okkKkkoko.oo..............................oo.okokkKkko',
    'okkooo.o......................................o.oookko',
    '.oo................................................oo.',
  ],
}

/**
 * Todas las capas de cada tipo de objeto. No es lo que pinta `PixelHero` —él
 * coloca cada capa en su sitio—, sino la lista que comprueba que ningún tipo del
 * catálogo se quede sin su versión pequeña.
 */
export const PIEZAS_PEQUENAS: Record<TipoObjeto, readonly Sprite[]> = {
  casco: [EQUIPO_CASCO],
  armadura: [EQUIPO_ARMADURA],
  guantes: [EQUIPO_GUANTE_IZQ, EQUIPO_GUANTE_DER, EQUIPO_GUANTE_ARRIBA],
  botas: [EQUIPO_BOTAS, EQUIPO_BOTAS_PASO_1, EQUIPO_BOTAS_PASO_2],
  espada: [EQUIPO_ESPADA],
  martillo: [EQUIPO_MARTILLO],
  escudo: [EQUIPO_ESCUDO],
  alas: [EQUIPO_ALAS],
}
