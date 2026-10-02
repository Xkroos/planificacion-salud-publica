import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFechaEncuentro(fecha: Date | string | null | undefined): string {
  if (!fecha) return ''
  if (typeof fecha === 'string') {
    const match = fecha.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const [, y, m, d] = match
      return `${d}/${m}/${y}`
    }
  }
  const d = new Date(fecha)
  if (isNaN(d.getTime())) return ''
  const day = String(d.getUTCDate()).padStart(2, '0')
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const year = d.getUTCFullYear()
  return `${day}/${month}/${year}`
}

export function formatFechaEncuentroLarga(fecha: Date | string | null | undefined): string {
  if (!fecha) return ''
  let y: number | undefined
  let m: number | undefined
  let day: number | undefined
  if (typeof fecha === 'string') {
    const match = fecha.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      y = parseInt(match[1], 10)
      m = parseInt(match[2], 10)
      day = parseInt(match[3], 10)
    }
  }
  if (!y || !m || !day) {
    const dObj = new Date(fecha)
    if (isNaN(dObj.getTime())) return ''
    y = dObj.getUTCFullYear()
    m = dObj.getUTCMonth() + 1
    day = dObj.getUTCDate()
  }
  const d = new Date(Date.UTC(y, m - 1, day, 12, 0, 0))
  return d.toLocaleDateString('es-VE', {
    timeZone: 'UTC',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function formatHoraAmPm(hora: string | null | undefined): string {
  if (!hora) return ''
  const trimmed = hora.trim()
  if (/am|pm/i.test(trimmed)) return trimmed
  const parts = trimmed.split(':')
  if (parts.length < 2) return hora
  let h = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  if (isNaN(h) || isNaN(m)) return hora

  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12

  const hStr = h < 10 ? `0${h}` : `${h}`
  const mStr = m < 10 ? `0${m}` : `${m}`
  return `${hStr}:${mStr} ${ampm}`
}

export function parseHoraTo24(hora: string | null | undefined): string {
  if (!hora) return ''
  const trimmed = hora.trim()
  const isPm = /pm/i.test(trimmed)
  const isAm = /am/i.test(trimmed)
  const clean = trimmed.replace(/[^\d:]/g, '')
  const parts = clean.split(':')
  if (parts.length < 2) return trimmed
  let h = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  if (isNaN(h) || isNaN(m)) return trimmed

  if (isPm && h < 12) h += 12
  if (isAm && h === 12) h = 0

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

export function formatDate(date: Date | string | null | undefined): string {
  return formatFechaEncuentro(date)
}

export function formatDateShort(date: Date | string | null | undefined): string {
  return formatFechaEncuentro(date)
}

export function getDedicacionLabel(dedicacion: string): string {
  const labels: Record<string, string> = {
    HP: 'Hora Cátedra',
    MT: 'Medio Tiempo',
    TC: 'Tiempo Completo',
    DE: 'Dedicación Exclusiva',
  }
  return labels[dedicacion] || dedicacion
}

export function getCategoriaLabel(categoria: string): string {
  const labels: Record<string, string> = {
    CONTRATADO: 'Contratado',
    ORDINARIO: 'Ordinario',
  }
  return labels[categoria] || categoria
}

export function getModalidadLabel(modalidad: string): string {
  const labels: Record<string, string> = {
    PRESENCIAL: 'Presencial',
    VIRTUAL: 'Virtual',
    MULTIMODAL: 'Multimodal',
  }
  return labels[modalidad] || modalidad
}

export function getRolLabel(rol: string): string {
  const labels: Record<string, string> = {
    ADMIN: 'Administrador',
    OPERADOR: 'Operador',
  }
  return labels[rol] || rol
}
