# Plantillas de email de Supabase Auth

Los emails de cuenta los envía Supabase por SMTP propio (Resend, remitente
`no-reply@teachcash.es`). Estas plantillas **no las lee la app ni Supabase**: se
pegan a mano en Supabase → Authentication → Emails → **Templates** (asunto y
cuerpo). Si cambias una aquí, pégala otra vez allí.

| Pestaña de Supabase | Fichero | Asunto |
|---|---|---|
| Confirm signup | `confirmar-cuenta.html` | 💵 Gracias por crear tu cuenta en TeachCash |
| Change email address | `cambiar-email.html` | ✉️ Confirma tu correo en TeachCash |
| Reset password | `recuperar-password.html` | 🔑 Recupera tu contraseña de TeachCash |
| Reauthentication | `reautenticacion.html` | 🔒 Tu código de verificación de TeachCash |

`Change email address` es también la que recibe un **invitado que crea su
cuenta**: la app pone el email sobre el usuario anónimo (`updateUser`).
Magic link e Invite user no se usan: la app no tiene enlace mágico ni invita
a nadie.

## Cómo son

Una carta corta y cercana, centrada, sin emojis en el cuerpo y sin dos puntos
en el texto. La primera frase va en serif cursiva y verde, como entradilla.
Firma "El equipo de TeachCash". El héroe va de pie sobre el borde superior
derecho de la tarjeta: celebrando con el billete en la de confirmar la cuenta,
quieto en las demás.

## Lo que no se toca

- **El enlace es `{{ .ConfirmationURL }}`**: es el flujo `?code=` (PKCE), ligado
  al navegador que lo pidió. No lo cambies a `token_hash`: `/auth/confirm` ya no
  lo acepta porque permitía un login CSRF (ver `docs/SECURITY.md`). Por eso el
  email avisa de abrirlo en el mismo navegador.
- **Todo el estilo va inline y en hexadecimal.** Los clientes de correo no leen
  variables CSS ni hojas de estilo; es la única excepción a la regla de tokens
  `--sd-*` de la app. Los colores son los de modo claro de `app/globals.css` y,
  en el héroe, los de `pixel.module.css`.
- **El héroe son celdas de tabla, no una imagen ni un SVG.** Gmail y Outlook no
  pintan SVG; una imagen habría que alojarla y muchos clientes la bloquean por
  defecto. Cada píxel es una celda con `bgcolor`, y los tramos seguidos del
  mismo color van en una sola con `colspan`: así cada email pesa unos 20 KB,
  lejos de los 102 KB a partir de los que Gmail lo recorta. Se generó desde los
  sprites de `src/presentation/components/Pixel/sprites.ts` (pose quieto y
  celebra, a 3 px por píxel); si el héroe cambia en la app, hay que regenerarlo.
- **Nada superpuesto.** Gmail quita `position` y los márgenes negativos: el
  héroe va en su propia celda, encima de la tarjeta, no montado sobre ella.
- **Tipografía del sistema** (San Francisco, Segoe UI, Roboto): se lee nítida
  en cualquier cliente. Fredoka y Nunito solo cargarían en algunos.
