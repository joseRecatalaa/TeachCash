import { requireUserId } from '@/lib/auth'
import { Card, CardTitle, EmptyState, PageHeader } from '@/components/ui'
import { ActionButton } from '@/components/ui/action-button'
import { listCategories } from '@/features/categories/queries'
import { createCategory, deleteCategory } from '@/features/categories/actions'
import { CategoryForm } from '@/features/categories/components/category-form'

export default async function CategoriasPage() {
  const userId = await requireUserId()
  const categories = await listCategories(userId)

  const roots = categories.filter((c) => c.parentId === null)
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id)

  const groups = [
    { kind: 'expense' as const, title: 'Gastos' },
    { kind: 'income' as const, title: 'Ingresos' },
  ]

  return (
    <>
      <PageHeader
        title="Categorías"
        description="Una categoría es de gasto o de ingreso, nunca las dos."
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          {categories.length === 0 && (
            <EmptyState title="No hay categorías">
              Ejecuta <code>pnpm db:seed</code> para cargar el catálogo por defecto, o crea
              las tuyas.
            </EmptyState>
          )}

          {groups.map((group) => {
            const items = roots.filter((c) => c.kind === group.kind)
            if (items.length === 0) return null

            return (
              <Card key={group.kind}>
                <CardTitle>{group.title}</CardTitle>
                <ul className="mt-3 flex flex-col gap-1">
                  {items.map((cat) => (
                    <li key={cat.id}>
                      <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
                        <span>
                          {cat.icon && <span aria-hidden>{cat.icon} </span>}
                          {cat.name}
                        </span>
                        <ActionButton
                          action={deleteCategory}
                          fields={{ id: cat.id }}
                          variant="danger"
                          confirm={`¿Eliminar la categoría "${cat.name}"?`}
                        >
                          Eliminar
                        </ActionButton>
                      </div>
                      {childrenOf(cat.id).length > 0 && (
                        <ul className="ml-6 flex flex-col gap-1 border-l border-border pl-3">
                          {childrenOf(cat.id).map((child) => (
                            <li
                              key={child.id}
                              className="flex items-center justify-between gap-4 py-1 text-sm text-muted"
                            >
                              <span>
                                {child.icon && <span aria-hidden>{child.icon} </span>}
                                {child.name}
                              </span>
                              <ActionButton
                                action={deleteCategory}
                                fields={{ id: child.id }}
                                variant="danger"
                                confirm={`¿Eliminar la categoría "${child.name}"?`}
                              >
                                Eliminar
                              </ActionButton>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            )
          })}
        </div>

        <Card className="h-fit">
          <CardTitle>Nueva categoría</CardTitle>
          <div className="mt-4">
            <CategoryForm
              action={createCategory}
              parents={roots.map((c) => ({ id: c.id, name: c.name, kind: c.kind }))}
            />
          </div>
        </Card>
      </div>
    </>
  )
}
