# Inversión: de dónde sale cada dato

Cada cifra legal, fiscal u oficial del mundo, nivel a nivel, con la norma o la
estadística de la que sale y su estado. Comprobado el **4 de noviembre de
2026** en la fuente oficial; la Ley del IRPF, en su texto consolidado con
última actualización del 07-10-2026. Este fichero no lo lee la aplicación: es
para quien revisa o actualiza el curso.

**Estados**

- **VERIFICADA**: vista en la fuente oficial que se enlaza.
- **CORREGIDA**: el informe de investigación decía otra cosa y se ha cambiado
  (se dice de qué a qué).
- **REGLA PRÁCTICA**: no es una norma; el texto la presenta como "una
  referencia habitual", sin atribuírsela a nadie.
- **NO VERIFICADO**: no se ha podido ver en la fuente oficial. Se dice cómo lo
  trata el texto.
- **CUENTA**: aritmética del ejemplo. **Todas las rentabilidades de los
  ejemplos (4 %, 6 %, 8 %, el fondo "del 14 %") son supuestas**, y el texto lo
  dice. Ninguna rentabilidad se promete. La única histórica (Ibex 35 en 2025)
  lleva el aviso de que no se repite por obligación.

**Cuándo hay que volver a mirarlo**: cada enero (tramos de la base del ahorro y
límites de los planes de pensiones) y cuando cambie la Ley del IRPF.

## Fuentes

| Clave | Fuente | URL |
|---|---|---|
| LIRPF | Ley 35/2006 del IRPF, texto consolidado | https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764 |
| TRLPFP | Real Decreto Legislativo 1/2002, texto refundido de la Ley de Planes y Fondos de Pensiones | https://www.boe.es/buscar/act.php?id=BOE-A-2002-24252 |
| RD-62-2018 | Real Decreto 62/2018 (añade la DT 7.ª al Reglamento de planes y fondos de pensiones) | https://www.boe.es/buscar/doc.php?id=BOE-A-2018-1832 |
| INE-IPC-2022 | INE, IPC de julio de 2022 (12-08-2022) | https://www.ine.es/daco/daco42/daco421/ipc0722.pdf |
| CNMV-ANUAL | CNMV, Informe anual 2025 | https://www.cnmv.es/DocPortal/Publicaciones/Informes/Informe_Anual_2025_ES.pdf |
| CNMV-FONDOS | CNMV, guía "Los fondos de inversión y la inversión colectiva" | https://www.cnmv.es/docportal/Publicaciones/Guias/G06_Fondos_IIC.pdf |
| CNMV-CHIRINGUITOS | CNMV, guía sobre chiringuitos financieros | https://www.cnmv.es/docportal/publicaciones/guias/chiringuitos.pdf |
| CNMV-CONTACTO | CNMV, contacto (atención al inversor) | https://www.cnmv.es/portal/utilidades/contacto?lang=es |
| CNMV-IDONEIDAD | CNMV, Portal del Inversor: idoneidad | https://www.cnmv.es/portal/inversor/idoneidad?lang=es |
| CNMV-CONVENIENCIA | CNMV, Portal del Inversor: conveniencia | https://www.cnmv.es/portal/inversor/conveniencia?lang=es |
| CNMV-DFI | CNMV, documento de datos fundamentales | https://www.cnmv.es/portal/inversor/fondos-dfi?lang=es |
| CRIPTO-2021 | Comunicado conjunto de la CNMV y el Banco de España sobre criptomonedas (9-02-2021) | https://www.bde.es/f/webbde/GAP/Secciones/SalaPrensa/NotasInformativas/21/presbe2021_15.pdf |

## Nivel 1 · `01-por-que-invertir` (lectura)

| Dato | Dónde | Fuente | Estado |
|---|---|---|---|
| En julio de 2022, el IPC subía un 10,8 %, la tasa más alta desde septiembre de 1984 | p. 1 (`dato`) | INE-IPC-2022 | VERIFICADA |
| "Rentabilidades pasadas no garantizan rentabilidades futuras" | p. 3, minitest `rentabilidad-pasada` | CNMV-FONDOS | VERIFICADA |
| 10.000 € quietos 10 años: 8.203 € (2 %), 7.441 € (3 %), 6.756 € (4 %); pérdida del 25,6 % al 3 % | ejemplo, mito | — | CUENTA (10.000 / 1,0x^10) |
| Mes de Pepito: 1.750 − 520 − 380 − 350 = 500 € | ejemplo | — | CUENTA |

## Nivel 2 · `02-pepito-invierte-su-excedente` (interactivo)

| Dato | Dónde | Fuente | Estado |
|---|---|---|---|
| No invertir en bolsa el dinero que vayas a necesitar en menos de 3 a 5 años | `matricula-en-bolsa` | — | REGLA PRÁCTICA, sin atribuir: no se encontró en la CNMV ni en Finanzas para Todos |
| 2.000 × 3 % = 60 €; 500 × 4 % + 500 × 8 % = 60 € | `calcula-inflacion`, `calcula-cartera-mixta` | — | CUENTA (rentabilidades supuestas) |

## Nivel 3 · `03-fondos-indexados-y-etf` (lectura)

| Dato | Dónde | Fuente | Estado |
|---|---|---|---|
| A finales de 2025, las IIC españolas rozaban los 486.000 millones de €; los fondos, 5,7 millones de inversores | p. 1 (`dato`) | CNMV-ANUAL, pp. 11, 23 y 24 | VERIFICADA |
| Las comisiones de gestión y depósito vienen descontadas del valor liquidativo; la de gestión puede ir sobre el patrimonio, los resultados o ambos | p. 6 (mito), minitest `comision-en-anos-malos` | CNMV-FONDOS | VERIFICADA. CORREGIDA: el informe decía que se cobra "gane o pierda el fondo" sin más; eso solo vale para la que va sobre el patrimonio |
| El fondo se compra o vende a un solo precio al día, el valor liquidativo, que se conoce después | p. 4 | CNMV-FONDOS | VERIFICADA. CORREGIDA: el informe decía "al valor de cierre" |
| El ETF se negocia en bolsa durante la sesión | p. 4, minitest `hueco-etf` | CNMV-FONDOS ("Fondos cotizados") | VERIFICADA |
| 10.000 € a 30 años: 52.753 € al 5,7 % y 34.358 € al 4,2 %; diferencia 18.395 € | ejemplo de la p. 3 | — | CUENTA. CORREGIDA: el informe daba 52.990 / 34.424 / 18.566 € |

## Nivel 4 · `04-pepito-compara-comisiones` (interactivo)

| Dato | Dónde | Fuente | Estado |
|---|---|---|---|
| Fondo activo, indexado y ETF | `empareja-vehiculos` | CNMV-FONDOS | VERIFICADA |
| Un fondo del Ibex 35 tiene las 35 empresas de ese índice | `ordena-diversificacion` | — | CORREGIDA: el informe decía "las 35 mayores empresas" |
| 180 − 30 = 150 €; 200 / 20 + 200 / 10 = 30 participaciones | `calcula-ahorro-comision`, `calcula-participaciones` | — | CUENTA |

## Nivel 5 · `05-impuestos-traspasos-y-pensiones` (lectura)

| Dato | Dónde | Fuente | Estado |
|---|---|---|---|
| Desde el 1-1-2025 se puede sacar lo aportado a un plan de pensiones hasta el 31-12-2015 | p. 1 (`dato`) | RD-62-2018 (DT 7.ª del Reglamento) | VERIFICADA |
| Mientras no vendes, la subida no tributa | p. 1 | LIRPF, art. 33.1 | VERIFICADA (principio general) |
| La entidad retiene un 19 % de la ganancia al reembolsar | p. 2 | LIRPF, art. 101.6 | VERIFICADA |
| Base del ahorro 2026: 19 % hasta 6.000 €; 21 % hasta 50.000 €; 23 % hasta 200.000 €; 27 % hasta 300.000 €; 30 % a partir de ahí | p. 2, p. 8 (mito) | LIRPF, art. 66.1 (estatal) + art. 76 (autonómica, mismos tipos) | VERIFICADA |
| Compensación: ganancias y pérdidas entre sí; lo que sobre, hasta el 25 % de intereses y dividendos; el resto, 4 años | p. 3, minitest `anos-para-compensar` | LIRPF, art. 49.1.a) y b) y 49.2 | VERIFICADA |
| Traspaso entre fondos sin tributar, conservando valor y fecha; los ETF, excluidos | p. 4, minitest `que-es-un-traspaso` | LIRPF, art. 94.1.a) | VERIFICADA |
| Requisito de más de 500 socios (para las IIC con forma de sociedad) | minitest `que-es-un-traspaso` (explicación) | LIRPF, art. 94.1.a) 2.º | VERIFICADA |
| Tope de reducción: el menor entre 1.500 € y el 30 % de los rendimientos netos del trabajo y de actividades | p. 5, minitest `hueco-limite-plan` | LIRPF, art. 52.1 | VERIFICADA. CORREGIDA: el informe daba 1.500 € sin el tope del 30 % |
| +8.500 € con plan de empleo de empresa; +4.250 € con plan de empleo simplificado de autónomos; los dos juntos, 8.500 € como mucho | p. 5 | LIRPF, art. 52.1, 1.º, 2.º y párrafo final | VERIFICADA |
| Rescate: jubilación, incapacidad, dependencia, fallecimiento; excepcionalmente, paro de larga duración y enfermedad grave; aportaciones con 10 años | p. 6 | TRLPFP, art. 8.6 y 8.8 | VERIFICADA. CORREGIDA la lista del informe, que mezclaba contingencias y supuestos excepcionales |
| Lo cobrado de un plan tributa como rendimiento del trabajo, en la base general | p. 6, minitest `rescate-base-ahorro` | LIRPF, art. 17.2.a) 3.º | VERIFICADA. CORREGIDO: se quitó "del 19 % al 47 %", que depende de la comunidad autónoma |
| País Vasco y Navarra tienen sus propias normas | p. 1 | Régimen foral | VERIFICADA (hecho general) |
| Cuentas de la familia: 3.450 − 1.120 − 1.430 − 300 − 600 = 0; 3.600 € al año al plan | ejemplo | — | CUENTA |
| 6.100 € de ganancia: 6.000 × 19 % + 100 × 21 % = 1.161 € | p. 8 (mito) | LIRPF, art. 66.1 y 76 | CUENTA |

## Nivel 6 · `06-pepito-hace-cuentas-con-el-irpf` (interactivo)

| Dato | Dónde | Fuente | Estado |
|---|---|---|---|
| 6.000 × 19 % + 4.000 × 21 % = 1.980 € | `calcula-tramos` | LIRPF, arts. 66.1 y 76 | VERIFICADA / CUENTA. El fondo es solo de Pepito: si fuera de la pareja, la ganancia se repartiría entre dos declaraciones |
| 400 − 25 % de 1.000 = 150 € pendientes, 4 años | `calcula-perdida-pendiente` | LIRPF, art. 49 | VERIFICADA / CUENTA |
| Traspaso: se pide en la entidad de destino; no vale si el dinero pasa por tu cuenta | `ordena-traspaso` | LIRPF, art. 94.1.a); CNMV-FONDOS, cap. VIII | VERIFICADA |
| FIFO: se venden primero las participaciones compradas antes | `fifo` | LIRPF, art. 94.1.a) | VERIFICADA |
| Los ETF no tienen traspaso | `hueco-sin-traspaso` | LIRPF, art. 94.1.a) | VERIFICADA |
| Límites y rescate de los planes; mover un plan a otro "sin cobrarlos" | `empareja-planes`, `rescate-de-golpe` | LIRPF, arts. 17.2.a) y 52.1; TRLPFP, art. 8.8 | VERIFICADA. Que la movilización no tribute: **NO VERIFICADO** por escrito; el texto no lo afirma |

## Nivel 7 · `07-test-mifid-riesgo-y-chiringuitos` (lectura)

| Dato | Dónde | Fuente | Estado |
|---|---|---|---|
| Los chiringuitos no están adheridos al Fondo de Garantía de Inversiones ni al de Depósitos | p. 1 (`dato`) | CNMV-CHIRINGUITOS | VERIFICADA |
| Ibex 35 en 2025: +49,3 %, con aviso de que no se repite por obligación | p. "El enemigo en el espejo" | CNMV-ANUAL, p. 15 (cuadro I.2.1) | VERIFICADA. CORREGIDA la cifra: el informe decía "casi el 50 %" |
| Test de conveniencia (conocimientos y experiencia) y de idoneidad (además, situación financiera y objetivos; obligatorio en asesoramiento y gestión de carteras) | p. "Los test que te protegen", minitest `conveniencia-o-idoneidad` | CNMV-IDONEIDAD; CNMV-CONVENIENCIA | VERIFICADA. No se citan artículos de la Ley 6/2023 porque no se han leído |
| Indicador de riesgo del 1 al 7; el 1 no es "sin riesgo" | p. "El semáforo del 1 al 7", minitest `hueco-escala` | CNMV-DFI | VERIFICADA en la CNMV. **NO VERIFICADO** en el Reglamento Delegado (UE) 2017/653: EUR-Lex no cargó |
| Criptomonedas: volatilidad extrema, posible pérdida total, sin cobertura del FGD ni del Fondo de Garantía de Inversiones | p. "Criptomonedas…", minitest `cripto-fgd` | CRIPTO-2021 | VERIFICADA, con su fecha (2021). **Pendiente**: confirmar que sigue así en 2026, con el Reglamento MiCA ya aplicándose |
| Teléfono de atención al inversor de la CNMV: 900 535 015 | p. de Pepito, minitest `como-comprobar` | CNMV-CONTACTO | VERIFICADA |
| Mes de Pepito: 2.100 − 650 − 750 − 500 = 200 € | ejemplo | — | CUENTA |

## Nivel 8 · `08-pepito-caza-un-chiringuito` (interactivo)

| Dato | Dónde | Fuente | Estado |
|---|---|---|---|
| Qué es un chiringuito; consultar los registros y advertencias de la CNMV | `hueco-chiringuito`, `ordena-comprobar-oferta` | CNMV-CHIRINGUITOS; CNMV-CONTACTO | VERIFICADA |
| Test de idoneidad en la gestión de carteras | `test-gestion-carteras`, `entender-no-basta` | CNMV-IDONEIDAD | VERIFICADA |
| −50 % y luego +50 %: 1.000 → 500 → 750 € | `calcula-baja-y-sube` | — | CUENTA |

## Nivel 9 · `09-jefe-oraculo-de-humo` (jefe)

| Dato | Dónde | Fuente | Estado |
|---|---|---|---|
| Tope de una autónoma: 1.500 + 4.250 = 5.750 € (si el 30 % no la frena) | `calcula-tope-autonoma` | LIRPF, art. 52.1 | VERIFICADA |
| ETF con 3.500 € de ganancia y acciones con 1.500 € de pérdida: (3.500 − 1.500) × 19 % = 380 € | `calcula-compensa-etf` | LIRPF, arts. 49 y 66.1 | VERIFICADA / CUENTA |
| 25 % de compensación cruzada | `hueco-veinticinco` | LIRPF, art. 49.1 | VERIFICADA |
| Tramos de la base del ahorro | `hueco-tramo-alto`, `ordena-tramos` | LIRPF, arts. 66.1 y 76 | VERIFICADA |
| Traspaso, ETF y rescate | `empareja-reglas`, `reembolso-y-recompra` | LIRPF, arts. 17.2.a) y 94.1.a) | VERIFICADA |
| Rescate de lo aportado con 10 años o hasta 2015 | `rescatar-sin-motivo` | TRLPFP, art. 8.8; RD-62-2018 | VERIFICADA |
| Indicador 6 de 7 | `riesgo-6-de-7` | CNMV-DFI | VERIFICADA |
| Rentabilidades pasadas | `fondo-del-14` | CNMV-FONDOS | VERIFICADA |
| Inflación del 3 % durante 20 años: un 44,6 % menos de poder de compra | pregunta del jefe | — | CUENTA (1 − 1/1,03^20) |

## Lo que se quitó del informe por no poder verificarlo

- "Inflación acumulada del 33,6 % en diez años" y la serie del IPC 2018-2025:
  no se confirmó en el INE y la serie mezcla medias anuales con tasas de
  diciembre. Se sustituyó por el 10,8 % de julio de 2022.
- Que el tipo más alto del ahorro "subió desde el 28 %" con la Ley 7/2024: no
  se comprobó. El 30 % vigente sí está verificado.
- Los límites por discapacidad (24.250 €): no se comprobaron. El 24.250 queda
  solo como opción equivocada de `hueco-limite-plan`.
- Los artículos concretos de la Ley 6/2023 y del RD 813/2023: no se han leído;
  se habla de MiFID II sin artículos.
