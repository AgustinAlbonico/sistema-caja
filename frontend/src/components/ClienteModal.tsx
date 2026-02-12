import { Modal } from './ui/Modal'
import { ClienteForm } from './ClienteForm'
import type { Cliente, CreateClienteDto } from '../hooks/useClientes'

interface ClienteModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: CreateClienteDto) => Promise<void>
    initialValues?: Cliente | null
    isLoading?: boolean
}

export function ClienteModal({
    isOpen,
    onClose,
    onSubmit,
    initialValues,
    isLoading,
}: ClienteModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialValues ? 'Editar Cliente' : 'Nuevo Cliente'}
        >
            <ClienteForm
                onSubmit={onSubmit}
                initialValues={initialValues || undefined}
                onCancel={onClose}
                isLoading={isLoading}
            />
        </Modal>
    )
}
