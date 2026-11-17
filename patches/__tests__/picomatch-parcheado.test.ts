import { createRequire } from 'node:module'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * GHSA-fc5q-39xc-vjpf: picomatch <= 4.0.7 deja pasar un `*` suelto dentro de un
 * extglob repetido (`+(*a)`, `*(*)`) y lo compila a `(?:[^/]*?a)+`: un
 * cuantificador sin tope dentro de otro, que con una cadena corta que no casa
 * se va a backtracking exponencial (`+(*)` contra 25 letras y una `/`: 6,5 s).
 * No hay versión con parche: lo arregla `patches/picomatch-parcheado`, que el
 * override de `pnpm-workspace.yaml` pone en lugar de todos los picomatch.
 *
 * Se resuelve picomatch por el mismo camino que lo cargan las herramientas
 * (vitest > vite > tinyglobby), no por ruta: lo que se comprueba es que el
 * override llega, no solo que la copia está arreglada.
 */
const raiz = createRequire(path.join(process.cwd(), 'package.json'))
const vite = createRequire(raiz.resolve('vitest/package.json'))
const desdeVite = createRequire(vite.resolve('vite/package.json'))
const desdeTinyglobby = createRequire(desdeVite.resolve('tinyglobby'))

type Picomatch = {
  (patron: string): (ruta: string) => boolean
  makeRe: (patron: string) => RegExp
}

const cargas: [string, Picomatch][] = [
  ['vite', desdeVite('picomatch') as Picomatch],
  ['tinyglobby', desdeTinyglobby('picomatch') as Picomatch],
]

// Una cadena que hace backtracking con los patrones de abajo si siguen siendo
// regex anidadas. Con 26 letras la versión vulnerable ya tarda segundos (cada
// letra más dobla el tiempo); la parcheada, menos de un milisegundo.
const veneno = 'a'.repeat(26) + '/'

const peligrosos = ['+(*)', '*(*)', '+(*a)', '*(*a)', '+(**a)', '+(a*b)', '+(x|*a)', '+(*.js)', '+(@(*a))']

describe.each(cargas)('picomatch cargado desde %s', (_, picomatch) => {
  it.each(peligrosos)('%s no anida un cuantificador sin tope', (patron) => {
    const inicio = performance.now()
    picomatch.makeRe(patron).test(veneno)
    expect(performance.now() - inicio).toBeLessThan(100)
  })

  // Lo que el parche no debe romper: los globs que de verdad usan vite,
  // tinyglobby, eslint y plop. Ninguno lleva un extglob repetido.
  it('sigue casando los globs normales', () => {
    expect(picomatch('**/*.test.ts')('src/a/b.test.ts')).toBe(true)
    expect(picomatch('**/*.test.ts')('src/a/b.ts')).toBe(false)
    expect(picomatch('src/**/*.{ts,tsx}')('src/x/y.tsx')).toBe(true)
    expect(picomatch('!(*.d).ts')('a.ts')).toBe(true)
    expect(picomatch('@(a|b)*.js')('bx.js')).toBe(true)
  })

  it('mantiene los extglobs repetidos sin comodín sin tope', () => {
    expect(picomatch('+(ab)')('ababab')).toBe(true)
    expect(picomatch('+(ab)')('aba')).toBe(false)
    expect(picomatch('*(a|b)c')('ababc')).toBe(true)
    expect(picomatch('+(a?)')('axay')).toBe(true)
    // El caso que picomatch ya aplanaba a una clase de caracteres segura.
    expect(picomatch('+(*(a)|*(b))')('abba')).toBe(true)
  })
})
