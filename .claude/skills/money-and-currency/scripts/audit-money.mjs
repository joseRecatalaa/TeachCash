#!/usr/bin/env node
/**
 * Busca patrones que delatan dinero en coma flotante.
 *
 *   node .claude/skills/money-and-currency/scripts/audit-money.mjs [dir]
 *
 * Sale con código 1 si encuentra algo, para poder encadenarlo en CI.
 * Es heurístico: revisa cada hallazgo, habrá falsos positivos.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = process.argv[2] ?? 'my-app'
const SKIP = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'coverage'])
const EXT = /\.(ts|tsx|mts|cts|js|jsx|mjs)$/

const RULES = [
  {
    id: 'parseFloat-money',
    re: /parseFloat\s*\([^)]*(amount|importe|precio|price|total|saldo|balance)/i,
    msg: 'parseFloat sobre un importe — usa parseMoney(), devuelve céntimos enteros',
  },
  {
    id: 'float-literal-amount',
    re: /\b(amount|importe|precio|price|total|saldo|balance)\w*\s*[:=]\s*-?\d+\.\d+/i,
    msg: 'Importe con literal decimal — los importes son enteros en céntimos',
  },
  {
    id: 'toFixed-money',
    re: /\.toFixed\s*\(\s*2\s*\)/,
    msg: 'toFixed(2) para formatear dinero — usa formatMoney() con Intl.NumberFormat',
  },
  {
    id: 'float-column',
    re: /\b(real|float|double|numeric|decimal)\s*\(\s*['"](amount|importe|balance|saldo|total)/i,
    msg: 'Columna de importe en coma flotante — debe ser integer',
  },
  {
    id: 'divide-by-100',
    re: /\/\s*100\b/,
    msg: 'División por 100 — solo permitida dentro de lib/format.ts',
    allow: (p) => /format\.(ts|tsx)$/.test(p) || /money\.(ts|tsx)$/.test(p),
  },
  {
    id: 'currency-symbol-concat',
    re: /['"`]\s*€\s*['"`]\s*$|\+\s*['"`]\s*€/,
    msg: 'Símbolo € concatenado a mano — usa Intl.NumberFormat, respeta el locale',
  },
]

function* walk(dir) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const name of entries) {
    if (SKIP.has(name)) continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) yield* walk(full)
    else if (EXT.test(name)) yield full
  }
}

const findings = []
for (const file of walk(ROOT)) {
  const rel = relative(process.cwd(), file).split(sep).join('/')
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return // comentarios
    for (const rule of RULES) {
      if (rule.allow?.(rel)) continue
      if (rule.re.test(line)) {
        findings.push({ file: rel, line: i + 1, rule, text: line.trim().slice(0, 100) })
      }
    }
  })
}

if (findings.length === 0) {
  console.log(`OK — sin patrones de dinero en coma flotante en ${ROOT}/`)
  process.exit(0)
}

console.log(`${findings.length} hallazgo(s):\n`)
for (const f of findings) {
  console.log(`  ${f.file}:${f.line}  [${f.rule.id}]`)
  console.log(`    ${f.text}`)
  console.log(`    → ${f.rule.msg}\n`)
}
process.exit(1)