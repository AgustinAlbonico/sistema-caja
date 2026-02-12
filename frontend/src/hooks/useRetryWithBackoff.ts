import { useState, useEffect, useCallback } from 'react'
import { fetchWithAuth } from '../lib/api'

interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  onRetry?: (attempt: number, error: Error) => void
  onSuccess?: () => void
  onFailure?: (error: Error) => void
}

interface RetryState {
  isRetrying: boolean
  attempt: number
  lastError: Error | null
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry' | 'onSuccess' | 'onFailure'>> = {
  maxRetries: 5,
  initialDelay: 1000, // 1 segundo
  maxDelay: 30000, // 30 segundos
  backoffMultiplier: 2,
}

/**
 * Hook para ejecutar una función con reintentos automáticos y backoff exponencial
 */
export function useRetryWithBackoff<T = any>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
) {
  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    attempt: 0,
    lastError: null,
  })

  const mergedOptions = { ...DEFAULT_OPTIONS, ...options }
  const [shouldRun, setShouldRun] = useState(false)

  const execute = useCallback(async () => {
    setShouldRun(false)
    setState({ isRetrying: true, attempt: 0, lastError: null })

    let lastError: Error | null = null

    for (let attempt = 0; attempt < mergedOptions.maxRetries; attempt++) {
      setState({ isRetrying: true, attempt: attempt + 1, lastError })

      try {
        const result = await fn()
        setState({ isRetrying: false, attempt: attempt + 1, lastError: null })
        mergedOptions.onSuccess?.()
        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        setState({ isRetrying: true, attempt: attempt + 1, lastError })

        mergedOptions.onRetry?.(attempt + 1, lastError)

        // Si no es el último intento, esperar antes de reintentar
        if (attempt < mergedOptions.maxRetries - 1) {
          const delay = Math.min(
            mergedOptions.initialDelay *
              Math.pow(mergedOptions.backoffMultiplier, attempt),
            mergedOptions.maxDelay,
          )

          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    setState({ isRetrying: false, attempt: mergedOptions.maxRetries, lastError })
    mergedOptions.onFailure?.(lastError!)
    throw lastError
  }, [fn, mergedOptions])

  useEffect(() => {
    if (shouldRun) {
      execute()
    }
  }, [shouldRun, execute, mergedOptions])

  return {
    ...state,
    execute: () => setShouldRun(true),
  }
}

/**
 * Hook específico para verificar la conexión al backend con reintentos
 */
export function useBackendConnection() {
  const connectionCheck = useCallback(async () => {
    const response = await fetchWithAuth('/health')
    return await response.json()
  }, [])

  return useRetryWithBackoff(connectionCheck, {
    maxRetries: 10,
    initialDelay: 2000, // 2 segundos iniciales
    maxDelay: 60000, // Máximo 1 minuto entre intentos
    backoffMultiplier: 1.5,
    onRetry: (attempt, error) => {
      console.log(`Intento de conexión ${attempt}/10: ${error.message}`)
    },
    onFailure: (error) => {
      console.error('No se pudo conectar al backend después de 10 intentos:', error)
    },
  })
}
