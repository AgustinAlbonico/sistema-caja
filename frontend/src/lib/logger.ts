export const logLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
} as const

export type LogLevel = (typeof logLevel)[keyof typeof logLevel]

/**
 * Escribe un mensaje en el log del frontend
 */
async function writeLog(level: LogLevel, message: string): Promise<void> {
  const formattedMessage = `[${level}] ${message}`
  if (level === logLevel.ERROR) {
    console.error(formattedMessage)
    return
  }

  if (level === logLevel.WARN) {
    console.warn(formattedMessage)
    return
  }

  console.log(formattedMessage)
}

/**
 * Logger para el frontend en modo web
 */
export const logger = {
  debug: (message: string) => writeLog(logLevel.DEBUG, message),
  info: (message: string) => writeLog(logLevel.INFO, message),
  warn: (message: string) => writeLog(logLevel.WARN, message),
  error: (message: string, error?: Error) => {
    const fullMessage = error ? `${message}: ${error.message}` : message
    writeLog(logLevel.ERROR, fullMessage)
  },
}

/**
 * Hook para usar logger en componentes React
 */
export function useLogger(context: string) {
  return {
    debug: (message: string) => logger.debug(`[${context}] ${message}`),
    info: (message: string) => logger.info(`[${context}] ${message}`),
    warn: (message: string) => logger.warn(`[${context}] ${message}`),
    error: (message: string, error?: Error) =>
      logger.error(`[${context}] ${message}`, error),
  }
}
