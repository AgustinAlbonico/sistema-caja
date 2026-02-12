import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, DollarSign, Lock, Unlock, User, Printer, Pencil, Trash2 } from 'lucide-react'
import { useCaja } from '../hooks/useCaja'
import { useGastos, type Gasto } from '../hooks/useGastos'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { GastoForm } from '../components/GastoForm'
import { getTodayDate, addDays, formatArgentinaTime } from '../lib/utils'
import { toast } from 'sonner'

// Tipo parcial para el gasto disponible en MovimientoCaja
type GastoMinimo = { idGasto: number; descripcion: string }

export function CajaPage() {
  const { resumen, loading, fetchResumen, cerrarCaja, abrirCaja, reabrirCaja } = useCaja()
  const { createGasto, updateGasto, deleteGasto, fetchGasto } = useGastos()
  const { user } = useAuth()

  const [currentDate, setCurrentDate] = useState(() => getTodayDate())
  const itemsPerPage = 10

  const [showGastoModal, setShowGastoModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmCerrar, setShowConfirmCerrar] = useState(false)
  const [showConfirmReabrir, setShowConfirmReabrir] = useState(false)

  // Estados para editar egreso
  const [showEditarGastoModal, setShowEditarGastoModal] = useState(false)
  const [gastoAEditar, setGastoAEditar] = useState<Gasto | null>(null)
  const [cargandoGasto, setCargandoGasto] = useState(false)

  // Estados para eliminar egreso  
  const [showConfirmEliminarGasto, setShowConfirmEliminarGasto] = useState(false)
  const [gastoAEliminar, setGastoAEliminar] = useState<{ idGasto: number; descripcion: string } | null>(null)
  const [eliminandoGasto, setEliminandoGasto] = useState(false)

  useEffect(() => {
    fetchResumen(currentDate, 1, itemsPerPage)
  }, [currentDate, fetchResumen])

  const handlePrevDay = () => {
    setCurrentDate(addDays(currentDate, -1))
  }

  const handleNextDay = () => {
    setCurrentDate(addDays(currentDate, 1))
  }

  const handleToday = () => {
    setCurrentDate(getTodayDate())
  }

  const handleImprimirPdf = async () => {
    // Validar que haya movimientos antes de imprimir
    if (!resumen || !resumen.movimientos || resumen.movimientos.length === 0) {
      toast.error('No se puede imprimir la caja: no hay movimientos registrados')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://${window.location.hostname}:3000/api/caja-diaria/${currentDate}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al generar el PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (err) {
      console.error('Error al generar PDF:', err)
      toast.error('Error al generar el PDF de la caja')
    }
  }

  const handlePageChange = (newPage: number) => {
    fetchResumen(currentDate, newPage, itemsPerPage)
  }

  const handleCerrarCaja = async () => {
    if (!user) {
      alert('Debe iniciar sesión para cerrar la caja')
      return
    }
    setShowConfirmCerrar(true)
  }

  const confirmCerrarCaja = async () => {
    if (!user) {
      return
    }

    try {
      await cerrarCaja({ fecha: currentDate, idUsuarioCierre: user.idUsuario })
      fetchResumen(currentDate)
      setShowConfirmCerrar(false)
    } catch (err) {
      console.error('Error cerrando caja:', err)
      alert('Error al cerrar la caja')
    }
  }

  const handleReabrirCaja = async () => {
    if (!user) {
      alert('Debe iniciar sesión para reabrir la caja')
      return
    }
    setShowConfirmReabrir(true)
  }

  const confirmReabrirCaja = async () => {
    try {
      await reabrirCaja({ fecha: currentDate })
      fetchResumen(currentDate)
      setShowConfirmReabrir(false)
    } catch (err) {
      console.error('Error reabriendo caja:', err)
      alert('Error al reabrir la caja')
    }
  }

  const handleAbrirCaja = async () => {
    if (!user) {
      alert('Debe iniciar sesión para abrir la caja')
      return
    }
    try {
      await abrirCaja({ fecha: currentDate, saldoInicial: '0.00', idUsuarioApertura: user.idUsuario })
      fetchResumen(currentDate)
    } catch (err) {
      console.error('Error abriendo caja:', err)
      alert('Error al abrir la caja')
    }
  }

  const handleSubmitGasto = async (gastoData: {
    descripcion: string
    importe: string
    fecha: string
    pagos: { idMetodoPago: number; importe: string; numerosCheque?: string }[]
  }) => {
    setIsSubmitting(true)
    try {
      await createGasto(gastoData)
      setShowGastoModal(false)
      fetchResumen(currentDate)
    } catch (err) {
      console.error('Error creating gasto:', err)
      alert('Error al registrar el gasto')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handler para editar egreso
  const handleEditarGasto = async (gastoData: {
    descripcion: string
    importe: string
    fecha: string
    pagos: { idMetodoPago: number; importe: string; numerosCheque?: string }[]
  }) => {
    if (!gastoAEditar) return
    setIsSubmitting(true)
    try {
      await updateGasto(gastoAEditar.idGasto, gastoData)
      setShowEditarGastoModal(false)
      setGastoAEditar(null)
      fetchResumen(currentDate)
      toast.success('Egreso actualizado correctamente')
    } catch (err) {
      console.error('Error updating gasto:', err)
      toast.error('Error al actualizar el egreso')
    } finally {
      setIsSubmitting(false)
    }
  }

  const abrirModalEditarGasto = async (gastoMinimo: GastoMinimo) => {
    setCargandoGasto(true)
    try {
      // Cargar el gasto completo desde el backend
      const gastoCompleto = await fetchGasto(gastoMinimo.idGasto)
      setGastoAEditar(gastoCompleto)
      setShowEditarGastoModal(true)
    } catch (err) {
      console.error('Error cargando gasto:', err)
      toast.error('Error al cargar los datos del egreso')
    } finally {
      setCargandoGasto(false)
    }
  }

  // Handler para eliminar egreso
  const handleEliminarGasto = async () => {
    if (!gastoAEliminar) return
    setEliminandoGasto(true)
    try {
      await deleteGasto(gastoAEliminar.idGasto)
      setShowConfirmEliminarGasto(false)
      setGastoAEliminar(null)
      fetchResumen(currentDate)
      toast.success('Egreso eliminado correctamente')
    } catch (err) {
      console.error('Error deleting gasto:', err)
      toast.error('Error al eliminar el egreso')
    } finally {
      setEliminandoGasto(false)
    }
  }

  const abrirModalEliminarGasto = (gastoMinimo: GastoMinimo) => {
    setGastoAEliminar({ idGasto: gastoMinimo.idGasto, descripcion: gastoMinimo.descripcion })
    setShowConfirmEliminarGasto(true)
  }

  const formatDate = (dateStr: string) => {
    // Parsear manualmente para evitar problemas de zona horaria
    // El formato de entrada es YYYY-MM-DD
    const [year, month, day] = dateStr.split('-').map(Number)
    // Crear fecha con componentes individuales (usa zona horaria local)
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

  const isToday = currentDate === getTodayDate()
  const cajaExists = resumen?.caja != null
  const cajaCerrada = resumen?.caja?.cerrada ?? false

  return (
    <div className="space-y-5">
      {/* Header with date navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-ink md:text-2xl">Caja Diaria</h1>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <input
            type="date"
            value={currentDate}
            onChange={(e) => setCurrentDate(e.target.value)}
            className="rounded-lg border border-ink/20 bg-white px-3 py-2 text-sm text-ink focus:border-teal focus:outline-none"
          />
          <Button variant="outline" size="sm" onClick={handleNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isToday && (
            <Button variant="secondary" size="sm" onClick={handleToday}>
              Hoy
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={handleImprimirPdf}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Date display */}
        <div className="text-center text-base font-medium text-ink/80 md:text-lg">
        {formatDate(currentDate)}
        {cajaCerrada && (
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-600">
            <Lock className="h-3 w-3" />
            Cerrada
          </span>
        )}
        {cajaExists && !cajaCerrada && (
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-teal/10 px-2 py-1 text-xs font-medium text-teal">
            <Unlock className="h-3 w-3" />
            Abierta
          </span>
        )}
      </div>

      {/* Summary cards */}
      {resumen && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-green-50 border-green-200">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-ink/60">Ingresos</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(resumen.ingresos)}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-ink/60">Egresos</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(resumen.egresos)}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-ink/60">Saldo Final</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(resumen.saldoFinal)}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Operadores information */}
      {resumen && (resumen.caja.usuarioApertura || resumen.caja.usuarioCierre) && (
        <Card className="bg-purple-50 border-purple-200">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-purple-900">Información de Operadores</h3>
            {resumen.caja.usuarioApertura && (
              <div className="flex items-center gap-2 text-sm text-purple-700">
                <User className="h-4 w-4" />
                <span>
                  Abrió: <strong>{resumen.caja.usuarioApertura.nombreCompleto}</strong>
                </span>
              </div>
            )}
            {resumen.caja.usuarioCierre && (
              <div className="flex items-center gap-2 text-sm text-purple-700">
                <Lock className="h-4 w-4" />
                <span>
                  Cerró: <strong>{resumen.caja.usuarioCierre.nombreCompleto}</strong>
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {cajaExists && !cajaCerrada && isToday && (
          <>
            <Button onClick={() => setShowGastoModal(true)}>
              <TrendingDown className="mr-2 h-4 w-4" />
              Registrar Egreso
            </Button>
            <Button variant="secondary" onClick={handleCerrarCaja}>
              <Lock className="mr-2 h-4 w-4" />
              Cerrar Caja
            </Button>
          </>
        )}
        {cajaExists && cajaCerrada && isToday && (
          <Button onClick={handleReabrirCaja}>
            <Unlock className="mr-2 h-4 w-4" />
            Reabrir Caja
          </Button>
        )}
        {!cajaExists && isToday && (
          <Button onClick={handleAbrirCaja}>
            <Unlock className="mr-2 h-4 w-4" />
            Abrir Caja
          </Button>
        )}
      </div>

      {/* Movements table */}
      <Card>
          <div className="p-3 border-b border-ink/10 md:p-4">
            <h2 className="text-lg font-semibold text-ink">Movimientos del Día</h2>
          </div>

        {loading ? (
          <div className="p-6 text-center text-ink/60">Cargando...</div>
        ) : !resumen || resumen.movimientos.length === 0 ? (
          <div className="p-6 text-center text-ink/60">
            No hay movimientos registrados para este día
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-paper border-b border-ink/10">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-ink/80">Hora</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-ink/80">Tipo</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-ink/80">Concepto</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-ink/80">Método de Pago</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-ink/80">Importe</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-ink/80">Saldo</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-ink/80">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {resumen.movimientos.map((mov) => (
                  <tr key={mov.idMovimientoCaja} className="hover:bg-paper/50">
                    <td className="px-4 py-3 text-sm text-ink/60">
                      {formatArgentinaTime(mov.fecha)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${mov.tipo === 'ingreso'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-red-100 text-red-600'
                          }`}
                      >
                        {mov.tipo === 'ingreso' ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {mov.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink">
                      {mov.recibo && `Recibo ${mov.recibo.nroComprobante}`}
                      {mov.recibo?.cliente?.nombre && ` - ${mov.recibo.cliente.nombre}`}
                      {mov.gasto?.descripcion}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink/80">
                      {mov.metodoPago?.nombre || '-'}
                    </td>
                    <td
                      className={`px-4 py-3 text-right text-sm font-medium ${mov.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'
                        }`}
                    >
                      {mov.tipo === 'ingreso' ? '+' : '-'}
                      {formatCurrency(mov.importe)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-blue-600">
                      {formatCurrency(mov.saldoAcumulado)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {mov.gasto && (
                      <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600"
                            title="Editar egreso"
                            onClick={() => abrirModalEditarGasto(mov.gasto!)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                            title="Eliminar egreso"
                            onClick={() => abrirModalEliminarGasto(mov.gasto!)}
                            disabled={eliminandoGasto}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {resumen && resumen.lastPage > 1 && (
          <div className="mt-3 flex items-center justify-between border-t border-ink/10 px-3 py-2.5 md:px-4 md:py-3">
            <div className="text-sm text-ink/60">
              Mostrando {((resumen.page - 1) * resumen.limit) + 1} -{' '}
              {Math.min(resumen.page * resumen.limit, resumen.total)} de {resumen.total} movimientos
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(resumen.page - 1)}
                disabled={resumen.page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="flex items-center px-3 text-sm text-ink/60">
                Página {resumen.page} de {resumen.lastPage}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(resumen.page + 1)}
                disabled={resumen.page === resumen.lastPage}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Gasto Modal */}
      <Modal
        isOpen={showGastoModal}
        onClose={() => setShowGastoModal(false)}
        title="Registrar Egreso"
        size="lg"
      >
        <GastoForm
          fecha={currentDate}
          onSubmit={handleSubmitGasto}
          onCancel={() => setShowGastoModal(false)}
          isLoading={isSubmitting}
        />
      </Modal>

      {/* Confirmación para cerrar caja */}
      <ConfirmDialog
        isOpen={showConfirmCerrar}
        title="Cerrar Caja"
        message="¿Está seguro de que desea cerrar la caja del día? Esta acción no se puede deshacer."
        confirmText="Cerrar Caja"
        cancelText="Cancelar"
        type="warning"
        onConfirm={confirmCerrarCaja}
        onCancel={() => setShowConfirmCerrar(false)}
      />

      {/* Confirmación para reabrir caja */}
      <ConfirmDialog
        isOpen={showConfirmReabrir}
        title="Reabrir Caja"
        message="¿Está seguro de que desea reabrir la caja del día? Esta acción permitirá realizar nuevos movimientos."
        confirmText="Reabrir Caja"
        cancelText="Cancelar"
        type="info"
        onConfirm={confirmReabrirCaja}
        onCancel={() => setShowConfirmReabrir(false)}
      />

      {/* Modal para editar egreso */}
      <Modal
        isOpen={showEditarGastoModal}
        onClose={() => {
          setShowEditarGastoModal(false)
          setGastoAEditar(null)
        }}
        title="Editar Egreso"
        size="lg"
      >
        {cargandoGasto ? (
          <div className="p-6 text-center text-ink/60">Cargando datos...</div>
        ) : gastoAEditar ? (
          <GastoForm
            fecha={gastoAEditar.fecha.split('T')[0]}
            onSubmit={handleEditarGasto}
            onCancel={() => {
              setShowEditarGastoModal(false)
              setGastoAEditar(null)
            }}
            isLoading={isSubmitting}
            initialData={{
              descripcion: gastoAEditar.descripcion || '',
              pagos: gastoAEditar.pagos.map(p => ({
                idMetodoPago: p.idMetodoPago,
                importe: p.importe,
                numerosCheque: p.numerosCheque || undefined,
              })),
            }}
            submitLabel="Guardar Cambios"
          />
        ) : null}
      </Modal>

      {/* Confirmación para eliminar egreso */}
      <ConfirmDialog
        isOpen={showConfirmEliminarGasto}
        title="Eliminar Egreso"
        message={`¿Está seguro de que desea eliminar el egreso "${gastoAEliminar?.descripcion || ''}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
        onConfirm={handleEliminarGasto}
        onCancel={() => {
          setShowConfirmEliminarGasto(false)
          setGastoAEliminar(null)
        }}
      />
    </div>
  )
}
