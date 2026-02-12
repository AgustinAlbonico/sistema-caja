import { useState, useEffect } from 'react';
import type { Cliente } from '../hooks/useClientes';
import { Button } from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { Edit2, Trash2, Search, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

interface ClientesListProps {
  clientes: Cliente[];
  onDelete: (id: number) => Promise<void>;
  onEditClick: (cliente: Cliente) => void;
  onViewReceipts: (cliente: Cliente) => void;
  isLoading?: boolean;
  // Pagination & Search
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  search: string;
  onSearchChange: (search: string) => void;
  limit: number;
  onLimitChange: (limit: number) => void;
}

export function ClientesList({
  clientes,
  onDelete,
  onEditClick,
  onViewReceipts,
  isLoading,
  page,
  totalPages,
  onPageChange,
  search,
  onSearchChange,
  limit,
  onLimitChange,
}: ClientesListProps) {

  // Helper to format category
  const getCategoryBadge = (cat?: string) => {
    if (!cat) return '-';
    const normalized = cat.toLowerCase();
    if (normalized.includes('monotribut') || normalized === 'metro') return 'M';
    if (normalized.includes('responsable') || normalized === 'ri') return 'RI';
    if (normalized.includes('exento')) return 'E';
    if (normalized.includes('consumidor')) return 'CF';
    return cat;
  };

  // Debounce search update
  const [localSearch, setLocalSearch] = useState(search);
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== search) {
        onSearchChange(localSearch);
        // Reset to page 1 on search change? usually good UX, but parent handles it or we do it here?
        // ideally parent does it.
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [localSearch, search, onSearchChange]);

  if (isLoading && clientes.length === 0) {
    return <div className="p-6 text-center text-slate-500">Cargando clientes...</div>;
  }

  return (
    <div>
      {/* Filters Bar */}
      <div className="border-b border-slate-100 bg-white p-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar clientes..."
              className="h-9 w-full rounded-lg border border-slate-200 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>
          {/* Add more filters here if needed */}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Nombre</th>
              <th className="px-4 py-2.5 font-medium">CUIT</th>
              <th className="px-4 py-2.5 font-medium">Categoría</th>
              <th className="px-4 py-2.5 font-medium">Localidad</th>
              <th className="px-4 py-2.5 font-medium">Teléfono</th>
              <th className="px-4 py-2.5 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {clientes.length > 0 ? (
              clientes.map((cliente) => (
                <tr key={cliente.idCliente} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {cliente.nombre}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{cliente.cuit || '-'}</td>
                  <td className="px-4 py-3 text-slate-500">
                    <span
                      className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800"
                      title={cliente.categoria}
                    >
                      {getCategoryBadge(cliente.categoria)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {cliente.localidad}
                    {cliente.provincia ? `, ${cliente.provincia}` : ''}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{cliente.telefono || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
                        title="Ver Recibos"
                        onClick={() => onViewReceipts(cliente)}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600"
                        title="Editar"
                        onClick={() => onEditClick(cliente)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                        title="Eliminar"
                        onClick={() => setClienteToDelete(cliente)}
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
                  {isLoading ? 'Cargando...' : 'No se encontraron clientes.'}
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
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Siguiente
          </Button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-slate-700">
              Página <span className="font-medium">{page}</span> de{' '}
              <span className="font-medium">{totalPages}</span>
            </p>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span>Mostrar</span>
              <select
                value={limit}
                onChange={(e) => onLimitChange(Number(e.target.value))}
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
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <span className="sr-only">Anterior</span>
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              {/* Note: Simplified pagination, just Prev/Next for now, can add page numbers later if requested */}
              <button
                onClick={() => onPageChange(page + 1)}
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

      {/* Modal de confirmación para eliminar cliente */}
      <ConfirmDialog
        isOpen={clienteToDelete !== null}
        title="Eliminar Cliente"
        message={`¿Está seguro de que desea eliminar al cliente "${clienteToDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
        onConfirm={async () => {
          if (clienteToDelete) {
            await onDelete(clienteToDelete.idCliente);
            setClienteToDelete(null);
          }
        }}
        onCancel={() => setClienteToDelete(null)}
      />
    </div>
  );
}

