/**
 * El layout del Camino del héroe: solo reparte el equipo del héroe a todas sus
 * pantallas (`EquipoDelCamino`). Persiste al ir del mapa a un mundo y a un nivel,
 * así que la tienda se pide una vez y no en cada página.
 */

import { EquipoDelCamino } from '@/src/presentation/components/Heroe/EquipoDelCamino'

export default function CaminoHeroeLayout({ children }: LayoutProps<'/CaminoHeroe'>) {
  return <EquipoDelCamino>{children}</EquipoDelCamino>
}
