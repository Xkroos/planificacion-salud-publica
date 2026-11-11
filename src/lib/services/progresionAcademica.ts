import { prisma } from '@/lib/prisma'
import { CondicionAcademica, Prisma } from '@prisma/client'

export const SECUENCIA_TRIMESTRES = [
  'Introductorio',
  'I',
  'II',
  'III',
  'IV',
  'V',
  'Comisión Técnica',
  'Finalizado'
] as const

export type TrimestreValido = typeof SECUENCIA_TRIMESTRES[number]

/**
 * Normaliza nombres de trimestres para evitar discrepancias de mayúsculas/minúsculas o formatos
 */
export function normalizarTrimestre(raw?: string | null): string {
  if (!raw) return 'Introductorio'
  const clean = raw.trim()
  const upper = clean.toUpperCase()

  if (upper === 'INTRODUCTORIO') return 'Introductorio'
  if (upper === 'I' || upper === 'I TRIMESTRE' || upper === '1' || upper === '1°') return 'I'
  if (upper === 'II' || upper === 'II TRIMESTRE' || upper === '2' || upper === '2°') return 'II'
  if (upper === 'III' || upper === 'III TRIMESTRE' || upper === '3' || upper === '3°') return 'III'
  if (upper === 'IV' || upper === 'IV TRIMESTRE' || upper === '4' || upper === '4°') return 'IV'
  if (upper === 'V' || upper === 'V TRIMESTRE' || upper === '5' || upper === '5°') return 'V'
  if (upper.includes('COMISION') || upper.includes('COMISIÓN')) return 'Comisión Técnica'
  if (upper.includes('FINALIZADO') || upper.includes('EGRESADO')) return 'Finalizado'

  // Si ya coincide exactamente con la secuencia
  const match = SECUENCIA_TRIMESTRES.find(t => t.toLowerCase() === clean.toLowerCase())
  return match || clean
}

export interface ResultadoCalculoNivel {
  trimestreCalculado: string
  trimestreAnterior: string | null
  motivo: string
  debeRepetir: boolean
  periodoAnteriorInfo?: string
}

/**
 * Calcula con precisión matemática el nivel correspondiente para un estudiante
 * en un período determinado, evaluando su rendimiento previo.
 */
export async function calcularNivelSiguiente(
  participanteId: string,
  nuevoPeriodoId: string,
  tx: Prisma.TransactionClient = prisma
): Promise<ResultadoCalculoNivel> {
  const nuevoPeriodo = await tx.periodo.findUnique({
    where: { id: nuevoPeriodoId },
  })

  if (!nuevoPeriodo) {
    throw new Error(`El período académico de destino no existe: ${nuevoPeriodoId}`)
  }

  // 1. Buscar en inscripciones_periodo los períodos cursados cronológicamente anteriores
  const inscripcionPrevia = await tx.inscripcionPeriodo.findFirst({
    where: {
      participanteId,
      periodo: {
        OR: [
          { anio: { lt: nuevoPeriodo.anio } },
          {
            anio: nuevoPeriodo.anio,
            numero: { lt: nuevoPeriodo.numero }
          }
        ]
      }
    },
    include: { periodo: true },
    orderBy: [
      { periodo: { anio: 'desc' } },
      { periodo: { numero: 'desc' } }
    ]
  })

  // 2. Si no hay inscripción en inscripcionPeriodo, consultar en la tabla de participantes (fallback legacy)
  if (!inscripcionPrevia) {
    const participante = await tx.participante.findUnique({
      where: { id: participanteId },
      include: { periodo: true }
    })

    if (!participante) {
      throw new Error(`Participante no encontrado: ${participanteId}`)
    }

    // Si tiene período asignado anterior al actual
    const esAnterior = participante.periodo && (
      participante.periodo.anio < nuevoPeriodo.anio ||
      (participante.periodo.anio === nuevoPeriodo.anio && participante.periodo.numero < nuevoPeriodo.numero)
    )

    if (participante.trimestre && esAnterior) {
      // Inferencia segura: si cursó en un período previo registrado y no hay reprobación, avanza al siguiente
      const norm = normalizarTrimestre(participante.trimestre)
      const idx = SECUENCIA_TRIMESTRES.indexOf(norm as any)

      if (idx >= 0 && idx < SECUENCIA_TRIMESTRES.length - 1) {
        return {
          trimestreCalculado: SECUENCIA_TRIMESTRES[idx + 1],
          trimestreAnterior: norm,
          motivo: `Promoción regular inferida desde ${norm} en período ${participante.periodo?.anio}-${participante.periodo?.numero}.`,
          debeRepetir: false,
          periodoAnteriorInfo: `${participante.periodo?.anio}-${participante.periodo?.numero}`
        }
      }
      return {
        trimestreCalculado: norm,
        trimestreAnterior: norm,
        motivo: `Mantiene nivel ${norm}.`,
        debeRepetir: false,
      }
    }

    // Nuevo ingreso sin ningún historial previo
    return {
      trimestreCalculado: 'Introductorio',
      trimestreAnterior: null,
      motivo: 'Estudiante de nuevo ingreso sin historial previo en la institución.',
      debeRepetir: false,
    }
  }

  // 3. Procesar las reglas de negocio con la inscripción previa formal encontrada
  const trimPrevioNormalizado = normalizarTrimestre(inscripcionPrevia.trimestre)
  const indexActual = SECUENCIA_TRIMESTRES.indexOf(trimPrevioNormalizado as any)
  const infoPeriodoPrev = `${inscripcionPrevia.periodo.anio}-${inscripcionPrevia.periodo.numero}`

  // REGLA: REPROBADO ("Raspó") -> Mantiene el mismo trimestre
  if (inscripcionPrevia.condicion === CondicionAcademica.REPROBADO) {
    return {
      trimestreCalculado: trimPrevioNormalizado,
      trimestreAnterior: trimPrevioNormalizado,
      motivo: `Reprobó en el período anterior (${infoPeriodoPrev}). Debe repetir el trimestre ${trimPrevioNormalizado}.`,
      debeRepetir: true,
      periodoAnteriorInfo: infoPeriodoPrev
    }
  }

  // REGLA: RETIRADO o INACTIVO -> Pausa académica (no salta niveles al reincorporarse)
  if (
    inscripcionPrevia.condicion === CondicionAcademica.RETIRADO ||
    inscripcionPrevia.condicion === CondicionAcademica.INACTIVO
  ) {
    return {
      trimestreCalculado: trimPrevioNormalizado,
      trimestreAnterior: trimPrevioNormalizado,
      motivo: `Estado ${inscripcionPrevia.condicion} en período ${infoPeriodoPrev}. Se reincorpora al mismo nivel.`,
      debeRepetir: false,
      periodoAnteriorInfo: infoPeriodoPrev
    }
  }

  // REGLA: APROBADO o REGULAR CULMINADO -> Avanza al siguiente trimestre
  if (
    inscripcionPrevia.condicion === CondicionAcademica.APROBADO ||
    inscripcionPrevia.condicion === CondicionAcademica.REGULAR
  ) {
    if (indexActual >= 0 && indexActual < SECUENCIA_TRIMESTRES.length - 1) {
      const nuevoTrimestre = SECUENCIA_TRIMESTRES[indexActual + 1]
      return {
        trimestreCalculado: nuevoTrimestre,
        trimestreAnterior: trimPrevioNormalizado,
        motivo: `Aprobó ${trimPrevioNormalizado} en período ${infoPeriodoPrev}. Avanza a ${nuevoTrimestre}.`,
        debeRepetir: false,
        periodoAnteriorInfo: infoPeriodoPrev
      }
    } else {
      return {
        trimestreCalculado: 'Finalizado',
        trimestreAnterior: trimPrevioNormalizado,
        motivo: 'Estudiante ha completado satisfactoriamente toda la secuencia curricular.',
        debeRepetir: false,
        periodoAnteriorInfo: infoPeriodoPrev
      }
    }
  }

  // Default seguro
  return {
    trimestreCalculado: trimPrevioNormalizado,
    trimestreAnterior: trimPrevioNormalizado,
    motivo: `Mantiene trimestre ${trimPrevioNormalizado}.`,
    debeRepetir: false,
    periodoAnteriorInfo: infoPeriodoPrev
  }
}

/**
 * Procesa masiva o individualmente las inscripciones y el cálculo de nivel para un período académico.
 * Es IDEMPOTENTE: puede ejecutarse repetidamente sin generar inconsistencias.
 */
export async function procesarInscripcionesNuevoPeriodo(
  nuevoPeriodoId: string,
  participantesIds?: string[],
  usuarioResponsable: string = 'SISTEMA_PROGRESION'
) {
  const nuevoPeriodo = await prisma.periodo.findUnique({
    where: { id: nuevoPeriodoId }
  })

  if (!nuevoPeriodo) {
    throw new Error(`El período académico no existe: ${nuevoPeriodoId}`)
  }

  const whereParticipantes: Prisma.ParticipanteWhereInput = participantesIds && participantesIds.length > 0
    ? { id: { in: participantesIds } }
    : {}

  const participantes = await prisma.participante.findMany({
    where: whereParticipantes,
    select: {
      id: true,
      nombre: true,
      apellido: true,
      cedula: true,
      trimestre: true,
      periodoId: true,
      aulaTerritorialId: true,
      regionId: true,
    }
  })

  let procesados = 0
  let promovidos = 0
  let repetidores = 0
  const detalles: any[] = []

  // Ejecución en batches para alta eficiencia con miles de estudiantes
  const BATCH_SIZE = 50
  for (let i = 0; i < participantes.length; i += BATCH_SIZE) {
    const lote = participantes.slice(i, i + BATCH_SIZE)

    await prisma.$transaction(async (tx) => {
      for (const p of lote) {
        const calculo = await calcularNivelSiguiente(p.id, nuevoPeriodoId, tx)
        
        // 1. Guardar o actualizar registro de inscripción en el período
        await tx.inscripcionPeriodo.upsert({
          where: {
            participanteId_periodoId: {
              participanteId: p.id,
              periodoId: nuevoPeriodoId
            }
          },
          create: {
            participanteId: p.id,
            periodoId: nuevoPeriodoId,
            trimestre: calculo.trimestreCalculado,
            condicion: CondicionAcademica.REGULAR,
            aulaTerritorialId: p.aulaTerritorialId,
          },
          update: {
            trimestre: calculo.trimestreCalculado,
            aulaTerritorialId: p.aulaTerritorialId || undefined
          }
        })

        // 2. Sincronizar el campo estático de proyección en Participante (evita romper UI)
        await tx.participante.update({
          where: { id: p.id },
          data: {
            trimestre: calculo.trimestreCalculado,
            periodoId: nuevoPeriodoId
          }
        })

        // 3. Auditoría histórica
        if (p.trimestre !== calculo.trimestreCalculado) {
          await tx.historialTrimestre.create({
            data: {
              participanteId: p.id,
              trimestreAnterior: p.trimestre,
              trimestreNuevo: calculo.trimestreCalculado,
              periodoId: nuevoPeriodoId,
              regionId: p.regionId,
              aulaTerritorialId: p.aulaTerritorialId,
              cambiadoPor: usuarioResponsable
            }
          })
          promovidos++
        }

        if (calculo.debeRepetir) {
          repetidores++
        }

        procesados++
        if (detalles.length < 20) {
          detalles.push({
            cedula: p.cedula,
            nombre: `${p.nombre} ${p.apellido || ''}`.trim(),
            anterior: p.trimestre,
            nuevo: calculo.trimestreCalculado,
            motivo: calculo.motivo
          })
        }
      }
    })
  }

  return {
    periodo: `${nuevoPeriodo.anio}-${nuevoPeriodo.numero}`,
    totalProcesados: procesados,
    totalPromovidos: promovidos,
    totalRepetidores: repetidores,
    muestraDetalles: detalles
  }
}

/**
 * Permite actualizar la condición de un estudiante en un período específico
 * (ej. cambiar a APROBADO, REPROBADO o RETIRADO).
 */
export async function registrarCondicionEstudiante(
  participanteId: string,
  periodoId: string,
  condicion: CondicionAcademica,
  notaPromedio?: number,
  seccion?: string
) {
  const inscripcion = await prisma.inscripcionPeriodo.upsert({
    where: {
      participanteId_periodoId: {
        participanteId,
        periodoId
      }
    },
    update: {
      condicion,
      notaPromedio: notaPromedio !== undefined ? notaPromedio : undefined,
      seccion: seccion !== undefined ? seccion : undefined,
    },
    create: {
      participanteId,
      periodoId,
      trimestre: 'Introductorio',
      condicion,
      notaPromedio,
      seccion
    }
  })

  return inscripcion
}

