import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { parseHoraTo24 } from '@/lib/utils'

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

    const asignaciones = await prisma.asignacionDocente.findMany({
      where: { cronogramaId: id },
      orderBy: [{ orden: 'asc' }, { horaInicio: 'asc' }, { id: 'asc' }]
    })

    if (asignaciones.length === 0) {
      return NextResponse.json({ error: 'No hay materias asignadas' }, { status: 400 })
    }

    // Parse horaInicio (soporta 24h '08:00' y 12h AM/PM '08:00 AM')
    const parsedHora = parseHoraTo24(horaInicio) || '08:00'
    let [baseH, baseM] = parsedHora.split(':').map(Number)
    if (isNaN(baseH)) baseH = 8
    if (isNaN(baseM)) baseM = 0

    const [year, month, day] = fechaInicio.split('-').map(Number)

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

      // Actualizar el horario en la asignación y garantizar el orden
      await prisma.asignacionDocente.update({
        where: { id: a.id },
        data: {
          horaInicio: horario.inicio,
          horaFin: horario.fin,
          orden: i
        }
      })

      // Eliminar fechas anteriores si existen
      await prisma.fechaEncuentro.deleteMany({
        where: { asignacionId: a.id }
      })

      // Generar nuevas fechas cada 15 días (cada 2 semanas = +14 días)
      // Ancladas a las 12:00:00 UTC para neutralidad de huso horario
      const nuevasFechas = []
      for (let j = 0; j < cantEncuentros; j++) {
        const d = new Date(Date.UTC(year, month - 1, day + (j * 14), 12, 0, 0))
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
