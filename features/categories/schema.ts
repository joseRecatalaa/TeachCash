import { z } from 'zod'
import { CATEGORY_KINDS } from '@/db/schema'

export const CATEGORY_KIND_LABELS: Record<(typeof CATEGORY_KINDS)[number], string> = {
  income: 'Ingreso',
  expense: 'Gasto',
}

export const CreateCategory = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(40, 'Máximo 40 caracteres'),
  // Una categoría es de ingreso o de gasto, nunca las dos: es lo que permite
  // filtrar el selector según el signo del importe.
  kind: z.enum(CATEGORY_KINDS, { message: 'Tipo no válido' }),
  parentId: z.string().min(1).nullable(),
  icon: z.string().trim().max(8).nullable(),
})

export const UpdateCategory = CreateCategory.omit({ kind: true }).extend({
  id: z.string().min(1),
})

export type CreateCategoryInput = z.infer<typeof CreateCategory>
export type UpdateCategoryInput = z.infer<typeof UpdateCategory>
