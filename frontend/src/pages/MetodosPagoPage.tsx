import { useState } from 'react'
import { Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { useMetodosPago } from '../hooks/useMetodosPago'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Card } from '../components/ui/Card'

export function MetodosPagoPage() {
  const { metodosPago, loading, createMetodoPago, updateMetodoPago, deleteMetodoPago } =
    useMetodosPago()

  const [showModal, setShowModal] = useState(false)
  const [editingMetodo, setEditingMetodo] = useState<{ idMetodoPago: number; nombre: string; activo: boolean } | null>(null)
  const [nombre, setNombre] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [metodoToDelete, setMetodoToDelete] = useState<{ idMetodoPago: number; nombre: string } | null>(null)

  const handleOpenModal = (metodo?: { idMetodoPago: number; nombre: string; activo: boolean }) => {
    if (metodo) {
      setEditingMetodo(metodo)
      setNombre(metodo.nombre)
    } else {
      setEditingMetodo(null)
      setNombre('')
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingMetodo(null)
    setNombre('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return

    setIsSubmitting(true)
    try {
      if (editingMetodo) {
        await updateMetodoPago(editingMetodo.idMetodoPago, { nombre: nombre.trim() })
      } else {
        await createMetodoPago({ nombre: nombre.trim() })
      }
      handleCloseModal()
    } catch (err) {
      console.error('Error saving metodo pago:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleActivo = async (idMetodoPago: number, currentActivo: boolean) => {
    try {
      await updateMetodoPago(idMetodoPago, { activo: !currentActivo })
    } catch (err) {
      console.error('Error toggling activo:', err)
    }
  }

  const handleDelete = async (idMetodoPago: number, nombre: string) => {
    setMetodoToDelete({ idMetodoPago, nombre })
  }

  const confirmDeleteMetodo = async () => {
    if (!metodoToDelete) return

    try {
      await deleteMetodoPago(metodoToDelete.idMetodoPago)
      setMetodoToDelete(null)
    } catch (err) {
      console.error('Error deleting metodo pago:', err)
      alert('No se pudo eliminar el método de pago. Puede estar en uso.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink md:text-2xl">Métodos de Pago</h1>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Método
        </Button>
      </div>

      <Card>
        {loading && metodosPago.length === 0 ? (
          <div className="p-6 text-center text-ink/60">Cargando...</div>
        ) : metodosPago.length === 0 ? (
          <div className="p-6 text-center text-ink/60">
            No hay métodos de pago registrados
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-paper border-b border-ink/10">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-ink/80">
                    Nombre
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-ink/80">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-ink/80">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {metodosPago.map((metodo) => (
                  <tr key={metodo.idMetodoPago} className="hover:bg-paper/50">
                    <td className="px-4 py-3 text-sm text-ink">
                      {metodo.nombre}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActivo(metodo.idMetodoPago, metodo.activo)}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                          metodo.activo
                            ? 'bg-teal/10 text-teal hover:bg-teal/20'
                            : 'bg-ink/10 text-ink/60 hover:bg-ink/20'
                        }`}
                      >
                        {metodo.activo ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            Activo
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            Inactivo
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenModal(metodo)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(metodo.idMetodoPago, metodo.nombre)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingMetodo ? 'Editar MÃ©todo de Pago' : 'Nuevo MÃ©todo de Pago'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Efectivo, Tarjeta de CrÃ©dito, Transferencia"
            required
          />
          <div className="flex gap-3 pt-4">
            <Button type="submit" isLoading={isSubmitting}>
              {editingMetodo ? 'Guardar Cambios' : 'Crear MÃ©todo'}
            </Button>
            <Button type="button" variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmación para eliminar método de pago */}
      <ConfirmDialog
        isOpen={metodoToDelete !== null}
        title="Eliminar Método de Pago"
        message={`¿Está seguro de que desea eliminar el método de pago "${metodoToDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
        onConfirm={confirmDeleteMetodo}
        onCancel={() => setMetodoToDelete(null)}
      />
    </div>
  )
}
