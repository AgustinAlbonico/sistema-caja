import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Search, Plus, FileText, ChevronLeft, ChevronRight, Calendar, ChevronDown, Trash2, AlertTriangle, Eye } from 'lucide-react'
import { useRecibos, type Recibo } from '../hooks/useRecibos'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths, startOfYear, endOfYear } from 'date-fns'
import { es } from 'date-fns/locale'

type FiltroRapido = 'hoy' | 'ayer' | 'semana' | 'mes' | 'mesPasado' | 'anio' | 'anioPasado' | 'todos'

export function RecibosPage() {
  const navigate = useNavigate()
  const [filtroAbierto, setFiltroAbierto] = useState(false)
  const [filtroActivo, setFiltroActivo] = useState<FiltroRapido>('mes')
  const [showConfirmAnular, setShowConfirmAnular] = useState(false)
  const [anulando, setAnulando] = useState(false)
  const [ultimoRecibo, setUltimoRecibo] = useState<{ recibo: Recibo | null; loading: boolean }>({ recibo: null, loading: false })

  // Estado para eliminar cualquier recibo (sin modificar contador)
  const [showConfirmEliminar, setShowConfirmEliminar] = useState(false)
  const [reciboAEliminar, setReciboAEliminar] = useState<Recibo | null>(null)
  const [eliminando, setEliminando] = useState(false)

  // Estado para ver detalles del recibo
  const [showDetalleRecibo, setShowDetalleRecibo] = useState(false)
  const [reciboDetalle, setReciboDetalle] = useState<Recibo | null>(null)

  const {
    recibos,
    loading,
    error,
    page,
    totalPages,
    total,
    limit,
    setPage,
    setLimit,
    search,
    setSearch,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    generarPdfRecibo,
    pdfLoading,
    anularUltimoRecibo,
    fetchUltimoRecibo,
    eliminarRecibo,
  } = useRecibos()

  const handleNuevoRecibo = () => {
    navigate('/recibos/nuevo')
  }

  const handleAnularUltimoRecibo = async () => {
    setAnulando(true)
    try {
      const result = await anularUltimoRecibo()
      setShowConfirmAnular(false)
      toast.success(`Recibo #${result.nroComprobante} anulado correctamente`, {
        description: `El contador volvió a ${result.nroComprobante - 1}`,
      })
    } catch (err) {
      // Error ya se maneja en el hook (setError)
      toast.error(err instanceof Error ? err.message : 'Error al anular el recibo')
    } finally {
      setAnulando(false)
    }
  }

  const handleEliminarRecibo = async () => {
    if (!reciboAEliminar) return
    setEliminando(true)
    try {
      const result = await eliminarRecibo(reciboAEliminar.idRecibo)
      setShowConfirmEliminar(false)
      setReciboAEliminar(null)
      toast.success(`Recibo #${result.nroComprobante} eliminado correctamente`, {
        description: 'El número correlativo no fue modificado',
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar el recibo')
    } finally {
      setEliminando(false)
    }
  }

  const abrirModalEliminar = (recibo: Recibo) => {
    setReciboAEliminar(recibo)
    setShowConfirmEliminar(true)
  }

  const aplicarFiltroRapido = (filtro: FiltroRapido) => {
    const hoy = new Date()
    let inicio: Date
    let fin: Date

    switch (filtro) {
      case 'hoy':
        inicio = startOfDay(hoy)
        fin = endOfDay(hoy)
        break
      case 'ayer':
        inicio = startOfDay(subDays(hoy, 1))
        fin = endOfDay(subDays(hoy, 1))
        break
      case 'semana':
        inicio = startOfWeek(hoy, { weekStartsOn: 1 })
        fin = endOfWeek(hoy, { weekStartsOn: 1 })
        break
      case 'mes':
        inicio = startOfMonth(hoy)
        fin = endOfMonth(hoy)
        break
      case 'mesPasado': {
        const mesPasado = subMonths(hoy, 1)
        inicio = startOfMonth(mesPasado)
        fin = endOfMonth(mesPasado)
        break
      }
      case 'anio':
        inicio = startOfYear(hoy)
        fin = endOfYear(hoy)
        break
      case 'anioPasado': {
        const anioPasado = subMonths(hoy, 12)
        inicio = startOfYear(anioPasado)
        fin = endOfYear(anioPasado)
        break
      }
      case 'todos':
        inicio = new Date('2000-01-01')
        fin = endOfDay(hoy)
        break
      default:
        return
    }

    setStartDate(format(inicio, 'yyyy-MM-dd'))
    setEndDate(format(fin, 'yyyy-MM-dd'))
    setFiltroActivo(filtro)
    setFiltroAbierto(false)
  }

  const getLabelFiltro = (filtro: FiltroRapido): string => {
    const labels: Record<FiltroRapido, string> = {
      hoy: 'Hoy',
      ayer: 'Ayer',
      semana: 'Esta semana',
      mes: 'Este mes',
      mesPasado: 'Mes pasado',
      anio: 'Este año',
      anioPasado: 'Año pasado',
      todos: 'Todos',
    }
    return labels[filtro]
  }

  // Cerrar el menú de filtros al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.filtro-rapido-container')) {
        setFiltroAbierto(false)
      }
    }

    if (filtroAbierto) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [filtroAbierto])

  // Cargar datos del último recibo cuando se abre el modal
  useEffect(() => {
    if (showConfirmAnular) {
      const cargarUltimoRecibo = async () => {
        setUltimoRecibo({ recibo: null, loading: true })
        const recibo = await fetchUltimoRecibo()
        setUltimoRecibo({ recibo, loading: false })
      }
      cargarUltimoRecibo()
    } else {
      // Limpiar cuando se cierra el modal
      setUltimoRecibo({ recibo: null, loading: false })
    }
  }, [showConfirmAnular, fetchUltimoRecibo])

  const handleGeneratePdf = async (idRecibo: number) => {
    await generarPdfRecibo(idRecibo)
  }

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy', { locale: es })
    } catch {
      return dateStr
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Recibos</h1>
          <p className="text-sm text-slate-600 mt-1">Gestión de recibos y pagos</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowConfirmAnular(true)}
            disabled={recibos.length === 0 || anulando}
            className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Anular Último
          </Button>
          <Button onClick={handleNuevoRecibo}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Recibo
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <Card className="bg-red-50 border-red-200">
          <p className="text-red-600">{error}</p>
        </Card>
      )}

      {/* Filters Bar - NORMAL div, NOT sticky/fixed - scrolls with page like ClientesList */}
      <div className="border-b border-slate-100 bg-white p-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
             <input
              type="text"
              placeholder="Buscar por cliente o número de comprobante..."
               className="h-9 w-full rounded-lg border border-slate-200 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Date filters */}
             <div className="flex items-center gap-3 mt-3 sm:mt-0">
            {/* Botón de Filtros Rápidos */}
            <div className="relative filtro-rapido-container">
              <button
                onClick={() => setFiltroAbierto(!filtroAbierto)}
                 className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Calendar className="w-4 h-4" />
                {getLabelFiltro(filtroActivo)}
                <ChevronDown className={`w-4 h-4 transition-transform ${filtroAbierto ? 'rotate-180' : ''}`} />
              </button>

              {filtroAbierto && (
                 <div className="absolute top-full right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                  <button
                    onClick={() => aplicarFiltroRapido('hoy')}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Hoy
                  </button>
                  <button
                    onClick={() => aplicarFiltroRapido('ayer')}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Ayer
                  </button>
                  <button
                    onClick={() => aplicarFiltroRapido('semana')}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Esta semana
                  </button>
                  <button
                    onClick={() => aplicarFiltroRapido('mes')}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Este mes
                  </button>
                  <button
                    onClick={() => aplicarFiltroRapido('mesPasado')}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Mes pasado
                  </button>
                  <button
                    onClick={() => aplicarFiltroRapido('anio')}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Este año
                  </button>
                  <button
                    onClick={() => aplicarFiltroRapido('anioPasado')}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Año pasado
                  </button>
                  <button
                    onClick={() => aplicarFiltroRapido('todos')}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Todos
                  </button>
                </div>
              )}
            </div>

            {/* Selector de rango personalizado */}
             <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
              <Calendar className="w-5 h-5 text-slate-500" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none text-sm cursor-text"
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none text-sm cursor-text"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <Card>
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                  <th className="px-4 py-2.5 font-medium">N° Comprobante</th>
                  <th className="px-4 py-2.5 font-medium">Fecha</th>
                  <th className="px-4 py-2.5 font-medium">Cliente</th>
                  <th className="px-4 py-2.5 font-medium">Conceptos</th>
                  <th className="px-4 py-2.5 font-medium">Total</th>
                  <th className="px-4 py-2.5 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Cargando recibos...
                  </td>
                </tr>
              ) : recibos.length > 0 ? (
                recibos.map((recibo) => (
                  <tr key={recibo.idRecibo} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      #{recibo.nroComprobante}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(recibo.fechaEmision)}
                    </td>
                    <td className="px-4 py-3 text-slate-900">
                      {recibo.cliente?.nombre || 'Cliente eliminado'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs">
                      {recibo.items && recibo.items.length > 0
                        ? recibo.items.map((item, idx) => (
                            <span key={idx} className="inline-block">
                              {idx > 0 && ', '}
                              {item.descripcion}
                            </span>
                          ))
                        : '-'}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {formatCurrency(recibo.total)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600"
                          title="Ver detalles"
                          onClick={() => {
                            setReciboDetalle(recibo)
                            setShowDetalleRecibo(true)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                          title="Eliminar recibo"
                          onClick={() => abrirModalEliminar(recibo)}
                          disabled={eliminando}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No se encontraron recibos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
            >
              Siguiente
            </Button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <p className="text-sm text-slate-700">
                Mostrando {((page - 1) * limit) + 1} -{' '}
                {Math.min(page * limit, total)} de {total} recibos
              </p>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>Filas por página:</span>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="rounded-md border-slate-300 py-1 pl-2 pr-6 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  {[5, 10, 20, 50].map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Anterior</span>
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <span className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300">
                  Página {page} de {totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Siguiente</span>
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </Card>

      {/* Modal de Confirmación para Anular Último Recibo */}
      {showConfirmAnular && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowConfirmAnular(false)}
        >
          <Card className="max-w-2xl w-full bg-white max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Confirmar Anulación
                </h3>
              </div>
              <p className="text-slate-600 mb-4">
                ¿Está seguro que desea anular el siguiente recibo?
              </p>

              {/* Información del recibo */}
              {ultimoRecibo.loading ? (
                <div className="bg-slate-50 rounded-lg p-4 mb-6">
                  <p className="text-slate-600 text-center">Cargando información del recibo...</p>
                </div>
              ) : ultimoRecibo.recibo ? (
                <div className="bg-slate-50 rounded-lg p-4 mb-6 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-sm font-medium text-slate-600">Número:</span>
                    <span className="font-semibold text-slate-900">#{ultimoRecibo.recibo.nroComprobante}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-sm font-medium text-slate-600">Fecha:</span>
                    <span className="font-medium text-slate-900">{formatDate(ultimoRecibo.recibo.fechaEmision)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-sm font-medium text-slate-600">Cliente:</span>
                    <span className="font-medium text-slate-900">{ultimoRecibo.recibo.cliente?.nombre || 'Cliente eliminado'}</span>
                  </div>
                  <div className="border-b border-slate-200 pb-2">
                    <span className="text-sm font-medium text-slate-600 block mb-2">Conceptos:</span>
                    {ultimoRecibo.recibo.items && ultimoRecibo.recibo.items.length > 0 ? (
                      <ul className="space-y-1">
                        {ultimoRecibo.recibo.items.map((item, index) => (
                          <li key={index} className="text-sm text-slate-800 flex items-start gap-2">
                            <span className="text-slate-500 mt-0.5">•</span>
                            <div>
                              <span className="font-medium">{item.descripcion}</span>
                              <span className="text-slate-600 ml-2">
                                ({formatCurrency(item.importe)})
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500">Sin conceptos</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-semibold text-slate-700">Total:</span>
                    <span className="text-lg font-bold text-slate-900">{formatCurrency(ultimoRecibo.recibo.total)}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 rounded-lg p-4 mb-6">
                  <p className="text-red-600 text-center">No se encontró el último recibo</p>
                </div>
              )}

              <p className="text-sm text-slate-500 mb-6">
                Esta acción eliminará permanentemente el recibo y decrementará el contador. No se puede deshacer.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmAnular(false)}
                  disabled={anulando}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAnularUltimoRecibo}
                  disabled={anulando || ultimoRecibo.loading}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {anulando ? 'Anulando...' : 'Sí, Anular Recibo'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Modal de Confirmación para Eliminar Cualquier Recibo */}
      {showConfirmEliminar && reciboAEliminar && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowConfirmEliminar(false)
            setReciboAEliminar(null)
          }}
        >
          <Card className="max-w-2xl w-full bg-white max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Eliminar Recibo
                </h3>
              </div>
              <p className="text-slate-600 mb-4">
                ¿Está seguro que desea eliminar el siguiente recibo?
              </p>

              {/* Información del recibo a eliminar */}
              <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-sm font-medium text-slate-600">Número:</span>
                  <span className="font-semibold text-slate-900">#{reciboAEliminar.nroComprobante}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-sm font-medium text-slate-600">Fecha:</span>
                  <span className="font-medium text-slate-900">{formatDate(reciboAEliminar.fechaEmision)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-sm font-medium text-slate-600">Cliente:</span>
                  <span className="font-medium text-slate-900">{reciboAEliminar.cliente?.nombre || 'Cliente eliminado'}</span>
                </div>
                {reciboAEliminar.items && reciboAEliminar.items.length > 0 && (
                  <div className="border-b border-slate-200 pb-2">
                    <span className="text-sm font-medium text-slate-600 block mb-2">Conceptos:</span>
                    <ul className="space-y-1">
                      {reciboAEliminar.items.map((item, index) => (
                        <li key={`eliminar-item-${reciboAEliminar.idRecibo}-${index}`} className="text-sm text-slate-800 flex items-start gap-2">
                          <span className="text-slate-500 mt-0.5">•</span>
                          <div>
                            <span className="font-medium">{item.descripcion}</span>
                            <span className="text-slate-600 ml-2">
                              ({formatCurrency(item.importe)})
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-semibold text-slate-700">Total:</span>
                  <span className="text-lg font-bold text-slate-900">{formatCurrency(reciboAEliminar.total)}</span>
                </div>
              </div>

              {/* Advertencia importante */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Importante</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Esta acción eliminará permanentemente el recibo pero <strong>NO modificará el número correlativo</strong>.
                      Se recomienda usar esta opción solo para recibos antiguos que deban eliminarse por error administrativo.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowConfirmEliminar(false)
                    setReciboAEliminar(null)
                  }}
                  disabled={eliminando}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleEliminarRecibo}
                  disabled={eliminando}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {eliminando ? 'Eliminando...' : 'Sí, Eliminar Recibo'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Modal de Detalles del Recibo */}
      {showDetalleRecibo && reciboDetalle && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowDetalleRecibo(false)
            setReciboDetalle(null)
          }}
        >
          <Card className="max-w-3xl w-full bg-white max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <FileText className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Detalles del Recibo #{reciboDetalle.nroComprobante}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowDetalleRecibo(false)
                    setReciboDetalle(null)
                  }}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Información del recibo */}
              <div className="bg-slate-50 rounded-lg p-4 mb-6 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-sm font-medium text-slate-600">Número:</span>
                  <span className="font-semibold text-slate-900">#{reciboDetalle.nroComprobante}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-sm font-medium text-slate-600">Fecha:</span>
                  <span className="font-medium text-slate-900">{formatDate(reciboDetalle.fechaEmision)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-sm font-medium text-slate-600">Cliente:</span>
                  <span className="font-medium text-slate-900">{reciboDetalle.cliente?.nombre || 'Cliente eliminado'}</span>
                </div>
              </div>

              {/* Conceptos */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Conceptos</h4>
                {reciboDetalle.items && reciboDetalle.items.length > 0 ? (
                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium">Descripción</th>
                          <th className="px-4 py-2 text-right font-medium">Mes</th>
                          <th className="px-4 py-2 text-right font-medium">Año</th>
                          <th className="px-4 py-2 text-right font-medium">Importe</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reciboDetalle.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-slate-900">{item.descripcion}</td>
                            <td className="px-4 py-2 text-right text-slate-600">{item.mesComprobante}</td>
                            <td className="px-4 py-2 text-right text-slate-600">{item.anioComprobante}</td>
                            <td className="px-4 py-2 text-right font-medium text-slate-900">
                              {formatCurrency(item.importe)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-lg p-4 text-center text-slate-600">
                    Sin conceptos
                  </div>
                )}
              </div>

              {/* Pagos */}
              {reciboDetalle.pagos && reciboDetalle.pagos.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Formas de Pago</h4>
                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium">Método</th>
                          <th className="px-4 py-2 text-right font-medium">Importe</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reciboDetalle.pagos.map((pago, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-slate-900">
                              {pago.numerosCheque ? `${pago.numerosCheque} (Cheque)` : 'Efectivo'}
                            </td>
                            <td className="px-4 py-2 text-right font-medium text-slate-900">
                              {formatCurrency(pago.importe)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-center justify-between">
                <span className="text-lg font-semibold text-indigo-900">Total:</span>
                <span className="text-xl font-bold text-indigo-900 md:text-2xl">{formatCurrency(reciboDetalle.total)}</span>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3 justify-end mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetalleRecibo(false)
                    setReciboDetalle(null)
                  }}
                >
                  Cerrar
                </Button>
                <Button
                  onClick={() => handleGeneratePdf(reciboDetalle.idRecibo)}
                  disabled={pdfLoading === reciboDetalle.idRecibo}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {pdfLoading === reciboDetalle.idRecibo ? 'Generando...' : 'Generar PDF'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
