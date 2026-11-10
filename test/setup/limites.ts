/**
 * Cada test empieza con los límites de peticiones a cero (`lib/limite.ts`).
 *
 * Viven en memoria del proceso, y un fichero de test llama a las acciones
 * cientos de veces con el mismo usuario: sin esto, un test fallaría con
 * "Demasiadas peticiones" según cuántos se hubieran ejecutado antes que él.
 */

import { beforeEach } from 'vitest'
import { reiniciarLimites } from '@/lib/limite'

beforeEach(() => reiniciarLimites())
