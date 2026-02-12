/**
 * Convierte una fecha a la zona horaria de Argentina (GMT-3)
 * @param date Fecha a convertir (string, Date o null)
 * @returns Date ajustada a GMT-3 o null si la entrada es null/undefined
 */
export function toArgentinaDateTime(
  date: string | Date | null | undefined,
): Date | null {
  if (!date) {
    return null;
  }

  const fecha = typeof date === 'string' ? new Date(date) : date;

  // Obtener el offset de la zona horaria local en minutos
  // getTimezoneOffset() devuelve la diferencia en minutos entre la hora local y UTC
  // Ejemplo: En Argentina (GMT-3), devuelve 180 (3 horas)
  const localOffsetMs = fecha.getTimezoneOffset() * 60 * 1000;

  // Convertir la fecha a UTC (sumando el offset local)
  const utcTime = fecha.getTime() + localOffsetMs;

  // Aplicar el offset de Argentina (GMT-3 = -3 horas)
  const argentinaOffsetMs = -3 * 60 * 60 * 1000;

  return new Date(utcTime + argentinaOffsetMs);
}

/**
 * Obtiene la fecha y hora actual en la zona horaria de Argentina (GMT-3)
 * @returns Date ajustada a GMT-3
 */
export function getNowArgentina(): Date {
  return toArgentinaDateTime(new Date())!;
}

/**
 * Obtiene la fecha actual (sin hora) en la zona horaria de Argentina (GMT-3)
 * @returns String con formato YYYY-MM-DD
 */
export function getTodayArgentina(): string {
  const ahora = getNowArgentina();
  const year = ahora.getFullYear();
  const month = String(ahora.getMonth() + 1).padStart(2, '0');
  const day = String(ahora.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
