import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD considerando la zona horaria local
 */
export function getLocalDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD usando el formato local del navegador
 * Más robusto para manejar diferentes zonas horarias
 */
export function getTodayDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Ajusta una fecha string (YYYY-MM-DD) para trabajar con zona horaria local
 */
export function toLocalDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return getLocalDateFromObj(date)
}

/**
 * Convierte un objeto Date a formato YYYY-MM-DD considerando zona horaria local
 */
export function getLocalDateFromObj(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Agrega o resta días a una fecha en formato YYYY-MM-DD
 */
export function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  return getLocalDateFromObj(date)
}

/**
 * Convierte una fecha string o Date a un objeto Date ajustado a la zona horaria de Argentina (GMT-3)
 * Úsalo antes de formatear fechas/horas para mostrarlas
 * 
 * NOTA: Esta función asume que el backend ya guarda las fechas en hora local de Argentina.
 * Si el backend guarda en UTC, hay que ajustar la lógica.
 */
export function toArgentinaDateTime(date: string | Date | null | undefined): Date | null {
  if (!date) return null

  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date.getTime())
  
  // Si la fecha del backend ya está en hora local de Argentina (GMT-3),
  // no necesitamos ajustarla, solo devolvemos el objeto Date
  // El backend ahora guarda la fecha correctamente en hora local
  return dateObj
}

/**
 * Formatea una fecha/hora al formato de Argentina
 * Uso: formatArgentinaDateTime(new Date(dateString), 'dd/MM/yyyy HH:mm')
 */
export function formatArgentinaDateTime(
  date: Date | string | null | undefined,
  format: string = 'dd/MM/yyyy HH:mm'
): string {
  const argentinaDate = toArgentinaDateTime(date)
  if (!argentinaDate) return ''

  const day = String(argentinaDate.getDate()).padStart(2, '0')
  const month = String(argentinaDate.getMonth() + 1).padStart(2, '0')
  const year = argentinaDate.getFullYear()
  const hours = String(argentinaDate.getHours()).padStart(2, '0')
  const minutes = String(argentinaDate.getMinutes()).padStart(2, '0')

  return format
    .replace('dd', day)
    .replace('MM', month)
    .replace('yyyy', String(year))
    .replace('HH', hours)
    .replace('mm', minutes)
}

/**
 * Formatea la hora de un movimiento de caja al formato de Argentina
 */
export function formatArgentinaTime(date: Date | string | null | undefined): string {
  const argentinaDate = toArgentinaDateTime(date)
  if (!argentinaDate) return ''

  return argentinaDate.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Formatea la fecha de un movimiento de caja al formato de Argentina
 */
export function formatArgentinaDate(date: Date | string | null | undefined): string {
  const argentinaDate = toArgentinaDateTime(date)
  if (!argentinaDate) return ''

  return argentinaDate.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
