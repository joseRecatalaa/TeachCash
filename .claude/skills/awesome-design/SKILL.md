---
name: awesome-design
description: Ocho DESIGN.md (sistemas de diseño analizados de marcas reales: Revolut, Wise, Mercury, Stripe, NerdWallet, Coinbase, Linear y Notion) para inspirarse o reproducir un lenguaje visual concreto. Úsala cuando el usuario pida que algo "se parezca a" una marca o producto, quiera referencias de tokens/tipografía/componentes de otro sistema, o busque inspiración para fintech y dashboards. No sustituye al sistema de diseño de TeachCash (`--sd-*`).
metadata:
  source: https://github.com/VoltAgent/awesome-design-md
  license: MIT
---

# Awesome DESIGN.md

Origen: `VoltAgent/awesome-design-md` (MIT). Cada fichero de `design-md/` es un
DESIGN.md (formato de Google Stitch): un documento en markdown con los tokens,
la tipografía, los componentes y las reglas de un sistema de diseño analizado a
partir de una web real.

## Cómo usarla

1. Elige la(s) referencia(s) del índice de abajo según lo que pida el usuario.
2. Lee **solo** esos ficheros (`design-md/<nombre>.md`); son largos, no cargues
   la colección entera.
3. Extrae lo que sirva (jerarquía tipográfica, densidad, tratamiento de cifras,
   patrones de componentes) y tradúcelo al sistema del proyecto.

**En TeachCash**: lo que se adopte se convierte en tokens `--sd-*` de
`app/globals.css` y en reglas de los `*.module.css`, nunca en hexadecimales
sueltos ni en un `style` inline (ver AGENTS.md, "El sistema de diseño").

Se han dejado solo las ocho más cercanas a una app de finanzas personales; el
resto de la colección está en el repo de origen.

## Índice

- `revolut` → `design-md/revolut.md`
- `wise` → `design-md/wise.md`
- `mercury` → `design-md/mercury.md`
- `stripe` → `design-md/stripe.md`
- `nerdwallet` → `design-md/nerdwallet.md`
- `coinbase` → `design-md/coinbase.md`
- `linear.app` → `design-md/linear.app.md`
- `notion` → `design-md/notion.md`
