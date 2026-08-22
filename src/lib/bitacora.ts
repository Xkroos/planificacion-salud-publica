import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function logAction(modulo: string, accion: string, detalles: string) {
  try {
    const session = await auth()
    const usuarioId = session?.user?.id

    await prisma.bitacora.create({
      data: {
        usuarioId,
        modulo,
        accion,
        detalles
      }
    })
  } catch (error) {
    console.error('Error logging action in Bitacora:', error)
  }
}
