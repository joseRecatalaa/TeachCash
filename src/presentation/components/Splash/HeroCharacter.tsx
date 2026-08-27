/*
 * El héroe de la pantalla de carga, de cintura para arriba.
 *
 * GEOMETRÍA QUE NO SE TOCA A OJO (viewBox 820x700)
 *   hombro izq. (308,442)   muñeca izq. (294,620)   mano izq. (294,640)
 *   hombro der. (572,442)   codo der.  (586,534)   muñeca der. (586,608)
 * Girando el brazo 140 grados sobre el hombro y contragirando la mano -110
 * sobre la muñeca, el puño aterriza en (194,314): ahí está el billete, y de ahí
 * salen los porcentajes de `.billeteCaja` en el módulo. Si mueves un pivote,
 * recalcula el otro o el personaje agarrará aire.
 *
 * Otras dos cosas que ya se rompieron una vez y por eso están así:
 *   - El torso llega a 300..580 en la cintura y los brazos van POR FUERA
 *     (258..338 y 542..622). Con un torso estrecho los brazos lo tapan entero
 *     y el chaleco desaparece.
 *   - Las hombreras son de rx 58, no 70. Con 70 se tragaban el brazo estirado
 *     y el gesto de coger el billete parecía un muñón.
 *
 * Los nombres de clase (`head`, `armL`, `handGrip`…) son los que engancha
 * `Splash.module.css` con `:global()`, y son los mismos del lienzo de diseño
 * para poder copiar cambios entre uno y otro sin traducir nada.
 */

const LINEA = {
  stroke: 'var(--sp-contorno)',
  strokeWidth: 5,
  strokeLinejoin: 'round',
} as const

const LINEA_GRUESA = {
  stroke: 'var(--sp-contorno)',
  strokeWidth: 6,
  strokeLinejoin: 'round',
} as const

const PIEL = { fill: 'url(#sp-piel)' } as const
const PELO = { fill: 'url(#sp-pelo)', ...LINEA_GRUESA } as const

const DEDOS = {
  stroke: 'var(--sp-piel-linea)',
  strokeWidth: 4.5,
  fill: 'none',
  strokeLinecap: 'round',
  opacity: 0.75,
} as const

const COSTURA = {
  stroke: 'var(--sp-contorno)',
  strokeWidth: 4,
  fill: 'none',
  opacity: 0.55,
} as const

export function HeroCharacter() {
  return (
    <svg className="sp-hero" viewBox="0 0 820 700" aria-hidden="true">
      <defs>
        <linearGradient id="sp-piel" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--sp-piel-luz)' }} />
          <stop offset="0.55" style={{ stopColor: 'var(--sp-piel)' }} />
          <stop offset="1" style={{ stopColor: 'var(--sp-piel-sombra)' }} />
        </linearGradient>
        <linearGradient id="sp-pelo" x1="0.25" y1="0" x2="0.75" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--sp-pelo-luz)' }} />
          <stop offset="0.45" style={{ stopColor: 'var(--sp-pelo)' }} />
          <stop offset="1" style={{ stopColor: 'var(--sp-pelo-sombra)' }} />
        </linearGradient>
        <linearGradient id="sp-cuero" x1="0.2" y1="0" x2="0.85" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--sp-cuero-luz)' }} />
          <stop offset="0.5" style={{ stopColor: 'var(--sp-cuero)' }} />
          <stop offset="1" style={{ stopColor: 'var(--sp-cuero-sombra)' }} />
        </linearGradient>
        <linearGradient id="sp-camisola" x1="0.3" y1="0" x2="0.8" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--sp-camisola-luz)' }} />
          <stop offset="0.5" style={{ stopColor: 'var(--sp-camisola)' }} />
          <stop offset="1" style={{ stopColor: 'var(--sp-camisola-sombra)' }} />
        </linearGradient>
        <linearGradient id="sp-salvia" x1="0.25" y1="0.05" x2="0.8" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--sp-salvia-luz)' }} />
          <stop offset="0.42" style={{ stopColor: 'var(--sp-salvia)' }} />
          <stop offset="1" style={{ stopColor: 'var(--sp-salvia-sombra)' }} />
        </linearGradient>
        <linearGradient id="sp-metal" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--sp-metal-luz)' }} />
          <stop offset="0.5" style={{ stopColor: 'var(--sp-metal)' }} />
          <stop offset="1" style={{ stopColor: 'var(--sp-metal-sombra)' }} />
        </linearGradient>
        <linearGradient id="sp-iris" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--sp-iris-luz)' }} />
          <stop offset="1" style={{ stopColor: 'var(--sp-iris)' }} />
        </linearGradient>
      </defs>

      <g className="ch">
        <g className="body">
          {/* ── Torso ─────────────────────────────────────────────────── */}
          <path d="M402,296 h76 v88 h-76 z" fill="var(--sp-piel-sombra)" {...LINEA} />
          <path
            d="M300,700 L316,474 Q326,388 396,372 L484,372 Q554,388 564,474 L580,700 Z"
            fill="url(#sp-camisola)"
            {...LINEA}
          />
          <path d="M404,378 h72 l10,322 h-92 z" fill="url(#sp-camisola)" />
          <path
            d="M440,386 l5,312"
            stroke="var(--sp-camisola-sombra)"
            strokeWidth={6}
            fill="none"
            opacity={0.5}
          />
          <path
            d="M396,372 q-70,16 -80,102 l-16,226 h106 l4,-328 z"
            fill="url(#sp-cuero)"
            {...LINEA}
          />
          <path
            d="M484,372 q70,16 80,102 l16,226 h-106 l-4,-328 z"
            fill="url(#sp-cuero)"
            {...LINEA}
          />
          <path d="M396,372 q-28,10 -34,44 l38,-10 z" fill="var(--sp-cuero-luz)" {...LINEA} />
          <path d="M484,372 q28,10 34,44 l-38,-10 z" fill="var(--sp-cuero-luz)" {...LINEA} />
          <path
            d="M322,474 l-16,220"
            stroke="var(--sp-cuero-sombra)"
            strokeWidth={5}
            fill="none"
            opacity={0.4}
          />
          <path
            d="M558,474 l16,220"
            stroke="var(--sp-cuero-sombra)"
            strokeWidth={5}
            fill="none"
            opacity={0.4}
          />

          {/* Bandolera */}
          <path
            d="M396,390 l152,258 -32,20 -152,-258 z"
            fill="var(--sp-cuero-tira)"
            {...LINEA}
          />
          <rect
            x="443"
            y="488"
            width="58"
            height="52"
            rx="12"
            fill="url(#sp-metal)"
            transform="rotate(59 472 514)"
            {...LINEA}
          />

          {/* Cinturón */}
          <path d="M304,636 h272 l4,48 h-280 z" fill="var(--sp-cuero-tira)" {...LINEA} />
          <rect x="410" y="628" width="62" height="62" rx="13" fill="url(#sp-metal)" {...LINEA} />
          <rect x="428" y="648" width="28" height="22" rx="6" fill="var(--sp-metal-sombra)" />

          {/* ── Brazo izquierdo (visor: izquierda). Coge el billete ────── */}
          <g className="armL">
            <path d="M260,436 q34,-18 68,0 l4,106 q-38,16 -76,0 z" {...PIEL} />
            <path d="M258,536 q36,-16 72,0 l3,76 q-39,16 -78,0 z" {...PIEL} />
            <path
              d="M254,552 q40,-18 80,0 l4,62 q-44,18 -88,0 z"
              fill="url(#sp-cuero)"
              {...LINEA}
            />
            <path d="M259,572 q35,-14 70,0" {...COSTURA} />
            <path d="M260,590 q34,-13 68,0" {...COSTURA} />
            <g className="handL">
              <g className="handOpen">
                <path
                  d="M258,610 q36,-12 72,0 q12,4 12,22 q0,26 -16,36 q-32,16 -64,0 q-16,-10 -16,-36 q0,-18 12,-22 z"
                  {...PIEL}
                  {...LINEA}
                />
                <rect x="264" y="654" width="22" height="46" rx="11" {...PIEL} {...LINEA} />
                <rect x="288" y="658" width="22" height="52" rx="11" {...PIEL} {...LINEA} />
                <rect x="312" y="654" width="22" height="46" rx="11" {...PIEL} {...LINEA} />
                <rect
                  x="238"
                  y="616"
                  width="21"
                  height="46"
                  rx="10"
                  transform="rotate(-28 248 639)"
                  {...PIEL}
                  {...LINEA}
                />
              </g>
              <g className="handGrip">
                <path
                  d="M256,608 q38,-12 76,0 q14,4 14,26 q0,30 -20,40 q-32,14 -64,0 q-20,-10 -20,-40 q0,-22 14,-26 z"
                  {...PIEL}
                  {...LINEA}
                />
                <path d="M278,614 v42 M302,612 v46 M326,614 v42" {...DEDOS} />
                <path d="M248,622 q-18,10 -8,32 q9,18 26,9" {...PIEL} {...LINEA} />
              </g>
            </g>
          </g>

          {/* ── Brazo derecho (visor: derecha). Levanta el pulgar ──────── */}
          <g className="armR">
            <path d="M552,436 q34,-18 68,0 l4,106 q-38,16 -76,0 z" {...PIEL} />
            <path
              d="M600,442 q14,4 14,12 l3,90 q-9,6 -17,4 z"
              fill="var(--sp-piel-sombra)"
              opacity={0.45}
            />
            <g className="foreR">
              <path d="M550,536 q36,-16 72,0 l3,76 q-39,16 -78,0 z" {...PIEL} />
              <path
                d="M546,552 q40,-18 80,0 l4,62 q-44,18 -88,0 z"
                fill="url(#sp-cuero)"
                {...LINEA}
              />
              <path d="M551,572 q35,-14 70,0" {...COSTURA} />
              <path d="M552,590 q34,-13 68,0" {...COSTURA} />
              <g className="handR">
                {/* El pulgar va ANTES del puño: así su base queda tapada y
                    parece que sale de dentro de la mano, no pegado encima. */}
                <g className="thumbR">
                  <path
                    d="M618,624 q26,-2 28,-34 l-2,-56 q-2,-19 -19,-19 q-17,0 -19,19 l-2,56 q-2,28 14,34 z"
                    {...PIEL}
                    {...LINEA}
                  />
                  <path
                    d="M620,530 q5,-15 15,-3"
                    stroke="var(--sp-piel-linea)"
                    strokeWidth={4}
                    fill="none"
                    strokeLinecap="round"
                  />
                </g>
                <path
                  d="M548,608 q38,-12 76,0 q14,4 14,26 q0,30 -20,40 q-32,14 -64,0 q-20,-10 -20,-40 q0,-22 14,-26 z"
                  {...PIEL}
                  {...LINEA}
                />
                <path d="M570,614 v42 M594,612 v46 M618,614 v42" {...DEDOS} />
              </g>
            </g>
          </g>

          {/* Hombreras: DESPUÉS de los brazos, tapan la junta del hombro */}
          <ellipse
            cx="316"
            cy="420"
            rx="58"
            ry="46"
            fill="url(#sp-salvia)"
            transform="rotate(-10 316 420)"
            {...LINEA_GRUESA}
          />
          <ellipse
            cx="302"
            cy="402"
            rx="28"
            ry="14"
            fill="var(--sp-salvia-luz)"
            opacity={0.7}
            transform="rotate(-16 302 402)"
          />
          <ellipse
            cx="564"
            cy="420"
            rx="58"
            ry="46"
            fill="url(#sp-salvia)"
            transform="rotate(10 564 420)"
            {...LINEA_GRUESA}
          />
          <ellipse
            cx="550"
            cy="402"
            rx="28"
            ry="14"
            fill="var(--sp-salvia-luz)"
            opacity={0.7}
            transform="rotate(-16 550 402)"
          />

          {/* ── Cabeza ────────────────────────────────────────────────── */}
          <g className="head">
            <ellipse cx="336" cy="242" rx="17" ry="25" {...PIEL} {...LINEA} />
            <ellipse cx="544" cy="242" rx="17" ry="25" {...PIEL} {...LINEA} />
            <path
              d="M440,78 c58,0 102,44 102,112 c0,42 -8,78 -26,104 c-18,26 -46,40 -76,40 c-30,0 -58,-14 -76,-40 c-18,-26 -26,-62 -26,-104 c0,-68 44,-112 102,-112 z"
              {...PIEL}
              {...LINEA_GRUESA}
            />
            <path
              d="M510,152 c22,26 30,66 24,104 c-6,38 -22,66 -44,80 c26,-38 34,-84 30,-120 c-3,-28 -8,-46 -10,-64 z"
              fill="var(--sp-piel-sombra)"
              opacity={0.45}
            />

            <g className="face">
              <g className="brows">
                <path
                  d="M376,196 q30,-18 60,-4"
                  stroke="var(--sp-iris)"
                  strokeWidth={13}
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M444,192 q30,-14 60,4"
                  stroke="var(--sp-iris)"
                  strokeWidth={13}
                  fill="none"
                  strokeLinecap="round"
                />
              </g>
              <g className="eyesOpen">
                <ellipse cx="404" cy="240" rx="27" ry="31" fill="#ffffff" {...LINEA} />
                <ellipse cx="476" cy="240" rx="27" ry="31" fill="#ffffff" {...LINEA} />
                <g className="pupils">
                  <circle cx="406" cy="244" r="18" fill="url(#sp-iris)" />
                  <circle cx="406" cy="246" r="9" fill="#2b1608" />
                  <circle cx="399" cy="235" r="7" fill="#ffffff" />
                  <circle cx="478" cy="244" r="18" fill="url(#sp-iris)" />
                  <circle cx="478" cy="246" r="9" fill="#2b1608" />
                  <circle cx="471" cy="235" r="7" fill="#ffffff" />
                </g>
              </g>
              <g className="eyesHappy">
                <path
                  d="M380,248 q24,-30 48,0"
                  stroke="var(--sp-contorno)"
                  strokeWidth={9}
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M452,248 q24,-30 48,0"
                  stroke="var(--sp-contorno)"
                  strokeWidth={9}
                  fill="none"
                  strokeLinecap="round"
                />
              </g>
              <path
                d="M442,262 q12,12 -2,18"
                stroke="var(--sp-piel-linea)"
                strokeWidth={6}
                fill="none"
                strokeLinecap="round"
              />
              <g className="mouthIdle">
                <path
                  d="M420,302 q22,10 42,-2"
                  stroke="var(--sp-contorno)"
                  strokeWidth={7}
                  fill="none"
                  strokeLinecap="round"
                />
              </g>
              <g className="mouthSmile">
                <path d="M404,292 q38,44 76,0 q-38,20 -76,0 z" fill="var(--sp-boca)" {...LINEA} />
                <path d="M424,314 q18,16 34,0 q-17,-8 -34,0 z" fill="var(--sp-lengua)" />
                <path
                  d="M410,294 q30,8 62,0"
                  stroke="#ffffff"
                  strokeWidth={9}
                  fill="none"
                  strokeLinecap="round"
                />
              </g>
              <g className="blush">
                <ellipse cx="376" cy="280" rx="21" ry="12" fill="var(--sp-rubor)" opacity={0.42} />
                <ellipse cx="504" cy="280" rx="21" ry="12" fill="var(--sp-rubor)" opacity={0.42} />
              </g>
            </g>

            {/*
              El pelo es UNA cúpula con el borde superior revuelto, no una
              cúpula lisa con pinchos pegados encima: sueltos se leían como
              cuernos. El borde de abajo va CURVADO hacia arriba porque recto
              tapaba las cejas.
            */}
            <g className="hair">
              <path d="M338,168 q-14,46 -6,90 q9,14 17,2 q-12,-46 -3,-92 z" {...PELO} />
              <path d="M542,168 q14,46 6,90 q-9,14 -17,2 q12,-46 3,-92 z" {...PELO} />
              <path
                d="M328,196
                   C328,124 354,70 398,56
                   C386,72 382,86 386,100
                   C404,70 436,48 472,50
                   C456,64 450,78 452,92
                   C480,64 518,60 540,82
                   C522,80 510,88 506,102
                   C536,118 552,150 552,196
                   C502,152 378,152 328,196 Z"
                {...PELO}
              />
              <path
                d="M390,100 q26,-26 60,-30"
                stroke="var(--sp-pelo-sombra)"
                strokeWidth={6}
                fill="none"
                strokeLinecap="round"
                opacity={0.5}
              />
              <path
                d="M456,94 q30,-22 54,-4"
                stroke="var(--sp-pelo-sombra)"
                strokeWidth={6}
                fill="none"
                strokeLinecap="round"
                opacity={0.42}
              />
              <path
                d="M368,150 q34,-38 90,-38 q40,0 64,22"
                stroke="var(--sp-pelo-luz)"
                strokeWidth={11}
                fill="none"
                strokeLinecap="round"
                opacity={0.55}
              />
            </g>
          </g>
        </g>

        <g className="spark">
          <path
            d="M728,318 l11,27 27,11 -27,11 -11,27 -11,-27 -27,-11 27,-11 z"
            fill="var(--sp-camisola)"
            stroke="var(--sp-contorno)"
            strokeWidth={4}
            strokeLinejoin="round"
          />
          <path
            d="M770,428 l7,18 18,7 -18,7 -7,18 -7,-18 -18,-7 18,-7 z"
            fill="var(--sp-camisola-luz)"
            stroke="var(--sp-contorno)"
            strokeWidth={3.5}
            strokeLinejoin="round"
          />
          <path
            d="M676,254 l6,15 15,6 -15,6 -6,15 -6,-15 -15,-6 15,-6 z"
            fill="var(--verde-300)"
            stroke="var(--sp-contorno)"
            strokeWidth={3}
            strokeLinejoin="round"
          />
        </g>
      </g>
    </svg>
  )
}
