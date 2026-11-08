# Contenido del Camino del héroe

Cómo se escribe un mundo o un nivel nuevo. El plan del módulo está en
`docs/plans/CAMINO_HEROE.md`; esto es solo el contenido.

**Añadir un curso es añadir un fichero JSON, sin tocar código.** El contenido
vive en `content/heroe/`, lo lee `src/infrastructure/heroe/contenido.ts` y su
formato lo fijan los esquemas Zod de `src/types/heroe.types.ts`, que son la
referencia exacta. Si dudas de un campo, mira allí.

El módulo lleva un aviso fijo: **"Contenido educativo, no asesoramiento
financiero"**. Ningún texto recomienda un producto, un banco ni un fondo
concretos.

## El flujo en tres pasos

1. **Investigar.** Se lanza el prompt del mundo (abajo) en **Gemini Deep
   Research**. Sale un informe con un temario de 8–10 niveles y fuentes.
2. **Convertir.** El informe se le pasa a Claude con el prompt de conversión.
   Sale un JSON por nivel. `pnpm heroe:validar` comprueba que todo cumple el
   formato y las reglas.
3. **Revisar.** Una persona lee los textos: cifras, leyes, tono y que cada
   pregunta tenga UNA respuesta buena sin trampa. Nada se publica sin esta
   lectura.

Los prompts que se usaron de verdad, ya rellenados por mundo, están en
`docs/plans/prompt-cursos.txt` (y el de la conversión de los cuatro mundos a la vez,
en `docs/plans/prompt-primeros-cursos.txt`). Los informes de investigación y la lista
de cifras comprobadas, con su estado y su fuente, están en
`docs/investigación-heroe/` (`revision-cifras.md`). Los informes son un
borrador: una cifra no es cierta porque salga ahí.

## Dónde va cada cosa

```
content/heroe/
  <mundo>/
    mundo.json             ← el mundo y el orden de sus niveles
    01-<nivel>.json        ← un nivel por fichero
    …
    09-jefe-<nombre>.json  ← el último, siempre el jefe
```

- El id de un mundo es el nombre de su carpeta; el de un nivel,
  `<mundo>/<fichero sin .json>`. Solo minúsculas, cifras y guiones. **No se
  cambian una vez publicados**: el progreso de la gente se guarda con ese id.
- `mundo.json` lista los niveles en el orden en que se juegan. Un fichero que
  no esté en la lista, o una entrada sin fichero, es un error.
- Estructura sugerida por mundo, 9 niveles: lectura, interactivo, lectura,
  interactivo, lectura, interactivo, lectura, interactivo y **jefe**.

### Los mundos

| Mundo | Carpeta | `decorado` | `orden` |
|---|---|---|---|
| Salud financiera | `salud` | `escudo` | 1 |
| Ahorro | `ahorro` | `hucha` | 2 |
| Inversión | `inversion` | `montana` | 3 |
| Deuda y crédito | `deuda` | `tarjeta` | 4 |

`decorado` decide el dibujo del mundo en el mapa y su color. Los mundos están
libres: `orden` es la posición en el mapa, no un orden de desbloqueo.

## Los tres tipos de nivel

Todo nivel lleva `id`, `tipo`, `titulo`, `descripcion` (la ficha del camino) y
`minutos` (lo que se tarda, de 1 a 15).

| Tipo | Lleva | Para superarlo |
|---|---|---|
| `lectura` | `paginas` (1–8) y `minitest` (3–5 preguntas) | 60 % del minitest |
| `interactivo` | `ejercicios` (3–12). **Sin minitest**: ya hace de test | 60 % |
| `jefe` | `preguntas` (8–12) y `aprobado` (50–100, en %) | Su `aprobado` |

El jefe de los cuatro mundos lleva **12 preguntas** (el máximo) de todo el
mundo, con los seis tipos, y `"aprobado": 70`.

**Estrellas**: 3 si es perfecto, 2 si llega al 80 %, 1 si se supera. Se puede
repetir y cuenta la mejor marca.

### Las páginas de una lectura

Cada página tiene un `titulo` y de 1 a 6 `bloques`. **Ningún título lleva
emoticonos** (ni el de una página, ni el de un nivel, ni el de un ejemplo, ni
el de un mundo): se comen el estilo del titular y el lector de pantalla lee su
nombre entero antes que el título. El validador los rechaza. En el texto, sí. Un curso de 2 minutos son
unas 4 páginas.

| Bloque | Campos | Para qué |
|---|---|---|
| `parrafo` | `texto` | El texto corrido. Frases cortas |
| `idea` | `texto` | La idea que hay que llevarse. Una por página como mucho |
| `dato` | `texto`, `fuente` (**obligatoria**) | El gancho de la lectura: un dato llamativo. Se pinta como "¿Sabías que…?" con la fuente debajo. Un dato sin fuente no pasa el validador |
| `ejemplo` | `titulo`, `filas` (`concepto`, `importe`), `nota` opcional | Un caso con cifras |
| `lista` | `items` (2–8) | Pasos o consejos |
| `imagen` | `sprite`, `pie` opcional | Un dibujo a píxel de los que ya tiene la app (abajo). El `pie` es lo que oye quien usa lector de pantalla: sin pie, el dibujo es decoración |

**Los importes van en céntimos y con signo**: 650 € de gasto es `-65000`.
Nunca un decimal.

**Sprites de `imagen`**: `hucha`, `cerdito`, `escudo`, `montana`, `tarjeta`,
`libro`, `mando`, `monstruo`, `candado`, `estrella`, `billete`, `nube`,
`pino` y `destello`. Son los dibujos de la propia aplicación y no ficheros de
imagen: no pesan, siguen el modo oscuro y no hay que tocar la CSP. Uno nuevo
se dibuja en `components/Pixel/sprites.ts` y se añade a `SPRITES_IMAGEN`.

### Negrita y cursiva

`**negrita**` y `_cursiva_` funcionan en los textos de `parrafo`, `idea`,
`dato`, los `items` de `lista`, el `titulo` y la `nota` de `ejemplo`, y en el
`enunciado` y la `explicacion` de las preguntas. Se pueden anidar
(`**muy _importante_**`).

- La marca va **pegada** a lo que marca: `**así**`. Por eso `3 * 4` o
  `2 ** 3` con espacios son texto normal, igual que un `_` dentro de una
  palabra (`mi_cuenta`) o el `___` de un hueco.
- **Una marca sin cerrar no pasa** `pnpm heroe:validar`, y el error dice el
  campo: `minitest.2.explicacion: Hay una negrita (**) sin cerrar`.
- En un `hueco`, una marca no puede cruzar el `___`: la frase se pinta en dos
  mitades.
- No se usan en `opciones`, `pasos`, `pares` ni el `pie` de una imagen: ahí
  el texto va tal cual.

### Las preguntas

Seis tipos. Todas llevan `id` (único en el nivel), `enunciado` y
**`explicacion`**: se enseña al fallar y es lo que de verdad enseña, así que
explica el porqué, no repite la respuesta.

| Tipo | Campos | La respuesta buena |
|---|---|---|
| `opcion` | `opciones` (2–5), `correcta` (índice desde 0) | Una sola |
| `verdaderoFalso` | `correcta` (`true`/`false`) | |
| `ordenar` | `pasos` (3–6) | **Se escriben en el orden bueno**; la app los baraja |
| `emparejar` | `pares` (3–5) de `concepto` y `definicion` | Cada concepto con **su** definición; la app las baraja |
| `hueco` | `enunciado` con UN `___`, `opciones`, `correcta` | La palabra que falta |
| `calcula` | `unidad`, `solucion`, `tolerancia` | Un número |

En `calcula`, la solución es un **entero en la unidad mínima**:

- `euros`: céntimos. 2.850 € es `285000`.
- `porcentaje`: centésimas de punto. 5,25 % es `525`.
- `numero`: un entero (años, meses, veces).

`tolerancia` va en esa misma unidad: `100` en euros acepta un euro arriba o
abajo. Con cifras redondas, `0`.

Ejemplo mínimo de cada tipo: `content/heroe/ahorro/`, que es el mundo piloto.

## Prompts

### 1. Investigación (Gemini Deep Research), uno por mundo

Se cambian `<MUNDO>` y `<ENFOQUE>` por la fila de la tabla de abajo.

```text
Eres un divulgador de educación financiera para adultos en España, sin
formación previa en finanzas. Prepara el temario de un curso corto sobre
<MUNDO> para una aplicación gratuita de finanzas personales, con forma de
videojuego, que se juega en el móvil en ratos de 2 a 4 minutos.

Enfoque: <ENFOQUE>

Quiero:

1. Un temario de 8 a 10 niveles, de lo más básico a lo más avanzado. Para
   cada nivel: título, objetivo en una frase y las 3-5 ideas clave que hay
   que llevarse.
2. Para cada idea clave, un ejemplo con cifras realistas en euros para una
   persona que vive en España hoy.
3. Los conceptos y siglas que aparecen (con su definición en una frase).
4. Los errores y mitos más frecuentes sobre el tema, y por qué son errores.
5. 10 preguntas de test por nivel con su respuesta correcta y una
   explicación de por qué lo es.

Reglas:

- Contexto ESPAÑOL: normativa, impuestos, productos y organismos de España
  (Banco de España, CNMV, Agencia Tributaria, Fondo de Garantía de Depósitos,
  finanzasparatodos.es). Si una cifra depende del año (tramos del IRPF,
  límites de aportación), di de qué año es.
- Cita la fuente oficial de cada dato y de cada cifra legal.
- NO recomiendes productos, bancos, fondos, aseguradoras ni plataformas
  concretas, ni por nombre ni por insinuación. Habla de tipos de producto.
- Distingue lo que es un hecho (la ley, una definición) de lo que es una
  regla práctica (el 50/30/20, los 3-6 meses de colchón).
- Lenguaje llano, frases cortas, sin anglicismos innecesarios.
- Si un ejemplo necesita una persona, se llama Pepito. Siempre Pepito: es el
  personaje de la casa.
```

| Mundo | Enfoque |
|---|---|
| Salud financiera | Saber dónde estás: ingresos y gastos, presupuesto mensual, regla 50/30/20, gastos fijos y variables, gastos hormiga, patrimonio neto, nómina (bruto, neto, retenciones), objetivos SMART. |
| Ahorro | Fondo de emergencia, pagarse primero, automatizar, cuentas remuneradas y depósitos, TAE frente a TIN, Fondo de Garantía de Depósitos, inflación y poder adquisitivo, interés compuesto, ahorro para metas, fiscalidad de los intereses. |
| Inversión | Riesgo y rentabilidad, horizonte temporal, diversificación, renta fija y variable, fondos de inversión e indexados, ETF, comisiones y su efecto a largo plazo, aportaciones periódicas, traspasos entre fondos sin tributar, planes de pensiones, perfil de riesgo y test MiFID, cómo detectar chiringuitos financieros (registros de la CNMV). |
| Deuda y crédito | Deuda buena y mala, TAE de un préstamo, tarjetas de crédito y pago aplazado (revolving), préstamos personales, hipotecas (tipo fijo, variable, Euríbor, amortización), CIRBE y ficheros de morosos, métodos bola de nieve y avalancha, reunificación de deudas, Ley de Segunda Oportunidad. |

### 2. Conversión (Claude), un mundo cada vez

```text
Te paso un informe de investigación sobre <MUNDO> para el Camino del héroe
de TeachCash. Conviértelo en los JSON de content/heroe/<carpeta>/ siguiendo
EXACTAMENTE docs/CONTENIDO_HEROE.md y los esquemas de
src/types/heroe.types.ts:

- mundo.json con decorado "<decorado>" y orden <orden>.
- 9 niveles: L, I, L, I, L, I, L, I y el jefe al final (hasta 12
  preguntas, aprobado 70). Cada lectura de unas 4 páginas y 4 preguntas de minitest;
  cada interactivo, de 5 a 7 ejercicios mezclando los seis tipos.
- Importes en céntimos y con signo; porcentajes de calcula en centésimas de
  punto.
- Toda pregunta con una explicación que diga POR QUÉ, en una o dos frases.
- Si un ejemplo necesita una persona, se llama Pepito (nunca otro nombre).
- Nada que no esté en el informe y respaldado por una fuente. Ningún producto
  ni marca concretos.

Cuando acabes, pasa `pnpm heroe:validar` y arregla lo que falle. Al final,
dame la lista de cifras y datos legales que tiene que comprobar una persona.
```

## La revisión (paso 3)

Antes de commitear un mundo, una persona comprueba:

- [ ] Cada cifra legal o fiscal está vigente y en su fuente oficial.
- [ ] Cada `calcula` da la `solucion` haciendo la cuenta a mano.
- [ ] Cada pregunta tiene UNA respuesta buena y ninguna trampa de redacción.
- [ ] Las explicaciones dicen el porqué y no solo la respuesta.
- [ ] No se nombra ningún banco, fondo, producto ni plataforma.
- [ ] El tono es llano y de tú, sin infantilizar.
- [ ] `pnpm heroe:validar` pasa.
