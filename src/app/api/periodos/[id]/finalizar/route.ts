import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { CondicionAcademica } from '@prisma/client'
import { asegurarTablaInscripcionesPeriodo } from '@/lib/services/sincronizarCohortes'

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    await asegurarTablaInscripcionesPeriodo()
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await props.params
    if (!id) return NextResponse.json({ error: 'Falta ID' }, { status: 400 })

    const [periodo] = await prisma.$transaction([
      prisma.periodo.update({
        where: { id },
        data: { estado: 'CERRADO' },
      }),
      // Al cerrar el período, los estudiantes en condición REGULAR culminan como APROBADO
      // (a menos que hayan sido marcados previamente como REPROBADO o RETIRADO)
      prisma.inscripcionPeriodo.updateMany({
        where: {
          periodoId: id,
          condicion: CondicionAcademica.REGULAR,
        },
        data: {
          condicion: CondicionAcademica.APROBADO,
        },
      }),
    ])

    return NextResponse.json(periodo)
  } catch (error: any) {
    console.error('Error finalizar periodo:', error)
    return NextResponse.json({ error: 'Error al finalizar el periodo' }, { status: 500 })
  }
}
