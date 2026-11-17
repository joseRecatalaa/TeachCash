'use client'

/*
 * El héroe del Camino, con lo que lleva equipado.
 *
 * El equipo llega por contexto (`EquipoContext`), que llena `EquipoDelCamino`
 * desde el layout del módulo: lo pintan el mapa, el camino, la ficha de un
 * nivel, el jefe, el resultado y el que acompaña en la lectura, y pasarlo de
 * mano en mano atravesaría media aplicación.
 *
 * Este fichero no sabe de dónde sale el equipo, a propósito: así los componentes
 * del Camino no arrastran la consulta de la tienda (ni sus Server Actions) y se
 * montan solos en sus tests. Sin proveedor, el héroe sale sin equipo: es
 * decorado, y no merece un error. Por eso el valor por defecto es "nada puesto".
 */

import { createContext, useContext, type ComponentProps } from 'react'
import { PixelHero } from '../Pixel/PixelHero'

export const SIN_EQUIPO: readonly string[] = []

export const EquipoContext = createContext<readonly string[]>(SIN_EQUIPO)

/** `PixelHero` con el equipo de quien juega. La pantalla de carga usa `PixelHero` a secas. */
export function HeroeCamino(props: Omit<ComponentProps<typeof PixelHero>, 'equipo'>) {
  return <PixelHero {...props} equipo={useContext(EquipoContext)} />
}
