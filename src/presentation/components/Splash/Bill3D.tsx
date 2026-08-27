/*
 * El billete, en sus dos estados.
 *
 * A LÁPIZ: va dentro de un <svg> con el MISMO viewBox que el personaje
 * (820x700) para que escale exactamente igual y la mano caiga siempre encima,
 * pase lo que pase con el tamaño de la ventana.
 *
 * DE VERDAD: es HTML con `perspective` y `rotateY` reales, no un dibujo que
 * finge girar. Tiene tres capas de canto en `translateZ`, y son justo lo que
 * hace que la vuelta se lea como una vuelta y no como un parpadeo.
 *
 * El orden importa: este billete va DEBAJO del personaje (lo fija el módulo con
 * los `z-index`), y por eso el puño queda por delante y parece agarrado.
 */

import styles from './Splash.module.css'

export function PencilBill() {
  const lapiz = {
    fill: 'none',
    stroke: 'var(--sp-lapiz)',
    strokeWidth: 3,
    strokeLinecap: 'round',
  } as const
  const lapizClaro = {
    fill: 'none',
    stroke: 'var(--sp-lapiz-claro)',
    strokeWidth: 3,
    strokeLinecap: 'round',
  } as const

  return (
    <svg className={styles.billeteLapiz} viewBox="0 0 820 700" aria-hidden="true">
      <g transform="translate(124,274) rotate(-10)">
        {/* Del color del PAPEL, no de `--sd-surface`: tiene que tapar los
            dibujos de detrás sin dejar de parecer un dibujo él mismo. Con el
            blanco de las tarjetas se leía como una tarjeta pegada encima. */}
        <rect
          x="-100"
          y="-57"
          width="200"
          height="115"
          rx="11"
          fill="var(--sd-paper)"
          stroke="var(--sp-lapiz)"
          strokeWidth={3}
        />
        <rect
          x="-90"
          y="-45"
          width="180"
          height="90"
          rx="8"
          fill="none"
          stroke="var(--sp-lapiz-claro)"
          strokeWidth={2.4}
          strokeDasharray="8 7"
        />
        <circle cx="-42" cy="0" r="27" {...lapiz} />
        <path d="M-30,-12 q-17,-8 -25,6 q-6,11 -1,21 q7,14 26,7" {...lapiz} strokeWidth={3.4} />
        <path d="M-61,-4 h20 M-61,5 h18" {...lapiz} strokeWidth={3.4} />
        <path d="M14,-24 h66 M14,-7 h54 M14,10 h66 M14,27 h40" {...lapizClaro} />
        <path
          d="M-95,-51 l13,0 M-95,-51 l0,11 M95,51 l-13,0 M95,51 l0,-11"
          {...lapiz}
          strokeWidth={2.4}
        />
      </g>
    </svg>
  )
}

export function Bill3D() {
  return (
    <div className={styles.billeteCaja} aria-hidden="true">
      <div className={styles.billete3d}>
        <div className={`${styles.canto} ${styles.canto1}`} />
        <div className={`${styles.canto} ${styles.canto2}`} />
        <div className={`${styles.canto} ${styles.canto3}`} />
        <div className={`${styles.cara} ${styles.dorso}`}>
          <div className={styles.billeteInterior}>
            <div className={styles.sello}>€</div>
          </div>
        </div>
        <div className={styles.cara}>
          <div className={styles.billeteInterior}>
            <div className={styles.sello}>€</div>
            <div className={styles.rayas}>
              <i />
              <i />
              <i />
              <i />
            </div>
            <span className={`${styles.esquina} ${styles.esquinaTL}`}>100</span>
            <span className={`${styles.esquina} ${styles.esquinaBR}`}>100</span>
          </div>
          <div className={styles.brillo} />
        </div>
      </div>
    </div>
  )
}
