import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { logAction } from '@/lib/bitacora'

/**
 * GET /api/profile
 * Devuelve los datos del usuario autenticado.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { id: true, nombre: true, email: true, rol: true },
  })

  if (!usuario) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  return NextResponse.json(usuario)
}

/**
 * PATCH /api/profile
 * Actualiza la contraseña o el email del usuario autenticado.
 *
 * Body para cambiar contraseña:
 *   { tipo: 'password', passwordActual: string, passwordNueva: string }
 *
 * Body para cambiar email:
 *   { tipo: 'email', passwordActual: string, emailNuevo: string }
 */
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await req.json()
  const { tipo, passwordActual } = body

  if (!tipo || !passwordActual) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  // Obtener usuario con la contraseña actual (hash)
  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
  })

  if (!usuario) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  // Verificar contraseña actual
  const esValida = await bcrypt.compare(passwordActual, usuario.password)
  if (!esValida) {
    return NextResponse.json({ error: 'La contraseña actual es incorrecta' }, { status: 401 })
  }

  // ── Cambio de contraseña ───────────────────────────────────────────────────
  if (tipo === 'password') {
    const { passwordNueva } = body

    if (!passwordNueva || passwordNueva.length < 6) {
      return NextResponse.json(
        { error: 'La nueva contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    const hash = await bcrypt.hash(passwordNueva, 12)
    await prisma.usuario.update({
      where: { id: session.user.id },
      data: { password: hash },
    })

    await logAction('USUARIOS', 'ACTUALIZAR', `El usuario actualizó su contraseña`)

    return NextResponse.json({ success: true, mensaje: 'Contraseña actualizada correctamente' })
  }

  // ── Cambio de email ────────────────────────────────────────────────────────
  if (tipo === 'email') {
    const { emailNuevo } = body

    if (!emailNuevo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNuevo)) {
      return NextResponse.json({ error: 'El correo ingresado no es válido' }, { status: 400 })
    }

    const emailLower = emailNuevo.toLowerCase().trim()

    if (emailLower === usuario.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'El nuevo correo es igual al actual' },
        { status: 400 }
      )
    }

    try {
      await prisma.usuario.update({
        where: { id: session.user.id },
        data: { email: emailLower },
      })
    } catch (e: any) {
      if (e?.code === 'P2002') {
        return NextResponse.json(
          { error: 'Este correo ya está en uso por otro usuario' },
          { status: 409 }
        )
      }
      throw e
    }

    await logAction('USUARIOS', 'ACTUALIZAR', `El usuario actualizó su correo electrónico a: ${emailLower}`)

    return NextResponse.json({ success: true, mensaje: 'Correo actualizado correctamente' })
  }

  return NextResponse.json({ error: 'Tipo de operación no reconocido' }, { status: 400 })
}
