import { prisma } from '@/lib/prisma'

/**
 * Convierte un string de hora en formato HH:MM (o HH:MM AM/PM) a un número de minutos desde medianoche
 * @param timeStr Hora en formato HH:MM o similar
 * @returns Minutos desde medianoche, o NaN si es inválido
 */
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return NaN;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    return h * 60 + m;
  }
  return NaN;
}

/**
 * Verifica si hay choque de horario para un docente en las fechas y horas especificadas.
 * @param docenteId ID del docente a asignar
 * @param fechas Arreglo de fechas (strings o Dates) en las que se darán las clases
 * @param horaInicio Hora de inicio en formato HH:MM (24h)
 * @param horaFin Hora de fin en formato HH:MM (24h)
 * @param excludeAsignacionId ID de la asignación actual a excluir (para el caso de edición)
 * @returns { isAvailable: boolean, message?: string }
 */
export async function checkDocenteAvailability(
  docenteId: string,
  fechas: (string | Date)[],
  horaInicio: string,
  horaFin: string,
  excludeAsignacionId?: string
) {
  if (!docenteId || fechas.length === 0 || !horaInicio || !horaFin) {
    return { isAvailable: true };
  }

  const startMinutes = parseTimeToMinutes(horaInicio);
  const endMinutes = parseTimeToMinutes(horaFin);

  if (isNaN(startMinutes) || isNaN(endMinutes)) {
    return { isAvailable: true }; // No validamos si la hora está mal formada
  }

  // Convertimos las fechas a un formato consistente para la comparación
  const dateStrings = fechas.map(f => {
    const d = new Date(typeof f === 'string' && !f.includes('T') ? `${f}T12:00:00Z` : f);
    return d.toISOString().split('T')[0];
  });

  // Obtenemos todas las asignaciones del docente (excluyendo la actual si es edición)
  const asignacionesDocente = await prisma.asignacionDocente.findMany({
    where: {
      docenteId,
      id: excludeAsignacionId ? { not: excludeAsignacionId } : undefined,
    },
    include: {
      fechas: true,
      cronograma: {
        include: {
          aulaTerritorial: true
        }
      }
    }
  });

  for (const asignacion of asignacionesDocente) {
    const aStart = parseTimeToMinutes(asignacion.horaInicio);
    const aEnd = parseTimeToMinutes(asignacion.horaFin);

    if (isNaN(aStart) || isNaN(aEnd)) continue;

    // Chequeamos si hay solapamiento de horas
    const isTimeOverlap = startMinutes < aEnd && endMinutes > aStart;

    if (isTimeOverlap) {
      // Chequeamos si hay solapamiento de fechas
      const aDateStrings = asignacion.fechas.map(f => f.fecha.toISOString().split('T')[0]);
      const commonDates = dateStrings.filter(d => aDateStrings.includes(d));

      if (commonDates.length > 0) {
        return {
          isAvailable: false,
          message: `El docente ya tiene una clase asignada en el cronograma de ${asignacion.cronograma.aulaTerritorial?.nombre || 'otra sede'} (Sección ${asignacion.cronograma.seccion}) que choca en horario (${asignacion.horaInicio} - ${asignacion.horaFin}) en las fechas: ${commonDates.join(', ')}.`
        };
      }
    }
  }

  return { isAvailable: true };
}
