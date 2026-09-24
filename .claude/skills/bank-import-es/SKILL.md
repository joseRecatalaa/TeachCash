---
name: bank-import-es
description: Importación de extractos bancarios españoles a la aplicación — CSV de banca online, Norma 43 (Cuaderno 43 AEB/CECA), deduplicación, normalización de conceptos y reglas de categorización automática. Úsala al construir o modificar el flujo de importación, escribir un parser de extractos, decidir cómo detectar movimientos duplicados, o implementar la categorización automática de movimientos importados.
---

# Importación de extractos

> **Ojo con el destino.** Esta skill se escribió cuando la aplicación tenía
> cuentas, y da por hecho que un extracto se importa *a una cuenta*. Ya no las
> hay: hay una sola cuenta implícita, así que un extracto importado se convierte
> en movimientos y punto. Todo lo demás de aquí —el parseo, la Norma 43, la
> deduplicación por `import_hash`, la normalización de conceptos y las reglas de
> categorización— sigue valiendo tal cual. Cuando el fichero traiga cabecera de
> cuenta (registro `11` de la Norma 43), su número de cuenta es metadato del
> extracto, no una entidad de la aplicación.
>
> La columna `import_hash` y su índice único siguen en `transactions`; el parser
> es lo que no está escrito. → "Decisiones abiertas" en `AGENTS.md`

## El flujo

```
Fichero → Parseo → Normalización → Deduplicación → Previsualización → Confirmación
```

**La previsualización no es opcional.** Ningún extracto se escribe directamente
en la base de datos. El usuario ve qué se va a crear, qué se va a saltar por
duplicado y con qué categoría, y confirma. Un import mal parseado que entra sin
revisión ensucia el histórico de forma que cuesta más deshacer que rehacer.

## Parseo

### CSV de banca online

No existe un formato estándar. Cada banco exporta lo suyo, y lo cambia sin
avisar. Asume lo peor:

- **Codificación**: muchos bancos españoles exportan en **Windows-1252 / ISO-8859-1**, no UTF-8. Sin detectarlo, las tildes y las "ñ" llegan rotas. Comprueba el BOM y, si no hay, prueba UTF-8 y cae a `latin1` si aparecen caracteres de reemplazo.
- **Separador**: `;` es lo habitual en España (porque la coma es el decimal). Detéctalo contando ocurrencias en la cabecera.
- **Cabeceras**: pueden empezar en la fila 5, tras filas de metadatos del banco. Busca la fila que contenga algo parecido a "fecha" e "importe" en lugar de asumir la primera.
- **Importes**: formato español `1.234,56`, a veces con `€` pegado, a veces con el signo detrás. → `parseMoney()` de la skill `money-and-currency`.
- **Fechas**: `DD/MM/AAAA` o `DD-MM-AA`. **Nunca las pases a `new Date(string)`**: interpreta formatos ambiguos como americanos y el 3 de abril se convierte en el 4 de marzo. Parsea los campos a mano.
- **Signo**: unos bancos usan una columna `importe` con signo; otros dos columnas separadas de debe y haber. Detecta cuál es antes de mapear.

Haz el parser **por perfil de banco**, con detección automática y opción de que
el usuario elija el mapeo de columnas a mano cuando falle:

```ts
type BankProfile = {
  id: string
  detect: (headers: string[]) => boolean
  map: (row: string[]) => RawMovement
}
```

### Norma 43 (Cuaderno 43)

Formato interbancario español de fichero de texto plano, registros de **80
caracteres** de ancho fijo, identificados por los dos primeros dígitos:

| Código | Registro |
|---|---|
| `11` | Cabecera de cuenta (entidad, oficina, cuenta, fechas, saldo inicial, divisa) |
| `22` | Movimiento |
| `23` | Complementario de concepto (hasta 5 por movimiento, texto libre) |
| `24` | Complementario de información de equivalencia de divisa |
| `33` | Fin de cuenta (saldo final y totales de debe/haber) |
| `88` | Fin de fichero (número total de registros) |

Tres cosas que hay que entender del formato:

1. **Los importes ya son enteros con 2 decimales implícitos.** El campo no lleva
   coma: `00000000123456` son 1.234,56 €. Es decir, **el fichero da céntimos
   directamente** — encaja con el modelo de la aplicación sin conversión. No lo
   pases por un `parseFloat` "para normalizar".
2. **El signo va en un campo aparte** (indicador debe/haber), no en el importe.
   Debe = salida = negativo en nuestro modelo; haber = entrada = positivo.
3. **Las fechas son `AAMMDD`**, con año de dos dígitos. Hay que inferir el
   siglo. Regla práctica: si el año resultante queda en el futuro respecto a la
   fecha del fichero, es del siglo anterior.

Los registros `23` llevan el concepto legible y **hay que concatenarlos al
movimiento `22` anterior**; si los ignoras, la descripción queda en un código de
tres cifras que no dice nada.

> **Verifica los desplazamientos de campo contra la especificación oficial del
> Cuaderno 43 y contra un fichero real antes de dar el parser por bueno.** Las
> posiciones exactas dentro de cada registro varían en algunos campos según la
> entidad, y un parser con un offset desplazado produce importes plausibles pero
> equivocados — el peor tipo de fallo, porque no revienta.

Los registros `33` y `88` son tu comprobación de integridad: **el saldo final
declarado tiene que coincidir con el saldo inicial más la suma de movimientos**.
Si no cuadra, el parser está mal. Falla ruidosamente, no importes.

## Normalización

Los conceptos bancarios vienen sucios. Antes de comparar o categorizar:

```ts
export function normalizeDescription(raw: string): string {
  return raw
    .normalize('NFKD').replace(/\p{Diacritic}/gu, '')  // sin tildes
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/\b\d{4,}\b/g, '')          // números de tarjeta, referencias
    .replace(/\b\d{2}\/\d{2}\b/g, '')    // fechas embebidas
    .replace(/^(COMPRA|PAGO|RECIBO|TRANSFERENCIA|BIZUM)\s+/, '')
    .trim()
}
```

**Guarda siempre el texto original** además del normalizado. El normalizado es
para casar reglas; el original es lo que el usuario reconoce cuando revisa.

## Deduplicación

El usuario reimportará el mismo mes dos veces. Es cuestión de tiempo.

```ts
const importHash = (m: RawMovement, accountId: string) =>
  sha256([accountId, m.date, m.amount, normalizeDescription(m.description)].join('|'))
```

Almacenado en `transactions.importHash` con índice único sobre
`(userId, importHash)` → el segundo import choca contra la restricción en lugar
de duplicar. Ver skill `finance-data-model`.

**El caso que rompe el hash:** dos movimientos legítimamente idénticos el mismo
día — dos cafés de 1,50 € en el mismo sitio. El hash los declara duplicados y se
pierde uno.

Solución: añade un discriminador de ocurrencia. Dentro de un mismo fichero,
numera las repeticiones de una misma clave (`...|0`, `...|1`) y mételo en el
hash. Así dos cafés idénticos generan hashes distintos, pero reimportar el mismo
fichero vuelve a generar la misma numeración y sigue deduplicando.

Si el fichero trae referencia única del banco, úsala en lugar de todo esto: es
más fiable que cualquier heurística.

**Movimientos pendientes**: algunos bancos exportan operaciones no liquidadas
que luego cambian de fecha o importe al consolidarse. Llegan como duplicado que
el hash no detecta. Si el formato marca el estado, no importes los pendientes.

## Categorización automática

Reglas del usuario, en orden de prioridad, primera que casa gana:

```ts
type CategoryRule = {
  id: string
  userId: string
  priority: number
  /** Se compara contra la descripción normalizada. */
  match: { type: 'contains' | 'startsWith' | 'regex'; value: string }
  /** Opcional: acota por rango de importe (en céntimos). */
  amountMin?: number
  amountMax?: number
  categoryId: string
}
```

- **Categoriza en la previsualización, no al escribir.** El usuario tiene que
  poder corregir antes de confirmar.
- **Sin coincidencia → queda por elegir, no se importa sola.** `categoryId` es
  `NOT NULL` (no existe el movimiento sin clasificar): la fila sin regla que la
  casque se queda pendiente en la previsualización hasta que el usuario le pone
  una categoría, y nunca cae a "Otros" por defecto — una categoría "Otros" que
  se llena sola es una categoría que el usuario deja de mirar.
- Ofrece **crear la regla desde la corrección**: si el usuario recategoriza
  "MERCADONA" a Supermercado, propón la regla. Es como se construye un
  clasificador útil sin pedirle que configure nada por adelantado.
- Las reglas de regex las escribe el usuario: compílalas con un límite de
  longitud y captúralas en `try/catch`. Una regex mal formada no puede tumbar la
  importación.
- **Nunca sobrescribas una categoría puesta a mano** al reimportar.

## Errores frecuentes

| Síntoma | Causa |
|---|---|
| Tildes rotas (`Nómina` → `NÃ³mina`) | Fichero en Windows-1252 leído como UTF-8 |
| Fechas desplazadas un mes | `new Date("03/04/2025")` interpretado en formato americano |
| Todos los movimientos positivos | Ignorado el indicador debe/haber de N43 |
| Importes ×100 o ÷100 | Doble conversión: N43 ya viene en céntimos |
| Movimientos legítimos descartados | Hash sin discriminador de ocurrencia |
| Import duplicado completo | Falta el índice único sobre `(userId, importHash)` |
| Descripciones que son códigos | Registros `23` de N43 no concatenados |

## Antes de dar por bueno un parser

- [ ] Probado con un fichero real de cada banco soportado
- [ ] Los totales cuadran con el saldo declarado en el extracto
- [ ] Reimportar el mismo fichero crea **cero** movimientos nuevos
- [ ] Un fichero vacío o truncado da un error claro, no una importación parcial
- [ ] La escritura va en una transacción: o entra todo, o no entra nada
- [ ] El fichero original no se guarda con datos que no hagan falta