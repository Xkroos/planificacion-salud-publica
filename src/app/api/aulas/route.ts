import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logAction } from '@/lib/bitacora'

export async function GET() {
  try {
    const aulas = await prisma.aulaTerritorial.findMany({
      include: { region: true },
      orderBy: [{ region: { nombre: 'asc' } }, { nombre: 'asc' }],
    })
    return NextResponse.json(aulas)
  } catch {
    return NextResponse.json({ error: 'Error al obtener aulas' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo el administrador puede crear aulas territoriales' }, { status: 403 })
    }

    const body = await req.json()
    const aula = await prisma.aulaTerritorial.create({
      data: {
        nombre: body.nombre.toUpperCase(),
        coordinador: body.coordinador || null,
        enlace: body.enlace || null,
        costo: body.costo ? parseFloat(body.costo) : 0,
        preinscripcion: body.preinscripcion ? parseFloat(body.preinscripcion) : 0,
        inscripcion: body.inscripcion ? parseFloat(body.inscripcion) : 0,
        gastosAdministrativos: body.gastosAdministrativos ? parseFloat(body.gastosAdministrativos) : 0,
        limpieza: body.limpieza ? parseFloat(body.limpieza) : 0,
        vigilancia: body.vigilancia ? parseFloat(body.vigilancia) : 0,
        aporteCoordinacion: body.aporteCoordinacion ? parseFloat(body.aporteCoordinacion) : 0,
        viatico: body.viatico ? parseFloat(body.viatico) : 0,
        regionId: body.regionId,
      },
      include: { region: true },
    })

    await logAction('AULAS', 'CREAR', `Se registró el aula territorial ${aula.nombre} (Región: ${aula.region?.nombre || ''})`)

    return NextResponse.json(aula, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al crear aula' }, { status: 500 })
  }
}
