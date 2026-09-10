import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const loginRateLimit = new Map<string, { count: number, blockedUntil: number | null }>();
const MAX_LOGIN_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutos

export const { handlers, auth, signIn, signOut } = NextAuth({
  basePath: '/sistema/api/auth',
  trustHost: true,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials)

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data
          
          // --- Rate Limiting Check ---
          const now = Date.now()
          const record = loginRateLimit.get(email) || { count: 0, blockedUntil: null }
          
          if (record.blockedUntil && now < record.blockedUntil) {
            throw new Error('Demasiados intentos fallidos. Intente en 5 minutos.')
          }

          const user = await prisma.usuario.findUnique({
            where: { email },
          })

          if (!user || !user.activo) {
            record.count += 1
            if (record.count >= MAX_LOGIN_ATTEMPTS) record.blockedUntil = now + BLOCK_DURATION_MS
            loginRateLimit.set(email, record)
            return null
          }

          const passwordsMatch = await bcrypt.compare(password, user.password)

          if (passwordsMatch) {
            // Limpiar intentos fallidos al tener éxito
            loginRateLimit.delete(email)
            return {
              id: user.id,
              name: user.nombre,
              email: user.email,
              role: user.rol,
            }
          } else {
            record.count += 1
            if (record.count >= MAX_LOGIN_ATTEMPTS) record.blockedUntil = now + BLOCK_DURATION_MS
            loginRateLimit.set(email, record)
          }
        }
        return null
      },
    }),
  ],
  events: {
    async signIn({ user }) {
      try {
        if (user?.id) {
          await prisma.bitacora.create({
            data: {
              usuarioId: user.id,
              modulo: 'SISTEMA',
              accion: 'LOGIN',
              detalles: `El usuario ${user.name} ha iniciado sesión en el sistema.`
            }
          })
        }
      } catch (e) {
        console.error('Error logging signIn:', e)
      }
    },
    async signOut(message: any) {
      try {
        const userId = message?.token?.id || message?.session?.user?.id || message?.token?.sub;
        if (userId) {
          await prisma.bitacora.create({
            data: {
              usuarioId: userId,
              modulo: 'SISTEMA',
              accion: 'LOGOUT',
              detalles: `El usuario ha cerrado sesión en el sistema.`
            }
          })
        }
      } catch (e) {
        console.error('Error logging signOut:', e)
      }
    }
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as { id: string, role: string }
        token.role = u.role
        token.id = u.id
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role as string
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: '/sistema/login',
    error: '/sistema/login',
  },
  session: {
    strategy: 'jwt',
  },
})
