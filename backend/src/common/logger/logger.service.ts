import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { getLogsDirectoryPath } from '../config/runtime-paths';

const logsDir = getLogsDirectoryPath();

// Formato de logs
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.splat(),
  format.printf(({ level, message, timestamp, stack }) => {
    if (stack) {
      return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`;
    }
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
  }),
);

// Configurar rotación de archivos de logs
const dailyRotateFileTransport = new DailyRotateFile({
  dirname: logsDir,
  filename: 'application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d', // Mantener logs por 30 días
  eol: '\n',
});

// Transporte de errores (rotación separada para errores)
const errorRotateFileTransport = new DailyRotateFile({
  level: 'error',
  dirname: logsDir,
  filename: 'error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '60d', // Mantener logs de errores por 60 días
  eol: '\n',
});

// Configuración de niveles de log
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Crear logger
const allTransports: any[] = [
  dailyRotateFileTransport,
  errorRotateFileTransport,
];

// Console output en desarrollo
if (process.env.NODE_ENV !== 'production') {
  allTransports.push(
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple(),
        format.printf(({ level, message, timestamp }) => {
          return `${timestamp} ${level}: ${message}`;
        }),
      ),
    }),
  );
}

export const logger = createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: allTransports,
  exceptionHandlers: [
    new DailyRotateFile({
      dirname: logsDir,
      filename: 'exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      dirname: logsDir,
      filename: 'rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
    }),
  ],
  exitOnError: false, // No salir inmediatamente, dejar que Winston termine de escribir
});

/**
 * Logger para HTTP requests (usado en NestJS)
 */
export class LoggerService {
  log(message: string, context?: string) {
    logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    logger.debug(message, { context });
  }

  setLogLevels(levels: any) {
    logger.level = Array.isArray(levels) ? levels[0] : levels;
  }
}

// Exportar instancia única
export const loggerService = new LoggerService();
