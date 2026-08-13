---
name: testing-finance
description: Estrategia y convenciones de test del gestor de finanzas — qué se testea de forma exhaustiva (aritmética de dinero, agregaciones, parsers de extracto, autorización de Server Actions) y qué no merece test. Incluye tests basados en propiedades para invariantes de dinero y los casos límite concretos que hay que cubrir. Úsala al escribir tests, al montar el runner, o al decidir si un cambio necesita cobertura.
---

# Tests

## Dónde ponerlos

La cobertura uniforme es un desperdicio. En esta aplicación el riesgo está muy
concentrado:

| Zona | Cobertura | Por qué |
|---|---|---|
| `lib/money.ts` | Exhaustiva, con propiedades | Un fallo aquí corrompe todos los datos |
| Agregaciones (`queries.ts`) | Alta | Errores silenciosos: el número sale, pero mal |
| Parsers de extracto | Alta, con ficheros reales | Entrada hostil e impredecible |
| Autorización de acciones | Alta | Un fallo expone datos de otro usuario |
| Fechas y periodos | Alta | Los bugs de zona horaria no se ven en el mes actual |
| Componentes de UI | Baja | Cambian mucho, fallan de forma visible |
| Estilos, layout | Ninguna | |

El criterio: **testea lo que falla en silencio.** Un botón desalineado se ve. Un
total mal calculado, no.

## Herramientas

- **Vitest** para `lib/`, parsers y agregaciones.
- **fast-check** para propiedades sobre aritmética de dinero.
- **Playwright** para tres o cuatro flujos completos, no más.
- Base de datos de test: SQLite en memoria, recreada por fichero de test. Nada
  de mockear el ORM — los bugs de agregación viven justo en el SQL que el mock
  no ejecuta.

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
{ "scripts": { "test:tz": "TZ=Pacific/Kiritimati vitest run" } }
```

Si los tests pasan en `Europe/Madrid` pero fallan en UTC+14, hay un `Date` donde
debería haber una fecha civil. → skill `finance-data-model`

**Transferencias**
- No aparecen en gasto por categoría
- Sí afectan al saldo de ambas cuentas
- Las dos patas suman cero (misma divisa)
- Borrar una pata no deja la otra huérfana

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
  const txA = await seedTransaction({ userId: 'user-a' })
  mockSession('user-b')

  const result = await updateTransaction(emptyState, formDataFor(txA.id, { amount: 100 }))

  expect(result.ok).toBe(false)
  const unchanged = await db.query.transactions.findFirst({ where: eq(transactions.id, txA.id) })
  expect(unchanged!.amount).toBe(txA.amount)   // comprobar el dato, no solo la respuesta
})
```

Comprobar solo que la respuesta es un error no basta: una acción puede devolver
error **después** de haber escrito. Verifica el estado de la base de datos.

Cubre también: pasar un `accountId` ajeno al crear, un `categoryId` ajeno, y una
transferencia con una cuenta propia y otra ajena.

## Parsers de extracto

Guarda ficheros reales **anonimizados** en `fixtures/`: cambia nombres, números
de cuenta e importes, pero **preserva la estructura, la codificación y los
finales de línea**. Un fixture reguardado como UTF-8 con `\n` deja de probar el
bug de Windows-1252 con `\r\n` que tenías.

Por cada banco soportado:
- Importar el fichero produce el número de movimientos esperado
- Los totales cuadran con el saldo declarado
- **Reimportar el mismo fichero crea cero movimientos**
- Un fichero truncado a la mitad no importa nada (transacción)
- Tildes y "ñ" llegan intactas

## Flujos end-to-end

Cuatro, y bien elegidos. Cada uno cuesta mantenimiento:

1. Crear cuenta → añadir movimiento → el saldo refleja el cambio
2. Transferencia entre cuentas → ambos saldos correctos → no sale como gasto
3. Importar extracto → previsualizar → confirmar → reimportar no duplica
4. Crear presupuesto → gastar por encima → se ve el exceso

No hagas e2e de validación de formularios: eso es un test unitario del esquema
Zod, y en Playwright cuesta cien veces más.

## Al arreglar un bug

Escribe primero el test que lo reproduce, comprueba que falla, luego arregla.
Con bugs de dinero es la única forma de saber que has entendido el fallo: es
fácil "arreglar" un descuadre de un céntimo moviéndolo a otro sitio.