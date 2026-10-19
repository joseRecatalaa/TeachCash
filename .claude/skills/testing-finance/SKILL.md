---
name: testing-finance
description: Estrategia y convenciones de test del gestor de finanzas — qué se testea de forma exhaustiva (aritmética de dinero, agregaciones, parsers de extracto, autorización de Server Actions) y qué no merece test. Incluye tests basados en propiedades para invariantes de dinero y los casos límite concretos que hay que cubrir. Úsala al escribir tests, al montar el runner, o al decidir si un cambio necesita cobertura.
---

# Tests

Esta skill dice QUÉ testear y con qué criterio. CÓMO está montado todo (PGlite,
mocks, Testing Library, Playwright, coverage, CI), qué fichero cubre qué y las
trampas conocidas están en **`docs/TESTS.md`**: léelo antes de escribir un test.

## Dónde ponerlos

La cobertura uniforme es un desperdicio. En esta aplicación el riesgo está muy
concentrado:

| Zona | Cobertura | Por qué |
|---|---|---|
| `lib/money.ts` | Exhaustiva, con propiedades | Un fallo aquí corrompe todos los datos |
| Agregaciones (`informes.repository.ts`) | Alta | Errores silenciosos: el número sale, pero mal |
| Parsers de extracto | Alta, con ficheros reales | Entrada hostil e impredecible |
| Autorización de acciones | Alta | Un fallo expone datos de otro usuario |
| Fechas y periodos | Alta | Los bugs de zona horaria no se ven en el mes actual |
| Formularios y tablas genéricos (`GenericForm`, `AppTable`, `MoneyInput`) | Media (80 %) | Los usa toda la app: un fallo aquí es un importe mal leído o un filtro que no filtra |
| Componentes de una sola vista | Baja | Cambian mucho, fallan de forma visible |
| Estilos, layout | Ninguna | |

El criterio: **testea lo que falla en silencio.** Un botón desalineado se ve. Un
total mal calculado, no.

## Herramientas

- **Vitest** para `lib/`, parsers y agregaciones.
- **fast-check** para propiedades sobre aritmética de dinero.
- **Testing Library** (`*.test.tsx`, jsdom) para componentes y hooks, por rol y
  nombre accesible y con `userEvent`. Los hooks, sobre Refine real
  (`test/refine.tsx`).
- **Playwright** (`e2e/`) para tres o cuatro flujos completos, no más, contra el
  build de producción y un Supabase de PRUEBAS (`teachcash-e2e`), nunca el de
  desarrollo.
- Base de datos de test: **Postgres real sobre PGlite** (el mismo motor en
  WASM, en proceso), con las migraciones reales y una base nueva por test
  (`createTestDb()` de `db/testing.ts`). Nunca contra Supabase. Nada de mockear
  el ORM — los bugs de agregación viven justo en el SQL que el mock no ejecuta,
  y los de dialecto (`like` que distingue mayúsculas, `sum` que vuelve como
  texto) solo los caza el mismo motor que hay en producción.
- `db/testing.ts` monta antes de migrar un **stub del esquema `auth`** de
  Supabase: `auth.users`, `auth.uid()` (lee `request.jwt.claim.sub`) y los
  roles `anon` y `authenticated`. Si una migración nueva usa algo más de
  `auth`, se añade ahí.
- Usuarios: `USER_A` y `USER_B` ya existen en `auth.users` (los datos tienen
  clave ajena ahí). Otro, con `crearUsuario(pg, id, { anonimo, email })`.
- Lo que se mockea: de dónde sale la conexión (`@/db`) y la sesión
  (`@/lib/auth`, `getSession`). Las semillas, en
  `src/infrastructure/repositories/__tests__/helpers.ts`.

## Propiedades del dinero

Los ejemplos concretos cubren lo que ya se te ocurrió. Las propiedades cubren lo
que no.

```ts
import fc from 'fast-check'
import { money, add, sub, allocate, sum, formatMoney, parseMoney } from '@/lib/money'

const anyCents = fc.integer({ min: -1_000_000_00, max: 1_000_000_00 })

test('el reparto conserva el total exactamente', () => {
  fc.assert(fc.property(
    anyCents.filter((n) => n > 0),
    fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 20 }),
    (total, weights) => {
      const parts = allocate(money(total), weights)
      expect(sum(parts).amount).toBe(total)   // ni un céntimo perdido
    },
  ))
})

test('formatear y parsear es una ida y vuelta fiel', () => {
  fc.assert(fc.property(anyCents, (cents) => {
    expect(parseMoney(formatMoney(money(cents)))?.amount).toBe(cents)
  }))
})

test('sumar y restar el mismo importe deja el original', () => {
  fc.assert(fc.property(anyCents, anyCents, (a, b) => {
    expect(sub(add(money(a), money(b)), money(b)).amount).toBe(a)
  }))
})
```

La ida y vuelta de formateo es la que más bugs reales encuentra: rompe con el
separador de miles, con negativos, con el espacio antes del `€` (que en es-ES es
un espacio *no separable*, ` `, no un espacio normal — si tu `parseMoney`
solo limpia `\s` con `trim()`, cuidado).

## Casos límite obligatorios

**Dinero**
- Cero, y `-0` (`Object.is(-0, 0)` es `false`; puede colarse por un `Math.round`)
- Importe negativo con redondeo (`Math.round(-0.5)` no es simétrico)
- Reparto entre 3, entre 7, y con un peso de 0
- Suma de lista vacía
- Divisas distintas → tiene que lanzar

**Fechas y periodos**
- Día 31 en un mes de 30
- 29 de febrero
- Movimiento del día 1 y del último día del mes: deben caer en su mes
- **Cambio de hora** (último domingo de marzo y de octubre): un movimiento del
  día del cambio no puede saltar de día
- Un usuario en zona horaria distinta de la del servidor

Este último es el que se escapa siempre. Ejecuta la suite con `TZ` forzado:

```json
{ "scripts": { "test:tz": "cross-env TZ=Pacific/Kiritimati vitest run" } }
```

Si los tests pasan en `Europe/Madrid` pero fallan en UTC+14, hay un `Date` donde
debería haber una fecha civil. → skill `finance-data-model`

**El saldo, que es DERIVADO**
- Es la suma de los movimientos que quedan: borrar uno (borrado físico, sin
  papelera) lo saca del saldo para siempre
- `getSaldoActual` y el último punto de `getSerieSaldo` dan la MISMA cifra. Dos
  caminos distintos hasta el mismo número es lo que prueba que nadie ha
  materializado un saldo por su cuenta (regla dura 7)

**Presupuestos**
- Gasto exactamente igual al límite (¿100% o superado?)
- Superado: el porcentaje pasa de 100 y se muestra
- Categoría sin presupuesto ≠ presupuesto de cero
- Categoría con hijas

## Autorización

Por cada Server Action, un test que confirme que el usuario B no puede tocar los
datos del usuario A:

```ts
test('no se puede editar el movimiento de otro usuario', async () => {
  await seedMovimiento(h.db, 'tx-a', USER_A, { amount: -500 })
  h.userId = USER_B                    // lo que devuelve el getSession mockeado

  const result = await updateEntity('Movimientos', 'tx-a', { amount: -100, … })

  expect(result.ok).toBe(false)
  const [fila] = await h.db.select().from(transactions).where(eq(transactions.id, 'tx-a'))
  expect(fila.amount).toBe(-500)       // comprobar el dato, no solo la respuesta
})
```

Comprobar solo que la respuesta es un error no basta: una acción puede devolver
error **después** de haber escrito. Verifica el estado de la base de datos.

Cubre también: pasar un `categoryId` ajeno al crear, y una categoría de ingreso
en un movimiento de gasto — que el repositorio rechaza porque descolocaría todos
los informes.

### Sesión y base

- **`getSession`** (`lib/__tests__/auth.test.ts`): el `userId` sale solo del
  `sub` de `getClaims()`; sin claims o con error, `null`. Nunca de
  `auth.getSession()`.
- **Acciones de auth** (`auth.actions.test.ts`): sin token de Turnstile no se
  llama a Supabase; crear cuenta siendo invitado conserva el mismo usuario; los
  mensajes no revelan si un email existe; los errores de Supabase no se filtran
  crudos al cliente.
- **`rutaInterna`** (`lib/__tests__/rutas.test.ts`): ninguna redirección sale
  del sitio (`//evil.com`, `https://…`, `/\evil.com`).
- **En la base** (`db/__tests__/schema.test.ts`): RLS con el rol
  `authenticated` y `request.jwt.claim.sub` fijado con `set_config` no deja ver
  ni escribir lo ajeno, y borrar de `auth.users` se lleva sus datos en cascada.
  Toda tabla nueva de datos de usuario entra en estos dos tests.

## Parsers de extracto

Guarda ficheros reales **anonimizados** en `fixtures/`: cambia nombres, números
de cuenta bancaria e importes, pero **preserva la estructura, la codificación y los
finales de línea**. Un fixture reguardado como UTF-8 con `\n` deja de probar el
bug de Windows-1252 con `\r\n` que tenías.

Por cada banco soportado:
- Importar el fichero produce el número de movimientos esperado
- Los totales cuadran con el saldo declarado
- **Reimportar el mismo fichero crea cero movimientos**
- Un fichero truncado a la mitad no importa nada (transacción)
- Tildes y "ñ" llegan intactas

## Flujos end-to-end

Pocos, y bien elegidos. Cada uno cuesta mantenimiento. Los que hay
(`e2e/*.spec.ts`):

1. Anotar un gasto → el saldo de la portada refleja el cambio, sin recargar
2. Borrarlo → el saldo vuelve atrás (el borrado es físico: no hay papelera ni
   "restaurar")
3. Crear una categoría → anotar en ella → aparece al filtrar por ella
4. Las tres tipografías llegan de verdad a la página (solo un navegador lo ve)

Cuando existan las funcionalidades, los siguientes candidatos son:

- Importar extracto → previsualizar → confirmar → reimportar no duplica
- Crear presupuesto → gastar por encima → se ve el exceso

Navega por el MENÚ, no con `page.goto`: una recarga tira la caché de React Query
y taparía justo lo que hay que probar, que cada mutación invalida `['informes']`.

No hagas e2e de validación de formularios: eso es un test unitario del esquema
Zod, y en Playwright cuesta cien veces más.

## Al arreglar un bug

Escribe primero el test que lo reproduce, comprueba que falla, luego arregla.
Con bugs de dinero es la única forma de saber que has entendido el fallo: es
fácil "arreglar" un descuadre de un céntimo moviéndolo a otro sitio.