---
name: nextjs-app-conventions
description: Convenciones de Next.js 16 App Router en este proyecto — qué es Server Component y qué es Client Component, dónde vive cada fichero, caché y revalidación, params asíncronos, y proxy.ts (antes middleware). Úsala al crear una ruta, un layout o un route handler, al decidir si un componente lleva 'use client', al configurar caché o revalidación, o cuando algo del framework no se comporta como esperabas por diferencias entre versiones de Next.
---

# Next.js 16 en este proyecto

## Antes de escribir código de framework

La documentación de la versión exacta instalada está en
`node_modules/next/dist/docs/`. **Léela.** Next 16 tiene cambios que
contradicen lo que probablemente asumas por versiones anteriores. Los mapas de
rutas útiles:

| Tema | Fichero bajo `node_modules/next/dist/docs/` |
|---|---|
| Layouts y páginas | `01-app/01-getting-started/03-layouts-and-pages.md` |
| Server/Client Components | `01-app/01-getting-started/05-server-and-client-components.md` |
| Obtener datos | `01-app/01-getting-started/06-fetching-data.md` |
| Mutaciones | `01-app/01-getting-started/07-mutating-data.md` |
| Caché | `01-app/01-getting-started/08-caching.md` |
| Revalidación | `01-app/01-getting-started/09-revalidating.md` |
| Proxy (antes middleware) | `01-app/01-getting-started/16-proxy.md` |
| Directiva `use cache` | `01-app/03-api-reference/01-directives/use-cache.md` |
| Convenciones de fichero | `01-app/03-api-reference/03-file-conventions/` |
| Server Actions | `01-app/02-guides/server-actions.md` |
| Seguridad de datos | `01-app/02-guides/data-security.md` |

## Diferencias con lo que probablemente sabes

### `middleware.ts` ahora es `proxy.ts`

Desde Next 16 el middleware se llama Proxy. Misma funcionalidad, fichero
`proxy.ts` en la raíz del proyecto.

No lo uses como sistema de autorización: la propia documentación lo desaconseja
explícitamente. Sirve para comprobaciones optimistas (redirigir a `/login` si no
hay cookie de sesión), pero **la autorización real va en cada Server Action y en
cada consulta de datos**. → skill `server-action-safety`

### `params` y `searchParams` son promesas

```tsx
// app/(app)/cuentas/[id]/page.tsx
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ periodo?: string }>
}) {
  const { id } = await params
  const { periodo } = await searchParams
  // ...
}
```

Olvidar el `await` no falla ruidosamente: obtienes un objeto Promise y `id` sale
`undefined`, que aguas abajo se convierte en una consulta que no devuelve nada.

### Caché explícita con `use cache`

Next 16 no cachea peticiones de datos por defecto como hacían versiones
anteriores. La caché es opt-in con la directiva `'use cache'` y la opción
`cacheComponents` en `next.config.ts`.

**En una aplicación de finanzas, casi nada debe cachearse.** Los saldos y
movimientos son datos por usuario que cambian con cada mutación. Cachea solo lo
que sea genuinamente compartido y estable: catálogos de categorías por defecto,
tipos de cambio del día, páginas estáticas de marketing.

Si cacheas algo por usuario, la clave de caché **tiene que incluir el
`userId`**, o un usuario verá los datos de otro. Es el fallo de seguridad más
caro que se puede cometer aquí. Ante la duda, no caches.

## Server vs Client Components

Por defecto todo es Server Component. `'use client'` solo cuando el componente
necesita:

- estado (`useState`, `useReducer`) o efectos
- manejadores de eventos del navegador
- APIs del navegador (`localStorage`, `window`)
- una librería que a su vez los use (muchas de gráficos)

### Empuja `'use client'` a las hojas

```tsx
// MAL — toda la página se vuelve cliente por un botón
'use client'
export default function Page() {
  return <div><Tabla datos={...} /><BotonFiltro /></div>
}

// BIEN — el servidor renderiza los datos, solo el botón es cliente
export default async function Page() {
  const datos = await getTransactions(userId)
  return <div><Tabla datos={datos} /><BotonFiltro /></div>  // BotonFiltro lleva 'use client'
}
```

Marcar una página entera como cliente en una app de finanzas significa enviar al
navegador la lógica de agregación y, potencialmente, más datos de los que se
muestran.

### Lo que nunca cruza al cliente

Un Server Component puede leer secretos y hablar con la base de datos. En cuanto
pasas algo como prop a un Client Component, **viaja al navegador y es visible en
el HTML**. No pases nunca objetos de fila completos "por comodidad": pasa solo
los campos que se pintan.

```tsx
// MAL — el objeto entero acaba serializado en el payload
<TransactionRow tx={tx} />

// BIEN
<TransactionRow id={tx.id} description={tx.description} amount={tx.amount} />
```

## Estructura de una feature

```
features/transactions/
  queries.ts       # lectura. Funciones async, reciben userId. Sin 'use server'.
  actions.ts       # 'use server' en la primera línea. Mutaciones.
  schema.ts        # esquemas Zod de entrada
  components/      # componentes de UI de la feature
```

Separar `queries.ts` de `actions.ts` no es cosmético: `'use server'` marca
**todos** los exports del fichero como endpoints POST públicos. Un fichero mixto
expone tus funciones de lectura como endpoints sin que te enteres.

## Carga y estados

Usa Suspense con granularidad, no una pantalla de carga global:

```tsx
export default async function Page() {
  return (
    <>
      <ResumenSaldos />                                  {/* rápido */}
      <Suspense fallback={<GraficoSkeleton />}>
        <GraficoAnual />                                 {/* lento */}
      </Suspense>
    </>
  )
}
```

El `loading.tsx` de una ruta bloquea la ruta entera. En un dashboard donde el
saldo se calcula en 5 ms y el informe anual en 400 ms, eso hace que todo espere
al más lento.

## Revalidación tras mutar

Después de una Server Action que cambia datos, invalida lo que corresponda:

```ts
revalidatePath('/movimientos')
// o, si usas tags:
revalidateTag(`transactions:${userId}`)
```

Los tags **siempre con el `userId` dentro**, por lo mismo que la caché.

## Route handlers: cuándo sí

Las mutaciones desde la UI van por Server Actions. Un `route.ts` solo cuando
necesitas un endpoint HTTP de verdad:

- webhooks entrantes (banco, pasarela de pago)
- descargas de fichero (exportar movimientos a CSV)
- una API consumida desde fuera de la aplicación

## Tailwind v4

La configuración vive en CSS, no en `tailwind.config.js`:

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-income: oklch(0.65 0.15 150);
  --color-expense: oklch(0.60 0.20 25);
}
```

No crees un `tailwind.config.js`: en v4 no se lee salvo que se importe
explícitamente, y acabarás depurando por qué tus tokens no existen.