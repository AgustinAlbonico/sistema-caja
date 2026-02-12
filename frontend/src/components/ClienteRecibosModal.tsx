import { useEffect, useState } from 'react';
import { useRecibos } from '../hooks/useRecibos';
import { Modal } from './ui/Modal';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, Printer } from 'lucide-react';
import type { Cliente } from '../hooks/useClientes';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subYears, subMonths, format } from 'date-fns';
import { cn } from '../lib/utils';
import { formatArgentinaDate } from '../lib/utils';

interface ClienteRecibosModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly cliente: Cliente | null;
}

type FiltroRapido = 'todos' | 'hoy' | 'semana' | 'mes' | 'mesPasado' | 'anio' | 'anioPasado';

export function ClienteRecibosModal({ isOpen, onClose, cliente }: ClienteRecibosModalProps) {
  const [filtroAbierto, setFiltroAbierto] = useState(false);
  const [filtroActivo, setFiltroActivo] = useState<FiltroRapido>('todos');

  const {
    recibos,
    loading,
    fetchRecibos,
    page,
    setPage,
    limit,
    setLimit,
    totalPages,
    total,
    setStartDate,
    setEndDate,
    generarPdfRecibo
  } = useRecibos({ autoFetch: false });

  const safeRecibos = recibos || [];

  // Aplicar filtro rápido de fecha
  const aplicarFiltroRapido = (filtro: FiltroRapido) => {
    const hoy = new Date();
    let inicio: Date | null = null;
    let fin: Date | null = null;

    switch (filtro) {
      case 'todos':
        inicio = null;
        fin = null;
        break;
      case 'hoy':
        inicio = hoy;
        fin = hoy;
        break;
      case 'semana':
        inicio = startOfWeek(hoy, { weekStartsOn: 1 });
        fin = endOfWeek(hoy, { weekStartsOn: 1 });
        break;
      case 'mes':
        inicio = startOfMonth(hoy);
        fin = endOfMonth(hoy);
        break;
      case 'mesPasado': {
        const mesPasado = subMonths(hoy, 1);
        inicio = startOfMonth(mesPasado);
        fin = endOfMonth(mesPasado);
        break;
      }
      case 'anio':
        inicio = startOfYear(hoy);
        fin = endOfYear(hoy);
        break;
      case 'anioPasado': {
        const anioPasado = subYears(hoy, 1);
        inicio = startOfYear(anioPasado);
        fin = endOfYear(anioPasado);
        break;
      }
    }

    setStartDate(inicio ? format(inicio, 'yyyy-MM-dd') : '');
    setEndDate(fin ? format(fin, 'yyyy-MM-dd') : '');
    setFiltroActivo(filtro);
    setFiltroAbierto(false);
    setPage(1); // Resetear a página 1 al cambiar filtros
  };

  const getLabelFiltro = (filtro: FiltroRapido): string => {
    const labels: Record<FiltroRapido, string> = {
      todos: 'Todos los recibos',
      hoy: 'Hoy',
      semana: 'Esta semana',
      mes: 'Este mes',
      mesPasado: 'Mes pasado',
      anio: 'Este año',
      anioPasado: 'Año pasado',
    };
    return labels[filtro];
  };

  // Inicializar fechas vacías cuando se abre el modal (filtro "todos")
  useEffect(() => {
    if (isOpen) {
      // Asegurar que las fechas estén vacías para mostrar todos los recibos
      setStartDate('');
      setEndDate('');
      setFiltroActivo('todos');
      setPage(1);
    }
  }, [isOpen, setStartDate, setEndDate, setPage]);

  // Cargar recibos cuando se abre el modal o cambia el cliente o la página
  useEffect(() => {
    if (isOpen && cliente) {
      fetchRecibos({ idCliente: cliente.idCliente });
    }
  }, [isOpen, cliente, page, fetchRecibos]);

  // Cerrar dropdown cuando se hace click fuera
  useEffect(() => {
    const handleClickOutside = () => setFiltroAbierto(false);
    if (filtroAbierto) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [filtroAbierto]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Recibos de ${cliente?.nombre || 'Cliente'}`}
      size="lg"
    >
      <div className="space-y-3">
        {/* Filtros de fecha */}
        <div className="flex items-center justify-between">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFiltroAbierto(!filtroAbierto);
              }}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all shadow-sm border",
                filtroAbierto
                  ? "bg-brand-50 text-brand-700 border-brand-200"
                  : "bg-white text-ink-700 border-surface-200 hover:bg-surface-50"
              )}
            >
              <Calendar className="w-4 h-4 text-ink-500" />
              {getLabelFiltro(filtroActivo)}
              <ChevronDown className={cn("w-4 h-4 text-ink-400 transition-transform", filtroAbierto && "rotate-180")} />
            </button>

            {filtroAbierto && (
              <div className="absolute top-full left-0 mt-2 w-52 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-[100] animate-in fade-in zoom-in-95 duration-200 origin-top-left max-h-72 overflow-y-auto">
                <div className="px-3 py-2 text-[10px] font-bold text-ink-400 uppercase tracking-wider">Filtrar por fecha</div>
                <div className="space-y-0.5 px-1">
                  {(['todos', 'hoy', 'semana', 'mes', 'mesPasado', 'anio', 'anioPasado'] as FiltroRapido[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => aplicarFiltroRapido(f)}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-between",
                        filtroActivo === f ? "bg-brand-50 text-brand-700 font-medium" : "text-ink-700 hover:bg-surface-50"
                      )}
                    >
                      {getLabelFiltro(f)}
                      {filtroActivo === f && <div className="h-1.5 w-1.5 rounded-full bg-brand-500" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Total de recibos */}
          <div className="text-sm text-ink-500">
            Total: <span className="font-semibold text-ink-900">{total}</span> recibos
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-center text-slate-500">Cargando recibos...</div>
        ) : safeRecibos.length === 0 ? (
          <div className="p-6 text-center text-slate-500">
            No hay recibos registrados para este cliente.
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nro</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                    <th className="px-4 py-3 font-medium">Items</th>
                    <th className="px-4 py-3 font-medium w-[50px]"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {safeRecibos.map((recibo) => (
                    <tr key={recibo.idRecibo} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        #{recibo.nroComprobante}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatArgentinaDate(recibo.fechaEmision)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                        $ {Number(recibo.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        <ul className="list-disc pl-4 text-xs">
                          {recibo.items?.map((item, idx) => (
                            <li key={idx}>{item.descripcion} ({item.mesComprobante}/{item.anioComprobante})</li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => generarPdfRecibo(recibo.idRecibo)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                          title="Imprimir recibo"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-slate-500">
                    Mostrando <span className="font-medium text-slate-900">{(page - 1) * limit + 1}</span> a <span className="font-medium text-slate-900">{Math.min(page * limit, total)}</span> de <span className="font-medium text-slate-900">{total}</span>
                  </p>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="rounded-lg border border-slate-300 py-1.5 pl-3 pr-8 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white text-slate-700 cursor-pointer hover:border-brand-300 transition-colors"
                  >
                    {[5, 10, 20, 50].map((l) => (
                      <option key={l} value={l}>{l} filas</option>
                    ))}
                  </select>
                </div>
                <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm bg-white" aria-label="Pagination">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                    className="relative inline-flex items-center rounded-l-xl px-3 py-2 text-slate-400 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 hover:text-slate-900 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <span className="sr-only">Anterior</span>
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-200 focus:outline-offset-0">
                    {page} de {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                    className="relative inline-flex items-center rounded-r-xl px-3 py-2 text-slate-400 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 hover:text-slate-900 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <span className="sr-only">Siguiente</span>
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
