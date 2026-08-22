import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logAction } from '@/lib/bitacora'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo el administrador puede editar aulas' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    
    // Obtener valores viejos para comparar
    const aulaVieja = await prisma.aulaTerritorial.findUnique({ where: { id } })
    
    const aula = await prisma.aulaTerritorial.update({
      where: { id },
      data: {
        nombre: body.nombre.toUpperCase(),
        coordinador: body.coordinador || null,
        enlace: body.enlace || null,
        costo: body.costo !== undefined ? parseFloat(body.costo) : undefined,
        preinscripcion: body.preinscripcion !== undefined ? parseFloat(body.preinscripcion) : undefined,
        inscripcion: body.inscripcion !== undefined ? parseFloat(body.inscripcion) : undefined,
        gastosAdministrativos: body.gastosAdministrativos ? parseFloat(body.gastosAdministrativos) : 0,
        limpieza: body.limpieza ? parseFloat(body.limpieza) : 0,
        vigilancia: body.vigilancia ? parseFloat(body.vigilancia) : 0,
        aporteCoordinacion: body.aporteCoordinacion ? parseFloat(body.aporteCoordinacion) : 0,
        viatico: body.viatico ? parseFloat(body.viatico) : 0,
        viaticoZona: body.viaticoZona ? parseFloat(body.viaticoZona) : 0,
        regionId: body.regionId,
      },
    })
    
    let cambios: string[] = []
    if (aulaVieja) {
      const camposNum = ['costo', 'preinscripcion', 'inscripcion', 'gastosAdministrativos', 'limpieza', 'vigilancia', 'aporteCoordinacion', 'viatico', 'viaticoZona']
      for (const campo of camposNum) {
        const valViejo = (aulaVieja as any)[campo] || 0
        const valNuevo = (aula as any)[campo] || 0
        if (valViejo !== valNuevo) {
          cambios.push(`${campo} (antes ${valViejo} cambiado a ${valNuevo})`)
        }
      }
    }
    
    const mensaje = cambios.length > 0 
      ? `Se modificaron los datos o costos del aula territorial ${aula.nombre}. Cambios: ${cambios.join(', ')}`
      : `Se modificaron los datos del aula territorial ${aula.nombre}`
      
    await logAction('COSTOS AULAS', 'ACTUALIZAR', mensaje)
    
    return NextResponse.json(aula)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar aula' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo el administrador puede eliminar aulas' }, { status: 403 })
    }

    const { id } = await params
    
    const aula = await prisma.aulaTerritorial.findUnique({ where: { id } })
    if (aula) {
      await logAction('COSTOS AULAS', 'ELIMINAR', `Se eliminó el aula territorial ${aula.nombre}`)
    }
    
    await prisma.aulaTerritorial.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar aula' }, { status: 500 })
  }
}
