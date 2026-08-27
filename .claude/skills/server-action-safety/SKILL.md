---
name: server-action-safety
description: Plantilla y comprobaciones obligatorias para escribir o revisar Server Actions y formularios en este proyecto — autenticación, verificación de propiedad del recurso, validación con Zod, idempotencia y estados de formulario con useActionState. Úsala siempre que crees un fichero con 'use server', añadas una mutación (crear/editar/borrar movimientos, categorías, presupuestos), construyas un formulario, o revises código de mutación existente.
---

# Seguridad en Server Actions

## La premisa

**Una Server Action es un endpoint POST público.** Next genera un identificador
para cada una y lo publica en el bundle del cliente. Cualquiera puede invocarla
con `curl`, con el cuerpo que quiera, sin pasar por tu formulario, sin tus
validaciones de cliente y sin tu comprobación de "el botón estaba deshabilitado".

De ahí sale todo lo demás: **cada acción se defiende sola**. No hereda seguridad
del layout que la renderizó, ni del `proxy.ts`, ni de que la ruta esté detrás de
login.

## Las cuatro comprobaciones

Toda acción, sin excepción, en este orden:

1. **Autenticar** — ¿hay sesión?
2. **Validar** — ¿la entrada tiene la forma esperada? (Zod, en el servidor)
3. **Autorizar** — ¿este usuario es dueño de este recurso concreto?
4. **Mutar y revalidar**

Saltarse el paso 3 es el fallo más común y el más grave: da una IDOR limpia
—cambiar un UUID en la petición y editar los movimientos de otra persona.

## Plantilla

```ts
// features/transactions/actions.ts
'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { db } from '@/db'
import { transactions, categories } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

const CreateTransaction = z.object({
  categoryId: z.string().uuid().nullable(),
  // Céntimos. Entero, siempre. Ver skill money-and-currency.
  amount: z.number().int().refine((n) => n !== 0, 'El importe no puede ser cero'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  description: z.string().trim().min(1).max(200),
})

export async function createTransaction(_prev: State, formData: FormData): Promise<State> {
  // 1. Autenticar
  const session = await getSession()
  if (!session?.user) return { ok: false, error: 'No autorizado' }

  // 2. Validar
  const parsed = CreateTransaction.safeParse({
    categoryId: formData.get('categoryId') || null,
    amount: parseMoney(String(formData.get('amount')))?.amount,
    date: formData.get('date'),
    description: formData.get('description'),
  })
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors }
  }

  // 3. Autorizar — TODO id que venga del cliente se comprueba contra la sesión.
  //    Aquí solo hay uno, la categoría, y es opcional; el día que haya más, se
  //    comprueban todos (ver "Comprueba todos los recursos referenciados").
  if (parsed.data.categoryId) {
    const category = await db.query.categories.findFirst({
      where: and(
        eq(categories.id, parsed.data.categoryId),
        eq(categories.userId, session.user.id),  // esta línea es la que importa
      ),
    })
    if (!category) return { ok: false, error: 'Categoría no encontrada' }
  }

  // 4. Mutar — userId del servidor, nunca del formulario
  await db.insert(transactions).values({
    ...parsed.data,
    id: crypto.randomUUID(),
    userId: session.user.id,
    createdAt: new Date(),
  })

  revalidatePath('/movimientos')
  return { ok: true }
}
```

Fíjate en que la comprobación de propiedad devuelve *"no encontrada"*, no
*"no tienes permiso"*. Distinguirlos filtra qué IDs existen.

## Reglas

### El `userId` viene de la sesión, jamás del formulario

```ts
// MAL — el atacante manda el userId que quiera
const userId = formData.get('userId')

// BIEN
const { user } = await getSession()
```

Y no lo pongas en un campo oculto del formulario "para tenerlo a mano".

### La propiedad se comprueba en el `where`, no después

```ts
// MAL — trae el recurso ajeno y luego decide
const tx = await db.query.transactions.findFirst({ where: eq(transactions.id, id) })
if (tx.userId !== session.user.id) throw new Error('...')

// BIEN — la consulta no puede devolver algo ajeno
const tx = await db.query.transactions.findFirst({
  where: and(eq(transactions.id, id), eq(transactions.userId, session.user.id)),
})
```

La segunda forma es correcta por construcción; la primera depende de que nadie
borre el `if` en un refactor.

### Comprueba todos los recursos referenciados

Cada id que llega del cliente es un id que hay que validar contra el `userId` de
la sesión, y **dentro del `where`**, no comprobando el dueño después de leer: un
`get` por id que comprueba el dueño luego ya ha leído el dato ajeno, y esa
comprobación se pierde en el primer refactor.

Hoy el formulario de movimiento solo referencia la categoría, así que es una sola
comprobación. Es justo el punto que se escapa cuando la acción crece: si mañana
un movimiento apunta a dos cosas, se validan las dos.

### Un fichero `'use server'` no mezcla lecturas

`'use server'` en la cabecera convierte **todos** los exports del fichero en
endpoints. Un helper "interno" exportado desde ahí es una API pública. Las
lecturas van en `queries.ts`, sin la directiva.

### Los errores esperados se devuelven, no se lanzan

Excepción lanzada en producción = mensaje genérico de Next y ningún detalle para
el usuario. Devuelve un objeto de estado:

```ts
type State =
  | { ok: true }
  | { ok: false; error?: string; fieldErrors?: Record<string, string[]> }
```

Lanzar queda para lo verdaderamente excepcional (base de datos caída). Y nunca
devuelvas el mensaje crudo de una excepción de base de datos: puede contener
nombres de tabla y valores.

### `redirect()` no va dentro de `try`

`redirect()` funciona lanzando una excepción de control. Dentro de un `try/catch`
la captura tu `catch` y la redirección no ocurre. Llámalo después del bloque.

## Formularios

```tsx
'use client'
import { useActionState } from 'react'
import { createTransaction } from '../actions'

export function TransactionForm() {
  const [state, formAction, isPending] = useActionState(createTransaction, { ok: true })

  return (
    <form action={formAction}>
      <input name="amount" inputMode="decimal" required />
      {state.ok === false && state.fieldErrors?.amount && (
        <p role="alert">{state.fieldErrors.amount[0]}</p>
      )}
      <button disabled={isPending}>Guardar</button>
    </form>
  )
}
```

- `inputMode="decimal"`, no `type="number"`: en móvil con teclado español la
  coma decimal se comporta mal, y `type="number"` rechaza "12,50".
- `disabled={isPending}` evita el doble clic, pero **no es la defensa real**
  contra duplicados — es una mejora de UX. Ver idempotencia.
- Los errores con `role="alert"` para que los lea un lector de pantalla.

## Idempotencia

Doble clic, reintento de red o botón de recarga pueden ejecutar la misma
mutación dos veces. En finanzas eso es un movimiento duplicado, que el usuario
ve como dinero que no existe.

Para creaciones repetibles, genera una clave en el cliente y hazla única en la
base de datos:

```tsx
<input type="hidden" name="idempotencyKey" defaultValue={useId()} />
```

Con un índice único sobre `(userId, idempotencyKey)`, el segundo envío choca
contra la restricción en lugar de duplicar. Para las importaciones el mismo
papel lo hace `importHash` → skill `bank-import-es`.

## Repaso rápido

Antes de dar por buena una acción:

- [ ] Comprueba la sesión antes de tocar nada
- [ ] Valida **toda** la entrada con Zod en el servidor
- [ ] El `userId` sale de la sesión, no de la entrada
- [ ] Cada ID recibido se filtra por `userId` dentro del `where`
- [ ] Los importes llegan como enteros en céntimos
- [ ] Los mensajes de error no distinguen "no existe" de "no es tuyo"
- [ ] Las escrituras múltiples van en una transacción
- [ ] Revalida lo que ha cambiado
- [ ] `redirect()` fuera de `try/catch`
- [ ] El fichero `'use server'` no exporta nada que no sea una acción