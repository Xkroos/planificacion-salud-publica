'use server'

import { signIn } from '@/lib/auth'
import { AuthError } from 'next-auth'

export async function loginAction(email: string, password: string): Promise<{ error?: string }> {
  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: '/',
    })
  } catch (error) {
    // AuthError = credenciales incorrectas
    if (error instanceof AuthError) {
      return { error: 'Credenciales incorrectas. Verifique su email y contraseña.' }
    }
    // NEXT_REDIRECT no es AuthError — Next.js lo maneja automáticamente
    // Cualquier otro error inesperado
    throw error
  }
  return {}
}
