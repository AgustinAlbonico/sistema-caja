import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useRecibos, type CreateReciboDto } from '../hooks/useRecibos'
import { useClientes, type Cliente, type CreateClienteDto } from '../hooks/useClientes'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ClientesSearchSelect } from '../components/ClientesSearchSelect'
import { ReciboLineas, type Linea } from '../components/ReciboLineas'
import { PagosForm, type Pago } from '../components/PagosForm'
import { ClienteForm } from '../components/ClienteForm'
import { Modal } from '../components/ui/Modal' // For new client sub-modal logic

const initialLineas: Linea[] = [
    {
        descripcion: '',
        mesComprobante: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getMonth() + 1,
        anioComprobante: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getFullYear(),
        importe: 0,
    },
]

export function ReciboCreatePage() {
    const navigate = useNavigate()
    const { createRecibo, generarPdfRecibo, metodosPago, loading } = useRecibos({ autoFetch: true })
    const { createCliente } = useClientes()

    const [cliente, setCliente] = useState<Cliente | null>(null)
    const [lineas, setLineas] = useState<Linea[]>(initialLineas)

    // Inicializar pagos con el primer método disponible cuando se carguen los métodos
    const [pagos, setPagos] = useState<Pago[]>([])

    // Efecto para inicializar el primer pago cuando se cargan los métodos de pago
    useEffect(() => {
        if (metodosPago.length > 0 && pagos.length === 0) {
            // Usar el primer método (debería ser "Efectivo" gracias al ordenamiento)
            setPagos([
                {
                    idMetodoPago: metodosPago[0].idMetodoPago,
                    importe: 0,
                },
            ])
        }
    }, [metodosPago])

    const [errors, setErrors] = useState<Record<string, string>>({})

    // Sub-modal de cliente rápido
    const [showNuevoClienteModal, setShowNuevoClienteModal] = useState(false)
    const [creatingCliente, setCreatingCliente] = useState(false)

    // Estado para controlar el loading durante la emisión del recibo y generación del PDF
    const [isEmitting, setIsEmitting] = useState(false)

    const totalLineas = lineas.reduce((sum, linea) => sum + (Number(linea.importe) || 0), 0)
    const totalPagos = pagos.reduce((sum, pago) => sum + (Number(pago.importe) || 0), 0)

    // Validar si el formulario está completo
    const isFormValid = (): boolean => {
        // 1. Se debe seleccionar un cliente
        if (!cliente) return false

        // 2. TODAS las líneas deben tener descripción e importe mayor a 0
        const allLineasValid = lineas.every(
            (l) => l.descripcion.trim() !== '' && Number(l.importe) > 0
        )
        if (!allLineasValid) return false

        // 3. Debe haber al menos un método de pago configurado
        if (pagos.length === 0) return false

        // 4. Los importes de conceptos deben coincidir con los importes de pagos
        if (Math.abs(totalLineas - totalPagos) > 0.01) return false

        return true
    }

    // Actualizar automáticamente el importe del primer pago cuando cambian las líneas
    useEffect(() => {
        if (pagos.length === 1) {
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

        if (lineas.some((l) => Number(l.importe) <= 0)) {
            newErrors.lineas = newErrors.lineas 
                ? 'Todas las líneas deben tener descripción e importe mayor a 0'
                : 'Todas las líneas deben tener un importe mayor a 0'
        }

        if (lineas.some((l) => Number(l.importe) <= 0)) {
            newErrors.lineas = newErrors.lineas 
                ? 'Todas las líneas deben tener descripción e importe mayor a 0'
                : 'Todas las líneas deben tener un importe mayor a 0'
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

        // Activar loading durante todo el proceso
        setIsEmitting(true)

        const reciboData: CreateReciboDto = {
            idCliente: cliente!.idCliente,
            nroComprobante: 0, // Backend handles this
            items: lineas.map((linea) => ({
                descripcion: linea.descripcion,
                mesComprobante: linea.mesComprobante,
                anioComprobante: linea.anioComprobante,
                importe: Number(linea.importe),
            })),
            pagos: pagos.map((pago) => ({
                idMetodoPago: pago.idMetodoPago,
                importe: Number(pago.importe),
                numerosCheque: pago.numerosCheque,
            })),
        }

        try {
            const nuevoRecibo = await createRecibo(reciboData)
            // Generar y abrir el PDF en una nueva pestaña
            await generarPdfRecibo(nuevoRecibo.idRecibo)
            // Navigate back to list on success
            navigate('/recibos')
        } catch (err) {
            console.error(err)
            // Mostrar notificación de error al usuario con el mensaje del backend
            const errorMessage = err instanceof Error ? err.message : 'Error al emitir el recibo'
            toast.error(errorMessage, {
                duration: 5000,
                position: 'top-right'
            })
        } finally {
            // Desactivar loading al finalizar (éxito o error)
            setIsEmitting(false)
        }
    }

    const handleNuevoCliente = async (clienteData: CreateClienteDto) => {
        setCreatingCliente(true)
        try {
            const newCliente = await createCliente(clienteData)
            setCliente(newCliente)
            setShowNuevoClienteModal(false)
        } catch (err) {
            console.error('Error creating cliente:', err)
        } finally {
            setCreatingCliente(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-5 pb-14 md:pb-20">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-slate-800 md:text-2xl">Emitir Nuevo Recibo</h1>
                <Button variant="outline" onClick={() => navigate('/recibos')}>
                    Volver
                </Button>
            </div>

            <Card className="p-4 md:p-5">
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Cliente */}
                    <div>
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                                <span className="bg-indigo-200 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                                Cliente
                            </h3>
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

                    <div className="border-t border-slate-100 my-3"></div>

                    {/* Líneas */}
                    <div>
                        <h3 className="mb-2 text-base font-semibold text-slate-800 flex items-center gap-2">
                            <span className="bg-indigo-200 text-emerald-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                            Conceptos
                        </h3>
                        <ReciboLineas lineas={lineas} onChange={setLineas} />
                    </div>

                    <div className="border-t border-slate-100 my-3"></div>

                    {/* Pagos */}
                    <div>
                        <h3 className="mb-2 text-base font-semibold text-slate-800 flex items-center gap-2">
                            <span className="bg-indigo-200 text-purple-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                            Métodos de pago
                        </h3>
                        <PagosForm
                            pagos={pagos}
                            onChange={setPagos}
                            metodosPago={metodosPago}
                            totalLineas={totalLineas}
                        />
                    </div>

                    {errors.totales && (
                        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 font-medium border border-red-100">
                            {errors.totales}
                        </div>
                    )}

                    {/* Botones */}
                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                        <Button
                            type="submit"
                            isLoading={isEmitting || loading}
                            disabled={!isFormValid() || isEmitting}
                            className="w-full sm:w-auto px-6"
                        >
                            Emitir Recibo
                        </Button>
                        <Button type="button" variant="outline" onClick={() => navigate('/recibos')} className="w-full sm:w-auto">
                            Cancelar
                        </Button>
                    </div>
                </form>
            </Card>

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
        </div>
    )
}
