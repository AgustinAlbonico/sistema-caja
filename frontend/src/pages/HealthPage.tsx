import { useMemo } from 'react'

import { useBackendHealth } from '../hooks/useBackendHealth'

interface HealthStatusCardProps {
  title: string
  status: 'ok' | 'error' | 'loading'
  detail: string
}

function HealthStatusCard({ title, status, detail }: HealthStatusCardProps) {
  const statusConfig = useMemo(() => {
    if (status === 'ok') {
      return {
        badgeClass: 'bg-green-100 text-green-700',
        badgeText: 'OK',
      }
    }

    if (status === 'loading') {
      return {
        badgeClass: 'bg-amber-100 text-amber-700',
        badgeText: 'Verificando',
      }
    }

    return {
      badgeClass: 'bg-red-100 text-red-700',
      badgeText: 'Error',
    }
  }, [status])

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusConfig.badgeClass}`}>
          {statusConfig.badgeText}
        </span>
      </div>
      <p className="text-sm text-gray-600">{detail}</p>
    </div>
  )
}

export function HealthPage() {
  const { health, loading, error } = useBackendHealth(15000)

  const backendStatus: 'ok' | 'error' | 'loading' = loading
    ? 'loading'
    : health?.status === 'ok' || health?.status === 'degraded'
      ? 'ok'
      : 'error'

  const backendDetail = loading
    ? 'Consultando estado del backend...'
    : error
      ? `No se pudo consultar el backend: ${error}`
      : `Backend responde en /api/health (estado: ${health?.status ?? 'desconocido'})`

  const databaseStatus: 'ok' | 'error' | 'loading' = loading
    ? 'loading'
    : health?.database?.status === 'connected'
      ? 'ok'
      : 'error'

  const databaseDetail = loading
    ? 'Consultando conexión a base de datos...'
    : health?.database?.status === 'connected'
      ? 'Conexión a base de datos operativa.'
      : health?.database?.error
        ? `Sin conexión a base de datos: ${health.database.error}`
        : 'Sin conexión a base de datos o backend no disponible.'

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-gray-900">Health Check del Sistema</h1>
          <p className="mt-2 text-sm text-gray-600">
            Esta ruta es pública y permite validar frontend, backend y base de datos.
          </p>
        </header>

        <HealthStatusCard
          title="Frontend"
          status="ok"
          detail="La aplicación frontend cargó correctamente en esta PC."
        />

        <HealthStatusCard title="Backend" status={backendStatus} detail={backendDetail} />

        <HealthStatusCard title="Base de datos" status={databaseStatus} detail={databaseDetail} />

        <div className="rounded-xl border border-gray-200 bg-white p-4 text-xs text-gray-500">
          Última actualización: {new Date().toLocaleString()}
        </div>
      </div>
    </main>
  )
}
