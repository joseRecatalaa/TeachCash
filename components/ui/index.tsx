/**
 * Primitivas de interfaz. Sin lógica de dominio y sin 'use client': son
 * Server Components salvo que quien las use necesite otra cosa.
 */

import type { ComponentProps, ReactNode } from 'react'
import { formatMoney, formatMoneySigned } from '@/lib/format'
import { isNegative, isZero, type Money } from '@/lib/money'

const cx = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(' ')

export function Card({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section
      className={cx('rounded-xl border border-border bg-surface p-5', className)}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }: ComponentProps<'h2'>) {
  return <h2 className={cx('text-sm font-medium text-muted', className)} {...props} />
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </header>
  )
}

const buttonStyles = {
  primary: 'bg-accent text-accent-foreground hover:opacity-90',
  secondary: 'border border-border bg-surface hover:bg-background',
  danger: 'border border-border text-expense hover:bg-background',
} as const

export function Button({
  variant = 'primary',
  className,
  ...props
}: ComponentProps<'button'> & { variant?: keyof typeof buttonStyles }) {
  return (
    <button
      className={cx(
        'inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition',
        'disabled:cursor-not-allowed disabled:opacity-50',
        buttonStyles[variant],
        className,
      )}
      {...props}
    />
  )
}

export function Field({
  label,
  htmlFor,
  errors,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  errors?: string[]
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !errors?.length && <p className="text-xs text-muted">{hint}</p>}
      {/* role="alert" para que un lector de pantalla lo anuncie al aparecer. */}
      {errors?.length ? (
        <p role="alert" className="text-xs text-expense">
          {errors[0]}
        </p>
      ) : null}
    </div>
  )
}

const controlClass =
  'h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-accent'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cx(controlClass, className)} {...props} />
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cx(controlClass, className)} {...props} />
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cx(controlClass, 'h-auto min-h-20 py-2', className)}
      {...props}
    />
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-8 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  )
}

/**
 * Un importe. Alineado a la derecha, con cifras de ancho fijo, y con el signo
 * como señal principal — el color es un refuerzo, nunca la única pista.
 */
export function MoneyText({
  value,
  showSign = false,
  colored = false,
  className,
}: {
  value: Money
  showSign?: boolean
  colored?: boolean
  className?: string
}) {
  const tone = isZero(value)
    ? undefined
    : isNegative(value)
      ? 'text-expense'
      : 'text-income'

  return (
    <span className={cx('tabular', colored && tone, className)}>
      {showSign ? formatMoneySigned(value) : formatMoney(value)}
    </span>
  )
}

export function Stat({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <Card>
      <CardTitle>{label}</CardTitle>
      <div className="mt-2 text-2xl font-semibold">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  )
}

export function FormStatus({
  state,
}: {
  state: { status: 'idle' } | { status: 'success'; message?: string } | { status: 'error'; error?: string }
}) {
  if (state.status === 'idle') return null
  if (state.status === 'success' && !state.message) return null
  const message = state.status === 'success' ? state.message : state.error
  if (!message) return null

  return (
    <p
      role={state.status === 'error' ? 'alert' : 'status'}
      className={cx('text-sm', state.status === 'error' ? 'text-expense' : 'text-income')}
    >
      {message}
    </p>
  )
}
