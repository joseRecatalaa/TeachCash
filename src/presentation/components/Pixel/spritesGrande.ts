/*
 * El héroe grande, a 48x66 píxeles: el de `sprites.ts` (32x44) calcado a una
 * vez y media, con las mismas formas, los mismos colores y la misma cara.
 *
 * Es el del Cuadro de mando y la Tienda, y existe porque a 32x44 un guante son
 * tres píxeles: el equipo no se distinguiría. Se probó uno de 64x88 con más
 * detalle y se descartó: dejaba de ser el personaje. Si lo retocas, compáralo
 * con el pequeño, que lleva el mismo equipo redibujado a su escala (`spritesEquipo.ts`).
 *
 * Se lee igual que `sprites.ts`: cada carácter es un píxel, el punto es
 * transparente y la letra es una clave de la paleta. Cada capa lleva su propio
 * contorno, y es lo que permite poner equipo encima y debajo sin que se funda.
 */

import type { Paleta, Sprite } from './sprites'
import { PALETA_EQUIPO } from './spritesEquipo'

/**
 * La del héroe más la del equipo: la misma que la del pequeño. El color del
 * equipo depende de su calidad, y por eso son cuatro variables que
 * `pixel.module.css` reapunta con `data-calidad`: un mismo dibujo vale para el
 * cuero, el hierro y el oro.
 */
export const PALETA_HEROE_GRANDE: Paleta = PALETA_EQUIPO

/** Piernas y botas. No respiran: el torso sube y baja y las botas se quedan clavadas. */
export const GRANDE_PIERNAS: Sprite = {
  x: 9,
  y: 46,
  filas: [
    '....oooooooooooooooooooooo....',
    '...oppppppppppppppppppPPPPo...',
    '...oppppppppppppppppppPPPPo...',
    '...oppppppppppppppppppppPPo...',
    '...oppppppppPPooppppppppPPo...',
    '...oppppppppPPooppppppppPPo...',
    '...oppppppppPPooppppppppPPo...',
    '...oppppppppPPooppppppppPPo...',
    '...oppppppppPPooppppppppPPo...',
    '...oppppppppPPooppppppppPPo...',
    '...oppppppppPPooppppppppPPo...',
    '...oppppppppPPooppppppppPPo...',
    '...onnnnnnnnnnoonnnnnnnnnno...',
    '...onnnnnnnnnnoonnnnnnnnnno...',
    '...oBBBBBBBBBBooBBBBBBBBBBo...',
    '.oooBBBBBBBBBBooBBBBBBBBBBooo.',
    'oBBBBBBBBBBBBBooBBBBBBBBBBBBBo',
    'oBBBBBBBBBBBBBooBBBBBBBBBBBBBo',
    'oBBBBBBBBBBBVVooVVBBBBBBBBBBBo',
    '.oooooooooooooooooooooooooooo.',
  ],
}

/** Cuello, chaleco, camiseta, bandolera, cinturón y hombreras. */
export const GRANDE_TORSO: Sprite = {
  x: 6,
  y: 24,
  filas: [
    '...............oooooo...............',
    '...........ooooSSSSSSoooo...........',
    '..........oyyyySSSSSSyyyyo..........',
    '.oooooooooovvyySSSSSSyyvvoooooooooo.',
    'oaaaggggggovvyySSSSSSyyvvoaaaggggggo',
    'oaagggggggovvyyySSSSyyyvvoaagggggggo',
    'oagggggGGGovvyyySSSSyyyvvoagggggGGGo',
    'ogggggGGGGobbbyyySSyyyyvvogggggGGGGo',
    'oGGGGGGGGGovbbbyyyyyyyyvvoGGGGGGGGGo',
    '.oooooonnvvvvbbbyyyyyyyvvvvVVoooooo.',
    '......onnvvvvvbbbyyyyyyvvvvVVo......',
    '......onnvvvvvybbbyyyyyvvvvVVo......',
    '......onnvvvvvyybbbyyyyvvvvVVo......',
    '......onnvvvvvyyybbbyyyvvvvVVo......',
    '......onnvvvvvyyyybbbyyvvvvVVo......',
    '......onnvvvvvyyyyybbbyvvvvVVo......',
    '......onnvvvvvyyyyyybbbvvvvVVo......',
    '......onnvvvvvyyyyyyybbbvvvVVo......',
    '......onnvvvvvyyyyyyyybbbvvVVo......',
    '......onnvvvvvyyyyyyyyybbbvVVo......',
    '......onnvvvvvyyyyyyyyyvbbbVVo......',
    '......obbbbbbbxxxxxxxxbbbbbbbo......',
    '......obbbbbbbxxXXXXxxbbbbbbbo......',
    '......obbbbbbbxxXXXXxxbbbbbbbo......',
    '.......oooooooooooooooooooooo.......',
  ],
}

/** El brazo de la izquierda de la pantalla: el escudo irá en esta mano. */
export const GRANDE_BRAZO_IZQ: Sprite = {
  x: 6,
  y: 33,
  filas: [
    '.oooo.',
    'ossSSo',
    'ossSSo',
    'ossSSo',
    'ossSSo',
    'ossSSo',
    'ossSSo',
    'ossSSo',
    'ossSSo',
    'onnvvo',
    'onnvvo',
    'onnvvo',
    'oVVVVo',
    'osssso',
    'ossSSo',
    'ossSSo',
    '.oooo.',
  ],
}

/** El brazo de la derecha de la pantalla: el arma irá en esta mano. */
export const GRANDE_BRAZO_DER: Sprite = {
  x: 36,
  y: 33,
  filas: [
    '.oooo.',
    'ossSSo',
    'ossSSo',
    'ossSSo',
    'ossSSo',
    'ossSSo',
    'ossSSo',
    'ossSSo',
    'ossSSo',
    'onnvvo',
    'onnvvo',
    'onnvvo',
    'oVVVVo',
    'osssso',
    'ossSSo',
    'ossSSo',
    '.oooo.',
  ],
}

/** Cabeza, pelo y cara. Va después del torso: la barbilla queda por delante del cuello. */
export const GRANDE_CABEZA: Sprite = {
  x: 6,
  y: 0,
  filas: [
    '...........oo....oo.....oo..........',
    '..........ohho..ohho...ohho.........',
    '........oohhhhoohhhhooohhhho........',
    '......oohHHHHhhhhHHHhhhhhhhhoo......',
    '.....ohhHHHhhhhhhhhhhhhhhhhhddo.....',
    '....ohhHHhhhhhhhhhhhhhhhhhhhhddo....',
    '...ohhHHhhhhhhhhhhhhhhhhhhhhhdddo...',
    '...ohhhhhhhhhhhhhhhhhhhhhhhhhdddo...',
    '...ohhhhhhhhhhhhhhhhhhhhhhhhhhddo...',
    '...ohhhhhhhhhhddhhhhhhhddhhhhhddo...',
    '...ohhhhhhhhhhhhhhhhhhhhhhhhhhddo...',
    '...ohhhhsshhhhhhssshhhhhhhsshhhdo...',
    '...ohhhsssssssssssssssssssssshhdo...',
    '...ohhsssssssssssssssssssssssshdo...',
    '.ooohhsssssssssssssssssssssssshdooo.',
    'ossohhssdddddssssssssssdddddsshdosso',
    'ossossssssoowssssssssssoowssssssosso',
    'oSSossssssoowssssssssssoowssssssoSSo',
    '.ooossssssooossssssssssooossssssooo.',
    '...ossssssiiissssssssssiiisssssso...',
    '...osssssssssssssssssssssssssssso...',
    '....osssssssssssoooossssssssSSSo....',
    '.....osssssssssssssssssssSSSSSo.....',
    '......oosssssssssssssssSSSSSoo......',
    '........oooooooooooooooooooo........',
  ],
}

/* ── El equipo: cada pieza se apoya en las coordenadas del héroe. Alas, arma y
 * escudo salen de su caja a propósito. ──────────────────────────────────── */

/** Tapa el pelo hasta las cejas. */
export const OBJETO_CASCO: Sprite = {
  x: 8,
  y: -1,
  filas: [
    '.........oooooooooooooo.........',
    '......oookkkkkkJJkkkkkkooo......',
    '....ookkjjjjjjjJJkkkkkkkkkoo....',
    '...okkjjjjjjkkkJJkkkkkkkkkkko...',
    '..okkjjjjkkkkkkJJkkkkkkkkkkKKo..',
    '.okkjjjkkkkkkkkJJkkkkkkkkkkKKko.',
    'okkjjjkkkkkkkkkJJkkkkkkkkkkKKKKo',
    'okkjjkkkkkkkkkkJJkkkkkkkkkkKKKKo',
    'okkjjkkkkkkkkkkJJkkkkkkkkkkKKKKo',
    'okkkkkkkkkkkkkkJJkkkkkkkkkkKKKKo',
    'okkkkkkkkkkkkkkJJkkkkkkkkkkKKKKo',
    'okkkkkkkkkkkkkkkkkkkkkkkkkkkkKKo',
    'ojjjjjjjjjjjjjjjjjjjjjjjjjjjjjjo',
    'oKKKKJKKKKJKKKKKKKKKKJKKKKJKKKKo',
    'oKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKo',
    'ojkkooooooooooooooooooooooooKKKo',
    'ojkko......................oKKKo',
    'ojkko......................oKKKo',
    'ojkko......................oKKKo',
    'ojkko......................oKKKo',
    'okkko......................oKKKo',
    '.ooo........................ooo.',
  ],
}

/** Encima del torso, debajo de los brazos. */
export const OBJETO_ARMADURA: Sprite = {
  x: 4,
  y: 25,
  filas: [
    '..oooooooooo................oooooooooo..',
    '.okjjjjjkkkko..............okjjjjjkkkko.',
    '.okkkkkkkkkko..............okkkkkkkkkko.',
    'okjjjjkkkkkKKo............okjjjjkkkkkKKo',
    'okjjkkkkkkkKKoo..........ookjjkkkkkkkKKo',
    'okkkkkJJkkkKKkko........okkkkkkkJJkkkKKo',
    'okkkkkkkkkkKKkkko......okkkkkkkkkkkkkKKo',
    'oKKKKKKKKKKKKkkkkooooookkkkKKKKKKKKKKKKo',
    'oKKKKKKKKKKKKkkkkkkKKkkkkkkKKKKKKKKKKKKo',
    '.oooooooojjjjjjkkkkKKkkkkkkkKKKoooooooo.',
    '........ojjjjjjkkkkKKkkkkkkkKKKo........',
    '........ojjjkkkkkkjjjjkkkkkkKKKo........',
    '........ojjjkkkkkkJJJJkkkkkkKKKo........',
    '........ojjjkkkkkkJJJJkkkkkkKKKo........',
    '........ojjjkkkkkkJJJJkkkkkkKKKo........',
    '........ojjjkkkkkkkKKkkkkkkkKKKo........',
    '........ojjjKKKKKKkKKkKKKKKKKKKo........',
    '........ojjjkkkkkkkKKkkkkkkkKKKo........',
    '........ojjjkkkkkkkKKkkkkkkkKKKo........',
    '........oKKKKKKKKKKKKKKKKKKKKKKo........',
    '.........oooooooooooooooooooooo.........',
  ],
}

/** Las dos manos en un mismo sprite. */
export const OBJETO_GUANTES: Sprite = {
  x: 5,
  y: 40,
  filas: [
    '.oooooo........................oooooo.',
    'ojjjjjjo......................ojjjjjjo',
    'okkkkkko......................okkkkkko',
    'okkJJkko......................okkJJkko',
    'oKKKKKKo......................oKKKKKKo',
    '.ojjkKo........................ojjkKo.',
    '.ojjkKo........................ojjkKo.',
    '.ojjkKo........................ojjkKo.',
    '.oKKKKo........................oKKKKo.',
    '..oooo..........................oooo..',
  ],
}

/** No respiran, como las piernas que cubren. */
export const OBJETO_BOTAS: Sprite = {
  x: 8,
  y: 54,
  filas: [
    '....ooooooooooo..ooooooooooo....',
    '...ojjjjjjjjjjjoojjjjjjjjjjjo...',
    '...oKKKKKKKKKKKooKKKKKKKKKKKo...',
    '...ojjkkkkkkkKKoojjkkkkkkkKKo...',
    '...ojjkkkkkkkKKoojjkkkkkkkKKo...',
    '...ojjkJJJJJkKKoojjkJJJJJkKKo...',
    '...ojjkkkkkkkKKoojjkkkkkkkKKo...',
    '.ooojjkkkkkkkKKoojjkkkkkkkKKooo.',
    'ojjjjjkkkkkkkkkoojjjjjkkkkkkkkko',
    'okkkkkkkkkkkkkkookkkkkkkkkkkkkko',
    'oKKKKKKKKKKKKKKooKKKKKKKKKKKKKKo',
    '.oooooooooooooo..oooooooooooooo.',
  ],
}

/** En diagonal desde la mano derecha de la pantalla, para no tapar el brazo. */
export const OBJETO_ESPADA: Sprite = {
  x: 35,
  y: 18,
  filas: [
    '...............................o.',
    '..............................oko',
    '.............................okko',
    '............................okko.',
    '............................oooo.',
    '...........................ojkkko',
    '..........................ojjkKko',
    '.........................ojjkKKo.',
    '........................ojjkKKo..',
    '.......................ojjkKKo...',
    '......................ojjkKKo....',
    '.....................ojjkKKo.....',
    '....................ojjkKKo......',
    '...................ojjkKKo.......',
    '..................ojjkKKo........',
    '.................ojjkKKo.........',
    '................ojjkKKo..........',
    '...............ojjkKKo...........',
    '..............ojjkKKo............',
    '.............ojjkKKo.............',
    '............ojjkKKo..............',
    '...o.......ojjkKKo...............',
    '..oko.....ojjkKKo................',
    '..oKko...ojjkKKo.................',
    '...oKkooojjkKKo..................',
    '....oKJJkjkKKo...................',
    '.....oJJkkkKo....................',
    '....oVVKkooo.....................',
    '...oVVVoKko......................',
    '..oVVVo.oKko.....................',
    '.oVVVo...oKko....................',
    'oVVVo.....oKKo...................',
    'oVVo.......oo....................',
    '.oo..............................',
  ],
}

/** Como la espada: comparten el hueco del arma. */
export const OBJETO_MARTILLO: Sprite = {
  x: 36,
  y: 16,
  filas: [
    '.....................oo.............',
    '....................oKKo............',
    '...................ojjKKo...........',
    '..................ojjkkKKo..........',
    '.................ojjkkkkKKo.........',
    '................ojjkkkkKKKKo........',
    '...............ojjkkkkKKkkKKo.......',
    '..............ojjkkkkKKkkkkKKo......',
    '.............ojjkkkkKKkkkkkkKKo.....',
    '............ojjkkkkKKkkJJkkkkKKo....',
    '.............ojjkkKKkkJJJJkkkkKKo...',
    '..............ojjKKkkJJJJJJkkKKKKo..',
    '...............ojjkkkkJJJJkkKKkkKKo.',
    '................ojjkkkkJJkkKKkkkkKKo',
    '.................ojjkkkkkkKKkkkkKKo.',
    '..................ojjkkkkKKkkkkKKo..',
    '.................oVVjjkkKKkkkkKKo...',
    '................oVVVojjKKkkkkKKo....',
    '...............oVVVo.ojjkkkkKKo.....',
    '..............oVVVo...ojjkkKKo......',
    '.............oVVVo.....ojjKKo.......',
    '............oVVVo.......ojjo........',
    '...........oVVVo.........oo.........',
    '..........oVVVo.....................',
    '.........oVVVo......................',
    '........oVVVo.......................',
    '.......oVVVo........................',
    '......oVVVo.........................',
    '.....oVVVo..........................',
    '....oVVVo...........................',
    '...oVVVo............................',
    '..oVVVo.............................',
    '.oVVVo..............................',
    'oVVVo...............................',
    'oVVo................................',
    '.oo.................................',
  ],
}

/** Delante de la mano izquierda de la pantalla. */
export const OBJETO_ESCUDO: Sprite = {
  x: -6,
  y: 31,
  filas: [
    '..oooooooooooooooooooo..',
    '.okkkkkkkkkkkkkkkkkkkko.',
    'okjjjjjjjjjjjjjjjjjjjjko',
    'ojjkkkkkkkkkkkkkkkkkkKKo',
    'ojjkkkkkkkKKKKkkkkkkkKKo',
    'ojjkkkkkkkKKKKkkkkkkkKKo',
    'ojjkkkkkkkKKKKkkkkkkkKKo',
    'ojjkkkkkkkKKKKkkkkkkkKKo',
    'ojjkkkkkkkKKKKkkkkkkkKKo',
    'ojjkkkkkkjjjjjjkkkkkkKKo',
    'ojjKKKKKKJJJJJJKKKKKKKKo',
    'ojjKKKKKKJJJJJJKKKKKKKKo',
    'ojjKKKKKKJJJJJJKKKKKKKKo',
    'ojjKKKKKKJJJJJJKKKKKKKKo',
    'ojjkkkkkkJJJJJJkkkkkkKKo',
    'ojjkkkkkkkKKKKkkkkkkkKKo',
    '.okkkkkkkkKKKKkkkkkkKKo.',
    '.okkkkkkkkKKKKkkkkkkKKo.',
    '..okkkkkkkKKKKkkkkkKKo..',
    '...okkkkkkKKKKkkkkKKo...',
    '....okkkkkKKKKkkkKKo....',
    '.....okkkkKKKKkkKKo.....',
    '......okkkKKKKkKKo......',
    '.......okkKKKKKKo.......',
    '........okkkkKKo........',
    '.........okkKKo.........',
    '..........oooo..........',
  ],
}

/** Detrás de todo, las dos en un mismo sprite. */
export const OBJETO_ALAS: Sprite = {
  x: -16,
  y: 13,
  filas: [
    '.o............................................................................o.',
    'ojoo........................................................................oojo',
    'ojjjo......................................................................ojjjo',
    'ojjjjoo..................................................................oojjjjo',
    'okjkjjjo................................................................ojjjkjko',
    'okkkjjjjoo............................................................oojjjjkkko',
    'okkKkjkjjjoo........................................................oojjjkjkKkko',
    'okkKkkkjjjjjo......................................................ojjjjjkkkKkko',
    'okkKkkkkjkjjjoo..................................................oojjjkjkkkkKkko',
    'okkKkkkkkkjjjjjo................................................ojjjjjkkkkkkKkko',
    'okkKkkkkKkkkkjjjoo............................................oojjjkkkkKkkkkKkko',
    'okkKkkkkKkkkkjjjjjoo........................................oojjjjjkkkkKkkkkKkko',
    'okkKkkkkKkkkkkkkjjjjo......................................ojjjjkkkkkkkKkkkkKkko',
    'okkKkkkkKkkkkKkkjjjjjoo..................................oojjjjjkkKkkkkKkkkkKkko',
    'okkKkkkkKkkkkKkkkkkjjjjo................................ojjjjkkkkkKkkkkKkkkkKkko',
    'okkKkkkkKkkkkKkkkkkkjjjjoo............................oojjjjkkkkkkKkkkkKkkkkKkko',
    'okkKkkkkKkkkkKkkkkKkkkjjjjoo........................oojjjjkkkKkkkkKkkkkKkkkkKkko',
    'okkKkkkkKkkkkKkkkkKkkkkjjjjjo......................ojjjjjkkkkKkkkkKkkkkKkkkkKkko',
    'okkKkkkkKkkkkKkkkkKkkkkkkjjjjo....................ojjjjkkkkkkKkkkkKkkkkKkkkkKkko',
    'oKkKKkkkKkkkkKkkkkKkkkkKkkjkjo....................ojkjkkKkkkkKkkkkKkkkkKkkkKKkKo',
    '.oKKoKkkKkkkkKkkkkKkkkkKkkkkjo....................ojkkkkKkkkkKkkkkKkkkkKkkKoKKo.',
    '..oo.okkKkkkkKkkkkKkkkkKkkkkko....................okkkkkKkkkkKkkkkKkkkkKkko.oo..',
    '.....oKKKKkkkKkkkkKkkkkKkkkkko....................okkkkkKkkkkKkkkkKkkkKKKKo.....',
    '......ooKoKkkKkkkkKkkkkKkkkkko....................okkkkkKkkkkKkkkkKkkKoKoo......',
    '........o.okkKKkkkKkkkkKkkkkko....................okkkkkKkkkkKkkkKKkko.o........',
    '..........oKKKokkkKkkkkKkkkkko....................okkkkkKkkkkKkkkoKKKo..........',
    '...........ooKoKkkKkkkkKkkkkko....................okkkkkKkkkkKkkKoKoo...........',
    '.............o.oKkKKkkkKkkkkko....................okkkkkKkkkKKkKo.o.............',
    '................oKKokkkKkkkkko....................okkkkkKkkkoKKo................',
    '.................oooKkkKkkkkko....................okkkkkKkkKooo.................',
    '....................oKkKKkkkko....................okkkkKKkKo....................',
    '.....................oKKoKkkko....................okkkKoKKo.....................',
    '......................oo.okkko....................okkko.oo......................',
    '.........................oKKko....................okKKo.........................',
    '..........................ooKo....................oKoo..........................',
    '............................o......................o............................',
  ],
}
