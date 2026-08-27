'use client'

/**
 * Selector de color de una categoría: una fila de chapas.
 *
 * Existe como componente y no como `type: 'select'` porque un desplegable con
 * los nombres de ocho colores no enseña los colores, que es lo único que
 * importa al elegir uno.
 *
 * Vive aquí y no en `src/config/categorias/sections.ts` porque esos ficheros no
 * pueden llevar JSX: la sección lo REFERENCIA con `component:` y el
 * `GenericForm` lo monta con los `FieldRenderArgs`. Ver "Cómo se declara una
 * vista" en AGENTS.md.
 *
 * Lo que se guarda es la CLAVE ('cat-3'), no el color. Ver `lib/colores.ts`.
 */

import { Input } from '@mantine/core'
import { IconCheck } from '@tabler/icons-react'
import { CLAVES_COLOR, NOMBRE_COLOR, type ClaveColor } from '@/lib/colores'
import type { FieldRenderArgs } from '@/src/presentation/components/Forms/GenericForm/types'
import styles from './SelectorColor.module.css'

export function SelectorColor({ form, values }: FieldRenderArgs) {
  const actual = String(values.color ?? '')

  // Un clic en la chapa ya elegida la desmarca: "sin color" es un estado válido
  // y tiene que poder alcanzarse sin un botón de "quitar" aparte.
  const elegir = (clave: ClaveColor) =>
    form.setFieldValue('color', actual === clave ? '' : clave)

  return (
    <Input.Wrapper
      label="Color"
      description="Con el que aparece en las listas y en los gráficos. Opcional."
    >
      <div className={styles.fila} role="radiogroup" aria-label="Color de la categoría">
        {CLAVES_COLOR.map((clave) => {
          const elegida = actual === clave
          return (
            <button
              key={clave}
              type="button"
              role="radio"
              aria-checked={elegida}
              // El nombre del color en el accesible: la chapa no dice nada a
              // quien navega con lector de pantalla.
              aria-label={NOMBRE_COLOR[clave]}
              title={NOMBRE_COLOR[clave]}
              onClick={() => elegir(clave)}
              className={elegida ? `${styles.chapa} ${styles.elegida}` : styles.chapa}
              data-color={clave}
            >
              {/* La marca, y no solo el trazo grueso: el estado elegido no puede
                  depender únicamente de un matiz de borde. */}
              {elegida && <IconCheck size={15} stroke={3} />}
            </button>
          )
        })}
      </div>
    </Input.Wrapper>
  )
}
