import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { useCaja } from '../hooks/useCaja'
import { getTodayDate } from '../lib/utils'

interface RecibosAccessGuardProps {
  children: React.ReactNode
}

export function RecibosAccessGuard({ children }: RecibosAccessGuardProps) {
  const navigate = useNavigate()
  const { fetchResumen } = useCaja()
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [canAccess, setCanAccess] = useState(false)
  const hasNotified = useRef(false)

  useEffect(() => {
    let isMounted = true

    const validateAccess = async () => {
      try {
        const today = getTodayDate()
        const resumen = await fetchResumen(today)
        const cajaCerrada = resumen?.caja?.cerrada ?? true

        if (cajaCerrada) {
          if (!hasNotified.current) {
            toast.error('La caja está cerrada. Debe abrirla para acceder a recibos.')
            hasNotified.current = true
          }
          navigate('/caja', { replace: true })
          return
        }

        if (isMounted) {
          setCanAccess(true)
        }
      } catch {
        if (!hasNotified.current) {
          toast.error('No hay una caja abierta para hoy. Debe abrirla para acceder a recibos.')
          hasNotified.current = true
        }
        navigate('/caja', { replace: true })
      } finally {
        if (isMounted) {
          setCheckingAccess(false)
        }
      }
    }

    validateAccess()

    return () => {
      isMounted = false
    }
  }, [fetchResumen, navigate])

  if (checkingAccess) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!canAccess) {
    return null
  }

  return <>{children}</>
}
