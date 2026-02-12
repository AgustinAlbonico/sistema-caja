import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

type BackendMode = 'setup' | 'normal' | 'unavailable'

/**
 * Componente que verifica si existe configuración al cargar la app.
 * Si no existe, redirige automáticamente a /setup
 * Si existe, permite continuar con el flujo normal
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
              return data?.status === 'setup' ? 'setup' : 'normal'
            } catch {
              await new Promise((resolve) => setTimeout(resolve, 300))
            }
          }

          return 'unavailable'
        }

        const mode = await detectBackendMode()

        if (mode === 'setup') {
          if (location.pathname !== '/setup') {
            console.log('[ConfigCheck] Backend en setup, redirigiendo a /setup')
            navigate('/setup', { replace: true })
          }
          return
        }

        if (mode === 'normal') {
          if (location.pathname === '/setup') {
            console.log('[ConfigCheck] Backend en modo normal, redirigiendo a /login')
            navigate('/login', { replace: true })
          }
          return
        }

        if (location.pathname !== '/setup' && location.pathname !== '/login') {
          console.log('[ConfigCheck] Backend no responde, redirigiendo a /setup')
          navigate('/setup', { replace: true })
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
          <p className="text-ink-500 text-sm">Verificando configuración...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
