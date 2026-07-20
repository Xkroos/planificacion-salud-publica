import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateShort(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
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
