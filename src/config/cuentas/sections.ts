/**
 * Formulario de Cuenta.
 *
 * `.ts` sin JSX: aquí se DESCRIBE la vista, no se pinta. Si hiciera falta JSX,
 * el componente se crea en `EntityForms/cuenta/` y se referencia con
 * `component:`. Ver la nota de cabecera de `GenericForm/types.ts`.
 */

import { IconCoin, IconWallet } from '@tabler/icons-react'
import type { SectionDefinition } from '@/src/config/_shared/types'

export function cuentaSections(): SectionDefinition[] {
  return [
    {
      title: 'Datos de la cuenta',
      icon: IconWallet,
      fields: [
        {
          name: 'nombre',
          label: 'Nombre',
          type: 'text',
          placeholder: 'Cuenta corriente, Ahorro, Visa...',
          required: true,
          span: { base: 12, md: 6 },
        },
        {
          // Sin `options`: las resuelve el `FieldRenderer` desde el metadata
          // usando `tipo` como clave. Ver `metadata.repository.ts`.
          name: 'tipo',
          label: 'Tipo',
          type: 'select',
          required: true,
          span: { base: 12, md: 6 },
        },
        {
          name: 'divisa',
          label: 'Divisa',
          type: 'select',
          required: true,
          span: { base: 12, md: 6 },
          // La divisa NO se cambia una vez creada la cuenta: los movimientos ya
          // registrados están en ella, y cambiarla reinterpretaría todo el
          // histórico sin tocar un solo importe. El repositorio la ignora en el
          // update; esto es solo para que la persona lo vea antes de intentarlo.
          disabledWhen: (_values, context) => context.mode === 'edit',
          tooltip: 'No se puede cambiar después de crear la cuenta.',
        },
        {
          name: 'saldoInicial',
          label: 'Saldo inicial',
          type: 'money',
          placeholder: '0,00',
          span: { base: 12, md: 6 },
          tooltip:
            'Cuánto había en la cuenta el día que entra en la aplicación. Puede ser negativo (una tarjeta en descubierto).',
        },
      ],
    },
    {
      title: 'Cómo se calcula el saldo',
      icon: IconCoin,
      description:
        'El saldo no se guarda: se calcula sumando el saldo inicial y todos los movimientos vivos de la cuenta, transferencias incluidas. Por eso siempre cuadra con la lista de movimientos.',
      fields: [],
    },
  ]
}
