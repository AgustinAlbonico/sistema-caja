import { useState } from 'react'
import { History, Filter, RefreshCw, User, Package, Plus, Edit, Trash, Calendar } from 'lucide-react'
import { format } from 'date-fns'

import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useAuditoria } from '../hooks/useAuditoria'
import { toArgentinaDateTime } from '../lib/utils'

const ENTIDADES = [
  { value: '', label: 'Todas las entidades' },
  { value: 'CLIENTE', label: 'Cliente' },
  { value: 'RECIBO', label: 'Recibo' },
  { value: 'GASTO', label: 'Gasto' },
  { value: 'CAJA', label: 'Caja' },
  { value: 'METODO_PAGO', label: 'Método de Pago' },
  { value: 'USUARIO', label: 'Usuario' },
]

const ACCIONES = [
  { value: '', label: 'Todas las acciones' },
  { value: 'CREAR', label: 'Crear', icon: Plus },
  { value: 'ACTUALIZAR', label: 'Actualizar', icon: Edit },
  { value: 'ELIMINAR', label: 'Eliminar', icon: Trash },
  { value: 'ABRIR_CAJA', label: 'Abrir Caja', icon: Calendar },
  { value: 'CERRAR_CAJA', label: 'Cerrar Caja', icon: Calendar },
]

function getAccionIcon(accion: string) {
  const accionConfig = ACCIONES.find(a => a.value === accion)
  if (accionConfig?.icon) {
    const Icon = accionConfig.icon
    return <Icon className="h-4 w-4" />
  }
  return <History className="h-4 w-4" />
}

function getAccionColor(accion: string): string {
  switch (accion) {
    case 'CREAR':
      return 'bg-green-100 text-green-700'
    case 'ACTUALIZAR':
      return 'bg-blue-100 text-blue-700'
    case 'ELIMINAR':
      return 'bg-red-100 text-red-700'
    case 'ABRIR_CAJA':
      return 'bg-emerald-100 text-emerald-700'
    case 'CERRAR_CAJA':
      return 'bg-orange-100 text-orange-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

export function AuditoriaPage() {
  const { 
    auditoria, 
    loading, 
    error, 
    fetchAuditoria, 
    page, 
    setPage, 
    limit,
    total,
    totalPages 
  } = useAuditoria()
  
  const [filtros, setFiltros] = useState({
    entidad: '',
    accion: '',
    fechaDesde: '',
    fechaHasta: '',
  })

  const handleFiltrar = () => {
    setPage(1)
    fetchAuditoria({
      entidad: filtros.entidad || undefined,
      accion: filtros.accion || undefined,
      fechaDesde: filtros.fechaDesde || undefined,
      fechaHasta: filtros.fechaHasta || undefined,
    })
  }

  const handleLimpiar = () => {
    setFiltros({
      entidad: '',
      accion: '',
      fechaDesde: '',
      fechaHasta: '',
    })
    setPage(1)
    fetchAuditoria()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 md:text-2xl">Auditoría del Sistema</h2>
        <Button variant="outline" onClick={() => fetchAuditoria()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-slate-500" />
          <h3 className="font-semibold text-slate-900">Filtros</h3>
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Entidad</label>
            <select
              value={filtros.entidad}
              onChange={(e) => setFiltros({ ...filtros, entidad: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {ENTIDADES.map(e => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Acción</label>
            <select
              value={filtros.accion}
              onChange={(e) => setFiltros({ ...filtros, accion: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {ACCIONES.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Fecha Desde</label>
            <input
              type="date"
              value={filtros.fechaDesde}
              onChange={(e) => setFiltros({ ...filtros, fechaDesde: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Fecha Hasta</label>
            <input
              type="date"
              value={filtros.fechaHasta}
              onChange={(e) => setFiltros({ ...filtros, fechaHasta: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button onClick={handleFiltrar}>
            <Filter className="mr-2 h-4 w-4" />
            Aplicar Filtros
          </Button>
          <Button variant="ghost" onClick={handleLimpiar}>
            Limpiar
          </Button>
        </div>
      </Card>

      {/* Tabla de Auditoría */}
      <Card>
        {loading ? (
          <div className="py-6 text-center text-slate-500">Cargando...</div>
        ) : error ? (
          <div className="py-6 text-center text-red-600">{error}</div>
        ) : auditoria.length === 0 ? (
          <div className="py-6 text-center text-slate-500">
            <History className="mx-auto mb-2 h-12 w-12 opacity-50" />
            No hay registros de auditoría
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Fecha</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Usuario</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Acción</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Entidad</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">ID Entidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {auditoria.map((item) => (
                  <tr key={item.idAuditoria} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {format(toArgentinaDateTime(item.fechaAccion)!, 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-900">
                          {item.usuario?.nombreCompleto || 'Desconocido'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${getAccionColor(item.accion)}`}>
                        {getAccionIcon(item.accion)}
                        {item.accion}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-900">{item.entidad}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {item.idEntidad || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <div className="text-sm text-slate-600">
              Mostrando {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} de {total} registros
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <span className="flex items-center px-3 text-sm text-slate-600">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
