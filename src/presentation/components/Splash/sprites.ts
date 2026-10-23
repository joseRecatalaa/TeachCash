/*
 * Los sprites de la pantalla de carga, dibujados a píxel.
 *
 * CÓMO SE LEEN
 *
 * Cada sprite es una lista de filas y cada carácter es UN píxel; el punto es
 * transparente. La letra no es un color sino una clave de la paleta de abajo,
 * que la traduce a una variable `--px-*` de `Splash.module.css`. Así el dibujo
 * se puede editar a ojo aquí mismo, y el color —también el del modo oscuro—
 * sigue viviendo en el CSS, como en el resto de la aplicación.
 *
 * `x` e `y` colocan el sprite dentro del personaje (32x44, origen arriba a la
 * izquierda), no en la escena. Pueden ser negativos: el billete sostenido
 * sobre la cabeza sale por encima de la caja del personaje, y es a propósito.
 *
 * El héroe es el mismo de siempre —pelo castaño revuelto, camiseta amarilla,
 * chaleco de cuero, hombreras salvia, bandolera y cinturón con hebilla—
 * redibujado de cuerpo entero para el futuro Camino del héroe. Si lo retocas,
 * mira que el contorno siga cerrado: es lo que lo separa del fondo.
 */

export type Sprite = {
  readonly x: number
  readonly y: number
  readonly filas: readonly string[]
}

/** Clave de píxel → sufijo de la variable `--px-*`. */
export type Paleta = Readonly<Record<string, string>>

export const PALETA_HEROE: Paleta = {
  o: 'contorno',
  h: 'pelo',
  H: 'pelo-luz',
  d: 'pelo-sombra',
  s: 'piel',
  S: 'piel-sombra',
  w: 'blanco',
  i: 'iris',
  r: 'rubor',
  m: 'boca',
  t: 'lengua',
  y: 'camisola',
  Y: 'camisola-sombra',
  v: 'cuero',
  V: 'cuero-sombra',
  n: 'cuero-luz',
  b: 'cuero-tira',
  g: 'salvia',
  G: 'salvia-sombra',
  a: 'salvia-luz',
  x: 'metal',
  X: 'metal-sombra',
  p: 'pantalon',
  P: 'pantalon-sombra',
  B: 'bota',
  e: 'billete',
  E: 'billete-sombra',
  f: 'billete-luz',
  c: 'billete-papel',
  z: 'destello',
  Z: 'blanco',
}

export const PALETA_MUNDO: Paleta = {
  n: 'nube',
  N: 'nube-sombra',
  a: 'hoja',
  A: 'hoja-sombra',
  t: 'tronco',
}

/* ── El héroe ──────────────────────────────────────────────────────────── */

/** Piernas y botas. Van aparte porque NO respiran: el torso sube y baja un
 *  píxel y las botas se quedan clavadas en el suelo. */
export const PIERNAS: Sprite = {
  x: 6,
  y: 32,
  filas: [
    '..oppppppppppppPPo..',
    '..opppppPoopppppPo..',
    '..opppppPoopppppPo..',
    '..opppppPoopppppPo..',
    '..opppppPoopppppPo..',
    '..opppppPoopppppPo..',
    '..opppppPoopppppPo..',
    '..onnnnnnoonnnnnno..',
    '..oBBBBBBooBBBBBBo..',
    'oBBBBBBBBooBBBBBBBBo',
    'oBBBBBBBVooVBBBBBBBo',
    'oooooooooooooooooooo',
  ],
}

/** Cabeza y torso, sin los brazos (cada pose trae los suyos). */
export const CUERPO: Sprite = {
  x: 0,
  y: 0,
  filas: [
    '...........oo..oo..oo...........',
    '..........ohhoohhoohho..........',
    '........ohHHhhhHHhhhhhho........',
    '.......ohHHhhhhhhhhhhhhdo.......',
    '......ohhHhhhhhhhhhhhhhhdo......',
    '......ohhhhhhhhhhhhhhhhddo......',
    '......ohhhhhhdhhhhhdhhhddo......',
    '......ohhsshhhsshhhsshhhdo......',
    '......ohssssssssssssssssho......',
    '......ohssdddssssssdddssho......',
    '.....osossssssssssssssssoso.....',
    '.....oSossssssssssssssssoSo.....',
    '......oossssssssssssssssoo......',
    '.......ossssssssssssssssso......',
    '.......osssssssssssssssSo.......',
    '........ossssssssssssSSo........',
    '.........oooooooooooooo.........',
    '.....oooooo...oSSo...oooooo.....',
    '....oaaggggovySSSSyvoaaggggo....',
    '....oagggGGovyySSyyvoagggGGo....',
    '....oGGGGGGovyyyyyyvoGGGGGGo....',
    '....oooooooobyyyyyyvoooooooo....',
    '........onvvbbyyyyyvvvVo........',
    '........onvvvbbyyyyvvvVo........',
    '........onvvvybbyyyvvvVo........',
    '........onvvvyybbyyvvvVo........',
    '........onvvvyyybbyvvvVo........',
    '........onvvvyyyybbvvvVo........',
    '........onvvvyyyyybbvvVo........',
    '........onvvvyyyyyybbvVo........',
    '........obbbbbxxxxbbbbbo........',
    '........obbbbbxXXxbbbbbo........',
  ],
}

export const BRAZO_IZQ_ABAJO: Sprite = {
  x: 4,
  y: 22,
  filas: ['osSo', 'osSo', 'osSo', 'osSo', 'osSo', 'onvo', 'onvo', 'oVVo', 'osso', 'osSo', '.oo.'],
}

export const BRAZO_DER_ABAJO: Sprite = {
  x: 24,
  y: 22,
  filas: ['osSo', 'osSo', 'osSo', 'osSo', 'osSo', 'onvo', 'onvo', 'oVVo', 'osso', 'osSo', '.oo.'],
}

/* La cara: cada gesto es una capa que se enciende o se apaga encima de la
   piel, que ya está en el CUERPO. */

export const OJOS: Sprite = {
  x: 11,
  y: 10,
  filas: ['ow......ow', 'oo......oo', 'ii......ii'],
}

/** Mirando arriba a su derecha, hacia el billete. */
export const OJOS_ARRIBA: Sprite = {
  x: 10,
  y: 9,
  filas: ['wo......wo', 'oo......oo', 'ii......ii'],
}

export const BOCA: Sprite = {
  x: 14,
  y: 14,
  filas: ['ooo'],
}

/* ── El billete ────────────────────────────────────────────────────────── */

const FILAS_BILLETE = [
  '.oooooooooooooooooo.',
  'offfffffffffffffffEo',
  'ofeecccccceeeeeeeeEo',
  'ofecccEEEceffffffeEo',
  'ofeccEccccceeeeeeeEo',
  'ofecEEEEcceffffeeeEo',
  'ofeccEccccceeeeeeeEo',
  'ofecccEEEceffffeeeEo',
  'ofeecccccceeeeeeeeEo',
  'ofeeeeeeeeeeeeeeeeEo',
  'oEEEEEEEEEEEEEEEEEEo',
  '.oooooooooooooooooo.',
]

/** El billete que flota. Su `x`/`y` son relativos al personaje igual que
 *  los demás, y valen lo mismo que el sostenido con el salto en lo alto: es
 *  exactamente donde lo agarra. */
export const BILLETE: Sprite = { x: -5, y: -10, filas: FILAS_BILLETE }

/** El brazo izquierdo en alto, sosteniendo el billete por encima de la
 *  cabeza: el "¡objeto conseguido!" de toda la vida. El billete va antes que
 *  el puño en el orden de pintado para que la mano quede por delante. */
export const BRAZO_ARRIBA: Sprite = {
  x: 2,
  y: 0,
  filas: [
    '.oooo.',
    'osssso',
    'osSSso',
    'osssSo',
    '.oooo.',
    '.onvo.',
    '.onvo.',
    '.oVVo.',
    '.osSo.',
    '.osSo.',
    '.osSo.',
    '.osSo.',
    '.osSo.',
    '.osSo.',
    '.osSo.',
    '.osSo.',
    '.osSo.',
    '.osSo.',
  ],
}

export const DESTELLO: Sprite = {
  x: 0,
  y: 0,
  filas: ['..z..', '..z..', 'zzZzz', '..z..', '..z..'],
}

/* ── El mundo ──────────────────────────────────────────────────────────── */

export const NUBE: Sprite = {
  x: 0,
  y: 0,
  filas: [
    '......nnnn........',
    '....nnnnnnnn.nnn..',
    '..nnnnnnnnnnnnnnn.',
    'nnnnnnnnnnnnnnnnnn',
    '.NNNNNNNNNNNNNNNN.',
  ],
}

export const PINO: Sprite = {
  x: 0,
  y: 0,
  filas: [
    '....a....',
    '...aaA...',
    '...aaA...',
    '..aaaAA..',
    '...aaA...',
    '..aaaAA..',
    '.aaaaAAA.',
    '..aaaAA..',
    '.aaaaAAA.',
    'aaaaaAAAA',
    '....t....',
    '....t....',
  ],
}
