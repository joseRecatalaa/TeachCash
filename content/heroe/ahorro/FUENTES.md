# Ahorro: de dónde sale cada dato

Cada cifra legal, fiscal u oficial del mundo, nivel a nivel, con la norma o la
estadística de la que sale y su estado. Comprobado el **4 de noviembre de
2026** en la fuente oficial. Este fichero no lo lee la aplicación: es para
quien revisa o actualiza el curso. El informe de investigación completo está
en `docs/investigación-heroe/mundo-ahorro.md`.

**Estados**

- **VERIFICADA**: vista en la fuente oficial que se enlaza.
- **CORREGIDA**: se ha cambiado por la cifra oficial (se dice de qué a qué).
- **REGLA PRÁCTICA**: no es una norma ni una estadística; el texto la presenta
  como "una referencia habitual".
- **CUENTA**: aritmética del ejemplo. **Los tipos de interés (2 %, 2,5 %, 3 %,
  4 %) y los precios de las Letras (985 €, 990 €) son ilustrativos**, no de
  ningún producto ni subasta real, y el texto lo dice.

**Cuándo hay que volver a mirarlo**: cada enero (tramos de la base del ahorro),
cada mes que se cite el IPC, y si cambia la normativa del FGD.

Los niveles van en el orden de `mundo.json`. El jefe conserva su fichero
`03-jefe-del-ahorro` (el progreso de la gente se guarda con ese id) pero se
juega el último.

## Fuentes

| Clave | Fuente | URL |
|---|---|---|
| RDL-FGD | Real Decreto-ley 16/2011, Fondo de Garantía de Depósitos de Entidades de Crédito, texto consolidado | https://www.boe.es/buscar/pdf/2011/BOE-A-2011-16173-consolidado.pdf |
| RD-FGD | Real Decreto 2606/1996, fondos de garantía de depósitos, texto consolidado | https://www.boe.es/buscar/pdf/1996/BOE-A-1996-28535-consolidado.pdf |
| FGD-FAQ | Fondo de Garantía de Depósitos, preguntas frecuentes | https://www.fgd.es/preguntas-frecuentes/ |
| ORDEN-TAE | Orden EHA/2899/2011, de transparencia de servicios bancarios, texto consolidado | https://www.boe.es/buscar/pdf/2011/BOE-A-2011-17015-consolidado.pdf |
| PCB-TAE | Banco de España, Portal del Cliente Bancario, la TAE de un depósito | https://clientebancario.bde.es/pcb/es/menu-horizontal/podemosayudarte/tiposinteres/guia_textual/latae/tae_deposito.html |
| BDE-GLOSARIO | Banco de España, glosario: tasa anual equivalente | https://www.bde.es/webbe/es/estadisticas/recursos/glosario/conceptos/tasa-anual-equivalente.html |
| PCB-CANCELAR | Banco de España, Portal del Cliente Bancario, depósitos a plazo: cancelación | https://clientebancario.bde.es/pcb/es/menu-horizontal/productosservici/cuentasdepositos/depositosplazo/guia-textual/cancelacion/ |
| PCB-BLOG-CANCELAR | Portal del Cliente Bancario, "¿Puedo cancelar un depósito antes de cumplir el plazo?" | https://clientebancario.bde.es/pcb/es/blog/puedo-cancelar-un-deposito-antes-de-cumplir-el-plazo-.html |
| LIRPF | Ley 35/2006 del IRPF, texto consolidado (última actualización 07-10-2026) | https://www.boe.es/buscar/pdf/2006/BOE-A-2006-20764-consolidado.pdf |
| RIRPF | Reglamento del IRPF (RD 439/2007), texto consolidado | https://www.boe.es/buscar/pdf/2007/BOE-A-2007-6820-consolidado.pdf |
| TESORO-LETRAS | Tesoro Público, Letras del Tesoro | https://www.tesoro.es/deuda-publica/los-valores-del-tesoro/letras-del-tesoro |
| TESORO-FAQ | Tesoro Público, preguntas frecuentes | https://www.tesoro.es/en/deuda-publica/preguntas-frecuentes |
| TESORO-COMPRAR | Tesoro Público, dónde comprar | https://elijo.tesoro.es/invertir_donde_comprar |
| INE-ECV | INE, Encuesta de Condiciones de Vida 2025 (5-02-2026) | https://www.ine.es/dyngs/Prensa/ECV2025.pdf |
| INE-IPC | INE, IPC de septiembre de 2026 (14-10-2026) | https://www.ine.es/dyngs/Prensa/IPC0926.pdf |
| INE-IPC-ADEL | INE, indicador adelantado del IPC de octubre de 2026 | https://www.ine.es/dyngs/Prensa/adIPC1026.pdf |

## Nivel 1 · `01-fondo-de-emergencia` (lectura)

| Dato | Dónde | Fuente | Estado |
|---|---|---|---|
| En 2025, el 36,4 % de la población no podía afrontar un gasto imprevisto con sus propios recursos | p. 1 (`dato`) | INE-ECV | VERIFICADA. El INE pregunta si el hogar puede afrontar un gasto imprevisto de 900 € y da el resultado por población; el texto dice "de la población" |
| Fondo de 3 a 6 meses de gastos imprescindibles | páginas, minitest | — | REGLA PRÁCTICA |
| FGD: 100.000 € por titular y entidad | p. 5, minitest `fgd` | RDL-FGD, art. 10.1; RD-FGD, art. 7.4 | VERIFICADA |
| TAE y TIN | p. 6 | ORDEN-TAE, art. 4.2 | VERIFICADA |
| Gastos de Pepito: 1.120 € al mes; 3 meses, 3.360 €; 6 meses, 6.720 € | ejemplo | — | CUENTA |

## Nivel 2 · `02-practica-el-colchon` (interactivo)

| Dato | Dónde | Fuente | Estado |
|---|---|---|---|
| FGD: 100.000 € por titular y entidad | `empareja-conceptos` | RDL-FGD, art. 10.1 | VERIFICADA |
| La TAE sirve para comparar | ejercicios | ORDEN-TAE, art. 4.2; PCB-TAE | VERIFICADA |
| Retención del 19 % sobre los intereses | `calcula-intereses` (explicación) | RIRPF, art. 90.1 | VERIFICADA |
| 3 × 950 = 2.850 €; 5.000 × 2 % = 100 € | `calcula-fondo`, `calcula-intereses` | — | CUENTA |

## Nivel 3 · `03-cuentas-y-depositos` (lectura)

| Dato | Dónde | Fuente | Estado |
|---|---|---|---|
| Al cancelar un depósito antes de tiempo, la penalización no puede superar los intereses brutos devengados | p. 1 (`dato`) | PCB-CANCELAR | VERIFICADA en el Banco de España. Matiz: la página no cita la norma de la que sale |
| Solo se puede cancelar antes si el contrato lo prevé | p. 3, minitest `cancelar-siempre` | PCB-CANCELAR | VERIFICADA |
| Al cancelar se puede recuperar menos de lo depositado | p. 3 | PCB-BLOG-CANCELAR | VERIFICADA |
| Prórroga automática del depósito | p. 3 | PCB-CANCELAR | VERIFICADA (la guía solo la menciona) |
| TAE: incluye el TIN, la frecuencia de pago y las comisiones | p. 4, minitest `frecuencia-tae` | ORDEN-TAE, art. 4.2; PCB-TAE; BDE-GLOSARIO | VERIFICADA |
| TIN del 3 % pagado cada mes: TAE de unos 3,04 % | p. 4 | — | CUENTA ((1 + 0,0025)^12 − 1 = 3,0416 %) |
| Retención del 19 % sobre los intereses | p. 5, p. 6, minitest `hueco-retencion` y `calcula-neto` | RIRPF, art. 90.1 | VERIFICADA |
| Los intereses son rendimientos del capital mobiliario y van a la base del ahorro | p. 6 | LIRPF, arts. 25.2 y 46.a) | VERIFICADA |
| En 2026, los primeros 6.000 € de la base del ahorro tributan al 19 % | p. 6 | LIRPF, arts. 66.1 y 76 (9,5 % estatal + 9,5 % autonómico) | VERIFICADA. Simplificado: en rigor es la base liquidable del ahorro |
| 8.000 × 2 % = 160 €; menos el 19 % = 129,60 € | `calcula-neto` | — | CUENTA |
| Depósito de 10.000 € al 3 %: 300 − 57 = 243 € | ejemplo | — | CUENTA |

## Nivel 4 · `04-practica-tae-y-depositos` (interactivo)

| Dato | Dónde | Fuente | Estado |
|---|---|---|---|
| La TAE con comisión | `tae-con-comision` | ORDEN-TAE, art. 4.2 | VERIFICADA |
| Sin cláusula de cancelación, no se puede cancelar | `contrato-sin-cancelacion` | PCB-CANCELAR | VERIFICADA |
| Prórroga automática | `empareja-ahorro` | PCB-CANCELAR | VERIFICADA |
| Retención del 19 % | `calcula-neto` | RIRPF, art. 90.1 | VERIFICADA |
| 6.000 × 2,5 % = 150 €; 150 − 28,50 = 121,50 € | `calcula-bruto`, `calcula-neto` | — | CUENTA |

## Nivel 5 · `05-fgd-y-letras-del-tesoro` (lectura)

| Dato | Dónde | Fuente | Estado |
|---|---|---|---|
| El FGD paga en 7 días hábiles | p. 1 (`dato`) | RD-FGD, art. 9.1.a) | VERIFICADA |
| 100.000 € por titular y entidad | p. 1, p. 4 | RDL-FGD, art. 10.1; RD-FGD, art. 7.4 | VERIFICADA |
| Cubre cuentas y depósitos a plazo, con los intereses devengados | p. 2 | RD-FGD, arts. 4.1 y 7.1 | VERIFICADA |
| Aparte, hasta 100.000 € en valores que la entidad no devuelve; no cubre las bajadas de precio ni los planes de pensiones | p. 2, minitest `perdidas-inversion` | RDL-FGD, art. 10.2; RD-FGD, art. 7 bis; FGD-FAQ | VERIFICADA |
| Entidad de otro país de la UE: la cubre el fondo de su país | p. 2 | FGD-FAQ | VERIFICADA en la FAQ del FGD (la directiva no se ha leído) |
| Varios titulares: según el contrato o, si no dice nada, a partes iguales; los autorizados no cuentan | p. 3, minitest `cuenta-conjunta` | RD-FGD, art. 7.5; FGD-FAQ | VERIFICADA |
| Sin límite durante 3 meses: venta de la vivienda e indemnización por despido | p. 4 | RDL-FGD, art. 10.1.a) y b) | VERIFICADA |
| Letras a 3, 6, 9 y 12 meses; 1.000 € y múltiplos; subasta; normalmente al descuento | p. 5, minitest `hueco-valor-letra` | TESORO-LETRAS | VERIFICADA. El Tesoro dice "al descuento o a premio": por eso el texto dice "normalmente" |
| Compra en la web del Tesoro (certificado, DNIe o Cl@ve) o en el Banco de España con cita previa; la Cuenta Directa es gratis salvo la transferencia al vencer | p. 6 | TESORO-FAQ; TESORO-COMPRAR | VERIFICADA |
| La Letra no lleva retención, pero se declara en la base del ahorro | p. 8, minitest `letra-hacienda` | RIRPF, art. 75.3.b); LIRPF, art. 25.2; TESORO-LETRAS | VERIFICADA |
| 150.000 € entre dos titulares; 160.000 € entre dos | ejemplo, minitest `cuenta-conjunta` | RD-FGD, art. 7.5 | CUENTA |
| 3 Letras a 985 €: ganancia de 45 € | ejemplo | — | CUENTA (precio ilustrativo) |

## Nivel 6 · `06-practica-fgd-y-letras` (interactivo)

| Dato | Dónde | Fuente | Estado |
|---|---|---|---|
| 100.000 € por titular y entidad | `calcula-descubierto` (120.000 − 100.000 = 20.000 €), `como-cubrirlo` | RDL-FGD, art. 10.1 | VERIFICADA |
| A partes iguales si el contrato no dice nada | `cuenta-hermana` (180.000 / 2 = 90.000 €) | RD-FGD, art. 7.5 | VERIFICADA |
| Venta del piso: sin límite durante 3 meses | `venta-del-piso` | RDL-FGD, art. 10.1.a) | VERIFICADA |
| Entidad de otro país de la UE | `entidad-ue` | FGD-FAQ | VERIFICADA |
| Letras: plazos, 1.000 €, subasta, Cuenta Directa | `empareja-letras` | TESORO-LETRAS; TESORO-FAQ | VERIFICADA |
| Al pedir se adelanta el 100 % y el sobrante se devuelve tras la subasta | `ordena-compra-letra` | TESORO-FAQ (pregunta 24) | VERIFICADA |
| Letras compradas en el Tesoro, sin retención | `hueco-retencion-letra` | RIRPF, art. 75.3.b) | VERIFICADA |
| 5 × (1.000 − 990) = 50 € | `calcula-letras` | — | CUENTA (precio ilustrativo) |

## Nivel 7 · `07-inflacion-y-compuesto` (lectura)

| Dato | Dónde | Fuente | Estado |
|---|---|---|---|
| IPC de septiembre de 2026: 4,9 %, el más alto desde febrero de 2023 | p. 1 (`dato`) | INE-IPC | VERIFICADA |
| El INE publica un indicador adelantado a final de mes y el dato completo a mediados del siguiente | p. 2 | INE-IPC; INE-IPC-ADEL | VERIFICADA |
| Interés simple frente a compuesto; metas con fecha | páginas | Definiciones | CUENTA (simple 400 €, compuesto 404 €; 5.000 × 1,04² = 5.408 €; 3.600 / 18 = 200 €; 3.000 / 12 = 250 €) |

## Nivel 8 · `08-practica-metas-con-fecha` (interactivo)

Sin cifras oficiales nuevas. Cuentas: `calcula-cuota` (2.400 / 12 = 200 €),
`calcula-con-ahorro` ((2.400 − 600) / 12 = 150 €), `calcula-compuesto`
(2.000 × 1,03² = 2.121,80 €).

## Nivel 9 (jefe) · `03-jefe-del-ahorro` — El Tragaperras

| Dato | Dónde | Fuente | Estado |
|---|---|---|---|
| FGD: 100.000 € por titular y entidad; repartir en otra entidad protege el resto | `fgd-repartir`, `empareja-mundo` | RDL-FGD, art. 10.1 | VERIFICADA |
| Retención del 19 %: 200 − 38 = 162 € | `calcula-retencion` | RIRPF, art. 90.1 | VERIFICADA |
| La TAE, no el TIN, es la que compara | `tae-o-tin` | ORDEN-TAE, art. 4.2 | VERIFICADA |
| Al cancelar un depósito se puede recuperar menos | `cancelar-con-perdida` | PCB-BLOG-CANCELAR | VERIFICADA |
| Compra de Letras en el Tesoro | `ordena-compra-letra` | TESORO-FAQ | VERIFICADA |
| 6 × 1.300 = 7.800 €; 10.000 al 3 % dos años = 609 €; 6.000 / 24 = 250 € | `calcula-seis-meses`, `calcula-compuesto`, `calcula-meta` | — | CUENTA |

## Lo que no se ha incluido

- La comisión exacta de la Cuenta Directa (1,5 por mil, mínimo 0,90 € y máximo
  200 €): verificada, pero se dejó como "una pequeña comisión" para no cargar la
  página.
- La venta de Letras antes de vencer: no se verificó en una fuente oficial.
- El resto de tramos de la base del ahorro: están en el mundo de Inversión.
