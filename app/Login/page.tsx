'use client'

import { Suspense } from 'react'
import { LoginForm } from '@/src/presentation/components/Auth/LoginForm'

// `LoginForm` lee `?enlace=` con useSearchParams: sin Suspense, el build avisa.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
