# picomatch 4.0.7, parcheado

Copia de `picomatch@4.0.7` (MIT, ver `LICENSE`) con un solo cambio en
`lib/parse.js`, marcado con `PARCHE TeachCash`.

## Por qué

GHSA-fc5q-39xc-vjpf (alta): un `*` suelto dentro de un extglob repetido
(`+(*)`, `+(*a)`, `*(*a)`) compila a `(?:[^/]*?a)+`, un cuantificador sin tope
dentro de otro. Con una cadena corta que no casa, el backtracking es
exponencial: `+(*)` contra 25 letras y una `/` tardaba 6,5 s. No hay versión con
parche (el aviso cubre `<= 4.0.7`, la última publicada).

Solo llega por desarrollo (vitest > vite > tinyglobby/fdir, eslint, plop), nunca
al servidor de producción. Aun así, el objetivo del repo es `pnpm audit` sin un
solo aviso, y sin ignorar ninguno.

## Qué cambia

`analyzeRepeatedExtglob` ya tenía la defensa: un extglob repetido "arriesgado"
se compila como texto literal en vez de como regex. Le faltaba reconocer una
rama con un `*` comodín. `hasTopLevelStar` lo añade, haya una rama o varias.

Lo que se pierde: un patrón como `+(*.js)` deja de ser un extglob y pasa a casar
solo el texto literal `+(*.js)`. Ninguna herramienta del repo usa extglobs
repetidos: sus globs son del tipo `**/*.test.ts`.

## Cómo se aplica y cuándo se quita

Override `picomatch: file:patches/picomatch-parcheado` en `pnpm-workspace.yaml`
(nombre distinto para que `pnpm audit` no lo confunda con el vulnerable). Lo
vigila `patches/__tests__/picomatch-parcheado.test.ts`, que carga picomatch por el
mismo camino que las herramientas.

Se quita cuando salga un picomatch con el arreglo: borrar esta carpeta y el
override, y `pnpm audit` dirá si sigue haciendo falta.
