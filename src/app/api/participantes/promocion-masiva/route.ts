import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logAction } from '@/lib/bitacora'

const SECUENCIA = [
  'Introductorio',
  'I',
  'II',
  'III',
  'IV',
  'V',
  'Comisión Técnica'
]

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    if (session.user.role === 'OPERADOR') {
      const config = await prisma.configuracionSistema.findFirst()
      if (!config?.inscripcionParticipantesAbierta) {
        return NextResponse.json({ error: 'El proceso esta cerrado' }, { status: 403 })
      }
    }

    const { periodoId } = await req.json()
    if (!periodoId) return NextResponse.json({ error: 'Falta periodoId' }, { status: 400 })

    const participantes = await prisma.participante.findMany({
      where: { periodoId }
    })

    if (participantes.length === 0) {
      return NextResponse.json({ message: 'No hay participantes para promover', promovidos: 0 })
    }

    let promovidos = 0

    for (const p of participantes) {
      if (!p.trimestre) continue
      
      const index = SECUENCIA.indexOf(p.trimestre)
      if (index >= 0 && index < SECUENCIA.length - 1) {
        const nuevoTrimestre = SECUENCIA[index + 1]
        
        await prisma.$transaction([
          prisma.participante.update({
            where: { id: p.id },
            data: { trimestre: nuevoTrimestre }
          }),
          prisma.historialTrimestre.create({
            data: {
              participanteId: p.id,
              trimestreAnterior: p.trimestre,
              trimestreNuevo: nuevoTrimestre,
              periodoId: p.periodoId,
              regionId: p.regionId,
              aulaTerritorialId: p.aulaTerritorialId,
              cambiadoPor: session.user.name || session.user.email || 'Sistema',
            }
          })
        ])
        promovidos++
      }
    }

    await logAction('PARTICIPANTES', 'ACTUALIZAR', `Se promovieron masivamente ${promovidos} participantes del periodo ${periodoId}`)

    return NextResponse.json({ message: 'Promoción completada', promovidos })

  } catch (error: any) {
    console.error('Error promoción masiva:', error)
    return NextResponse.json({ error: 'Error interno al realizar la promoción masiva' }, { status: 500 })
  }
}
