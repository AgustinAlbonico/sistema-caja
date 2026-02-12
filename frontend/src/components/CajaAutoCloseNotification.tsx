import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, Lock, CheckCircle } from 'lucide-react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { useAuth } from '../hooks/useAuth'
import { fetchWithAuth } from '../lib/api'

interface CajaCerradaInfo {
  idCajaDiaria: number
  fecha: string
  saldoFinal: string
}

interface CerrarAutomaticamenteResponse {
  cerradas: CajaCerradaInfo[]
  cantidad: number
  mensaje: string
}

const AUTO_CLOSE_TIMEOUT_MS = 15_000

export function CajaAutoCloseNotification() {
  const { isAuthenticated } = useAuth()
  const [showNotification, setShowNotification] = useState(false)
  const [data, setData] = useState<CerrarAutomaticamenteResponse | null>(null)
  const hasCheckedRef = useRef(false)

  useEffect(() => {
    if (!isAuthenticated || hasCheckedRef.current) return

    hasCheckedRef.current = true

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), AUTO_CLOSE_TIMEOUT_MS)

    const cerrarCajasPendientes = async () => {
      try {
        const response = await fetchWithAuth('/caja-diaria/cerrar-automaticamente', {
          method: 'POST',
          signal: controller.signal,
        })

        if (!response.ok) {
          return
        }

        const result: CerrarAutomaticamenteResponse = await response.json()

        if (result.cantidad > 0) {
          setData(result)
          setShowNotification(true)
        }
      } catch (err) {
        if (controller.signal.aborted) {
          return
        }

        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }
        console.error('[CajaAutoClose] Error al verificar cajas pendientes:', err)
      } finally {
        clearTimeout(timeoutId)
      }
    }

    void cerrarCajasPendientes()

    return () => {
      controller.abort()
      clearTimeout(timeoutId)
    }
  }, [isAuthenticated])

  const handleClose = () => {
    setShowNotification(false)
  }

  if (!showNotification || !data) return null

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  }

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? Number(amount) : amount
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(num)
  }

  return (
    <Modal
      isOpen={showNotification}
      onClose={handleClose}
      title="Cierre Automático de Caja"
      size="md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg bg-yellow-50 p-4 border border-yellow-200">
          <AlertTriangle className="h-6 w-6 text-yellow-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-900 mb-1">
              Cierre automático realizado
            </h3>
            <p className="text-sm text-yellow-800">
              Se detectaron {data.cantidad} caja{data.cantidad > 1 ? 's' : ''} de días anteriores
              que no {data.cantidad > 1 ? 'fueron cerradas' : 'fue cerrada'}.{' '}
              {data.cantidad > 1 ? 'Han sido cerradas' : 'Ha sido cerrada'} automáticamente.
            </p>
          </div>
        </div>

        {data.cantidad > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-ink flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Cajas cerradas ({data.cantidad})
            </h4>
            <div className="rounded-lg border border-ink/10 bg-paper/50 p-3">
              <ul className="space-y-2">
                {data.cerradas.map((caja) => (
                  <li key={caja.idCajaDiaria} className="flex items-center justify-between text-sm">
                    <span className="text-ink capitalize">
                      {formatDate(caja.fecha)}
                    </span>
                    <span className="font-medium text-ink">
                      Saldo: {formatCurrency(caja.saldoFinal)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-4 border border-blue-200">
          <CheckCircle className="h-6 w-6 text-blue-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-1">Recordatorio</h3>
            <p className="text-sm text-blue-800">
              Recuerde cerrar la caja al finalizar cada día laboral para evitar cierres automáticos.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={handleClose}>
            Entendido
          </Button>
        </div>
      </div>
    </Modal>
  )
}
