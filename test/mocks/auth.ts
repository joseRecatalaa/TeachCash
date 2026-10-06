/**
 * Sustituto de `@/lib/auth`: la sesión es la que diga `harness.userId`.
 *
 * Lo que se prueba con él es que el código de servidor tome el `userId` de la
 * sesión y de ningún otro sitio; cómo se verifica el JWT lo prueba
 * `lib/__tests__/auth.test.ts` contra el `lib/auth.ts` real.
 */

import { harness } from '../harness'

export function authMock() {
  return {
    getSession: async () =>
      harness.userId ? { user: { id: harness.userId, email: null, esInvitado: false } } : null,
    requireUserId: async () => {
      if (!harness.userId) throw new Error('No autorizado')
      return harness.userId
    },
  }
}
