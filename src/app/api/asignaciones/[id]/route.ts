import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (session.user.role === 'OPERADOR') {
      const config = await prisma.configuracionSistema.findFirst()
      if (!config?.asignacionCargaAbierta) {
        return NextResponse.json({ error: 'Solo el administrador puede eliminar asignaciones una vez cerrado el proceso' }, { status: 403 })
      }
    }

    const { id } = await params
    await prisma.asignacionDocente.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar asignación' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (session.user.role === 'OPERADOR') {
      // Permitimos que el operador modifique la asignacion para asignar al docente
    }

    const { id } = await params
    const body = await req.json()

    // Calcular viático automáticamente si se cambia el docente
    let viatico = 0;
    if (body.docenteId) {
       const asignacionActual = await prisma.asignacionDocente.findUnique({
          where: { id },
          include: { cronograma: { include: { aulaTerritorial: true } } }
       });
       const docente = await prisma.docente.findUnique({
         where: { id: body.docenteId }
       });
       
       if (asignacionActual?.cronograma?.aulaTerritorialId && docente?.aulaOrigenId) {
         if (asignacionActual.cronograma.aulaTerritorialId !== docente.aulaOrigenId) {
           viatico = asignacionActual.cronograma.aulaTerritorial?.viatico || 0;
         }
       }
    }

    // Actualizar asignación y regenerar fechas
    await prisma.fechaEncuentro.deleteMany({ where: { asignacionId: id } })
    const asignacion = await prisma.asignacionDocente.update({
      where: { id },
      data: {
        docenteId: body.docenteId,
        unidadId: body.unidadId,
        viatico: viatico, // Asignar viático calculado
        lugar: body.lugar || null,
        horaInicio: body.horaInicio,
        horaFin: body.horaFin,
        modalidad: body.modalidad,
        uc: parseInt(body.uc),
        cantHoras: parseInt(body.cantHoras),
        fechas: {
          create: (body.fechas || []).map((f: string) => ({
            fecha: new Date(f),
            modalidad: body.modalidad,
          })),
        },
      },
      include: {
        docente: true,
        unidad: true,
        fechas: { orderBy: { fecha: 'asc' } },
      },
    })
// --- LÓGICA DE RECONFIGURACIÓN AUTOMÁTICA DE HORAS ---
    // Obtenemos todas las asignaciones del cronograma ordenadas
    const todasAsignaciones = await prisma.asignacionDocente.findMany({
      where: { cronogramaId: asignacion.cronogramaId },
      orderBy: { horaInicio: 'asc' }
    });
    
    const currentIndex = todasAsignaciones.findIndex(a => a.id === id);
    
    if (currentIndex !== -1 && currentIndex < todasAsignaciones.length - 1) {
      // Tomamos la hora fin de la asignación actual para empezar a empujar las siguientes
      let [currentEndH, currentEndM] = asignacion.horaFin.split(':').map(Number);
      if (isNaN(currentEndH)) currentEndH = 10;
      if (isNaN(currentEndM)) currentEndM = 0;
      
      for (let i = currentIndex + 1; i < todasAsignaciones.length; i++) {
        const nextA = todasAsignaciones[i];
        
        let startH = currentEndH;
        let endH = startH + 2;
        
        const sH = startH.toString().padStart(2, '0');
        const sM = currentEndM.toString().padStart(2, '0');
        const eH = endH.toString().padStart(2, '0');
        
        await prisma.asignacionDocente.update({
          where: { id: nextA.id },
          data: {
            horaInicio: `${sH}:${sM}`,
            horaFin: `${eH}:${sM}`
          }
        });
        
        // Actualizamos para la próxima iteración
        currentEndH = endH;
      }
    }
    // -----------------------------------------------------
        return NextResponse.json(asignacion)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar asignación' }, { status: 500 })
  }
}
