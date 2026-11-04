# Revisión de cifras del Camino del héroe

**Nada se publica sin esta lectura.** Es la lista de lo que una persona tiene
que comprobar antes de mergear los cursos de los cuatro mundos (rama
`feat/PrimerosCursosMundos`). Comprobaciones hechas el **4 de noviembre de
2026**.

Dónde está cada cosa:

- **Este documento**: arriba, lo NO VERIFICADO, lo CORREGIDO y lo que hay que
  decidir, por mundo. Debajo, la revisión completa de cada mundo: tabla de
  niveles, cuentas, cifras con norma y URL, lo quitado y las preguntas
  discutibles.
- **`content/heroe/<mundo>/FUENTES.md`**: cada dato de cada nivel con su fuente,
  ordenado por nivel. Es la referencia para mantener el curso al día.
- **Los informes de investigación**: `mundo-salud-financiera.md`,
  `mundo-inversión.md`, `mundo-deuda.md` y `mundo-ahorro.md` (este último no es
  de Gemini: lo hizo el subagente de Ahorro, con URLs). Son borradores: una
  cifra no es cierta porque salga ahí.

## Lo que comprobé yo, además de los subagentes

- **Todas las cuentas**: los 52 `calcula` de los cuatro mundos, rehechos uno a
  uno, y la simulación de la revolving de `deuda/03` (43 meses, 1.497,65 €).
  Todas las soluciones cuadran.
- **Tres cifras que sorprendían**, en la fuente oficial:
  - el SMI de 2026, 1.221 € (RD 126/2026, BOE-A-2026-3815);
  - el IPC de septiembre de 2026, 4,9 % (INE, nota del 14-10-2026);
  - el Euríbor de septiembre de 2026, 3,247 % (BOE-A-2026-20519).
- **Coherencia entre mundos**: el FGD (100.000 € por titular y entidad), la
  retención del 19 % y el primer tramo del ahorro (6.000 € al 19 %) valen lo
  mismo en todas partes.
- **Nombres y marcas**: solo sale Pepito. No sale ningún banco, fondo, bróker,
  aseguradora, app ni plataforma. Cl@ve y la Cuenta Directa del Tesoro son
  servicios públicos.
- **Un cambio mío**: el gancho de `salud/01` usaba el mismo 36,4 % del INE que el
  de `ahorro/01`. En Salud se queda solo el 8,5 % que llega a fin de mes con
  mucha dificultad (misma encuesta, verificado); el 36,4 % sigue en Ahorro. La
  revisión de Salud de más abajo es anterior a este cambio.
- **Lectura entera** de un nivel por mundo: `salud/05`, `ahorro/05`,
  `inversion/05` y `deuda/03`.

## NO VERIFICADO y pendiente de decidir

### Deuda y crédito

- **El estado del anteproyecto: VERIFICADO el 4-11-2026, sigue siendo
  anteproyecto.** Ninguna referencia del Consejo de Ministros del 6, 13, 20 y 27
  de octubre ni del 3 de noviembre recoge la segunda vuelta. Además, las Cortes
  están disueltas desde el 6 de octubre (Real Decreto 806/2026, BOE-A-2026-20742;
  elecciones el 29 de noviembre, nuevas Cámaras el 23 de diciembre), así que
  ningún proyecto puede tramitarse hasta la nueva legislatura. Las dos frases
  que dicen "en noviembre de 2026 seguía en anteproyecto" (la p. 7 de
  `03-tarjetas-revolving-y-usura` y la explicación de `fecha-directiva` en el
  jefe) son correctas. Hay que volver a mirarlas cuando la nueva legislatura
  mueva la norma.
- **STS 366/2026**: no aparece en CENDOJ, solo en webs de despachos. **Quitada.**
- **STS 258/2023 y 1378/2023**: verificadas en el comentario de la biblioteca
  jurídica del BOE, no en el texto de CENDOJ.
- **Plazos del SAC** (15 días hábiles y un mes): vistos solo en una entrada de
  2019 del Portal del Cliente Bancario.
- **Plazo del Banco de España**: la Ley 7/2017 dice 90 días y la Orden
  ECC/2502/2012 consolidada, 4 meses. **No se usa** en el contenido.
- **`exoneracion-doble`** (jefe): da 20.000 € porque aplica el tope de 10.000 €
  a cada organismo, Hacienda y Seguridad Social. Es como lo dice el art.
  489.1.5.º del TRLC, pero conviene que lo mire alguien de derecho concursal.

### Inversión

- **Criptoactivos sin cobertura del FGD ni del FOGAIN**: la fuente es el
  comunicado de la CNMV y el Banco de España de 2021 (el texto dice la fecha).
  Falta confirmar que sigue así en 2026, con el Reglamento MiCA aplicándose.
- **Que mover un plan de pensiones a otro no tribute**: se deduce de la ley,
  pero no se vio escrito. El texto no lo afirma ("sin cobrarlos").
- **El indicador de riesgo del 1 al 7** en el Reglamento PRIIPs: no cargó
  EUR-Lex. Sí está verificado en la CNMV.
- **"3 a 5 años" antes de invertir en bolsa**: regla práctica sin fuente
  oficial. Va como "una referencia habitual".

### Salud financiera

- **La prorrata de las pagas extra en la base de cotización**: verificada en el
  Portal Educativo de la Seguridad Social, no en el artículo de la LGSS.
- **El MEI de 2025**: no se comprobó, y por eso se quitó el "sube al 0,90 %".
  El 0,90 % de 2026 sí está verificado.
- **Reglas prácticas sin atribuir**: el 30-35 % para la vivienda, la cita
  mensual de 20 minutos y los repartos 65/20/15 y 70/20/10.

### Ahorro

- **El tope de la penalización al cancelar un depósito** (`ahorro/03`, p. 1):
  el Portal del Cliente Bancario dice que "no puede exceder" los intereses
  brutos, pero no cita la norma. La fuente del dato ya dice "Banco de España".
  La pregunta del jefe que lo usa no depende de ese tope.
- **Entidades de otro país de la UE**: verificado en la FAQ del FGD; no se ha
  leído la directiva.

## CORREGIDO respecto a los informes

### Salud financiera

- El "32 % de hogares, INE" no existe: pasa a ser el 8,5 % (Salud) y el 36,4 %
  (Ahorro) de la ECV 2025, que hablan de población.
- 50/30/20: las deudas van en el 50 %, no en el 20 % (Finanzas para Todos).
- Desempleo, FP y FOGASA: el artículo es el 33.2 de la Orden PJC/297/2026, no el 30.
- La URL del art. 81.1 del Reglamento del IRPF (el informe enlazaba otro
  documento del BOE).
- El reparto del nivel 4: 270 € de ahorro, no 260 €.
- Se quitan la luz como "gasto fijo" y que las suscripciones "se cancelan
  gratis y al momento".

### Inversión

- Comisiones a 30 años: 52.753 / 34.358 / 18.395 €, no 52.990 / 34.424 /
  18.566 €.
- El límite de 1.500 € de los planes de pensiones llevaba omitido el tope del
  30 % de los rendimientos.
- Se quita "la base general va del 19 % al 47 %", porque depende de la
  comunidad autónoma.
- La comisión "gane o pierda el fondo" solo vale si se cobra sobre el patrimonio.
- Las contingencias del rescate de un plan, separadas de los supuestos
  excepcionales.
- El valor liquidativo no es "el de cierre".
- El Ibex no son "las 35 mayores" empresas; el +49,3 % de 2025 sustituye al
  "casi el 50 %".
- En `calcula-tramos`, el fondo pasa a ser solo de Pepito, para que la cuenta
  valga.

### Deuda y crédito

- Ficheros de morosos: no entran las deudas de **menos** de 50 €
  (disposición adicional sexta de la LO 3/2018). El informe decía "superior a
  50 €" y citaba el art. 20.2.b).
- CIRBE: el umbral es de 1.000 € **o más**, no "más de 1.000 €".
- Cuadro de amortización: la cuota es de 258,20 € y no de 265 €; el coste total
  es de 158,40 € y no de 240 €.
- Segunda Oportunidad: se quita "el 100 % de la deuda privada".
- El descubierto tácito (art. 20.4 de la Ley 16/2011) ya no se atribuye al
  anteproyecto.
- **Todos los topes del anteproyecto, fuera** (4 % mensual, 5 % de apertura…).

### Ahorro

No había informe del que partir. Las cifras de 01, 02 y el jefe se volvieron a
comprobar y siguen vigentes; en 02, "Marcos" pasa a ser Pepito.

---

# Anexo: revisión completa de cada mundo

Tal como la escribió cada subagente, con las cuentas, las cifras con su norma y
URL, lo quitado y las preguntas discutibles.

## Revisión del mundo Salud financiera

En `content/heroe/salud/`. Pasa
`pnpm heroe:validar` con los cuatro mundos juntos.
Fecha de las comprobaciones: 4 de noviembre de 2026. `mundo.json` solo cambia en `niveles`.

### a) Los 9 niveles

| Fichero | Tipo | Título | Min | Preguntas |
|---|---|---|---|---|
| 01-radiografia-ingresos-gastos | lectura (6 pág.) | La radiografía de tus ingresos y gastos | 3 | 4 |
| 02-practica-primer-presupuesto | interactivo | El primer presupuesto mensual de Pepito | 4 | 7 (5 tipos) |
| 03-regla-50-30-20-y-alquiler | lectura (6 pág.) | La regla 50/30/20 y el peso del alquiler | 3 | 5 |
| 04-practica-gastos-hormiga | interactivo | A la caza de gastos hormiga y suscripciones | 4 | 7 (6 tipos) |
| 05-nomina-bruto-neto-mei | lectura (6 pág.) | La nómina por dentro: bruto, neto y MEI | 4 | 5 |
| 06-practica-revisa-la-nomina | interactivo | Pepito revisa su nómina línea a línea | 4 | 7 (6 tipos) |
| 07-patrimonio-neto-y-metas-smart | lectura (6 pág.) | Patrimonio neto, metas SMART y cita mensual | 3 | 4 |
| 08-practica-plan-de-patrimonio | interactivo | El plan de patrimonio del camionero Pepito | 4 | 7 (6 tipos) |
| 09-jefe-niebla-financiera | jefe (aprobado 70) | La Niebla Financiera | 5 | 12 (6 tipos, 3 calcula) |

Todas las lecturas llevan, en la primera página, imagen con pie y dato con fuente; un ejemplo
en tabla; mito y realidad; una idea por página como mucho y el gancho como último párrafo.
Páginas de 60 palabras o menos (contadas con un script, títulos de tabla incluidos).

### b) Cuentas (rehechas con un script; todas cuadran)

| Fichero · id | Cuenta | Solución |
|---|---|---|
| 01 · ejemplo "Un mes de Pepito" | 1.350 − 480 − 320 − 150 = 400 € | fila +40000 |
| 01 · calcula-balance | 1.350 − 620 − 480 = 250 € | 25000 |
| 02 · prorratea-seguro | 480 / 12 = 40 € | (VF) |
| 02 · calcula-lo-que-queda | 400+220+35+25+60+110 = 850; 1.350 − 850 = 500 € | 50000 |
| 02 · averia-portatil | 500 − 180 = 320 € | opción 0 |
| 03 · ejemplo "Las necesidades de Pepito en un mes" | 720 + 300 + 150 = 1.170 €; 720/1.800 = 40 %; 1.170/1.800 = 65 % | fila −117000 |
| 03 · calcula-esfuerzo | 720 / 1.800 × 100 = 40 % | 4000 |
| 04 · calcula-hormiga-anual | 3,50 × 20 = 70; 12 + 18 = 30; 100 × 12 = 1.200 € | 120000 |
| 04 · reparto-adaptado | 720+300+150 = 1.170 (65 %); 20 % = 360; 15 % = 270 | opción 0 |
| 04 · ordena-coste-anual | 36; 8×12 = 96; 35×12 = 420; 2×365 = 730 | orden dado |
| 04 · dos-euros-al-dia | 2 × 365 = 730 € | (VF falso) |
| 04 · calcula-ahorro-mensual | 1.800 × 0,15 = 270; 1.170+360+270 = 1.800 | 27000 |
| 05 · ejemplo MEI | 2.000 × 0,15 % = 3; × 0,75 % = 15; total 0,90 % = 18 € | −300/−1500/−1800 |
| 05 · ejemplo bruto | 12 × 1.221 = 14.652; 2 × 1.221 = 2.442; total 17.094; /12 = 1.424,50 | 1465200/244200/1709400 |
| 05 · calcula-smi-doce | 1.221 × 14 = 17.094; / 12 = 1.424,50 € | 142450 |
| 06 · calcula-total-cotizacion | 4,70 + 1,55 + 0,10 + 0,15 = 6,50 % | 650 |
| 06 · calcula-mei | 2.000 × 0,0015 = 3,00 € | 300 |
| 06 · calcula-neto-opciones | 2.000 × 6,5 % = 130; 2.000 − 130 − 200 = 1.670 € | opción 0 |
| 07 · ejemplo patrimonio | 4.000 + 10.000 − 1.500 − 3.500 = 9.000 € | fila +900000 |
| 07 · calcula-patrimonio | 4.500 + 2.500 − 1.200 − 800 = 5.000 € | 500000 |
| 08 · calcula-patrimonio-noviembre | 14.700 − 5.700 = 9.000 € | 900000 |
| 08 · quien-tiene-mas | compañero: 500 + 8.000 − 18.000 − 4.000 = −13.500 € | opción 0 |
| 08 · empareja-metas | 200 × 8 = 1.600 € | — |
| 08 · calcula-amortizacion | 250 × 0,80 = 200 € | 20000 |
| 09 · calcula-mei-jefe | 2.400 × 0,0015 = 3,60 € | 360 |
| 09 · calcula-neto-jefe | 130 + 240 = 370; 2.000 − 370 = 1.630 € | 163000 |
| 09 · calcula-patrimonio-final | antes 10.000 − 3.000 = 7.000; después 9.000 − 2.000 = 7.000 € | 700000 |

Todas con tolerancia 0: ninguna depende de un redondeo que no diga el enunciado.

### c) Cifras legales, fiscales u oficiales

| Valor | Dónde sale | Norma / organismo | URL | Estado |
|---|---|---|---|---|
| SMI 2026: 1.221 €/mes y 40,70 €/día | 05 p1 (dato), 05 p5, 05 · calcula-smi-doce, 09 · smi-2026 | Real Decreto 126/2026, de 18 de febrero, art. 1 (BOE núm. 44, 19/02/2026) | https://www.boe.es/buscar/act.php?id=BOE-A-2026-3815 | VERIFICADA |
| SMI anual no inferior a 17.094 € | 05 p1, 05 p5, 09 · smi-2026 | RD 126/2026, art. 3.1 | ídem | VERIFICADA. Ojo: el RD **no habla de 14 pagas**; 17.094 = 14 × 1.221 es aritmética, y el texto lo dice así |
| SMI referido a jornada legal (a prorrata si es menor) | 05 p5 ("a jornada completa") | RD 126/2026, art. 1 | ídem | VERIFICADA |
| SMI en 12 pagas: 1.424,50 € | 05 p5, 05 · calcula-smi-doce | Cálculo (17.094 / 12) | — | Cuenta, no norma |
| Contingencias comunes trabajador 4,70 % (total 28,30 %) | 05 p2, 06 · empareja/calcula, 09 · calcula-neto-jefe | Orden PJC/297/2026, de 30 de marzo, art. 4.a) (BOE núm. 79, 31/03/2026) | https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-7296 | VERIFICADA |
| Desempleo trabajador 1,55 % indefinido / 1,60 % temporal | 05 p2, 06 · empareja | Orden PJC/297/2026, art. 33.2.a) | ídem | VERIFICADA. CORREGIDO el artículo: el informe decía art. 30 |
| Formación profesional trabajador 0,10 % | 05 p2, 06 | Orden PJC/297/2026, art. 33.2.c) | ídem | VERIFICADA (artículo corregido: art. 30 → 33.2.c) |
| FOGASA 0,20 %, solo empresa | 05 p2, 05 · hueco-fogasa | Orden PJC/297/2026, art. 33.2.b) | ídem | VERIFICADA (artículo corregido: art. 30 → 33.2.b) |
| MEI 2026: 0,90 % sobre la base de contingencias comunes; 0,75 empresa y 0,15 trabajador | 05 p3, 05 · mei-trabajador, 06 · calcula-mei, 09 · calcula-mei-jefe | Orden PJC/297/2026, art. 16 | ídem | VERIFICADA |
| Total trabajador 6,50 % | 05 p2, 06, 09 | Suma de los anteriores | ídem + https://www.seg-social.es/wps/portal/wss/internet/Trabajadores/CotizacionRecaudacionTrabajadores/36537 | VERIFICADA (la tabla de la Seguridad Social da los mismos tipos) |
| La base de cotización incluye la prorrata de las pagas extra | 06 · base-con-pagas-extra | Seguridad Social, Portal Educativo ("incrementado por el prorrateo de las percepciones de vencimiento superior al mensual") | https://www.seg-social.es/wps/portal/wss/internet/PortalEducativo/Profesores/Unidad6/PESS602/PESS605/PESS608 | VERIFICADA en la fuente divulgativa oficial. El artículo de la LGSS que citaba el informe (RDL 8/2015) no lo he leído: no se cita |
| No hay retención si se cobra 15.876 € al año o menos (sin hijos ni cónyuge a cargo, "otras situaciones", 0 descendientes) | 05 p4, 09 · limite-sin-retencion | Reglamento del IRPF (RD 439/2007), art. 81.1, redacción del RD 142/2024 | https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820 | VERIFICADA en el texto consolidado (el informe enlazaba otro id del BOE, BOE-A-2007-6886, que es una orden de ayudas juveniles: URL CORREGIDA). La situación "sin hijos ni cónyuge a cargo" es la 3.ª, mejor descrita que el "sin cargas" del informe |
| 36,4 % de la población no puede afrontar un gasto imprevisto; 8,5 % llega a fin de mes con mucha dificultad (2025) | 01 p1 (dato) | INE, Encuesta de Condiciones de Vida 2025, nota de prensa de 5/02/2026 | https://www.ine.es/dyngs/Prensa/ECV2025.htm | CORREGIDA: el informe decía "el 32 % de los hogares no llega con holgura a fin de mes, INE 2024". Esa cifra no está en el INE; la más parecida es el 32,2 % de la población que no puede irse una semana de vacaciones. Además el INE habla de población, no de hogares |
| 50/30/20: 50 % necesidades (incluye deudas y seguros), 30 % deseos, 20 % ahorro; "un punto de partida, debes adaptarla" | 03 p1 (dato), 03 p2, 03 · cuotas-de-deudas | Finanzas para Todos | https://www.finanzasparatodos.es/gestionar-tus-finanzas-pon-en-practica-la-regla-50-30-20 | VERIFICADA. CORREGIDO el reparto: el informe ponía "20 % para ahorro o amortizar deudas"; la fuente mete las deudas en el 50 % |
| Vivienda: referencia del 30-35 % de los ingresos netos | 03 p3, 03 · referencia-vivienda | Regla práctica. Lo más cercano verificado: "las entidades estiman que la tasa de endeudamiento no debe superar el 30-35 % de los ingresos" (Finanzas para Todos) | https://www.finanzasparatodos.es/necesitas-una-hipoteca-esto-tienes-que-tener-en-cuenta | CORREGIDA: se quita "el Banco de España recomienda", que no he encontrado en el BdE. Se enseña como "una referencia habitual" y sin fuente atribuida |
| Seguimiento mensual del presupuesto | 07 p1 (dato) | Banco de España, Portal del Cliente Bancario, 30/12/2025 ("Haz seguimiento mensual: revisa tu presupuesto y ajusta lo necesario") | https://clientebancario.bde.es/pcb/es/blog/propositos-financieros-de-ano-nuevo-como-empezar-el-ano-con-estabilidad-economica.html | VERIFICADA. Los "20 minutos" que el informe atribuía a Finanzas para Todos NO están verificados: se dejan como "una costumbre práctica", sin fuente |

No queda ninguna cifra oficial como NO VERIFICADO dentro del contenido: lo que no he podido
confirmar se ha quitado o se ha dejado como regla práctica sin atribuir.

### d) Lo que se ha quitado o cambiado del informe

- **"32 % de hogares, INE 2024"**: no existe así en el INE (ver c). Sustituido por el 36,4 % y el 8,5 % de la ECV 2025.
- **"Esfuerzo medio para alquilar del 39 % en 2026"** (pág. 3 y mito del nivel 3): no lo he encontrado en el Banco de España ni en el INE; los datos del BdE que aparecen usan otras medidas (renta bruta, mediana, años 2022). Fuera.
- **"El Banco de España recomienda 30-35 % para vivienda, suministros incluidos"**: atribución no verificada. Queda como regla práctica (ver c).
- **"Ley 21/2021"** como fuente del MEI: no la he leído; se cita solo la Orden PJC/297/2026, que sí.
- **"El MEI sube al 0,90 %"**: se quita el "sube" (no he comprobado el tipo de 2025).
- **"De acuerdo con las recomendaciones del Banco de España"** en el orden de los pasos del presupuesto (nivel 2): atribución quitada.
- **"Finanzas para Todos recomienda 20 minutos"**: atribución quitada.
- **Tabla de cifras que no se usan**: contingencias comunes empresa 23,60 %, base máxima 5.101,20 €, bases mínimas 1.424,40 € y 47,48 €/día, retención mínima del 2 % (art. 86.2 RIRPF). Las bases y el 23,60 % están verificados, pero no hacían falta y alargaban la lectura del nivel 5. El 2 % se ha dejado fuera a propósito para no complicar el límite del art. 81.
- **Nivel 2, ejercicio 1**: el informe preguntaba si la luz es "gasto fijo". Discutible (varía cada mes): ahora se pregunta cuál de tres gastos era prescindible.
- **Nivel 4, ejercicio 3**: el informe decía que 720 + 300 + 160 = 1.180 € es "65,5 %" (es 65,6 %) y que el 15 % de 1.800 son "260 €" (son 270 €). Corregido: facturas de 150 €, necesidades de 1.170 € (65 % exacto) y 270 € de ahorro, coherente con el ejercicio 7.
- **Nivel 4, ejercicio 5** ("para dar de baja una suscripción es obligatorio contratar un producto de consolidación", y la explicación "se cancelan gratis e inmediatamente"): la explicación no es cierta en todos los casos (permanencias). Sustituido por un VF de "2 € al día = 730 € al año".
- **Gonzalo, Lucía, Marc, Elena, Roberto, Carmen**: todos son Pepito, con su edad y su ciudad en cada ejemplo (24 años en Valencia; 31 en Barcelona; Sevilla; 58 en Madrid). El compañero del nivel 8 no lleva nombre.
- **"Camioneta"** pasa a "furgoneta" y el "camión" se queda en su oficio.
- **Glosario**: se usan activo, pasivo, base de cotización, contingencias comunes, FOGASA, gasto fijo, variable y hormiga, IRPF y retención, líquido a percibir, MEI, SMART, patrimonio neto, 50/30/20, bruto, SMI y tasa de esfuerzo. No entra la definición de IRPF como "tributo personal, directo y progresivo": no cabía sin añadir otra página.
- **Lenguaje**: se han quitado tecnicismos del informe ("quiebra patrimonial neta", "tesorería", "ruina técnica", "naturaleza contable") y el "infinitamente mejor".

### e) Preguntas que alguien podría discutir

- **09 · smi-2026** (VF verdadero: "1.221 € al mes en 14 pagas"). El RD no dice "14 pagas"; dice 1.221 €/mes y 17.094 € al año como mínimo. Las 14 pagas salen del Estatuto (dos pagas extra) y de la aritmética. La explicación lo cuenta así, pero un jurista podría pedir quitar "en 14 pagas".
- **05 p4 y 09 · limite-sin-retencion** (15.876 €). Es la situación 3.ª con 0 descendientes del art. 81.1. Lo he acotado a "sin hijos ni cónyuge a cargo y con contrato indefinido" para dejar fuera el mínimo del 2 % de los contratos de menos de un año (art. 86.2) y las otras situaciones familiares. Es la pregunta más técnica del mundo.
- **06 · base-con-pagas-extra** (VF verdadero). Cierto según la Seguridad Social, pero técnico. Si se quiere un mundo más llano, es la primera candidata a salir.
- **06 · hueco-renta y 05 p4** ("lo normal es que la Renta salga a pagar"). Va con "lo normal" porque depende de otras rentas, deducciones y de si hay obligación de declarar.
- **03 · referencia-vivienda** (30-35 %). Es una regla práctica, y se presenta así; pero la cifra varía según la fuente (30 %, 35 %, 40 % con todas las deudas).
- **08 · hueco-meta-especifica** ("___ y medible": específica). Fijar una fecha también la hace temporal, pero "temporal" no está entre las opciones; las otras dos (ambigua, abstracta) son claramente falsas.
- **09 · empareja-conductas** ("vender el coche para pagar un préstamo del mismo valor lo deja igual"). Supone que se vende al valor por el que figuraba en el patrimonio.
- **02 · empareja-decisiones** ("medicinas por una gripe → gasto variable pero necesario"). Defendible, pero "variable" y "necesario" son dos ejes distintos; la lectura 1 explica que hay gastos necesarios que varían.
- **03 p5** (repartos "65/20/15 o 70/20/10"). Son ejemplos del informe, no una fuente; se presentan como posibilidades, no como regla.

## Ahorro: revisión

`pnpm heroe:validar` pasa con los cuatro mundos juntos. Las fuentes con sus URLs están en `docs/investigación-heroe/mundo-ahorro.md`.

### a) Los 9 niveles (en el orden de `mundo.json`)

| # | Fichero | Tipo | Título | Min | Páginas | Preguntas |
|---|---|---|---|---|---|---|
| 1 | 01-fondo-de-emergencia.json | lectura | El fondo de emergencia | 3 | 7 | 4 (minitest) |
| 2 | 02-practica-el-colchon.json | interactivo | Practica: monta tu colchón | 3 | — | 6 (5 tipos) |
| 3 | 03-cuentas-y-depositos.json | lectura | Cuentas remuneradas y depósitos a plazo | 4 | 6 | 4 (minitest) |
| 4 | 04-practica-tae-y-depositos.json | interactivo | Practica: elige dónde aparcar tus ahorros | 4 | — | 8 (los 6 tipos) |
| 5 | 05-fgd-y-letras-del-tesoro.json | lectura | El Fondo de Garantía y las Letras del Tesoro | 4 | 8 | 4 (minitest) |
| 6 | 06-practica-fgd-y-letras.json | interactivo | Practica: ahorro a salvo con el FGD y las Letras | 4 | — | 9 (los 6 tipos) |
| 7 | 07-inflacion-y-compuesto.json | lectura | Inflación, interés compuesto y metas con fecha | 4 | 8 | 4 (minitest) |
| 8 | 08-practica-metas-con-fecha.json | interactivo | Practica: la meta de Pepito contra la inflación | 4 | — | 8 (los 6 tipos) |
| 9 | 03-jefe-del-ahorro.json | jefe | El Tragaperras (aprobado 70) | 5 | — | 12 (los 6 tipos, 4 `calcula`) |

En `mundo.json` solo cambia `niveles`. Los ids 01, 02 y 03-jefe siguen igual, y el jefe es el último.

**Lo que usa el E2E y sigue intacto**: el título de página "Lo inesperado siempre llega", el título "El fondo de emergencia", los 4 minitest de 01 en su orden y con sus respuestas buenas ("Para cubrir imprevistos sin endeudarte", "6", Falso, "100.000 € por titular y entidad") y el título "Practica: monta tu colchón".

**Cambios en 01, 02 y el jefe** (ids y cifras sin tocar):

- 01: en la página 1 entran un `imagen` (hucha) y un `dato` (INE, ECV 2025).
- 01: en la página 2 entra el mito ("Para eso ya está la tarjeta") frente a la realidad.
- 01: se añaden negritas y cursivas, y un gancho final en la última página.
- 01: se acortan textos para que ninguna página pase de 60 palabras.
- 02: "Marcos" pasa a ser **Pepito**; también se añaden negritas.
- Jefe: sube a 12 preguntas, de 4 a 5 minutos, y tiene una descripción nueva.

Cada página de lectura tiene 60 palabras como mucho y de 1 a 3 marcas, comprobado con un script. Cada lectura lleva:

- en la página 1, un `imagen` con su pie y un `dato` con su fuente;
- un ejemplo de Pepito en tabla;
- el mito frente a la realidad;
- el gancho final como último párrafo.

### b) Cada "calcula" y cada total de ejemplo

Todas las cuentas están rehechas con `decimal` de Python, y todas cuadran al céntimo. Ninguna depende de un redondeo.

| Nivel · id | Cuenta | Solución |
|---|---|---|
| 02 · calcula-fondo | 3 × 950 € = 2.850 € | 285000 |
| 02 · calcula-intereses | 5.000 € × 2 % = 100 € | 10000 |
| 03 · calcula-neto | 8.000 × 2 % = 160; 160 × 19 % = 30,40; 160 − 30,40 = 129,60 € | 12960 |
| 04 · calcula-bruto | 6.000 × 2,5 % = 150 € | 15000 |
| 04 · calcula-neto | 150 × 19 % = 28,50; 150 − 28,50 = 121,50 € | 12150 |
| 06 · calcula-descubierto | 120.000 − 100.000 = 20.000 € | 2000000 |
| 06 · cuenta-hermana | 180.000 ÷ 2 = 90.000 € | 9000000 |
| 06 · calcula-letras | 5 × (1.000 − 990) = 50 € | 5000 |
| 07 · calcula-compuesto | 5.000 × 1,04 = 5.200; × 1,04 = 5.408 € | 540800 |
| 08 · calcula-cuota | 2.400 ÷ 12 = 200 € | 20000 |
| 08 · calcula-con-ahorro | (2.400 − 600) ÷ 12 = 150 € | 15000 |
| 08 · calcula-compuesto | 2.000 × 1,03 = 2.060; × 1,03 = 2.121,80 € | 212180 |
| Jefe · calcula-seis-meses | 6 × 1.300 = 7.800 € | 780000 |
| Jefe · calcula-retencion | 200 − 38 = 162 € | 16200 |
| Jefe · calcula-compuesto | 300 + 309 = 609 € de intereses | 60900 |
| Jefe · calcula-meta | 6.000 ÷ 24 = 250 € | 25000 |

Todas las tolerancias son 0.

| Ejemplo y nota | Cuenta |
|---|---|
| 01 · gastos de Pepito | −650 − 300 − 120 − 50 = −1.120 €. Por 3 meses, 3.360 €; por 6 meses, 6.720 € |
| 03 · depósito de Pepito | +300 (3 % de 10.000) − 57 (19 %) = +243 € |
| 03 · TIN del 3 % pagado cada mes | (1 + 0,0025)^12 − 1 = 3,0416 %, de ahí "unos 3,04 %". Pagado una vez al año, 3 % |
| 05 · cuenta conjunta | 75.000 + 75.000 = 150.000 € |
| 05 · minitest cuenta-conjunta | 160.000 ÷ 2 = 80.000 € por titular |
| 05 · tres Letras | −2.955 (3 × 985) + 3.000 = +45 € |
| 07 · compra de Pepito | −300 × 1,05 = −315; diferencia −15 € |
| 07 · mito | 1.000 × 1,05 = 1.050 € |
| 07 · simple frente a compuesto | Simple: 200 + 200 = 400 €. Compuesto: 200 + 204 = 404 € |
| 07 · moto | 3.600 ÷ 18 = 200 € |
| 07 · minitest hueco-meta | 3.000 ÷ 12 = 250 € |

Los tipos de interés y los precios de Letras de los ejemplos (2 %, 2,5 %, 3 %, 4 %, 985 €, 990 €) son ilustrativos, y el texto lo dice donde aparecen como oferta o precio.

### c) Cifras legales, fiscales u oficiales

| Valor | Dónde sale | Norma / fuente | URL | Estado |
|---|---|---|---|---|
| FGD: 100.000 € por titular y entidad | 01 p5 y minitest `fgd`; 02 `empareja-conceptos`; 05 p1, p4 y minitest `cuenta-conjunta`; 06 `calcula-descubierto`, `como-cubrirlo` y `cuenta-hermana`; jefe `fgd-repartir` y `empareja-mundo` | RDL 16/2011, art. 10.1; RD 2606/1996, art. 7.4 | boe.es BOE-A-2011-16173 / BOE-A-1996-28535; fgd.es | VERIFICADA |
| Varios titulares: según el contrato o, si no dice nada, a partes iguales | 05 p3 y minitest `cuenta-conjunta`; 06 `cuenta-hermana` | RD 2606/1996, art. 7.5; ejemplo de 150.000 € en la FAQ del FGD | ídem; fgd.es/preguntas-frecuentes | VERIFICADA |
| Los autorizados no tienen cobertura | 05 p3 | FAQ del FGD | fgd.es/preguntas-frecuentes | VERIFICADA |
| Cubre los depósitos a plazo y los intereses devengados | 05 p2 | RD 2606/1996, arts. 4.1 y 7.1 | BOE-A-1996-28535 | VERIFICADA |
| Pago en 7 días hábiles | 05 p1 (dato) | RD 2606/1996, art. 9.1.a) | ídem | VERIFICADA |
| Valores: 100.000 € aparte; no cubre pérdidas de valor ni planes de pensiones | 05 p2 y minitest `perdidas-inversion` | RDL 16/2011, art. 10.2; RD 2606/1996, art. 7 bis; FAQ del FGD | ídem | VERIFICADA |
| Sin límite durante 3 meses: venta de vivienda e indemnización por despido | 05 p4; 06 `venta-del-piso` | RDL 16/2011, art. 10.1.a) y b) | BOE-A-2011-16173 | VERIFICADA |
| Entidad de otro país de la UE: la cubre el fondo de su país, como mínimo igual que el FGD | 05 p2; 06 `entidad-ue` | FAQ del FGD (normativa comunitaria) | fgd.es/preguntas-frecuentes | VERIFICADA (en la FAQ del FGD; no he leído la directiva) |
| TAE: incluye el TIN, la frecuencia de pago y las comisiones; sirve para comparar | 01 p6; 02; 03 p4 y minitest `frecuencia-tae`; 04 `tae-con-comision`; jefe `tae-o-tin` | Orden EHA/2899/2011, art. 4.2; Portal del Cliente Bancario; glosario del BdE | BOE-A-2011-17015; clientebancario.bde.es; bde.es | VERIFICADA |
| Penalización por cancelar antes: como mucho, los intereses brutos devengados | 03 p1 (dato); jefe `cancelar-con-perdida` | Portal del Cliente Bancario, guía de depósitos a plazo | clientebancario.bde.es/…/depositosplazo/guia-textual/cancelacion/ | VERIFICADA en el BdE (la página no cita la norma: ver e) |
| Cancelar antes solo si el contrato lo prevé | 03 p3 y minitest `cancelar-siempre`; 04 `contrato-sin-cancelacion` | ídem | ídem | VERIFICADA |
| Se puede recuperar menos de lo depositado al cancelar | 03 p3; jefe `cancelar-con-perdida` | Blog del Portal del Cliente Bancario (31-10-2023) | clientebancario.bde.es/pcb/es/blog/… | VERIFICADA |
| Prórroga automática | 03 p3; 04 `empareja-ahorro` | Portal del Cliente Bancario, guía de cancelación | ídem | VERIFICADA (la guía solo la menciona) |
| Retención del 19 % sobre los intereses | 02 `calcula-intereses`; 03 p5, p6, minitest `hueco-retencion` y `calcula-neto`; 04; jefe `calcula-retencion` | RIRPF, art. 90.1 | BOE-A-2007-6820 (últ. mod. 07-10-2026) | VERIFICADA |
| Intereses = rendimientos del capital mobiliario, en la base del ahorro | 03 p6; 05 p8 y minitest `letra-hacienda` | LIRPF, arts. 25.2 y 46.a) | BOE-A-2006-20764 (últ. mod. 07-10-2026) | VERIFICADA |
| 2026: los primeros 6.000 € de la base del ahorro, al 19 %; por encima, tipos más altos | 03 p6 | LIRPF, arts. 66.1 y 76 (9,5 % + 9,5 %) | ídem | VERIFICADA |
| Letras: plazos de 3, 6, 9 y 12 meses; 1.000 € y múltiplos; subasta; al descuento | 05 p5 y minitest `hueco-valor-letra`; 06 `empareja-letras` y `calcula-letras`; jefe `empareja-mundo` | Tesoro Público, "Letras del Tesoro" | tesoro.es/deuda-publica/los-valores-del-tesoro/letras-del-tesoro | VERIFICADA |
| Letras sin retención, pero se declaran | 05 p8 y minitest `letra-hacienda`; 06 `hueco-retencion-letra` | RIRPF, art. 75.3.b); tesoro.es | BOE-A-2007-6820; tesoro.es | VERIFICADA |
| Compra en tesoro.es (certificado, DNIe o Cl@ve) o en el BdE con cita previa; Cuenta Directa gratis salvo la transferencia al vencer | 05 p6; 06 `empareja-letras` | FAQ del Tesoro; elijo.tesoro.es | tesoro.es/en/deuda-publica/preguntas-frecuentes | VERIFICADA |
| Al pedir se adelanta el dinero (el 100 %) y el sobrante se devuelve tras la subasta | 06 `ordena-compra-letra`; jefe `ordena-compra-letra` | FAQ 24 del Tesoro | ídem | VERIFICADA |
| IPC de septiembre de 2026: 4,9 %, el más alto desde febrero de 2023 | 07 p1 (dato) | INE, nota del 14-10-2026 | ine.es/dyngs/Prensa/IPC0926.pdf | VERIFICADA |
| El INE publica el IPC cada mes: un indicador adelantado a final de mes y el dato completo a mediados del siguiente | 07 p2 | INE (indicador adelantado del 30-10-2026; dato de septiembre del 14-10-2026) | ine.es | VERIFICADA |
| 36,4 % de la población sin capacidad para un imprevisto en 2025 | 01 p1 (dato) | INE, ECV 2025 (5-2-2026) | ine.es/dyngs/Prensa/ECV2025.pdf | VERIFICADA |

Nada de lo que se enseña como hecho ha quedado sin verificar. Ninguna cifra ha hecho falta corregirla, porque no había informe del que partir. Las cifras de 01, 02 y el jefe se han vuelto a comprobar (FGD, retención del 19 %, TAE y TIN) y siguen vigentes.

### d) Lo que no se ha incluido, y por qué

- **El 1,5 por mil de la Cuenta Directa** (mínimo 0,90 €, máximo 200 €): está verificado, pero se ha dejado como "una pequeña comisión al vencer", para no meter tres cifras en una página.
- **La reinversión automática de Letras y su venta antes de vencer**: la reinversión está verificada, pero no cabía. La venta en el mercado secundario no la he verificado en una fuente oficial.
- **El detalle de los tramos de la base del ahorro**: solo se menciona el primero (19 % hasta 6.000 €). El resto toca al mundo de Inversión.
- **La regla del 72 y las fórmulas de la TAE con comisiones**: no se pueden hacer con la calculadora del móvil sin aproximar.
- **Del jefe salen 3 preguntas antiguas**: `base-del-calculo`, `autonomo` (las dos de fondo de emergencia, ya cubiertas en 01 y 02) y `ordena-prioridades`, que hablaba de invertir y es tema de otro mundo. Se van para dar sitio a los niveles 3 a 8 sin pasar de 12. Las otras 7 conservan sus ids y sus cifras. En dos de ellas solo se ha ampliado la explicación (`calcula-seis-meses` y `calcula-retencion`).
- **La inflación de julio de 2022 (10,8 %)**: verificada, pero se ha preferido el dato vigente de 2026.

### e) Preguntas o frases que alguien podría discutir

1. **El tope de la penalización** (03 p1, el dato; jefe `cancelar-con-perdida`): el Portal del Cliente Bancario dice "no puede exceder", pero no cita la norma. Hay foros que lo consideran un criterio del BdE y no una norma legal. La pregunta del jefe se sostiene igual, porque lo que se pregunta es si se puede recuperar menos, y eso lo dice el BdE expresamente. Si se quiere blindar, el dato puede pasar a decir "según el Banco de España".
2. **Letras sin retención** (05 `letra-hacienda`; 06 `hueco-retencion-letra`): hay una excepción, las "cuentas basadas en operaciones sobre Letras" de las entidades, que sí llevan retención (RIRPF, art. 75.3.b). En 06 el enunciado ya dice "compradas en el Tesoro". En 05 se habla de "una Letra del Tesoro", que no es ese producto.
3. **"Normalmente al descuento"** (05 p5): el Tesoro dice "al descuento o a premio". Con tipos negativos se han llegado a pagar por encima de 1.000 €, y por eso el texto dice "normalmente". Las preguntas no dependen de esto.
4. **04 `ordena-deposito`**: entre "calcula los intereses brutos" y "retiene el 19 %" el orden es lógico, pero en la práctica pasan en el mismo apunte.
5. **06 `ordena-compra-letra` y jefe**: el orden está sacado de la FAQ del Tesoro para comprar directamente. Por un banco, los pasos son otros, y el enunciado lo acota.
6. **03 p6, "los primeros 6.000 € tributan al 19 %"**: hablando con precisión, es la base liquidable del ahorro, después del mínimo personal y familiar. Se ha simplificado.
7. **El dato de 01** (36,4 %): el INE habla de "la población", con una pregunta sobre si **el hogar** puede afrontar 900 €. El texto dice "de la población". Ojo con la coherencia con Salud, a cuyo informe se atribuye un "32 % de hogares" del INE: no es la misma cifra ni el mismo año.
8. **05 p4, "Vendes tu vivienda o cobras la indemnización de un despido"**: la ley dice "pagos… ligados al… despido". Se ha evitado decir "cualquier indemnización", porque las otras solo cuentan si vienen de un delito o de un error judicial.

## Revisión del mundo Inversión

En `content/heroe/inversion/`. Pasa
`pnpm heroe:validar` con los cuatro mundos juntos.
`mundo.json` solo cambia en `"niveles"`. Fecha de las comprobaciones: 4 de noviembre de 2026.
Texto consolidado de la Ley 35/2006 (IRPF) leído en el BOE con "última actualización publicada el 07/10/2026".

### Lo primero: CORREGIDO y NO VERIFICADO

**CORREGIDO**
- Comisiones a 30 años (nivel 03, página "El bocado silencioso a 30 años"). El informe daba 52.990,49 € / 34.424,32 € / diferencia 18.566,17 €. Rehecho: 10.000 × 1,057^30 = **52.753,30 €**; 10.000 × 1,042^30 = **34.358,29 €**; diferencia **18.395,01 €**. En el JSON van redondeados al euro (5275300, 3435800, -1839500).
- "Tributación del rescate: como sueldo en la base general (19 % al 47 %)". El 19-47 % no es una cifra única: la escala general es la estatal (art. 63 LIRPF, 9,5 % a 24,5 %) más la autonómica, que cambia por comunidad. Se dice "como rendimiento del trabajo, en la base general, con su escala progresiva", sin porcentajes.
- Límite de los planes de pensiones: el informe daba "1.500 €" a secas. El art. 52.1 dice que el tope es **la menor** de dos cifras: 1.500 € o el 30 % de los rendimientos netos del trabajo y de actividades económicas. Y que los dos aumentos (8.500 € y 4.250 €) juntos no pasan de 8.500 €. Las dos cosas se han añadido.
- Comisión de gestión "gane o pierda el fondo" (nivel 03, minitest `comision-en-anos-malos` y página "Mito y realidad"). Según la guía de fondos de la CNMV, la comisión de gestión puede cobrarse sobre el patrimonio, sobre los resultados o sobre ambos. Solo la que va sobre el patrimonio se cobra aunque el fondo pierda. La pregunta dice ahora "sobre el patrimonio".
- Rescate de un plan: el informe decía "jubilación, paro, enfermedad grave o aportaciones con 10 años". Las contingencias son jubilación, incapacidad, fallecimiento y dependencia (art. 8.6 TRLPFP). Los supuestos excepcionales son paro de larga duración y enfermedad grave, y aparte están las aportaciones con 10 años (art. 8.8). Se separan así.
- Fondo de inversión "se compra o vende una vez al día al valor de cierre". La CNMV dice que se aplica el valor liquidativo del día de la solicitud o del siguiente, según el folleto. Se dice "a un solo precio al día, el valor liquidativo, que se conoce después".
- "Fondo que replica el Ibex 35 con las 35 mayores empresas cotizadas de España". No son exactamente las 35 mayores (la selección no es solo por tamaño). Queda "las 35 empresas de ese índice".

**NO VERIFICADO (y por eso se ha quitado o se presenta como regla práctica)**
- "Inflación acumulada del 33,6 % en diez años (100 € → 133,57 €)" y la serie del IPC 2018-2025. No se ha podido confirmar en el INE, y la serie del informe mezcla medias anuales con tasas de diciembre (en 2022 da el 8,4 %, que es la media anual, pero en 2021 da el 6,5 %, que es la tasa de diciembre). **Quitado.** Se sustituye por el 10,8 % de julio de 2022, que sí está verificado.
- "Una referencia habitual es no invertir en bolsa el dinero que vayas a necesitar en menos de 3 a 5 años" (nivel 02, `matricula-en-bolsa`). Se queda **como regla práctica**, sin atribuírsela a Finanzas para Todos ni a la CNMV: no he encontrado esa cifra en su web.
- Que la movilización de un plan de pensiones "no tributa". El art. 8.8 TRLPFP permite movilizar, y el art. 17.2.a) LIRPF grava las *prestaciones*. Que mover el plan no tribute se deduce de ahí (no se cobra nada), pero no lo he visto escrito así en una fuente oficial. En el texto se evita decir "sin tributar" en la movilización. Se dice "sin cobrarlos" (nivel 06, `empareja-planes`).

### a) Los 9 niveles

| Fichero | Tipo | Título | Minutos | Preguntas |
|---|---|---|---|---|
| 01-por-que-invertir.json | lectura | Por qué invertir: inflación, riesgo y plazo | 4 | 4 (7 páginas) |
| 02-pepito-invierte-su-excedente.json | interactivo | Pepito pone a trabajar su primer excedente | 4 | 7 |
| 03-fondos-indexados-y-etf.json | lectura | Fondos, indexados, ETF y el bocado de las comisiones | 4 | 4 (7 páginas) |
| 04-pepito-compara-comisiones.json | interactivo | Pepito compara comisiones y aporta cada mes | 4 | 6 |
| 05-impuestos-traspasos-y-pensiones.json | lectura | Hacienda, traspasos y planes de pensiones en 2026 | 4 | 4 (8 páginas) |
| 06-pepito-hace-cuentas-con-el-irpf.json | interactivo | Pepito hace cuentas con el IRPF de sus fondos | 4 | 7 |
| 07-test-mifid-riesgo-y-chiringuitos.json | lectura | Test MiFID, riesgo del 1 al 7 y chiringuitos | 4 | 4 (7 páginas) |
| 08-pepito-caza-un-chiringuito.json | interactivo | El radar antichiringuitos de Pepito | 4 | 6 |
| 09-jefe-oraculo-de-humo.json | jefe | El Oráculo de Humo | 5 | 12 (aprobado 70) |

- Los interactivos 02 y 04 tienen 5 tipos cada uno; el 06, el 08 y el jefe, los seis. Los de 02 y 04 llevan dos "calcula"; el 06, dos, y el 08, uno. El jefe lleva dos.
- Cada lectura lleva imagen con pie y dato con fuente en la primera página, un ejemplo de Pepito en tabla, mito y realidad, y el gancho como último párrafo.
- Las páginas se han recortado a unas 55 palabras como mucho, sin contar emojis ni cifras sueltas.
- Pepito en cada pareja de niveles: 01-02, 27 años, laboratorio, Valencia. 03-04, 34 años, diseñador web autónomo, Vigo. 05-06, 42 años, autónomo, Zaragoza, con su pareja y dos hijos. 07-08, 61 años, administrativo, Sevilla.

### b) Cada "calcula" y cada total de ejemplo

Todo está rehecho con un script de Python, sin fiarse del informe.

| Dónde | Cuenta | Solución |
|---|---|---|
| 02 `calcula-inflacion` | 2.000 × 3 / 100 = 60 € | 6000 |
| 02 `calcula-cartera-mixta` | 500 × 4 % + 500 × 8 % = 20 + 40 = 60 € | 6000 |
| 04 `calcula-ahorro-comision` | 10.000 × 1,8 % − 10.000 × 0,3 % = 180 − 30 = 150 € | 15000 |
| 04 `calcula-participaciones` | 200/20 + 200/10 = 10 + 20 = 30 | 30 (numero) |
| 06 `calcula-tramos` | 6.000 × 19 % + 4.000 × 21 % = 1.140 + 840 = 1.980 € | 198000 |
| 06 `calcula-perdida-pendiente` | 400 − 1.000 × 25 % = 400 − 250 = 150 € | 15000 |
| 08 `calcula-baja-y-sube` | 1.000 × 0,5 = 500; 500 × 1,5 = 750 € | 75000 |
| 09 `calcula-tope-autonoma` | 1.500 + 4.250 = 5.750 € | 575000 |
| 09 `calcula-compensa-etf` | (3.500 − 1.500) × 19 % = 2.000 × 0,19 = 380 € | 38000 |

Todas llevan tolerancia 0.

Ejemplos en tabla:
- 01 "Un mes de Pepito": 1.750 − 520 − 380 − 350 = **500 €** (fila 50000).
- 01 "Lo que compran 10.000 € quietos al cabo de 10 años": 10.000/1,02^10 = 8.203,48 → 8.203 €; 10.000/1,03^10 = 7.440,94 → 7.441 €; 10.000/1,04^10 = 6.755,64 → 6.756 €. El −25,6 % de la página "Mito y realidad" sale de 1 − 7.440,94/10.000 = 25,6 %. En el jefe: 1 − 1/1,03^20 = 44,6 %.
- 03 "10.000 € de Pepito al cabo de 30 años": 52.753 € / 34.358 € / −18.395 € (ver CORREGIDO).
- 03 "Un mes de Pepito, autónomo": 2.200 − 750 − 360 − 690 − 400 = 0.
- 05 "Las cuentas de la familia de Pepito": 3.450 − 1.120 − 1.430 − 300 − 600 = 0. Al año, 300 × 12 = 3.600 € al plan, por debajo de 5.750 €.
- 05 "Mito y realidad" (texto): con 6.100 € de ganancia, 6.000 × 19 % + 100 × 21 % = 1.161 €, frente a 1.281 € si todo fuera al 21 %.
- 07 "Un mes de Pepito tras comprobarlo": 2.100 − 650 − 750 − 500 − 0 = **200 €** (fila 20000).

Las rentabilidades del 4 %, 6 %, 8 % y la del fondo "del 14 %" son **supuestas** para el ejemplo, y el texto lo dice. Ninguna se presenta como esperable.

### c) Cifras legales, fiscales y oficiales

| Valor | Dónde sale | Norma / organismo | URL | Estado |
|---|---|---|---|---|
| Base del ahorro 2026: 19 % hasta 6.000 €; 21 % hasta 50.000 €; 23 % hasta 200.000 €; 27 % hasta 300.000 €; 30 % a partir de ahí | 05 p. "Los tramos del ahorro en 2026", p. "Mito y realidad"; 06 `calcula-tramos`; 09 `hueco-tramo-alto`, `ordena-tramos`, `calcula-compensa-etf` | Ley 35/2006, art. 66.1 (estatal: 9,5/10,5/11,5/13,5/15) + art. 76 (autonómica, mismos tipos) | https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764 | VERIFICADA (suma de las dos escalas en el texto consolidado de 07/10/2026) |
| Retención del 19 % en el reembolso de fondos | 05 p. "Los tramos del ahorro en 2026" | Ley 35/2006, art. 101.6 (y 101.4 para el capital mobiliario) | ídem | VERIFICADA |
| Compensación: ganancias y pérdidas entre sí; cruzada hasta el 25 %; resto en los 4 años siguientes | 05 p. "Pepito compensa pérdidas…", `anos-para-compensar`; 06 `calcula-perdida-pendiente`; 09 `hueco-veinticinco`, `calcula-compensa-etf` | Ley 35/2006, art. 49.1.a) y b), y 49.2 | ídem | VERIFICADA |
| Traspaso entre fondos sin computar ganancia; las nuevas participaciones conservan el valor y la fecha | 05 p. "Traspaso: fondos sí, ETF no", `que-es-un-traspaso`; 06 `ordena-traspaso`; 09 `empareja-reglas` | Ley 35/2006, art. 94.1.a), 2.º párrafo | ídem | VERIFICADA |
| El diferimiento no se aplica si el importe se pone a disposición del contribuyente | 06 `ordena-traspaso` (explicación); 09 `reembolso-y-recompra` | Art. 94.1.a), último párrafo | ídem | VERIFICADA |
| ETF excluidos del traspaso | 05 p. "Traspaso…"; 06 `hueco-sin-traspaso`; 09 `empareja-reglas` | Art. 94.1.a), último párrafo, con remisión al art. 79 del RD 1082/2012 | ídem | VERIFICADA |
| FIFO: se consideran vendidos los valores homogéneos comprados primero | 06 `fifo` | Art. 94.1.a), 1.er párrafo | ídem | VERIFICADA |
| Más de 500 socios (requisito para las IIC con forma de sociedad) | 05 `que-es-un-traspaso` (explicación) | Art. 94.1.a) 2.º | ídem | VERIFICADA |
| La subida no tributa mientras no se vende | 05 p. "Hacienda solo cobra al vender" | Art. 33.1 (la ganancia aparece "con ocasión de cualquier alteración" del patrimonio) | ídem | VERIFICADA (principio general) |
| Límite de planes: el menor entre 1.500 € y el 30 % de los rendimientos netos del trabajo y de actividades | 05 p. "Planes de pensiones…", `hueco-limite-plan`; 06 `empareja-planes`; 09 `calcula-tope-autonoma` | Art. 52.1 a) y b) (límite financiero: DA 16.ª) | ídem | VERIFICADA (CORREGIDA por omisión del 30 %) |
| +8.500 € con contribuciones empresariales; +4.250 € con planes de empleo simplificados de autónomos; los dos juntos, 8.500 € como mucho | 05 p. "Planes de pensiones…"; 06 `empareja-planes`; 09 `calcula-tope-autonoma` | Art. 52.1, 1.º y 2.º, y su párrafo final | ídem | VERIFICADA |
| Lo cobrado de un plan tributa como rendimiento del trabajo | 05 p. "Cuándo y cómo se rescata…", `rescate-base-ahorro`; 06 `empareja-planes`, `rescate-de-golpe`; 09 `empareja-reglas` | Art. 17.2.a) 3.º; las rentas del ahorro son las del art. 46 | ídem | VERIFICADA |
| Contingencias: jubilación, incapacidad, fallecimiento, dependencia; excepcionales: paro de larga duración y enfermedad grave; aportaciones con 10 años de antigüedad | 05 p. "Cuándo y cómo se rescata…"; 06 `empareja-planes`; 09 `rescatar-sin-motivo` | RDL 1/2002 (TRLPFP), art. 8.6 y 8.8 | https://www.boe.es/buscar/act.php?id=BOE-A-2002-24252 | VERIFICADA |
| Lo aportado hasta el 31-12-2015 se puede sacar desde el 1-1-2025 | 05 dato de la p. 1; 06 `rescate-de-golpe`; 09 `rescatar-sin-motivo` | RD 62/2018, que añade la DT 7.ª al RD 304/2004 | https://www.boe.es/buscar/doc.php?id=BOE-A-2018-1832 | VERIFICADA |
| Movilización de un plan individual a otro; la gestora de origen informa de las fechas de las aportaciones | 06 `empareja-planes` | TRLPFP art. 8.8; preámbulo del RD 62/2018 | las dos de arriba | VERIFICADA (que no tribute: ver NO VERIFICADO) |
| Escala general estatal (9,5 % a 24,5 %), solo para descartar el "19 % al 47 %" | — (no sale en el contenido) | Art. 63.1 | BOE de la LIRPF | VERIFICADA; por eso se quitó el 19-47 % |
| IPC de julio de 2022: 10,8 % anual, el más alto desde septiembre de 1984 | 01 dato de la p. 1 | INE, nota de prensa del 12-08-2022 | https://www.ine.es/daco/daco42/daco421/ipc0722.pdf | VERIFICADA |
| IIC financieras: casi 486.000 millones de € a finales de 2025; fondos: 5,7 millones de inversores | 03 dato de la p. 1 | CNMV, Informe anual 2025, pp. 11, 23 y 24 | https://www.cnmv.es/DocPortal/Publicaciones/Informes/Informe_Anual_2025_ES.pdf | VERIFICADA |
| Ibex 35 en 2025: +49,3 %, 17.307,8 puntos (máximo histórico) | 07 p. "El enemigo en el espejo" (solo el +49,3 %, con aviso de que no se repite por obligación) | CNMV, Informe anual 2025, p. 15 (cuadro I.2.1) y p. 11 | ídem | VERIFICADA (el informe decía "casi el 50 %"; se usa el 49,3 % del cuadro) |
| Comisiones de gestión y depósito descontadas del valor liquidativo; la de gestión, sobre el patrimonio, los resultados o ambos | 03 p. "Mito y realidad", `comision-en-anos-malos` | CNMV, Guía "Los fondos de inversión y la inversión colectiva" | https://www.cnmv.es/docportal/Publicaciones/Guias/G06_Fondos_IIC.pdf | VERIFICADA |
| "Rentabilidades pasadas no garantizan rentabilidades futuras" | 01 p. 3, `rentabilidad-pasada`; 09 `fondo-del-14` | CNMV, misma guía | ídem | VERIFICADA |
| Traspaso: se pide en la entidad de destino, que lo solicita a la de origen; el dinero va de fondo a fondo | 06 `ordena-traspaso` | CNMV, misma guía, cap. VIII | ídem | VERIFICADA |
| ETF: participaciones que se negocian en bolsa, con compraventa durante la sesión | 03 p. "Fondo indexado frente a ETF", `hueco-etf`; 04 `empareja-vehiculos` | CNMV, misma guía, "Fondos cotizados" | ídem | VERIFICADA |
| Teléfono de atención al inversor de la CNMV: 900 535 015 | 07 p. "Pepito caza un chiringuito…", `como-comprobar`; 08 `ordena-comprobar-oferta` | CNMV, página de contacto (lunes a viernes, de 9:00 a 19:00) y Guía de chiringuitos | https://www.cnmv.es/portal/utilidades/contacto?lang=es | VERIFICADA |
| Chiringuito: entidad que presta servicios de inversión sin autorización; no adherida al FOGAIN ni al FGD; advertencias de la CNMV y de IOSCO | 07 dato de la p. 1; 08 `hueco-chiringuito`, `ordena-comprobar-oferta` | CNMV, Guía sobre chiringuitos financieros | https://www.cnmv.es/docportal/publicaciones/guias/chiringuitos.pdf | VERIFICADA |
| Criptomonedas: volatilidad extrema, posible pérdida total, sin cobertura del FGD ni del Fondo de Garantía de Inversores, sin respaldo de un banco central | 07 p. "Criptomonedas…", `cripto-fgd` | Comunicado conjunto CNMV y Banco de España, 9-02-2021 | https://www.bde.es/f/webbde/GAP/Secciones/SalaPrensa/NotasInformativas/21/presbe2021_15.pdf | VERIFICADA (fechado en 2021 en el texto; no se cita el "Informe Anual 2025" que daba el informe) |
| Test de conveniencia: conocimientos y experiencia. Test de idoneidad: además, situación financiera y objetivos; obligatorio en asesoramiento y gestión de carteras | 07 p. "Los test que te protegen", `conveniencia-o-idoneidad`; 08 `test-gestion-carteras`, `entender-no-basta` | CNMV, Portal del Inversor | https://www.cnmv.es/portal/inversor/idoneidad?lang=es · https://www.cnmv.es/portal/inversor/conveniencia?lang=es | VERIFICADA (no cito artículos de la Ley 6/2023: no los he leído) |
| Indicador de riesgo del 1 al 7 en el Documento de Datos Fundamentales; 1 no es "sin riesgo"; supone mantener el plazo recomendado | 07 p. "El semáforo del 1 al 7", `hueco-escala`; 09 `riesgo-6-de-7` | CNMV (página del DFI y DDF registrados en la CNMV). Reglamento PRIIPs | https://www.cnmv.es/portal/inversor/fondos-dfi?lang=es | VERIFICADA en la CNMV; NO VERIFICADO en el Reglamento Delegado (UE) 2017/653, porque EUR-Lex no cargó |

### d) Lo que se ha quitado del informe, y por qué

- **Los nombres**: Lucía, Mateo, Carmen, David y Roberto pasan a ser Pepito. "Carmen y David" pasa a ser "Pepito y su pareja". El hermano de Lucía es el hermano de Pepito, y el vecino de Roberto, un vecino de Pepito. Arreglo de coherencia: en el informe Carmen era asalariada y David autónomo con plan de autónomos. Aquí Pepito es el autónomo y "su pareja trabaja por cuenta ajena". En `calcula-tramos` el informe hacía reembolsar el fondo a "Carmen y David" juntos. Si el fondo es de los dos, la ganancia se reparte entre las dos declaraciones y la cuenta de 1.980 € deja de valer. Ahora el fondo "está a su nombre".
- **La inflación acumulada del 33,6 % y la serie del IPC 2018-2025**: no verificadas, y la serie mezcla dos medidas (ver arriba).
- **Las tablas de inflación a 5 y 20 años con el 2 % y el 4 %**: las cuentas son correctas, pero no caben en el límite de palabras. Queda la tabla a 10 años, y el 44,6 % a 20 años al 3 % sale en el jefe.
- **"Del 19 % al 47 %" de la base general**: depende de la comunidad autónoma.
- **Que el tipo superior del ahorro "subió desde el 28 %" por la Ley 7/2024**: no lo he comprobado en el BOE de la Ley 7/2024. El dato vigente (30 %) sí está verificado, y basta.
- **Límites por discapacidad (24.250 €, 10.000 € de terceros, art. 53)**: están en la tabla del informe, pero no se usaban en ningún nivel y no los he comprobado. Fuera. El "24.250" queda solo como opción mala de `hueco-limite-plan`.
- **"Boletín Económico Trimestral 2026" del Banco de España** (fuentes del informe): no aporta ninguna cifra al contenido.
- **El artículo concreto de la Ley 6/2023 y del RD 813/2023**: se nombra "MiFID II" sin artículos, porque no he leído esas normas.
- **"Desde el 1 de enero de 2025 … Reglamento de Planes y Fondos de Pensiones … y Banco de España"**: la fuente del Banco de España sobra. Se cita el RD 62/2018.
- **Frase del villano** («¡Dejad los ahorros…!») y el subtítulo "El Jardín del Tiempo": no hay campo para ellos, y la descripción del mundo no se toca. La idea va en la descripción del jefe.
- **Glosario**: no tiene campo propio. Lo que tenía sitio va en las páginas y en los "emparejar": acción, aportaciones periódicas, base del ahorro, rentabilidad-riesgo, chiringuito, CNMV, comisión de gestión, compensación, criptoactivo, diferimiento, diversificación, DDF, ETF, FIFO, FOGAIN, fondo activo e indexado, horizonte, indicador 1-7, inflación, MiFID II, plan de pensiones, renta fija y variable, test de conveniencia e idoneidad. Quedan fuera las definiciones sueltas de IIC, índice bursátil, INE y volatilidad.
- **"Opciones" del informe que se pasaban de 200 caracteres**: se han acortado sin cambiar cuál es la buena.

### e) Preguntas que alguien podría discutir

1. **02 `calcula-inflacion` (60 €)**: alguien podría calcular la pérdida de poder adquisitivo (2.000 − 2.000/1,03 = 58,25 €). El enunciado pregunta cuántos euros **de más** hacen falta para comprar lo mismo, y eso es 60 € sin ambigüedad.
2. **02 `matricula-en-bolsa`**: el "3 a 5 años" es una regla práctica, sin fuente oficial que la fije.
3. **05 `hueco-limite-plan`**: "el tope general es 1.500 €" se matiza con el 30 % en el propio enunciado. Para quien gane poco, el tope real puede ser menor.
4. **06 `calcula-tramos` y 09 `calcula-compensa-etf`**: aplican la escala a la ganancia tal cual. En rigor, la escala se aplica a la base liquidable del ahorro que exceda del mínimo personal y familiar (art. 66.1). Si ese mínimo ya lo absorbe la base general, que es lo normal con sueldo o actividad, la cuenta es exacta. No se explica para no enredar.
5. **06 `ordena-traspaso`**: "abrir cuenta en la entidad de destino" y "pedir el traspaso" pueden hacerse en el mismo acto. El orden sigue siendo el único lógico.
6. **06 `rescate-de-golpe` (Verdadero)**: depende de los tipos marginales de cada año, y por eso el enunciado dice "puede".
7. **06 `empareja-planes`**: que la movilización "no tributa" no lo afirmo. Se dice "sin cobrarlos" (ver NO VERIFICADO).
8. **07 `cripto-fgd` y la página de criptomonedas**: el comunicado es de 2021. Desde entonces se aplica en la UE el Reglamento MiCA, que regula a los proveedores de criptoactivos. El texto no dice que no haya regulación, solo lo que avisaron sobre el FGD, el FOGAIN y la volatilidad. Conviene que alguien confirme que en 2026 sigue sin haber cobertura del FGD ni del FOGAIN para criptoactivos. Lo doy por cierto (el FGD cubre depósitos), pero la frase se apoya en un texto de 2021.
9. **08 `test-gestion-carteras` y 07 `conveniencia-o-idoneidad`**: no digo cuándo es obligatorio el de conveniencia, porque en algunos casos de solo ejecución con productos no complejos puede no hacerse. Solo digo cuándo es obligatorio el de idoneidad, que es lo verificado.
10. **09 `riesgo-6-de-7`**: la opción buena dice ahora "si sales antes, el riesgo real puede variar y puedes recuperar menos", que es lo que dicen los DDF registrados en la CNMV. Las otras tres son claramente falsas.
11. **04 `ordena-diversificacion`**: un fondo del Ibex 35 frente a un fondo global es "más diversificado" por número de empresas y de países. Alguien podría hablar de correlaciones, pero a este nivel no hay discusión razonable.

## Revisión del mundo Deuda y crédito

En `content/heroe/deuda/`. Pasa
`pnpm heroe:validar` con los cuatro mundos juntos.
Fecha de comprobación de las fuentes: 4 de noviembre de 2026. Cuentas rehechas con un script de Python.

### a) Los 9 niveles

| Fichero | Tipo | Título | Min. | Preguntas |
|---|---|---|---|---|
| 01-precio-real-del-credito | lectura (7 págs.) | El precio real del crédito | 4 | 4 |
| 02-practica-equipo-de-sonido | interactivo | Pepito financia su equipo de sonido | 4 | 8 |
| 03-tarjetas-revolving-y-usura | lectura (8 págs.) | Tarjetas, revolving y usura | 4 | 5 |
| 04-practica-frena-la-revolving | interactivo | Pepito frena su tarjeta revolving | 4 | 8 |
| 05-hipotecas-cirbe-y-morosos | lectura (7 págs.) | Hipotecas, CIRBE y ficheros de morosos | 4 | 5 |
| 06-practica-firma-de-la-hipoteca | interactivo | Pepito y su pareja ante la hipoteca | 4 | 8 |
| 07-salir-de-deudas | lectura (8 págs.) | Bola de nieve, avalancha y segunda oportunidad | 4 | 4 |
| 08-practica-plan-de-rescate | interactivo | El plan de rescate de Pepito | 4 | 8 |
| 09-jefe-marques-del-minimo | jefe (aprobado 70) | El Marqués del Mínimo | 5 | 12 |

Tipos: los interactivos 02 y 06 llevan los seis; 04 cinco (sin hueco); 08 cinco (sin emparejar). El jefe, los seis, con tres `calcula`.
Pepito: 29 años en Valencia (1-2), 34 años autónomo en Sevilla (3-4), en Zaragoza con su pareja y su hijo (5-6), 63 años en Vigo, con una hija (7-8). Ningún otro nombre propio.

### b) Cuentas

**Ejemplos (tablas)**

- 01 · El mes de Pepito: 1.650 − 480 − 240 − 65 = **865 €** de margen. 35 % de 1.650 = **577,50 €**.
- 01 · Dos préstamos de 3.000 € a 2 años: A, 5 % TIN + 60 € de comisión → TAE **7,20 %** (la comisión de 59,57 € da 7,20 %; con 60 €, 7,2 % redondeado). B, 6 % TIN sin comisión → TAE = 1,005¹² − 1 = **6,17 %**. Total pagado: A 3.218,74 €; B 3.191,08 € (B más barato, como dice el texto).
- 03 · El mes de Pepito en Sevilla: solo filas, sin total. 2 % mensual → TAE 1,02¹² − 1 = **26,82 %**. Intereses del mes: 1.000 × 2 % = 20 €; a deuda, 35 − 20 = 15 €.
- 03 · 1.000 € a 2 % mensual pagando 35 €/mes, sin compras: simulación mes a mes → **43 meses**, **1.497,61 €** pagados ("unos 1.498 €").
- 03 · Minicrédito de 30 € por 100 € a un mes: TAE = 1,3¹² − 1 = **2.229,8 %** ("pasa del 2.000 %").
- 05 · El mes de la familia: 3.200 − 820 − 680 − 135 = **1.565 €**. Hipoteca 150.000 € a 25 años (300 cuotas) al 4,247 %: cuota francesa = **812,36 €** ("unos 812 €").
- 07 · El mes de Pepito en Vigo: 1.380 − 790 − 640 = **−50 €**.
- 09 · Aristocrático vs. Llano (5.000 € a 3 años): 4,5 % TIN + 260 € de comisión → TAE **8,40 %** (260,10 € exactos). Llano 6 % → 6,17 %. Total: 5.614,45 € frente a 5.475,95 €.

**Ejercicios `calcula`**

| Nivel · id | Cuenta | Solución (unidad mínima) |
|---|---|---|
| 02 · coste-total | 12 × 258,20 = 3.098,40; + 60 = 3.158,40; − 3.000 = 158,40 € | 15840 |
| 02 · interes-mes-1 | 3.000 × 0,06 ÷ 12 = 15 € | 1500 |
| 04 · cuanto-baja | 1.000 × 0,02 = 20; 35 − 20 = 15 € | 1500 |
| 04 · cuota-de-20 | 20 − 20 = 0 € | 0 |
| 04 · diferencia-puntos | 26,8 − 19,5 = 7,3 puntos | 730 |
| 06 · cuanto-devuelven | 2.000 × 0,073 ÷ 365 = 0,40 €/día; × 10 = 4; 2.000 + 4 = 2.004 € | 200400 |
| 06 · tipo-variable | 3,247 + 1 = 4,247 % → 4,25 % (el enunciado pide dos decimales) | 425 |
| 06 · gastos-suyos | 380 + 50 = 430 € | 43000 |
| 08 · bola-primer-mes | 50 + 70 + 120 = 240; 300 − 240 = 60; 50 + 60 = 110 € | 11000 |
| 08 · avalancha-primer-mes | 70 + 60 = 130 € | 13000 |
| 08 · exoneracion-12000 | 5.000 + (12.000 − 5.000) × 0,5 = 8.500 € (< 10.000) | 850000 |
| 09 · gastos-marques | 420 + 30 = 450 € | 45000 |
| 09 · exoneracion-doble | por organismo: 5.000 + 10.000 × 0,5 = 10.000 (tope); × 2 = 20.000 € | 2000000 |

Otras cifras de cuenta en el texto: cuadro de amortización de 02 (3.000 € al 6 % a 12 meses): cuota 258,1993 → **258,20 €**; intereses mes 1, 15 €; capital 243,20 €; vivo 2.756,80 €. La cuota supone 258,20 / 1.650 = **15,6 %** de la nómina ("menos del 16 %"). TAE del préstamo de Pepito con los 60 € de comisión: **10,25 %** (por eso el ejercicio 02 · que-financiar dice 10,25 %). 3.000 € a 0 % TIN en 10 cuotas con 120 € de comisión: TAE ≈ 9,4 % (no sale en el texto). Revolving 27,5 − 19,8 = **7,7 puntos**.

### c) Cifras legales y oficiales

| Valor | Dónde sale | Norma / fuente | URL | Estado |
|---|---|---|---|---|
| Deuda de los hogares 41,9 % del PIB en 2T 2026 | 01, pág. 1 (dato) | Banco de España, Cuentas Financieras 2T 2026, nota de 8-10-2026 | https://www.bde.es/wbe/es/noticias-eventos/actualidad-banco-espana/notas-banco-espana/cuentas-financieras-2t2026.html | VERIFICADA |
| Cuotas de deuda ≤ 35 % de los ingresos netos (regla práctica) | 01 pág. 2 y `referencia-35`; 02 `cabe-en-35`, `pasos-antes`; 09 `derrotar-marques` (sin cifra) | finanzasparatodos.es, "¿Cómo gestionar mis deudas?": "no debe exceder el 40 %… otros establecen este límite en un 35 %" | https://www.finanzasparatodos.es/c-mo-gestionar-mis-deudas | VERIFICADA como regla práctica (la fuente da 35-40 %; el texto la presenta como "referencia habitual") |
| TAE: incluye comisiones obligatorias; se calcula por el anexo I | 01, 02 `cero-tin`, 09 `aristocratico` | Ley 16/2011, art. 32 | https://www.boe.es/buscar/act.php?id=BOE-A-2011-10970 | VERIFICADA (el informe citaba el art. 32 para el 0 % TIN: el artículo regula el cálculo de la TAE, no ese caso, así que no se cita en el texto) |
| Reembolso anticipado: compensación máx. 1 % (0,5 % si queda ≤ 1 año), solo con tipo fijo | 02 `cuando-adelantar` (explicación) | Ley 16/2011, art. 30.2 | https://www.boe.es/buscar/act.php?id=BOE-A-2011-10970 | VERIFICADA (añadida, no venía en el informe) |
| Desistimiento: 14 días naturales; devolver capital + interés en ≤ 30 días naturales; sin penalización salvo gastos no reembolsables a la Administración | 05 pág. 1 y `dias-desistir`; 06 `desistir`, `cuanto-devuelven`; 09 `registros-plazos`, `derrotar-marques` | Ley 16/2011, art. 28.1 y 28.2.b) | https://www.boe.es/buscar/act.php?id=BOE-A-2011-10970 | VERIFICADA |
| Descubierto tácito: TAE ≤ 2,5 veces el interés legal del dinero | 09 `descubierto` | Ley 16/2011, art. 20.4 | https://www.boe.es/buscar/act.php?id=BOE-A-2011-10970 | VERIFICADA (el informe lo atribuía también al anteproyecto: quitado) |
| Usura: nulo el préstamo con interés notablemente superior al normal; se devuelve solo lo recibido | 03 pág. 4 y `nulidad-usura`; 09 `revolving-marques` | Ley de 23 de julio de 1908, arts. 1 y 3 | https://www.boe.es/buscar/pdf/1908/BOE-A-1908-5579-consolidado.pdf | VERIFICADA |
| Revolving usuraria si la TAE supera en más de 6 puntos el tipo medio de esas tarjetas en la fecha del contrato | 03 pág. 1 (dato) y `seis-puntos`; 04 `es-usurario`; 09 `revolving-marques` | STS (Pleno) 258/2023, de 15 de febrero | https://www.boe.es/biblioteca_juridica/comentarios_sentencias_unificacion_doctrina_civil_y_mercantil/abrir_pdf.php?id=COM-D-2023-2 (comentario en la biblioteca jurídica del BOE) | VERIFICADA en el comentario del BOE (no en el texto de CENDOJ) |
| Préstamos personales: la regla de los 6 puntos "no resulta directamente aplicable… nada impide que se tenga en consideración" | 03 pág. 5; 04 `prestamo-personal` | STS 1378/2023, de 6 de octubre, citada en el mismo comentario del BOE | (misma URL) | VERIFICADA en el comentario del BOE |
| "STS 366/2026" (préstamo al 16,61 % frente a 8,10 %, nulo por 8,51 puntos) | — | — | Solo vista en webs de despachos y vLex; en poderjudicial.es aparece citada en un extracto, sin el texto | NO VERIFICADO → **quitada** del contenido |
| Directiva (UE) 2023/2225: aplicable desde el 20-11-2026; transposición antes del 20-11-2025; deroga la 2008/48 con efectos 20-11-2026 | 03 pág. 7 y `directiva-200`; 09 `fecha-directiva` | Directiva (UE) 2023/2225 (ficha del BOE: "Aplicable desde el 20 de noviembre de 2026") | https://www.boe.es/buscar/doc.php?id=DOUE-L-2023-81526 | VERIFICADA |
| La directiva incluye los créditos de menos de 200 € y el "compra ahora, paga después" | 03 pág. 7 y `directiva-200` | Directiva 2023/2225, considerandos 15 y 16 | (misma URL) | VERIFICADA |
| Anteproyecto de Ley de Contratos de Crédito al Consumo: aprobado en primera vuelta el 7-1-2026; no es ley | 03 pág. 7 ("seguía en noviembre de 2026 en anteproyecto") y `anteproyecto`; 09 `fecha-directiva` (explicación) | Portal del Cliente Bancario, 25-2-2026: "Este anteproyecto no es definitivo" | https://clientebancario.bde.es/pcb/es/blog/proyecto-de-nueva-regulacion-de-los-creditos-al-consumo.html | VERIFICADA la entrada del BdE. Que siga sin ser proyecto de ley en noviembre de 2026: **no hay en el BOE ni en las fuentes oficiales ninguna ley publicada**; varias fuentes secundarias (octubre de 2026) dicen que no se ha remitido a las Cortes. No he podido consultar la web del Congreso. Comprobar antes de publicar. **Hecho el 4-11-2026: sigue en anteproyecto** (ver arriba, "NO VERIFICADO y pendiente de decidir") |
| Topes del anteproyecto (4 % mensual, apertura 5 % con tope de 30 €, 3-12 meses, 22 % transitorio) | — | — | — | NO VERIFICADO en fuente oficial y, sobre todo, no vigente → **quitados** |
| Gastos de la hipoteca: tasación, prestatario; notaría, registro y gestoría, prestamista; copias, quien las pida | 05 pág. 4 y `gasto-tuyo`; 06 `gastos-suyos`; 09 `gastos-marques` | Ley 5/2019, art. 14.1.e) | https://www.boe.es/buscar/act.php?id=BOE-A-2019-3814 | VERIFICADA |
| AJD de la escritura de préstamo hipotecario: sujeto pasivo el prestamista, desde el 10-11-2018 | 05 pág. 4 | Texto refundido ITP y AJD, art. 29, redactado por el RDL 17/2018 | https://www.boe.es/buscar/act.php?id=BOE-A-1993-25359 | VERIFICADA |
| FEIN al menos 10 días naturales antes; comparecencia ante notario, acta sin coste | 05 pág. 3; 06 `fein-notario` | Ley 5/2019, arts. 14.1 y 15 | https://www.boe.es/buscar/act.php?id=BOE-A-2019-3814 | VERIFICADA |
| Euríbor a 12 meses: 3,247 % (septiembre de 2026) | 06 `tipo-variable`; 05 pág. 2 (4,247 % de la nota) | Resolución del BdE de 1-10-2026 | https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-20519 | VERIFICADA |
| Euríbor a 12 meses: 3,239 % (octubre de 2026) | 05 pág. 1 (dato) | Resolución del BdE de 3-11-2026 | https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-23168 | VERIFICADA |
| CIRBE: el informe incluye las entidades con riesgo acumulado **igual o superior a 1.000 €**; los avales, como riesgo indirecto | 05 pág. 5, `que-es-cirbe`, `umbral-cirbe`; 06 `aval`; 09 `registros-plazos` | Orden ETD/699/2020; documento explicativo de los informes de la CIR (sede del BdE) | https://sedeelectronica.bde.es/f/websede/INF/Comun/Relcionados/Informes_a_partir_de_enero_2021-documento_explicativo_de_las_claves_utilizadas.pdf | VERIFICADA. CORREGIDA: el informe decía "más de 1.000 €"; el documento del BdE dice "igual o superior". El blog del Portal ("supere los 1.000 euros") dice lo otro: las preguntas no dependen de ese borde |
| Umbral anterior de la CIRBE: 9.000 € (hasta los informes de 2020) | 05 pág. 5, `umbral-cirbe` | Portal del Cliente Bancario, "Novedades en la CIRBE" (2-3-2021) | https://clientebancario.bde.es/pcb/es/blog/novedades-en-la-cirbe.html | VERIFICADA. La "Circular 1/2020" que citaba el informe no la he visto: no se cita |
| Ficheros de morosos: deuda cierta, vencida, exigible y no reclamada judicial o administrativamente; aviso previo; máx. 5 años desde el vencimiento | 05 pág. 6; 04 `no-pagar`; 09 `fichero-reclamada`, `registros-plazos` | LO 3/2018, art. 20.1 b), c) y d) | https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673 | VERIFICADA |
| Ficheros de morosos: no entran deudas con principal **inferior a 50 €** | 05 pág. 6, `factura-35`; 06 `factura-42`; 09 `registros-plazos` ("al menos 50 €") | LO 3/2018, **disposición adicional sexta** | https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673 | CORREGIDA: el informe decía "superior a 50 €", "igual o inferior a 50 € no" y lo situaba en el "art. 20.2.b)". La ley dice "inferior a cincuenta euros" (una de 50 € justos sí podría entrar) y está en la DA 6.ª |
| Exoneración del crédito público: hasta 10.000 € con la AEAT y lo mismo con la Seguridad Social; 5.000 € íntegros y 50 % del resto; solo en la primera exoneración | 07 pág. 1 (dato), pág. 6, `tope-hacienda`; 08 `exoneracion-12000`; 09 `exoneracion-doble` | TRLC (RDL 1/2020), art. 489.1.5.º y 489.3 | https://www.boe.es/buscar/act.php?id=BOE-A-2020-4859 | VERIFICADA |
| No todo se exonera (p. ej., alimentos) | 07 pág. 6 | TRLC, art. 489.1.3.º | (misma URL) | VERIFICADA. CORREGIDO el "100 % de la deuda privada" del informe |
| Plan de pagos: 3 años en general; 5 si no se realiza la vivienda habitual | 07 pág. 5; 08 `conservar-casa` | TRLC, art. 497 (Ley 16/2022) | (misma URL) | VERIFICADA |
| Dos vías: plan de pagos sin liquidación o liquidación | 07 pág. 5 | TRLC, art. 486 | (misma URL) | VERIFICADA |
| SAC: 15 días hábiles en servicios de pago; un mes en lo demás (consumidores) | 07 pág. 7; 08 `plazo-pagos`, `reclamar-comisiones` | Portal del Cliente Bancario, "Quiero reclamar contra mi banco: plazos" (25-6-2019) | https://clientebancario.bde.es/pcb/es/blog/quiero_reclamar_contra_banco_plazos.html | VERIFICADA en el Portal (entrada de 2019; no he abierto la orden ni el RDL 19/2018) |
| Un año desde la reclamación a la entidad para ir al Banco de España | 07 pág. 7; 08 `reclamar-comisiones`; 09 `plazo-bde`, `registros-plazos` | Ley 7/2017, art. 18.1.e); Portal del Cliente Bancario | https://www.boe.es/buscar/act.php?id=BOE-A-2017-12659 | VERIFICADA |
| Hay que reclamar antes a la entidad | 07 `directo-bde` | Portal del Cliente Bancario (misma entrada) | (misma URL del Portal) | VERIFICADA |
| Informe del Banco de España no vinculante | 07 pág. 7, `vinculante` | Orden ECC/2502/2012, art. 12.6 | https://www.boe.es/buscar/act.php?id=BOE-A-2012-14363 | VERIFICADA |
| Plazo de 90 días naturales del Banco de España | — | Ley 7/2017, art. 20 (90 días, verificado en el BOE); pero el art. 12.1 de la Orden ECC/2502/2012 consolidada dice 4 meses, y el BdE (Memoria) distingue 90 días para consumidores de la UE | — | **No se usa** en el contenido: dos normas con plazos distintos para un dato que no hace falta |

### d) Lo que se ha quitado del informe, y por qué

- **Todo lo del anteproyecto como regla**: el 4 % de interés mensual, la comisión de apertura del 5 % con tope de 30 €, el plazo de 3 a 12 meses, el ejemplo del microcrédito de 300 € (de 103 € a 20 €), la prohibición de publicidad y de usar redes sociales para la solvencia. Es un anteproyecto, no ley, y no he visto esas cifras en una fuente oficial. Queda solo que existe y que no obliga (03).
- **STS 366/2026** y su caso (16,61 % frente a 8,10 %, 8,51 puntos): no la he podido ver en CENDOJ ni en una fuente oficial. Se sustituye por lo verificado: la STS 1378/2023 (la regla de los 6 puntos "puede tenerse en cuenta" para un préstamo personal) y la idea de comparar con el tipo medio de la propia categoría.
- **"Criterio extendido en 2026 a los préstamos personales"** (minitest 2 del nivel 3 del informe): dependía de la 366/2026. Reescrita solo con la 258/2023.
- **El dictamen motivado de la Comisión a España (30-9-2026)** y la sentencia del Supremo de febrero de 2026 sobre créditos públicos subordinados: no verificados y no necesarios.
- **Ratios macro** (68,1 % de la renta disponible, 82,3 % de la eurozona, 65,5 % en 2028, 161,8 % de riqueza financiera, Euríbor a 3 meses 2,643 %): no verificados y no aportan al curso. Se queda el 41,9 % del PIB, verificado.
- **"14 días en Cataluña"** para la FEIN: no verificado.
- **"Circular 1/2020"** para la CIRBE: no la he visto; se cita la Orden ETD/699/2020.
- **"Derecho al honor"** (jefe 9 del informe): no verificado en jurisprudencia; la pregunta se reescribe sobre el requisito legal del art. 20.1.b) LO 3/2018.
- **Plazo de 90 días del Banco de España** (pantalla 5 del nivel 7, jefe 6): ver la última fila de la tabla c).
- **Solvencia en la directiva** ("exigiendo estudio previo de solvencia"): no lo he leído en el articulado; la pregunta se queda en que la directiva incluye esos créditos.
- **"Factura de la luz… reclamación ante Consumo"** (minitest 3 del nivel 5): no es seguro que una queja de consumo sea "reclamación administrativa" a efectos del art. 20; la pregunta se apoya solo en el umbral de 50 €.
- **El cuadro de amortización del informe** (cuota de 265 €, intereses 15 €, capital 250 €) no cuadraba: 15 € de intereses implica un 6 % TIN, y a ese tipo la cuota es de 258,20 €. Rehecho con 258,20 € / 15 € / 243,20 € / 2.756,80 €; el coste total pasa de 240 € a **158,40 €**.
- **"Equipo al 6,5 % TAE"**: con la comisión de 60 € y el 6 % TIN la TAE sale 10,25 %; cambiado para que todo el nivel cuente lo mismo.
- **Euríbor + diferencial con tres decimales** (4,247 %): el formato de `porcentaje` va en centésimas, así que el enunciado pide redondear a dos decimales (4,25 %).
- **"Pensión de 1.380 €", "piso ya pagado de Vigo", la hija con tres deudas**: se mantienen, con Pepito y "su hija". Lucía y David pasan a "Pepito y su pareja"; el hermano de David, a "su hermano".
- **El glosario**: casi todo entra en los textos (amortización anticipada, avalista/riesgo indirecto, capital vivo, CIRBE, BNPL, coste total, desistimiento, descubierto tácito, diferencial, EPI, Euríbor, FEIN, fichero de morosos, tipos de hipoteca, IAJD, avalancha, bola de nieve, reunificación, SAC, sistema francés, TAE, TIN, tarjetas, usura). Fuera: **TEDR** (el ajuste de 20-30 centésimas está verificado en el comentario del BOE, pero no cabía sin meter más letra; no cambia ninguna respuesta: 7,3 y 7,7 puntos siguen por encima de 6 con el ajuste).
- La frase del villano se usa en la descripción del jefe, recortada ("veinte euritos al mes toda la vida").

### e) Preguntas discutibles

- **01 `referencia-35` / 02 `cabe-en-35`**: la fuente oficial da 35-40 %. El texto dice "referencia habitual" y 40 % no está entre las opciones del hueco, así que no hay dos respuestas buenas; aun así, alguien podría preferir 40 %.
- **02 `que-financiar`**: "uso sano del crédito" es un juicio. Se ha reforzado con los tres encargos firmados para que la respuesta no dependa de opiniones.
- **03 `fin-de-mes`**: "sin intereses" es lo normal en el pago total a fin de mes, pero cada contrato manda; podría haber una tarjeta con comisión.
- **04 `es-usurario` / 09 `revolving-marques`**: el criterio de los 6 puntos es jurisprudencia, no ley, y el juez valora el caso. Las opciones dicen "sería usuraria" y "según el criterio del Supremo". El 19,5 % y el 19,8 % de tipo medio son supuestos del enunciado, no datos del BdE.
- **04 `no-pagar`**: "se arriesga" es correcto, pero una reclamación ante el SAC del banco no convierte la deuda en "reclamada" a efectos del art. 20 LO 3/2018 (eso es judicial o administrativa). El enunciado dice "sin haber reclamado nada" para evitarlo.
- **05 `umbral-cirbe`**: el BdE usa "igual o superior a 1.000 €" en un documento y "supere los 1.000 €" en otro. El hueco dice "1.000 o más" y las otras opciones están lejos.
- **06 `tipo-variable`**: la revisión real usa el Euríbor de una fecha que fija cada contrato (a menudo, el de dos meses antes); el enunciado da el índice como dato.
- **07 pág. 3 / `herramientas`**: "la avalancha ahorra más intereses" vale con el mismo dinero al mes y sin deudas nuevas; con comisiones raras o promociones podría no ser así.
- **08 `reunificar-casa`**: la afirmación central es el riesgo para la vivienda (defendible siempre). Que pague "más intereses" se dice en la explicación con "suelen".
- **08 `conservar-casa`**: el plan de pagos de 5 años es cuando no se realiza la vivienda habitual; que el juez lo apruebe depende de cada caso.
- **03 pág. 7 y 09 `fecha-directiva`** (explicación): "en noviembre de 2026 seguía en anteproyecto" es una foto con fecha. Si el Gobierno aprueba el proyecto o se publica la ley, hay que cambiar esas dos frases. Ninguna respuesta depende de ello.
- **09 `descubierto`**: el art. 20.4 Ley 16/2011 es el vigente; si la nueva ley de crédito al consumo lo cambia, habrá que revisarla.

