import { useEffect, useState } from 'react'
import { fetchWithAuth } from '../lib/api'

interface HealthResponse {
  status: 'ok' | 'degraded' | 'error'
  timestamp: string
  database: {
    status: 'connected' | 'disconnected' | 'error'
    error: string | null
  }
  uptime?: number
  memory?: any
}

/**
 * Hook para monitorear la salud del backend y la base de datos
 */
export function useBackendHealth(interval: number = 30000) {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const checkHealth = async () => {
    try {
      setError(null)
      const response = await fetchWithAuth('/health')
      const data = await response.json()
      setHealth(data)
      setLastChecked(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setHealth(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Chequeo inicial
    checkHealth()

    // Chequeo periódico
    const intervalId = setInterval(checkHealth, interval)

    return () => clearInterval(intervalId)
  }, [interval])

  return {
    health,
    loading,
    error,
    isHealthy: health?.status === 'ok',
    isDatabaseConnected: health?.database.status === 'connected',
    lastChecked,
    checkHealth,
  }
}
