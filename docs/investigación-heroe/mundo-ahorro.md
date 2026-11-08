# Ahorro: informe de investigación

Fecha de consulta: 4 de noviembre de 2026. Ahorro no tenía informe de Gemini. Este lo he hecho yo, con fuentes oficiales, a partir del ENFOQUE de la sección AHORRO de `docs/plans/prompt-cursos.txt`. Las normas se han leído en el **texto consolidado del BOE**, descargado ese mismo día. La fecha de "última modificación" que da cada texto va anotada al lado.

## 1. Fondo de Garantía de Depósitos (FGD)

| Dato | Valor | Norma / fuente | URL |
|---|---|---|---|
| Límite de los depósitos en dinero | 100.000 € | RDL 16/2011, art. 10.1 (consolidado, últ. mod. 24-06-2017) | https://www.boe.es/buscar/pdf/2011/BOE-A-2011-16173-consolidado.pdf |
| El límite es por depositante y entidad, "cualesquiera que sean el número y clase de depósitos" | — | RD 2606/1996, art. 7.4 (consolidado, últ. mod. 08-10-2026) | https://www.boe.es/buscar/pdf/1996/BOE-A-1996-28535-consolidado.pdf |
| Cuenta con varios titulares: se reparte "de acuerdo con lo previsto en el contrato de depósito y, en su defecto, a partes iguales" | — | RD 2606/1996, art. 7.5 | ídem |
| La garantía alcanza los intereses devengados y no abonados | — | RD 2606/1996, art. 7.1 | ídem |
| Incluye "los depósitos a plazo fijo y los depósitos de ahorro" | — | RD 2606/1996, art. 4.1 | ídem |
| Plazo de pago de los depósitos | 7 días hábiles (desde el 1-1-2024; antes eran 20, 15 y 10) | RD 2606/1996, art. 9.1.a) y disp. transitoria | ídem |
| Valores confiados a la entidad: cobertura aparte | 100.000 € | RDL 16/2011, art. 10.2; RD 2606/1996, art. 7 bis | ídem |
| Sin límite durante 3 meses: venta de vivienda residencial privada; pagos puntuales por matrimonio, divorcio, jubilación, despido, invalidez o fallecimiento; seguros o indemnizaciones por delito o error judicial | 3 meses | RDL 16/2011, art. 10.1 a) b) c) | ídem |
| Ejemplo oficial de cotitulares: 150.000 € al 50 % → 75.000 € cubiertos a cada uno | — | FGD, preguntas frecuentes | https://www.fgd.es/preguntas-frecuentes/ |
| No cubre las pérdidas de valor de los títulos; no cubre planes de pensiones; las personas autorizadas no tienen cobertura | — | FGD, preguntas frecuentes | ídem |
| La sucursal de una entidad de otro país de la UE: la cubre el fondo del país de la entidad, con una cobertura al menos igual a la del FGD | — | FGD, preguntas frecuentes | ídem |
| "En general, el FGD garantiza hasta 100.000 € por titular y entidad" | — | FGD, portada | https://www.fgd.es/ |

## 2. TIN y TAE

| Dato | Fuente | URL |
|---|---|---|
| La TAE "iguala en cualquier fecha el valor actual de los efectivos recibidos y entregados"; las entidades la publican junto a sus tipos "de manera sencilla y que facilite la comparación entre entidades" | Orden EHA/2899/2011, art. 4.2 (consolidado, últ. mod. 27-07-2020) | https://www.boe.es/buscar/pdf/2011/BOE-A-2011-17015-consolidado.pdf |
| "El TIN es el precio que la entidad cobra por prestar o que paga por depositar"; "La TAE incluye además del TIN, los gastos y comisiones" | Banco de España, Portal del Cliente Bancario | https://clientebancario.bde.es/pcb/es/menu-horizontal/podemosayudarte/tiposinteres/ |
| La TAE de un depósito se basa en el interés compuesto (supone que los intereses se reinvierten) y permite comparar ofertas | Portal del Cliente Bancario, "TAE de un depósito" | https://clientebancario.bde.es/pcb/es/menu-horizontal/podemosayudarte/tiposinteres/guia_textual/latae/tae_deposito.html |
| La TAE tiene en cuenta el TIN, la frecuencia de los pagos (mensual, trimestral…), las comisiones y algunos gastos | Banco de España, glosario | https://www.bde.es/webbe/es/estadisticas/recursos/glosario/conceptos/tasa-anual-equivalente.html |

Ejemplo, calculado con un script: con un TIN del 3 % pagado cada mes y sin comisiones, TAE = (1 + 0,03/12)^12 − 1 = 3,0416 %, es decir, unos 3,04 %. Pagado una vez al año, la TAE es del 3 %.

## 3. Depósitos a plazo: cancelación anticipada

| Dato | Fuente | URL |
|---|---|---|
| Solo se puede cancelar antes "atendiendo a lo pactado"; si el contrato no lo prevé, "no cabría la cancelación anticipada por la sola voluntad de una sola de las partes" | Portal del Cliente Bancario, guía de depósitos a plazo | https://clientebancario.bde.es/pcb/es/menu-horizontal/productosservici/cuentasdepositos/depositosplazo/guia-textual/cancelacion/ |
| La penalización "no puede exceder del importe total de los intereses brutos devengados" | ídem | ídem |
| Con varios titulares, la orden de cancelar tiene que darla cada uno de ellos | ídem | ídem |
| Prórrogas automáticas: existen si el contrato las prevé | ídem | ídem |
| Como la retención no se reduce, "puede ocurrir que tras la cancelación anticipada obtengas un importe inferior a la cantidad depositada inicialmente" | Portal del Cliente Bancario, blog (31-10-2023) | https://clientebancario.bde.es/pcb/es/blog/puedo-cancelar-un-deposito-antes-de-cumplir-el-plazo-.html |

## 4. Letras del Tesoro

| Dato | Fuente | URL |
|---|---|---|
| Plazos de 3, 6, 9 y 12 meses | Tesoro Público, "Letras del Tesoro" | https://www.tesoro.es/deuda-publica/los-valores-del-tesoro/letras-del-tesoro |
| Petición mínima de 1.000 €; por encima, en múltiplos de 1.000 € | ídem | ídem |
| Se emiten "al descuento o a premio", en subasta; el rendimiento es la diferencia entre el reembolso (1.000 €) y el precio de compra | ídem | ídem |
| Rendimientos "exentos de retención a cuenta" en el IRPF, aunque hay que declararlos | ídem | ídem |
| Sin retención: los rendimientos de las Letras del Tesoro. Excepción: las cuentas de las entidades basadas en operaciones sobre Letras sí llevan retención | RIRPF (RD 439/2007), art. 75.3.b) (consolidado, últ. mod. 07-10-2026) | https://www.boe.es/buscar/pdf/2007/BOE-A-2007-6820-consolidado.pdf |
| Compra online en tesoro.es con certificado digital, DNIe o Cl@ve; en el Banco de España, con cita previa; o a través de bancos y agencias de valores, con sus comisiones | Tesoro, preguntas frecuentes; Elijo Tesoro, "Dónde comprar" | https://www.tesoro.es/en/deuda-publica/preguntas-frecuentes · https://elijo.tesoro.es/invertir_donde_comprar |
| Cuenta Directa: comprar, custodiar, abrirla y mantenerla no cuesta nada; las transferencias por amortizaciones e intereses cuestan el 1,5 por mil, con un mínimo de 0,90 € y un máximo de 200 € | Tesoro, preguntas frecuentes | https://www.tesoro.es/en/deuda-publica/preguntas-frecuentes |
| Depósito previo de las Letras: el 100 %, 1.000 € por título. El sobrante se empieza a devolver al día siguiente de resolverse la subasta | Tesoro, preguntas frecuentes (FAQ 24) | ídem |
| Reinversión: se programa en la pestaña "REINVERTIR" y el plazo acaba siete días antes de la subasta | ídem | ídem |

## 5. Fiscalidad de los intereses

| Dato | Valor | Norma | URL |
|---|---|---|---|
| Los intereses son rendimientos del capital mobiliario (cesión a terceros de capitales propios), igual que la amortización de activos financieros como las Letras | — | LIRPF (Ley 35/2006), art. 25.2 (consolidado, últ. mod. 07-10-2026) | https://www.boe.es/buscar/pdf/2006/BOE-A-2006-20764-consolidado.pdf |
| Entran en la renta del ahorro | — | LIRPF, art. 46.a) | ídem |
| Retención sobre los rendimientos del capital mobiliario | 19 % | RIRPF, art. 90.1 | https://www.boe.es/buscar/pdf/2007/BOE-A-2007-6820-consolidado.pdf |
| Escala del ahorro, parte estatal y parte autonómica (las dos iguales): 9,5 % + 9,5 % hasta 6.000 €; 10,5 + 10,5 de 6.000 a 50.000; 11,5 + 11,5 de 50.000 a 200.000; 13,5 + 13,5 de 200.000 a 300.000; 15 + 15 a partir de ahí. En total: 19 / 21 / 23 / 27 / 30 % | 2026 | LIRPF, arts. 66.1 y 76 | ídem |

## 6. Inflación e IPC

| Dato | Valor | Fuente | URL |
|---|---|---|---|
| IPC de septiembre de 2026: tasa anual | 4,9 %, la más alta desde febrero de 2023 (subyacente: 3,1 %) | INE, nota de prensa del 14-10-2026 | https://www.ine.es/dyngs/Prensa/IPC0926.pdf |
| Indicador adelantado de octubre de 2026 | 4,9 % (publicado el 30-10-2026) | INE | https://www.ine.es/dyngs/Prensa/adIPC1026.pdf |
| IPC de julio de 2022 (referencia histórica, no se usa) | 10,8 %, la más alta desde septiembre de 1984 | INE, nota del 12-08-2022 | https://www.ine.es/daco/daco42/daco421/ipc0722.pdf |
| El IPC base actual | base 2025 | INE, nota IPC0926 | ídem |

## 7. Gancho del nivel 1 (fondo de emergencia)

| Dato | Valor | Fuente | URL |
|---|---|---|---|
| Población sin capacidad para afrontar gastos imprevistos | 36,4 % en 2025 (35,8 % en 2024) | INE, Encuesta de Condiciones de Vida 2025, resultados definitivos (5-2-2026) | https://www.ine.es/dyngs/Prensa/ECV2025.pdf |
| Importe del gasto imprevisto por el que pregunta la encuesta | 900 € (cuestionario de 2025; se revisa cada año) | INE, cuestionario de hogar ECV 2025, pregunta HG4 | https://www.ine.es/metodologia/t25/ecv_hog25.pdf |

## 8. Interés simple, compuesto y metas

Son aritmética y no necesitan fuente: todas las cuentas están rehechas con `decimal` de Python, sin redondeos intermedios. Lo de "págate primero", "automatizar" y de 3 a 6 meses de colchón son **reglas prácticas**, y el texto las presenta como "referencia habitual".

## Fuentes descartadas

Blogs y comparadores (helpmycash, rankia, roams, raisin, openbank…) han salido en las búsquedas. No se han usado como fuente de ninguna cifra, porque no son fuentes oficiales.
