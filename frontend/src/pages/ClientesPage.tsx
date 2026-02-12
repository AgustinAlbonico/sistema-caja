import { useState } from 'react';
import { useClientes, type CreateClienteDto, type Cliente } from '../hooks/useClientes';
import { ClientesList } from '../components/ClientesList';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ClienteModal } from '../components/ClienteModal';
import { ClienteRecibosModal } from '../components/ClienteRecibosModal';

export function ClientesPage() {
  const {
    clientes,
    loading,
    createCliente,
    updateCliente,
    deleteCliente,
    page,
    setPage,
    totalPages,
    search,
    setSearch,
    limit,
    setLimit,
  } = useClientes();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRecibosModalOpen, setIsRecibosModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

  const handleCreateClick = () => {
    setSelectedCliente(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsModalOpen(true);
  };

  const handleViewReceipts = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsRecibosModalOpen(true);
  };

  const handleSave = async (data: CreateClienteDto) => {
    try {
      if (selectedCliente) {
        await updateCliente(selectedCliente.idCliente, data);
        toast.success('Cliente actualizado correctamente');
      } else {
        await createCliente(data);
        toast.success('Cliente creado correctamente');
      }

      setIsModalOpen(false);
      setSelectedCliente(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar el cliente';
      toast.error(message);
      throw err;
    }
  };

  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch);
    setPage(1); // Reset to first page on new search
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          {/* Header is handled by MainLayout, but we can add page-specific actions here */}
        </div>
        <Button onClick={handleCreateClick}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        <ClientesList
          clientes={clientes}
          onDelete={deleteCliente}
          onEditClick={handleEditClick}
          onViewReceipts={handleViewReceipts}
          isLoading={loading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          search={search}
          onSearchChange={handleSearchChange}
          limit={limit}
          onLimitChange={setLimit}
        />
      </Card>

      <ClienteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSave}
        initialValues={selectedCliente}
        isLoading={loading}
      />

      <ClienteRecibosModal
        isOpen={isRecibosModalOpen}
        onClose={() => setIsRecibosModalOpen(false)}
        cliente={selectedCliente}
      />
    </div>
  );
}
