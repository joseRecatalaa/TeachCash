'use strict'

/*
 * minimatch@11 con la FORMA de minimatch@3, para quien todavía pide la 3.
 *
 * Por qué existe: GHSA-g3hv-75wg-m249 (DoS por amplificación de patrones glob)
 * cubre todo minimatch <11.0.1, y la 3 no tiene versión con parche. La traen
 * eslint y sus plugins (eslint-plugin-import, react, jsx-a11y…), que no se pueden
 * subir solos. Antes se ignoraba el aviso en `auditConfig`; esto lo quita de raíz.
 *
 * Lo único que cambió de la 3 a la 11 que les afecta es la forma del módulo: en la
 * 3, `module.exports` ES la función (`require('minimatch')(ruta, patrón)`); en la
 * 11 la función va en `.minimatch`. Aquí se exporta una función que delega en la
 * 11 y lleva colgado todo lo demás (`Minimatch`, `filter`, `makeRe`, `GLOBSTAR`…),
 * igual que en la 3. Sin `__esModule`, así que `_interopRequireDefault` de Babel
 * (eslint-plugin-import) se queda con la función entera.
 *
 * Se aplica con el override `minimatch@<4` de `pnpm-workspace.yaml`. Quitarlo, y
 * este paquete, cuando eslint y sus plugins dejen la 3: `pnpm why minimatch`.
 */

const once = require('minimatch')

function minimatch(ruta, patron, opciones) {
  return once.minimatch(ruta, patron, opciones)
}

// Lo único de la 3 que falta es `makeRe`, que la 11 quitó del todo. Ninguno de los
// que la traen lo usa (solo llaman a la función y a `Minimatch`): si uno nuevo lo
// necesitara, fallaría al lintar con "makeRe is not a function", no en silencio.
module.exports = Object.assign(minimatch, once.minimatch, once, { minimatch })
