# Salud financiera: de dónde sale cada dato

Cada cifra legal, fiscal u oficial del mundo, nivel a nivel, con la norma o la
estadística de la que sale y su estado. Comprobado el **4 de noviembre de
2026** en la fuente oficial. Este fichero no lo lee la aplicación: es para
quien revisa o actualiza el curso.

**Estados**

- **VERIFICADA**: vista en la fuente oficial que se enlaza.
- **CORREGIDA**: el informe de investigación decía otra cosa y se ha cambiado
  por la cifra oficial (se dice de qué a qué).
- **REGLA PRÁCTICA**: no es una norma ni una estadística. El texto la presenta
  como "una referencia habitual", sin atribuírsela a ningún organismo.
- **CUENTA**: aritmética del ejemplo, no un dato oficial. Las cifras de los
  personajes (sueldos, alquileres, gastos) son inventadas para el ejemplo.

**Cuándo hay que volver a mirarlo**: cada enero (SMI, cotizaciones y MEI
cambian por año) y cuando el INE publique una Encuesta de Condiciones de Vida
nueva.

## Fuentes

| Clave | Fuente | URL |
|---|---|---|
| RD-SMI | Real Decreto 126/2026, de 18 de febrero, salario mínimo interprofesional para 2026 (BOE núm. 44, 19-02-2026) | https://www.boe.es/buscar/act.php?id=BOE-A-2026-3815 |
| ORDEN-COT | Orden PJC/297/2026, de 30 de marzo, normas de cotización de 2026 (BOE núm. 79, 31-03-2026) | https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-7296 |
| SS-TIPOS | Seguridad Social, tipos de cotización de trabajadores | https://www.seg-social.es/wps/portal/wss/internet/Trabajadores/CotizacionRecaudacionTrabajadores/36537 |
| SS-EDU | Seguridad Social, Portal Educativo (base de cotización y prorrata de pagas extra) | https://www.seg-social.es/wps/portal/wss/internet/PortalEducativo/Profesores/Unidad6/PESS602/PESS605/PESS608 |
| RIRPF | Reglamento del IRPF (RD 439/2007), texto consolidado | https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820 |
| INE-ECV | INE, Encuesta de Condiciones de Vida 2025, nota de prensa de 5-02-2026 | https://www.ine.es/dyngs/Prensa/ECV2025.htm |
| FPT-503020 | Finanzas para Todos, "Pon en práctica la regla 50/30/20" | https://www.finanzasparatodos.es/gestionar-tus-finanzas-pon-en-practica-la-regla-50-30-20 |
| FPT-HIPOTECA | Finanzas para Todos, "¿Necesitas una hipoteca?" | https://www.finanzasparatodos.es/necesitas-una-hipoteca-esto-tienes-que-tener-en-cuenta |
| PCB-PROPOSITOS | Banco de España, Portal del Cliente Bancario, "Propósitos financieros de año nuevo" (30-12-2025) | https://clientebancario.bde.es/pcb/es/blog/propositos-financieros-de-ano-nuevo-como-empezar-el-ano-con-estabilidad-economica.html |

## Nivel 1 · `01-radiografia-ingresos-gastos` (lectura)

| Dato | Dónde | Fuente | Estado |
|---|---|---|---|
| En 2025, el 8,5 % de la población llegaba a fin de mes con mucha dificultad | p. 1, bloque `dato` | INE-ECV | VERIFICADA. CORREGIDA respecto al informe, que decía "el 32 % de los hogares no llega con holgura a fin de mes, INE 2024": esa cifra no está en el INE (el 32,2 % de la ECV es quien no puede irse una semana de vacaciones) y el INE habla de población, no de hogares |
| Gastos fijos, variables, balance del mes | páginas y `calcula-balance` | — | CUENTA (1.350 − 620 − 480 = 250 €) |

El 36,4 % de la misma encuesta (no poder afrontar un imprevisto) se usa como
gancho en `ahorro/01-fondo-de-emergencia`, y se quitó de aquí para no repetir el
mismo gancho en dos mundos.

## Nivel 2 · `02-practica-primer-presupuesto` (interactivo)

Sin cifras oficiales. Todo son cuentas del presupuesto de Pepito
(`calcula-lo-que-queda`: 1.350 − 850 = 500 €; `prorratea-seguro`: 480 / 12 =
40 €; `averia-portatil`: 500 − 180 = 320 €).

## Nivel 3 · `03-regla-50-30-20-y-alquiler` (lectura)

| Dato | Dónde | Fuente | Estado |
|---|---|---|---|
| La 50/30/20 es "un punto de partida" que cada persona adapta: 50 % necesidades (con las deudas y los seguros), 30 % deseos, 20 % ahorro | p. 1 (`dato`), p. 2, minitest `cuotas-de-deudas` | FPT-503020 | VERIFICADA. CORREGIDA: el informe ponía las deudas en el 20 %; la fuente las mete en el 50 % |
| Vivienda: una referencia habitual es no pasar del 30-35 % de los ingresos netos | p. 3, minitest `referencia-vivienda` | Lo más cercano: FPT-HIPOTECA ("las entidades estiman que la tasa de endeudamiento no debe superar el 30-35 %") | REGLA PRÁCTICA. Se quitó el "el Banco de España recomienda" del informe: no está en el BdE |
| Repartos 65/20/15 y 70/20/10 | p. 5 | — | REGLA PRÁCTICA (ejemplos, no norma) |
| Esfuerzo del alquiler de Pepito: 720 / 1.800 = 40 % | p. 4, `calcula-esfuerzo` | — | CUENTA |

## Nivel 4 · `04-practica-gastos-hormiga` (interactivo)

Sin cifras oficiales. Cuentas: `calcula-hormiga-anual` (3,50 × 20 + 12 + 18 =
100 € al mes; × 12 = 1.200 €), `calcula-ahorro-mensual` (15 % de 1.800 =
270 €), `dos-euros-al-dia` (2 × 365 = 730 €). El reparto 65/20/15 es REGLA
PRÁCTICA.

## Nivel 5 · `05-nomina-bruto-neto-mei` (lectura)

| Dato | Dónde | Fuente | Estado |
|---|---|---|---|
| SMI 2026: 1.221 € al mes y 40,70 € al día | p. 1 (`dato`), p. 5, minitest `calcula-smi-doce` | RD-SMI, art. 1 | VERIFICADA |
| SMI anual no inferior a 17.094 € | p. 1, p. 5 | RD-SMI, art. 3.1 | VERIFICADA. El RD no dice "14 pagas": 17.094 = 14 × 1.221 es la cuenta, y el texto lo presenta así |
| SMI referido a jornada completa | p. 5 | RD-SMI, art. 1 | VERIFICADA |
| SMI en 12 pagas: 1.424,50 € | p. 5, `calcula-smi-doce` | — | CUENTA (17.094 / 12) |
| Contingencias comunes, parte del trabajador: 4,70 % | p. 2 | ORDEN-COT, art. 4.a) | VERIFICADA |
| Desempleo, trabajador: 1,55 % (1,60 % con contrato temporal) | p. 2 | ORDEN-COT, art. 33.2.a) | VERIFICADA. CORREGIDO el artículo: el informe decía art. 30 |
| Formación profesional, trabajador: 0,10 % | p. 2 | ORDEN-COT, art. 33.2.c) | VERIFICADA (artículo corregido, de 30 a 33.2.c) |
| FOGASA 0,20 %, solo la empresa | p. 2, minitest `hueco-fogasa` | ORDEN-COT, art. 33.2.b) | VERIFICADA (artículo corregido, de 30 a 33.2.b) |
| MEI 2026: 0,90 % de la base de contingencias comunes (0,75 empresa y 0,15 trabajador) | p. 3, minitest `mei-trabajador` | ORDEN-COT, art. 16 | VERIFICADA. Se quitó el "sube al 0,90 %": el tipo de 2025 no se comprobó |
| Total que aporta el trabajador con contrato indefinido: 6,50 % | p. 2 | Suma de los anteriores; SS-TIPOS da los mismos tipos | VERIFICADA |
| Sin retención hasta 15.876 € brutos al año (sin hijos ni cónyuge a cargo, contrato indefinido) | p. 4 | RIRPF, art. 81.1 (redacción del RD 142/2024), situación 3.ª con 0 descendientes | VERIFICADA. CORREGIDA la URL: el informe enlazaba otro documento del BOE |
| La retención es un adelanto; si se retiene de menos, la Renta "suele salir a pagar" | p. 4 | Funcionamiento general del IRPF | Se dice "suele" porque depende de otras rentas y deducciones |

## Nivel 6 · `06-practica-revisa-la-nomina` (interactivo)

| Dato | Dónde | Fuente | Estado |
|---|---|---|---|
| 4,70 % / 1,55 % / 0,10 % / 0,15 % (MEI) del trabajador | `empareja-cotizaciones`, `calcula-total-cotizacion` (6,50 %) | ORDEN-COT, arts. 4.a), 16 y 33.2 | VERIFICADA |
| MEI de una base de 2.000 €: 3 € | `calcula-mei` | ORDEN-COT, art. 16 | VERIFICADA (cuenta: 2.000 × 0,15 %) |
| Neto: 2.000 − 130 − 200 = 1.670 € | `calcula-neto-opciones` | — | CUENTA (el 10 % de IRPF es un supuesto del ejemplo) |
| La base de cotización mensual incluye la prorrata de las pagas extra | `base-con-pagas-extra` | SS-EDU | VERIFICADA en la fuente divulgativa oficial de la Seguridad Social. No se cita el artículo de la LGSS, que no se ha leído |

## Nivel 7 · `07-patrimonio-neto-y-metas-smart` (lectura)

| Dato | Dónde | Fuente | Estado |
|---|---|---|---|
| El Banco de España propone un seguimiento mensual del presupuesto | p. 1 (`dato`) | PCB-PROPOSITOS | VERIFICADA |
| Una cita mensual de "unos 20 minutos" | páginas | — | REGLA PRÁCTICA. Se quitó la atribución a Finanzas para Todos del informe: no se encontró |
| Patrimonio neto = lo que tienes − lo que debes | páginas, `calcula-patrimonio` | Definición | CUENTA (4.500 + 2.500 − 1.200 − 800 = 5.000 €) |

## Nivel 8 · `08-practica-plan-de-patrimonio` (interactivo)

Sin cifras oficiales. Cuentas: `calcula-patrimonio-noviembre` (3.200 + 11.500 −
4.100 − 1.600 = 9.000 €), `calcula-amortizacion` (80 % de 250 = 200 €),
`quien-tiene-mas` (500 + 8.000 − 18.000 − 4.000 = −13.500 €). Las metas SMART
son un método de planificación, no una norma.

## Nivel 9 · `09-jefe-niebla-financiera` (jefe)

| Dato | Dónde | Fuente | Estado |
|---|---|---|---|
| SMI 2026: 1.221 € al mes en 14 pagas | `smi-2026` | RD-SMI, arts. 1 y 3.1 | VERIFICADA. Discutible: el RD no dice "14 pagas" (sale del Estatuto de los Trabajadores y de la cuenta) |
| Sin retención hasta 15.876 € | `limite-sin-retencion` | RIRPF, art. 81.1 | VERIFICADA |
| MEI del trabajador 0,15 %: 2.400 × 0,15 % = 3,60 € | `calcula-mei-jefe` | ORDEN-COT, art. 16 | VERIFICADA |
| Neto con 6,50 % de SS y 12 % de IRPF: 2.000 − 130 − 240 = 1.630 € | `calcula-neto-jefe` | ORDEN-COT (el 6,50 %); el 12 % es un supuesto | VERIFICADA / CUENTA |
| Patrimonio antes y después de pagar deuda: 7.000 € | `calcula-patrimonio-final` | — | CUENTA |

## Lo que se quitó del informe por no poder verificarlo

- "El esfuerzo medio para alquilar es del 39 % en 2026": no está en el Banco
  de España ni en el INE con esa medida.
- "El Banco de España recomienda el 30-35 % para vivienda": atribución no
  encontrada (queda como regla práctica).
- La Ley 21/2021 como fuente del MEI: no se ha leído; se cita solo la Orden
  PJC/297/2026.
- "De acuerdo con las recomendaciones del Banco de España" en los pasos del
  presupuesto, y "Finanzas para Todos recomienda 20 minutos": atribuciones no
  encontradas.
