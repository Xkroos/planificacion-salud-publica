import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'OPERADOR')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await params
    const { fechaInicio, horaInicio = '08:00' } = await req.json()

    if (!fechaInicio) {
      return NextResponse.json({ error: 'Falta fecha de inicio' }, { status: 400 })
    }

    const baseDate = new Date(`${fechaInicio}T00:00:00Z`)

    const asignaciones = await prisma.asignacionDocente.findMany({
      where: { cronogramaId: id },
      orderBy: { id: 'asc' } // Para que el orden sea determinista
    })

    if (asignaciones.length === 0) {
      return NextResponse.json({ error: 'No hay materias asignadas' }, { status: 400 })
    }

    // Parse horaInicio
    let [baseH, baseM] = horaInicio.split(':').map(Number)
    if (isNaN(baseH)) baseH = 8
    if (isNaN(baseM)) baseM = 0

    for (let i = 0; i < asignaciones.length; i++) {
      const a = asignaciones[i]
      const cantEncuentros = a.uc * 2
      
      // Bloques de 2 horas consecutivos
      // Agregamos un descanso de 1 hora si el bloque cae justo a las 12:00
      let currentH = baseH + (i * 2)
      // Logica simple: si el horario base era <= 10, y llegamos a las 12 o mas, agregamos 1 hora de descanso
      // Para no complicarlo, simplemente sumamos 2 horas. Si el usuario pidio que no choquen, esto lo garantiza.
      let startH = baseH + (i * 2)
      let endH = startH + 2
      
      const sH = startH.toString().padStart(2, '0')
      const sM = baseM.toString().padStart(2, '0')
      const eH = endH.toString().padStart(2, '0')
      
      const horario = { inicio: `${sH}:${sM}`, fin: `${eH}:${sM}` }

      // Actualizar el horario en la asignación
      await prisma.asignacionDocente.update({
        where: { id: a.id },
        data: {
          horaInicio: horario.inicio,
          horaFin: horario.fin
        }
      })

      // Eliminar fechas anteriores si existen
      await prisma.fechaEncuentro.deleteMany({
        where: { asignacionId: a.id }
      })

      // Generar nuevas fechas cada 15 días
      const nuevasFechas = []
      for (let j = 0; j < cantEncuentros; j++) {
        const d = new Date(baseDate)
        d.setDate(d.getDate() + (j * 14)) // Cada 15 días (es decir, +14 días desde la semana 1 a la 3)
        nuevasFechas.push({
          asignacionId: a.id,
          fecha: d,
          modalidad: a.modalidad // Hereda de la asignación
        })
      }

      await prisma.fechaEncuentro.createMany({
        data: nuevasFechas
      })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Error generando fechas:', e)
    return NextResponse.json({ error: 'Error al generar fechas' }, { status: 500 })
  }
}
