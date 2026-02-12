import { useBackendHealth } from '../hooks/useBackendHealth'

/**
 * Página de error cuando la base de datos no está disponible
 */
export function DatabaseErrorPage() {
  const { health, loading, checkHealth, isDatabaseConnected } = useBackendHealth(5000)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600">Verificando conexión a la base de datos...</p>
        </div>
      </div>
    )
  }

  // Si la base de datos está conectada, redirigir al dashboard
  if (isDatabaseConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-3"></div>
          <p className="text-gray-600">Base de datos conectada. Redirigiendo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 md:p-8">
        <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-3 md:w-16 md:h-16 md:mb-4">
          <svg
            className="w-6 h-6 text-red-600 md:w-8 md:h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-gray-900 text-center mb-2 md:text-2xl">
          Error de Base de Datos
        </h2>

        <p className="text-sm text-gray-600 text-center mb-5 md:text-base md:mb-6">
          No se pudo conectar a la base de datos. Verifique que el servidor de base
          de datos esté disponible y que la configuración sea correcta.
        </p>

        {health?.database.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800 font-medium mb-1">
              Detalles del error:
            </p>
            <p className="text-sm text-red-700">{health.database.error}</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={checkHealth}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Reintentar Conexión
          </button>

          <button
            onClick={() => (window.location.href = '/setup')}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Configurar Conexión
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Soluciones sugeridas:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Verifique que el servidor PostgreSQL esté en ejecución</li>
            <li>• Revise la dirección IP y puerto del servidor</li>
            <li>• Confirme que las credenciales son correctas</li>
            <li>• Asegúrese de tener conexión a la red</li>
          </ul>
        </div>

        {health && (
          <div className="mt-6 pt-6 border-t border-gray-200 text-xs text-gray-500">
            <p>Última verificación: {new Date().toLocaleString()}</p>
          </div>
        )}
      </div>
    </div>
  )
}
