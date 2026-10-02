'use client'

/**
 * La cuenta de quien usa la aplicación, y el modo invitado.
 *
 * Al arrancar sin sesión (primera visita, cookies borradas, invitado caducado)
 * crea una de invitado: pide el token del CAPTCHA invisible y llama a
 * `iniciarInvitado`. Mientras tanto NO pinta la aplicación: si lo hiciera,
 * Refine lanzaría las consultas sin cookie y todas volverían "No autorizado".
 *
 * También es quien CAMBIA de usuario (entrar, salir), y por eso es quien vacía
 * la caché de React Query: sin `queryClient.clear()`, al entrar con otra cuenta
 * en el mismo navegador se verían un instante los movimientos del anterior.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Loader } from '@mantine/core'
import { obtenerTokenCaptcha } from '@/lib/turnstile'
import {
  cerrarSesion as cerrarSesionAction,
  getCuenta,
  iniciarInvitado,
} from '@/src/application/actions/auth.actions'
import type { CuentaDto } from '@/src/types/cuenta.types'
import styles from './CuentaProvider.module.css'

/** El texto con el que las acciones avisan de que no hay sesión. */
export const NO_AUTORIZADO = 'No autorizado'

type CuentaContexto = {
  cuenta: Exclude<CuentaDto, { tipo: 'ninguna' }>
  /** Cambia de usuario tras entrar o fijar contraseña: vacía la caché y navega. */
  entrar: (cuenta: CuentaDto, destino?: string) => void
  /** Sale, vacía la caché y deja la aplicación lista para un invitado nuevo. */
  salir: () => Promise<void>
  /** Vuelve a preguntar al servidor quién es. */
  refrescar: () => Promise<void>
  /** La sesión ha desaparecido a mitad de uso. Lo llama el `onError` global. */
  sesionPerdida: () => void
}

const Contexto = createContext<CuentaContexto | null>(null)

export function useCuenta(): CuentaContexto {
  const valor = useContext(Contexto)
  if (!valor) throw new Error('useCuenta fuera de <CuentaProvider>')
  return valor
}

/**
 * Para el `onError` global de React Query, que vive en `providers.tsx`, por
 * encima de este componente: no puede usar el contexto, así que se le deja
 * un puntero a la función.
 */
let avisarSesionPerdida: () => void = () => {}
export const notificarSesionPerdida = () => avisarSesionPerdida()

type Arranque = { ok: true; cuenta: CuentaDto } | { ok: false; error: string }

/**
 * La creación del invitado en curso, compartida. En desarrollo, StrictMode
 * monta los efectos dos veces: sin esto saldrían dos llamadas a la vez y, como
 * ninguna ve todavía la cookie de la otra, dos invitados.
 */
let arranqueEnCurso: Promise<Arranque> | null = null

function arrancarInvitado(): Promise<Arranque> {
  arranqueEnCurso ??= (async (): Promise<Arranque> => {
    try {
      const resultado = await iniciarInvitado(await obtenerTokenCaptcha())
      return resultado.ok
        ? { ok: true, cuenta: resultado.data }
        : { ok: false, error: resultado.error }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'No se pudo preparar la aplicación' }
    } finally {
      arranqueEnCurso = null
    }
  })()
  return arranqueEnCurso
}

export function CuentaProvider({
  inicial,
  children,
}: {
  inicial: CuentaDto
  children: React.ReactNode
}) {
  const [cuenta, setCuenta] = useState<CuentaDto>(inicial)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const router = useRouter()
  /** Sube con cada "Reintentar": es lo que vuelve a disparar el arranque. */
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    if (cuenta.tipo !== 'ninguna') return
    let vigente = true
    void arrancarInvitado().then((r) => {
      if (!vigente) return
      if (!r.ok) {
        setError(r.error)
        return
      }
      // Lo que hubiera en caché falló sin sesión o era de otro usuario.
      queryClient.clear()
      setCuenta(r.cuenta)
    })
    return () => {
      vigente = false
    }
  }, [cuenta.tipo, intento, queryClient])

  const sesionPerdida = useCallback(() => {
    queryClient.clear()
    setCuenta({ tipo: 'ninguna' })
  }, [queryClient])

  useEffect(() => {
    avisarSesionPerdida = sesionPerdida
    return () => {
      avisarSesionPerdida = () => {}
    }
  }, [sesionPerdida])

  const entrar = useCallback(
    (nueva: CuentaDto, destino = '/') => {
      queryClient.clear()
      setCuenta(nueva)
      router.push(destino)
      router.refresh()
    },
    [queryClient, router],
  )

  const salir = useCallback(async () => {
    await cerrarSesionAction()
    queryClient.clear()
    setCuenta({ tipo: 'ninguna' })
    router.push('/')
  }, [queryClient, router])

  const refrescar = useCallback(async () => {
    const resultado = await getCuenta()
    if (resultado.ok) setCuenta(resultado.data)
  }, [])

  const valor = useMemo<CuentaContexto | null>(
    () =>
      cuenta.tipo === 'ninguna'
        ? null
        : { cuenta, entrar, salir, refrescar, sesionPerdida },
    [cuenta, entrar, salir, refrescar, sesionPerdida],
  )

  if (!valor) {
    return (
      <div className={styles.preparando} role="status" aria-live="polite">
        {error ? (
          <>
            <p className={styles.texto}>{error}</p>
            <Button
              onClick={() => {
                setError(null)
                setIntento((n) => n + 1)
              }}
            >
              Reintentar
            </Button>
          </>
        ) : (
          <>
            <Loader />
            <p className={styles.texto}>Preparando tu espacio…</p>
          </>
        )}
      </div>
    )
  }

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}
