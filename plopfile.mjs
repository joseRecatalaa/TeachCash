/**
 * Generador de CRUD.  `pnpm generate:crud`
 *
 * Pregunta dos cosas —el nombre en singular y el plural— y de ahí deriva las
 * cuatro carpetas de la entidad, cada una con su caso. La tabla de derivación
 * está en AGENTS.md, sección "Añadir una entidad".
 *
 * Los DTOs traen un campo `nombre` de ejemplo para que el andamiaje se sostenga;
 * el trabajo es sustituirlo por los reales, y hay un `// TODO` en cada uno de
 * los cuatro sitios donde toca.
 *
 * **El repositorio generado NO compila tal cual**, a diferencia del resto: apunta
 * a una tabla que casi nunca existe todavía. Créala en `db/schema.ts` y pasa las
 * migraciones antes de tocarlo. Es a propósito — un repositorio que compilara
 * apuntando a una tabla inventada sería peor.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

/** Los ficheros que se crean, en orden. Se usa para formatear y para el aviso. */
const FICHEROS = [
  'src/types/{{camelCase name}}.types.ts',
  'src/infrastructure/repositories/{{dashCase pluralName}}.repository.ts',
  'src/application/hooks/use{{pascalCase pluralName}}.ts',
  'src/config/{{dashCase pluralName}}/sections.ts',
  'src/config/{{dashCase pluralName}}/columns.ts',
  'src/presentation/components/Forms/EntityForms/{{camelCase name}}/{{pascalCase name}}FormRefine.tsx',
  'app/{{pascalCase pluralName}}/page.tsx',
  'app/{{pascalCase pluralName}}/Create/page.tsx',
  'app/{{pascalCase pluralName}}/Edit/page.tsx',
]

/**
 * Los dos registros donde hay que dar de alta el recurso.
 *
 * Un `modify` de Plop cuyo patrón no casa **no falla: se salta en silencio**, y
 * la entidad sale sin registrar sin que nada avise. Por eso después de generar
 * se comprueba a mano que el nombre está en los dos ficheros, y si no, se dice.
 */
const REGISTROS = [
  {
    fichero: 'src/infrastructure/repositories/index.ts',
    // Sin esto, el data provider lanza "Recurso desconocido" en la 1ª consulta.
    que: 'el mapa REPOSITORIES',
  },
  {
    fichero: 'src/application/providers/providers.tsx',
    que: 'el array REFINE_RESOURCES',
  },
]

/** @param {import('plop').NodePlopAPI} plop */
export default function generadorCrud(plop) {
  plop.setHelper('dashCase', (texto) =>
    texto
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase(),
  )
  plop.setHelper('lowerCase', (texto) => texto.toLowerCase())
  plop.setHelper('upperCase', (texto) => texto.toUpperCase())

  plop.setGenerator('crud', {
    description: 'Generar el CRUD completo de una entidad',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Nombre de la entidad (singular, PascalCase — ej: Presupuesto):',
        validate: (valor) => {
          if (!valor) return 'El nombre es obligatorio'
          if (!/^[A-Z][a-zA-Z]*$/.test(valor)) {
            return 'Debe empezar por mayúscula y llevar solo letras'
          }
          return true
        },
      },
      {
        type: 'input',
        name: 'pluralName',
        message: 'Plural, que será la RUTA y el nombre del recurso (ej: Presupuestos):',
        validate: (valor) => {
          if (!valor) return 'El plural es obligatorio'
          if (!/^[A-Z][a-zA-Z]*$/.test(valor)) {
            return 'PascalCase, sin guiones y sin siglas en mayúscula'
          }
          return true
        },
      },
    ],

    actions() {
      const plantillas = [
        'types.hbs',
        'repository.hbs',
        'hooks.hbs',
        'sections.hbs',
        'columns.hbs',
        'form.hbs',
        'list-page.hbs',
        'create-page.hbs',
        'edit-page.hbs',
      ]

      const acciones = FICHEROS.map((path, i) => ({
        type: 'add',
        path,
        templateFile: `plop-templates/${plantillas[i]}`,
      }))

      // ── Registro 1: el mapa de repositorios ────────────────────────────────
      acciones.push({
        type: 'modify',
        path: 'src/infrastructure/repositories/index.ts',
        pattern: /(import type \{ EntityRepository \} from '\.\/types')/,
        template:
          "import { {{camelCase pluralName}}Repository } from './{{dashCase pluralName}}.repository'\n$1",
      })
      acciones.push({
        type: 'modify',
        path: 'src/infrastructure/repositories/index.ts',
        pattern: /(export const REPOSITORIES = \{\r?\n)/,
        template: '$1  {{pascalCase pluralName}}: {{camelCase pluralName}}Repository,\n',
      })

      // ── Registro 2: los recursos de Refine ─────────────────────────────────
      acciones.push({
        type: 'modify',
        path: 'src/application/providers/providers.tsx',
        pattern: /(export const REFINE_RESOURCES = \[\r?\n)/,
        template:
          "$1  {\n" +
          "    name: '{{pascalCase pluralName}}',\n" +
          "    list: '/{{pascalCase pluralName}}',\n" +
          "    create: '/{{pascalCase pluralName}}/Create',\n" +
          "    edit: '/{{pascalCase pluralName}}/Edit',\n" +
          "    meta: { label: '{{pascalCase pluralName}}' },\n" +
          '  },\n',
      })

      // ── Formatear y comprobar ──────────────────────────────────────────────
      acciones.push((respuestas) => {
        const rutas = FICHEROS.map((f) =>
          plop.renderString(f, respuestas),
        ).concat(REGISTROS.map((r) => r.fichero))

        try {
          // Herramienta de desarrollo, en la máquina de quien la lanza: el PATH es
          // el suyo, y es el mismo con el que ha ejecutado `pnpm generate:crud`.
          // eslint-disable-next-line sonarjs/no-os-command-from-path
          execFileSync('pnpm', ['exec', 'prettier', '--write', ...rutas], {
            stdio: 'ignore',
            shell: process.platform === 'win32',
          })
        } catch {
          // Prettier no está instalado en este proyecto; no es motivo para
          // fallar el generador. Lo escrito ya sigue el estilo del repo.
        }

        const sinRegistrar = REGISTROS.filter(
          (r) => !readFileSync(r.fichero, 'utf8').includes(respuestas.pluralName),
        )

        if (sinRegistrar.length > 0) {
          // El aviso que evita el fallo silencioso descrito arriba.
          return (
            'AVISO: el recurso NO se ha registrado en ' +
            sinRegistrar.map((r) => `${r.que} (${r.fichero})`).join(' ni en ') +
            '. Añádelo a mano y revisa el `pattern` del plopfile.'
          )
        }
        return 'Recurso registrado en REPOSITORIES y en REFINE_RESOURCES.'
      })

      acciones.push((respuestas) => {
        const { name, pluralName } = respuestas
        const kebab = plop.renderString('{{dashCase pluralName}}', respuestas)
        return `
CRUD generado para ${name}.

Quedan cuatro TODO, en este orden:
  1. src/types/${plop.renderString('{{camelCase name}}', respuestas)}.types.ts
     Los campos reales de los tres DTOs. Un importe es un ENTERO EN CÉNTIMOS
     con su divisa al lado; una fecha de movimiento es 'YYYY-MM-DD'.
  2. src/infrastructure/repositories/${kebab}.repository.ts
     La tabla real y su esquema Zod. El userId va DENTRO del where, siempre.
  3. src/config/${kebab}/sections.ts       — los campos del formulario
  4. src/config/${kebab}/columns.ts        — las columnas del listado

Dos cosas que el generador no puede saber:
  - Si la entidad necesita tabla nueva, créala en db/schema.ts y pasa
    'pnpm db:generate' y 'pnpm db:migrate' ANTES de tocar el repositorio.
  - Si '${pluralName}' debe aparecer en el menú, añádelo a ENLACES en
    src/presentation/components/Navbar.tsx. El generador no lo toca: qué va en
    el menú es una decisión de producto, no de andamiaje.

Y escribe sus tests: src/infrastructure/repositories/__tests__/${kebab}.repository.test.ts
Los tres que no son opcionales son aislamiento por usuario, validación de
importes y reglas de borrado. → skill 'testing-finance'
`
      })

      return acciones
    },
  })
}
