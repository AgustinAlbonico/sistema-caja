import { useState, useEffect } from 'react'
import type { Cliente } from '../hooks/useClientes'
import type { CreateReciboDto } from '../hooks/useRecibos'
import type { MetodoPago } from '../hooks/useRecibos'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { ClientesSearchSelect } from './ClientesSearchSelect'
import { ReciboLineas, type Linea } from './ReciboLineas'
import { PagosForm, type Pago } from './PagosForm'
import { ClienteForm } from './ClienteForm'
import type { CreateClienteDto } from '../hooks/useClientes'

interface ReciboModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (recibo: CreateReciboDto) => Promise<void>
    metodosPago: MetodoPago[]
    onCreateCliente: (cliente: CreateClienteDto) => Promise<Cliente>
    isLoading?: boolean
}

const initialLineas: Linea[] = [
    {
        descripcion: '',
        mesComprobante: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getMonth() + 1,
        anioComprobante: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getFullYear(),
        importe: 0,
    },
]

export function ReciboModal({
    isOpen,
    onClose,
    onSubmit,
    metodosPago,
    onCreateCliente,
    isLoading,
}: ReciboModalProps) {
    const [cliente, setCliente] = useState<Cliente | null>(null)
    const [observaciones, setObservaciones] = useState('')
    const [lineas, setLineas] = useState<Linea[]>(initialLineas)
    const [pagos, setPagos] = useState<Pago[]>([
        {
            idMetodoPago: metodosPago[0]?.idMetodoPago || 1,
            importe: 0,
        },
    ])
    const [errors, setErrors] = useState<Record<string, string>>({})

    // Sub-modal de cliente rápido
    const [showNuevoClienteModal, setShowNuevoClienteModal] = useState(false)
    const [creatingCliente, setCreatingCliente] = useState(false)

    const totalLineas = lineas.reduce((sum, linea) => sum + (Number(linea.importe) || 0), 0)
    const totalPagos = pagos.reduce((sum, pago) => sum + (Number(pago.importe) || 0), 0)

    // Actualizar automáticamente el importe del primer pago cuando cambian las líneas
    useEffect(() => {
        if (pagos.length === 1 && pagos[0].importe === 0) {
            setPagos([
                {
                    ...pagos[0],
                    importe: totalLineas,
                },
            ])
        }
    }, [totalLineas])

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {}

        if (!cliente) {
            newErrors.cliente = 'Debe seleccionar un cliente'
        }

        if (lineas.some((l) => !l.descripcion.trim())) {
            newErrors.lineas = 'Todas las líneas deben tener una descripción'
        }

        if (Math.abs(totalLineas - totalPagos) > 0.01) {
            newErrors.totales = 'El total de líneas debe coincidir con el total de pagos'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validate()) return

        const reciboData: CreateReciboDto = {
            idCliente: cliente!.idCliente,
            nroComprobante: 0, // Ignored by backend
            items: lineas.map((linea) => ({
                descripcion: linea.descripcion,
                mesComprobante: linea.mesComprobante,
                anioComprobante: linea.anioComprobante,
                importe: Number(linea.importe),
            })),
            pagos: pagos.map((pago) => ({
                idMetodoPago: pago.idMetodoPago,
                importe: Number(pago.importe),
                numerosCheque: pago.numerosCheque || undefined,
            })),
        }

        await onSubmit(reciboData)
        resetForm()
    }

    const resetForm = () => {
        setCliente(null)
        setObservaciones('')
        setLineas(initialLineas)
        setPagos([
            {
                idMetodoPago: metodosPago[0]?.idMetodoPago || 1,
                importe: 0,
            },
        ])
        setErrors({})
    }

    const handleClose = () => {
        resetForm()
        onClose()
    }

    const handleNuevoCliente = async (clienteData: CreateClienteDto) => {
        setCreatingCliente(true)
        try {
            const newCliente = await onCreateCliente(clienteData)
            setCliente(newCliente)
            setShowNuevoClienteModal(false)
        } catch (err) {
            console.error('Error creating cliente:', err)
        } finally {
            setCreatingCliente(false)
        }
    }

    return (
        <>
            <Modal isOpen={isOpen} onClose={handleClose} title="Emitir Recibo">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Cliente */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-ink/80">
                                Cliente
                                {errors.cliente && (
                                    <span className="ml-2 text-xs text-red-500">{errors.cliente}</span>
                                )}
                            </label>
                            <Button
                                variant="outline"
                                className="px-3 py-1 text-xs"
                                onClick={() => setShowNuevoClienteModal(true)}
                                type="button"
                            >
                                + Nuevo Cliente
                            </Button>
                        </div>
                        <ClientesSearchSelect
                            onSelect={setCliente}
                            value={cliente}
                            placeholder="Buscar cliente por nombre..."
                            loadOnMount={true}
                        />

                    </div>

                    {/* Observaciones */}
                    <div>
                        <Input
                            label="Observaciones"
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            placeholder="Observaciones adicionales"
                        />
                    </div>

                    {/* Líneas */}
                    <div>
                        <h3 className="mb-3 text-sm font-medium text-ink/80">Líneas del recibo</h3>
                        <ReciboLineas lineas={lineas} onChange={setLineas} />
                    </div>

                    {/* Pagos */}
                    <div>
                        <h3 className="mb-3 text-sm font-medium text-ink/80">Métodos de pago</h3>
                        <PagosForm
                            pagos={pagos}
                            onChange={setPagos}
                            metodosPago={metodosPago}
                            totalLineas={totalLineas}
                        />
                    </div>

                    {errors.totales && (
                        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">
                            {errors.totales}
                        </div>
                    )}

                    {/* Botones */}
                    <div className="flex gap-3 pt-4">
                        <Button type="submit" isLoading={isLoading}>
                            Emitir Recibo
                        </Button>
                        <Button type="button" variant="outline" onClick={handleClose}>
                            Cancelar
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Sub-modal de cliente rápido */}
            <Modal
                isOpen={showNuevoClienteModal}
                onClose={() => setShowNuevoClienteModal(false)}
                title="Nuevo Cliente Rápido"
            >
                <ClienteForm
                    onSubmit={handleNuevoCliente}
                    onCancel={() => setShowNuevoClienteModal(false)}
                    isLoading={creatingCliente}
                />
            </Modal>
        </>
    )
}
