/*
 * El héroe grande, a 48x66 píxeles: el de `sprites.ts` (32x44) calcado a una
 * vez y media, con las mismas formas, los mismos colores y la misma cara.
 *
 * Es el del Cuadro de mando y la Tienda, y existe porque a 32x44 un guante son
 * tres píxeles: el equipo no se distinguiría. Se probó uno de 64x88 con más
 * detalle y se descartó: dejaba de ser el personaje. Si lo retocas, compáralo
 * con el pequeño. Este sigue en la pantalla de carga y en los caminos, sin equipo.
 *
 * Se lee igual que `sprites.ts`: cada carácter es un píxel, el punto es
 * transparente y la letra es una clave de la paleta. Cada capa lleva su propio
 * contorno, y es lo que permite poner equipo encima y debajo sin que se funda.
 */

import { PALETA_HEROE, type Paleta, type Sprite } from './sprites'

export const PALETA_HEROE_GRANDE: Paleta = PALETA_HEROE

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
