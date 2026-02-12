import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

type BackendMode = 'normal' | 'unavailable'

/**
 * Componente que verifica el estado del backend al cargar la app.
 * Si el backend no esta operativo, redirige a /database-error.
 */
export function ConfigCheck({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
        const checkConfig = async () => {
          try {
            const detectBackendMode = async (): Promise<BackendMode> => {
              for (let attempt = 0; attempt < 8; attempt++) {
                try {
              const response = await fetch('http://127.0.0.1:47832/api/health', {
                method: 'GET',
                signal: AbortSignal.timeout(1500),
              })

              if (!response.ok) {
                await new Promise((resolve) => setTimeout(resolve, 300))
                continue
              }

                  const data = await response.json()
                  return data?.status === 'error' ? 'unavailable' : 'normal'
                } catch {
                  await new Promise((resolve) => setTimeout(resolve, 300))
                }
              }

          return 'unavailable'
        }

        const mode = await detectBackendMode()

        if (mode === 'normal') {
          if (location.pathname === '/database-error') {
            console.log('[ConfigCheck] Backend operativo, redirigiendo a /login')
            navigate('/login', { replace: true })
          }
          return
        }

        if (location.pathname !== '/database-error') {
          console.log('[ConfigCheck] Backend no disponible, redirigiendo a /database-error')
          navigate('/database-error', { replace: true })
        }
      } catch (error) {
        console.error('[ConfigCheck] Error verificando configuración:', error)
      } finally {
        setChecking(false)
      }
    }

    checkConfig()
  }, [navigate, location.pathname])

  // Mientras verifica, mostrar nada o un spinner
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent"></div>
            <p className="text-ink-500 text-sm">Verificando backend...</p>
          </div>
        </div>
      )
  }

  return <>{children}</>
}
