import { prisma } from '@/lib/prisma'
import { Genero, CondicionAcademica } from '@prisma/client'
import * as XLSX from 'xlsx'
import { asegurarTablaInscripcionesPeriodo } from '@/lib/services/sincronizarCohortes'

export function normalizarTexto(txt?: string | number | null): string {
  if (txt === null || txt === undefined) return ''
  return txt
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
}

export function limpiarCedula(cedulaRaw?: string | number | null): string {
  if (!cedulaRaw) return ''
  const str = cedulaRaw.toString().trim()
  // Eliminar puntos, espacios, guiones y prefijo V/E/J
  return str.replace(/[^0-9a-zA-Z]/g, '').toUpperCase().replace(/^[VEJ]-?/, '')
}

export function limpiarTelefono(tlfRaw?: string | number | null): string {
  if (!tlfRaw) return ''
  const str = tlfRaw.toString().trim()
  return str.replace(/[^0-9]/g, '')
}

// Catálogo estricto de trimestres permitidos según especificación
export const NIVELES_MAPA_ESTRICTO: Record<string, string> = {
  'INTRODUCTORIO': 'Introductorio',
  'I': 'I',
  'II': 'II',
  'III': 'III',
  'IV': 'IV',
  'V': 'V',
  'COMISION TECNICA': 'Comisión Técnica',
  'FINALIZADO': 'Finalizado'
}

export interface FilaExcelRaw {
  [key: string]: any
}

export interface FilaValidada {
  numeroFila: number
  nombre: string
  apellido: string
  cedula: string
  telefono?: string | null
  email?: string | null
  genero: Genero
  trimestre: string
  periodoId: string
  periodoInfo: string
  regionId: string
  regionNombre: string
  aulaTerritorialId: string
  aulaNombre: string
}

export interface FilaConError {
  numeroFila: number
  cedula?: string
  nombre?: string
  apellido?: string
  errores: string[]
  esConflictoUnicidad: boolean
  datosOriginales: Record<string, any>
}

export interface ResultadoValidacionImportacion {
  totalFilas: number
  totalValidas: number
  totalErrores: number
  hayConflictoUnicidad: boolean
  mensajeConflictoUnicidad?: string
  filasValidas: FilaValidada[]
  filasConError: FilaConError[]
  catalogosCargados: {
    periodosActivos: string[]
    regiones: string[]
  }
}

/**
 * Lee un buffer o array de filas de Excel y valida exhaustivamente cada fila
 * verificando duplicados (internos y contra BD) y consistencia contra catálogos.
 */
export async function validarLoteExcelParticipantes(
  filasRaw: FilaExcelRaw[]
): Promise<ResultadoValidacionImportacion> {
  // 1. Cargar catálogos actuales desde la Base de Datos
  const periodos = await prisma.periodo.findMany({
    select: { id: true, anio: true, numero: true, estado: true }
  })

  const regiones = await prisma.region.findMany({
    include: {
      aulas: {
        select: { id: true, nombre: true, regionId: true }
      }
    }
  })

  // Pre-cargar todos los identificadores únicos existentes en la BD para validación O(1)
  const participantesExistentes = await prisma.participante.findMany({
    select: { cedula: true, email: true, telefono: true }
  })

  const docentesExistentes = await prisma.docente.findMany({
    select: { cedula: true, email: true }
  })

  const setCedulasBD = new Set<string>()
  const setEmailsBD = new Set<string>()
  const setTelefonosBD = new Set<string>()

  participantesExistentes.forEach(p => {
    if (p.cedula) setCedulasBD.add(limpiarCedula(p.cedula))
    if (p.email) setEmailsBD.add(p.email.trim().toLowerCase())
    if (p.telefono) setTelefonosBD.add(limpiarTelefono(p.telefono))
  })

  docentesExistentes.forEach(d => {
    if (d.cedula) setCedulasBD.add(limpiarCedula(d.cedula))
    if (d.email) setEmailsBD.add(d.email.trim().toLowerCase())
  })

  // Estructuras para detectar duplicados dentro del mismo archivo Excel
  const setCedulasLote = new Map<string, number>()
  const setEmailsLote = new Map<string, number>()
  const setTelefonosLote = new Map<string, number>()

  const filasValidas: FilaValidada[] = []
  const filasConError: FilaConError[] = []
  let hayConflictoUnicidadGlobal = false

  // 2. Procesar fila por fila
  for (let i = 0; i < filasRaw.length; i++) {
    const row = filasRaw[i]
    const numeroFila = i + 2 // Fila 1 suele ser cabecera
    const errores: string[] = []
    let esConflictoUnicidad = false

    // Identificar columnas por múltiples alias posibles
    const getVal = (claves: string[]) => {
      for (const k of Object.keys(row)) {
        const normKey = normalizarTexto(k)
        for (const clave of claves) {
          if (normKey === clave || normKey.includes(clave)) {
            const v = row[k]
            return v !== undefined && v !== null ? String(v).trim() : ''
          }
        }
      }
      return ''
    }

    const nombreRaw = getVal(['NOMBRE', 'NOMBRES', 'FIRST NAME'])
    const apellidoRaw = getVal(['APELLIDO', 'APELLIDOS', 'LAST NAME'])
    const cedulaRaw = getVal(['CEDULA', 'CÉDULA', 'CI', 'DOCUMENTO', 'DNI'])
    const telefonoRaw = getVal(['TELEFONO', 'TELÉFONO', 'TLF', 'CELULAR', 'MOVIL'])
    const emailRaw = getVal(['CORREO', 'EMAIL', 'E-MAIL', 'CORREO ELECTRONICO', 'CORREO ELECTRÓNICO'])
    const generoRaw = getVal(['GENERO', 'GÉNERO', 'SEXO'])
    const nivelRaw = getVal(['NIVEL', 'TRIMESTRE', 'NIVEL / TRIMESTRE', 'NIVEL/TRIMESTRE'])
    const periodoRaw = getVal(['PERIODO', 'PERÍODO', 'PERIODO ACADEMICO', 'PERÍODO ACADÉMICO'])
    const estadoRaw = getVal(['ESTADO', 'REGION', 'REGIÓN'])
    const aulaRaw = getVal(['AULA', 'SEDE', 'AULA TERRITORIAL'])

    // --- VALIDACIÓN 1: Nombre y Apellido (Obligatorios) ---
    if (!nombreRaw) {
      errores.push("El campo 'Nombre' es obligatorio.")
    }
    if (!apellidoRaw) {
      errores.push("El campo 'Apellido' es obligatorio.")
    }

    // --- VALIDACIÓN 2: Cédula (Obligatoria y Única) ---
    const cedulaClean = limpiarCedula(cedulaRaw)
    if (!cedulaClean) {
      errores.push("El campo 'Cédula' es obligatorio.")
    } else {
      // Duplicado en el mismo archivo Excel
      if (setCedulasLote.has(cedulaClean)) {
        errores.push(`Cédula duplicada en el mismo archivo (también en fila ${setCedulasLote.get(cedulaClean)}).`)
        esConflictoUnicidad = true
      } else {
        setCedulasLote.set(cedulaClean, numeroFila)
      }

      // Duplicado en la Base de Datos
      if (setCedulasBD.has(cedulaClean)) {
        errores.push(`La cédula '${cedulaClean}' ya se encuentra registrada en el sistema.`)
        esConflictoUnicidad = true
      }
    }

    // --- VALIDACIÓN 3: Teléfono (Opcional pero Único si está informado) ---
    let tlfClean: string | null = null
    if (telefonoRaw) {
      tlfClean = limpiarTelefono(telefonoRaw)
      if (tlfClean.length < 7) {
        errores.push(`El número de teléfono '${telefonoRaw}' es inválido (mínimo 7 dígitos).`)
      } else {
        // Duplicado en Excel
        if (setTelefonosLote.has(tlfClean)) {
          errores.push(`Número de teléfono duplicado en el mismo archivo (también en fila ${setTelefonosLote.get(tlfClean)}).`)
          esConflictoUnicidad = true
        } else {
          setTelefonosLote.set(tlfClean, numeroFila)
        }

        // Duplicado en BD
        if (setTelefonosBD.has(tlfClean)) {
          errores.push(`El número de teléfono '${telefonoRaw}' ya se encuentra registrado en el sistema.`)
          esConflictoUnicidad = true
        }
      }
    }

    // --- VALIDACIÓN 4: Correo Electrónico (Opcional pero Único y con Formato) ---
    let emailClean: string | null = null
    if (emailRaw) {
      emailClean = emailRaw.trim().toLowerCase()
      const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!regexEmail.test(emailClean)) {
        errores.push(`El correo '${emailRaw}' tiene un formato inválido.`)
      } else {
        // Duplicado en Excel
        if (setEmailsLote.has(emailClean)) {
          errores.push(`Correo electrónico duplicado en el mismo archivo (también en fila ${setEmailsLote.get(emailClean)}).`)
          esConflictoUnicidad = true
        } else {
          setEmailsLote.set(emailClean, numeroFila)
        }

        // Duplicado en BD
        if (setEmailsBD.has(emailClean)) {
          errores.push(`El correo electrónico '${emailRaw}' ya se encuentra registrado en el sistema.`)
          esConflictoUnicidad = true
        }
      }
    }

    // --- VALIDACIÓN 5: Género (Obligatorio contra Catálogo) ---
    let generoValido: Genero | null = null
    const generoNorm = normalizarTexto(generoRaw)
    if (!generoNorm) {
      errores.push("El campo 'Género' es obligatorio.")
    } else if (['FEMENINO', 'F', 'FEM'].includes(generoNorm)) {
      generoValido = Genero.FEMENINO
    } else if (['MASCULINO', 'M', 'MASC'].includes(generoNorm)) {
      generoValido = Genero.MASCULINO
    } else {
      errores.push(`Género inválido ('${generoRaw}'). Valores permitidos estrictamente: 'Femenino' o 'Masculino'.`)
    }

    // --- VALIDACIÓN 6: Nivel / Trimestre (Estricto Anti-Typos) ---
    let nivelValido: string | null = null
    const nivelNorm = normalizarTexto(nivelRaw)
    if (!nivelNorm) {
      errores.push("El campo 'Nivel / Trimestre' es obligatorio.")
    } else if (NIVELES_MAPA_ESTRICTO[nivelNorm]) {
      nivelValido = NIVELES_MAPA_ESTRICTO[nivelNorm]
    } else {
      errores.push(`Nivel/Trimestre inválido ('${nivelRaw}'). Valores admitidos estrictamente: 'introductorio', 'I', 'II', 'III', 'IV', 'V', 'Comision tecnica', 'finalizado'.`)
    }

    // --- VALIDACIÓN 7: Período Académico (Existe y está ACTIVO) ---
    let periodoValido: { id: string; info: string } | null = null
    const periodoNorm = normalizarTexto(periodoRaw)
    if (!periodoNorm) {
      errores.push("El campo 'Período Académico' es obligatorio.")
    } else {
      // Buscar período coincidente por string (ej. "2026-2", "2026 2", "2026-II", o solo 2026 / 2)
      const matchPeriodo = periodos.find(p => {
        const strP1 = `${p.anio}-${p.numero}`
        const strP2 = `${p.anio} ${p.numero}`
        const strP3 = `${p.anio}${p.numero}`
        return (
          periodoNorm === normalizarTexto(strP1) ||
          periodoNorm === normalizarTexto(strP2) ||
          periodoNorm === normalizarTexto(strP3) ||
          (periodoNorm.includes(String(p.anio)) && periodoNorm.includes(String(p.numero)))
        )
      })

      if (!matchPeriodo) {
        errores.push(`El período académico '${periodoRaw}' no existe en el sistema.`)
      } else if (matchPeriodo.estado !== 'ACTIVO') {
        errores.push(`El período '${matchPeriodo.anio}-${matchPeriodo.numero}' está CERRADO. Solo se permite inscribir en períodos ACTIVOS.`)
      } else {
        periodoValido = {
          id: matchPeriodo.id,
          info: `${matchPeriodo.anio}-${matchPeriodo.numero}`
        }
      }
    }

    // --- VALIDACIÓN 8: Estado (Región) ---
    let regionValida: { id: string; nombre: string; aulas: any[] } | null = null
    const estadoNorm = normalizarTexto(estadoRaw)
    if (!estadoNorm) {
      errores.push("El campo 'Estado' es obligatorio.")
    } else {
      let regMatch = regiones.find(r => normalizarTexto(r.nombre) === estadoNorm)
      
      // Alias común en UNERG: Distrito Capital -> Caracas
      if (!regMatch && estadoNorm === 'DISTRITO CAPITAL') {
        regMatch = regiones.find(r => normalizarTexto(r.nombre) === 'CARACAS')
      }

      if (!regMatch) {
        errores.push(`El Estado/Región '${estadoRaw}' no existe en el catálogo del sistema.`)
      } else {
        regionValida = regMatch
      }
    }

    // --- VALIDACIÓN 9: Aula Territorial (Pertenece a la Región) ---
    let aulaValida: { id: string; nombre: string } | null = null
    const aulaNorm = normalizarTexto(aulaRaw)
    if (!aulaNorm) {
      errores.push("El campo 'Aula Territorial' es obligatorio.")
    } else if (regionValida) {
      const matchAula = regionValida.aulas.find(a => {
        const cleanA = normalizarTexto(a.nombre)
        return cleanA === aulaNorm || cleanA.includes(aulaNorm) || aulaNorm.includes(cleanA)
      })

      if (!matchAula) {
        errores.push(`El Aula Territorial '${aulaRaw}' no existe o no pertenece al Estado '${regionValida.nombre}'.`)
      } else {
        aulaValida = matchAula
      }
    }

    // Evaluación final de la fila
    if (esConflictoUnicidad) {
      hayConflictoUnicidadGlobal = true
    }

    if (errores.length > 0) {
      filasConError.push({
        numeroFila,
        cedula: cedulaClean || cedulaRaw || 'Sin cédula',
        nombre: nombreRaw || 'Sin nombre',
        apellido: apellidoRaw || 'Sin apellido',
        errores,
        esConflictoUnicidad,
        datosOriginales: row
      })
    } else if (
      generoValido &&
      nivelValido &&
      periodoValido &&
      regionValida &&
      aulaValida
    ) {
      filasValidas.push({
        numeroFila,
        nombre: nombreRaw.trim(),
        apellido: apellidoRaw.trim(),
        cedula: cedulaClean,
        telefono: tlfClean || null,
        email: emailClean || null,
        genero: generoValido,
        trimestre: nivelValido,
        periodoId: periodoValido.id,
        periodoInfo: periodoValido.info,
        regionId: regionValida.id,
        regionNombre: regionValida.nombre,
        aulaTerritorialId: aulaValida.id,
        aulaNombre: aulaValida.nombre
      })
    }
  }

  const periodosActivos = periodos
    .filter(p => p.estado === 'ACTIVO')
    .map(p => `${p.anio}-${p.numero}`)

  const regionesNombres = regiones.map(r => r.nombre)

  return {
    totalFilas: filasRaw.length,
    totalValidas: filasValidas.length,
    totalErrores: filasConError.length,
    hayConflictoUnicidad: hayConflictoUnicidadGlobal,
    mensajeConflictoUnicidad: hayConflictoUnicidadGlobal
      ? 'Error: El correo, número de teléfono o cédula ya se encuentran registrados en el sistema.'
      : undefined,
    filasValidas,
    filasConError,
    catalogosCargados: {
      periodosActivos,
      regiones: regionesNombres
    }
  }
}

/**
 * Inserta masivamente las filas validadas dentro de una transacción ACID
 * creando el participante, su inscripción formal en el período y la auditoría.
 */
export async function ejecutarImportacionParticipantes(
  filas: FilaValidada[],
  usuarioResponsable: string = 'SISTEMA_IMPORTACION'
) {
  await asegurarTablaInscripcionesPeriodo()
  let insertados = 0
  const fallos: { fila: number; cedula: string; razon: string }[] = []

  // Procesamiento por lotes en transacciones atómicas para máxima integridad
  const BATCH_SIZE = 50

  for (let i = 0; i < filas.length; i += BATCH_SIZE) {
    const lote = filas.slice(i, i + BATCH_SIZE)

    try {
      await prisma.$transaction(async (tx) => {
        for (const p of lote) {
          // 1. Crear el participante
          const nuevoParticipante = await tx.participante.create({
            data: {
              nombre: p.nombre,
              apellido: p.apellido,
              cedula: p.cedula,
              telefono: p.telefono,
              email: p.email,
              genero: p.genero,
              trimestre: p.trimestre,
              periodoId: p.periodoId,
              regionId: p.regionId,
              aulaTerritorialId: p.aulaTerritorialId
            }
          })

          // 2. Crear la inscripción formal en el período
          await tx.inscripcionPeriodo.create({
            data: {
              participanteId: nuevoParticipante.id,
              periodoId: p.periodoId,
              trimestre: p.trimestre,
              condicion: CondicionAcademica.REGULAR,
              aulaTerritorialId: p.aulaTerritorialId
            }
          })

          // 3. Crear registro de bitácora histórica de trimestre
          await tx.historialTrimestre.create({
            data: {
              participanteId: nuevoParticipante.id,
              trimestreAnterior: null,
              trimestreNuevo: p.trimestre,
              periodoId: p.periodoId,
              regionId: p.regionId,
              aulaTerritorialId: p.aulaTerritorialId,
              cambiadoPor: usuarioResponsable
            }
          })

          insertados++
        }
      })
    } catch (batchError: any) {
      // Si el lote falla, registrar el error y continuar con los restantes
      console.error('Fallo en transacción de lote:', batchError)
      for (const p of lote) {
        fallos.push({
          fila: p.numeroFila,
          cedula: p.cedula,
          razon: batchError.message || 'Error en transacción de base de datos'
        })
      }
    }
  }

  return {
    totalSolicitados: filas.length,
    totalInsertados: insertados,
    totalFallos: fallos.length,
    fallos
  }
}

/**
 * Genera un libro de Excel oficial como plantilla de ejemplo
 */
export function generarPlantillaExcel(): Buffer {
  const wb = XLSX.utils.book_new()

  const datosEjemplo = [
    {
      'Nombre': 'Juan Carlos',
      'Apellido': 'Perez Rodriguez',
      'Cédula': '28123456',
      'Teléfono': '04141234567',
      'Correo Electrónico': 'juan.perez@ejemplo.com',
      'Género': 'Masculino',
      'Nivel / Trimestre': 'Introductorio',
      'Período Académico': '2026-2',
      'Estado': 'GUARICO',
      'Aula Territorial': 'SAN JUAN DE LOS MORROS'
    },
    {
      'Nombre': 'Maria Elena',
      'Apellido': 'Gomez Hernandez',
      'Cédula': '29987654',
      'Teléfono': '04249876543',
      'Correo Electrónico': 'maria.gomez@ejemplo.com',
      'Género': 'Femenino',
      'Nivel / Trimestre': 'I',
      'Período Académico': '2026-2',
      'Estado': 'GUARICO',
      'Aula Territorial': 'CALABOZO'
    }
  ]

  const ws = XLSX.utils.json_to_sheet(datosEjemplo)

  // Configurar anchos de columna
  ws['!cols'] = [
    { wch: 18 }, // Nombre
    { wch: 20 }, // Apellido
    { wch: 14 }, // Cédula
    { wch: 15 }, // Teléfono
    { wch: 26 }, // Correo
    { wch: 12 }, // Género
    { wch: 20 }, // Nivel / Trimestre
    { wch: 18 }, // Período Académico
    { wch: 16 }, // Estado
    { wch: 26 }, // Aula Territorial
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Participantes')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

