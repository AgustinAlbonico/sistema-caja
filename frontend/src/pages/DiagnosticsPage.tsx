import { useEffect, useState } from 'react'
import { useBackendHealth } from '../hooks/useBackendHealth'

interface SystemInfo {
  appRuntime?: string
  os?: string
  arch?: string
}

/**
 * Página de diagnóstico para verificar el estado del sistema
 */
export function DiagnosticsPage() {
  const { health, loading, checkHealth } = useBackendHealth(10000)
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({})
  const [logs, setLogs] = useState<string[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  useEffect(() => {
    const userAgent = navigator.userAgent
    const navigatorWithUserAgentData = navigator as Navigator & {
      userAgentData?: { platform?: string }
    }
    const platform =
      (typeof navigatorWithUserAgentData.userAgentData?.platform === 'string'
        ? navigatorWithUserAgentData.userAgentData.platform
        : navigator.platform) || 'Desconocido'

    let architecture = 'Desconocida'
    if (userAgent.includes('x86_64') || userAgent.includes('Win64') || userAgent.includes('x64')) {
      architecture = 'x64'
    }
    if (userAgent.includes('arm64') || userAgent.includes('aarch64')) {
      architecture = 'arm64'
    }

    setSystemInfo({
      appRuntime: 'Web (Vite + React)',
      os: platform,
      arch: architecture,
    })
  }, [])

  const loadLogs = async () => {
    setLogsLoading(true)
    try {
      // Nota: En una implementación real, necesitaríamos un endpoint en el backend
      // para leer los archivos de log. Por ahora, mostramos un mensaje.
      setLogs([
        '[INFO] Iniciando sistema de diagnóstico...',
        '[INFO] Verificando conexión al backend...',
        '[INFO] Verificando conexión a la base de datos...',
      ])
    } catch (error) {
      console.error('Error al cargar logs:', error)
    } finally {
      setLogsLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const statusColor = (status: string) => {
    switch (status) {
      case 'ok':
      case 'connected':
        return 'text-green-600 bg-green-100'
      case 'degraded':
      case 'error':
      case 'disconnected':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="space-y-5">
      <div className="max-w-6xl mx-auto">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-900 mb-1 md:text-2xl md:mb-2">
            Diagnóstico del Sistema
          </h1>
          <p className="text-gray-600">
            Información sobre el estado del backend, base de datos y configuración
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          {/* Estado del Backend */}
          <div className="bg-white rounded-lg shadow p-4 md:p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 md:text-xl md:mb-4">
              Estado del Backend
            </h2>

            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : health ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Estado General:</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor(
                      health.status,
                    )}`}
                  >
                    {health.status}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Base de Datos:</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor(
                      health.database.status,
                    )}`}
                  >
                    {health.database.status}
                  </span>
                </div>

                {health.database.error && (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-sm text-red-800">
                      {health.database.error}
                    </p>
                  </div>
                )}

                <div className="text-sm text-gray-500 space-y-1">
                  <p>Última verificación: {new Date().toLocaleString()}</p>
                  {health.uptime && (
                    <p>
                      Tiempo activo: {Math.floor(health.uptime / 60)} minutos
                    </p>
                  )}
                </div>

                <button
                  onClick={checkHealth}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Verificar Estado
                </button>
              </div>
            ) : (
                <div className="text-center text-gray-500 py-6">
                  <p>No se pudo obtener el estado del backend</p>
                </div>
              )}
          </div>

          {/* Configuración */}
          <div className="bg-white rounded-lg shadow p-4 md:p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 md:text-xl md:mb-4">
              Configuración
            </h2>

            <div className="space-y-3 text-sm text-gray-700">
              <p>
                La configuración del sistema se administra fuera de la app desde
                el archivo:
              </p>
              <p className="font-mono rounded bg-gray-100 px-3 py-2 text-xs md:text-sm">
                C:\SistemaCajaEstudio\config\.env
              </p>
              <p>
                Después de cambiar valores de base de datos o JWT, reinicie el
                sistema para aplicar cambios.
              </p>
            </div>
          </div>
        </div>

        {/* Información del Sistema */}
        <div className="bg-white rounded-lg shadow p-4 mb-5 md:p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 md:text-xl md:mb-4">
            Información del Sistema
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">Runtime</p>
              <p className="text-base font-semibold text-gray-900 md:text-lg">
                {systemInfo.appRuntime || 'N/A'}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">Sistema Operativo</p>
              <p className="text-base font-semibold text-gray-900 md:text-lg">
                {systemInfo.os || 'N/A'}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">Arquitectura</p>
              <p className="text-base font-semibold text-gray-900 md:text-lg">
                {systemInfo.arch || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Logs Recientes */}
        <div className="bg-white rounded-lg shadow p-4 md:p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 md:text-xl md:mb-4">
            Logs Recientes
          </h2>

          {logsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="bg-gray-900 rounded-lg p-3 h-52 overflow-auto md:h-56 md:p-4">
              <pre className="text-xs text-gray-300 font-mono">
                {logs.length > 0
                  ? logs.join('\n')
                  : 'No hay logs disponibles'}
              </pre>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="mt-5 flex gap-3">
          <button
            onClick={() => (window.location.href = '/')}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg transition-colors"
          >
            Volver al Dashboard
          </button>

          <button
            onClick={() => window.location.reload()}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-6 rounded-lg transition-colors"
          >
            Recargar Aplicación
          </button>
        </div>
      </div>
    </div>
  )
}
