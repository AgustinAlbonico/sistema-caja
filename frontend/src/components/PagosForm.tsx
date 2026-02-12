import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import type { MetodoPago } from '../hooks/useRecibos'

export interface Pago {
    idMetodoPago: number
    importe: number
    numerosCheque?: string
}

interface PagosFormProps {
    pagos: Pago[]
    onChange: (pagos: Pago[]) => void
    metodosPago: MetodoPago[]
    totalLineas: number
    errors?: Record<number, Record<string, string>>
}

export function PagosForm({
    pagos,
    onChange,
    metodosPago,
    totalLineas,
    errors = {},
}: PagosFormProps) {
    const handleAddPago = () => {
        // Encontrar el primer método de pago que no esté siendo usado
        const metodoDisponible = metodosPago.find(m => !pagos.some(p => p.idMetodoPago === m.idMetodoPago))
        
        if (metodoDisponible) {
            onChange([
                ...pagos,
                {
                    idMetodoPago: metodoDisponible.idMetodoPago,
                    importe: 0,
                },
            ])
        }
    }

    const handleRemovePago = (index: number) => {
        if (pagos.length > 1) {
            const newPagos = [...pagos]
            newPagos.splice(index, 1)
            onChange(newPagos)
        }
    }

    const handleChange = (
        index: number,
        field: keyof Pago,
        value: string | number
    ) => {
        const newPagos = [...pagos]
        newPagos[index] = {
            ...newPagos[index],
            [field]:
                field === 'numerosCheque' ? value : field === 'idMetodoPago' ? Number(value) : Number(value),
        }
        onChange(newPagos)
    }

    const totalPagos = pagos.reduce((sum, pago) => sum + (Number(pago.importe) || 0), 0)
    const diferencia = totalLineas - totalPagos

    return (
        <div className="space-y-3">
            <div className="space-y-3">
                {pagos.map((pago, index) => {
                    // Calcular opciones disponibles para esta fila específica
                    const rowOptions = metodosPago
                        .filter(m => {
                            // Permitir si es el actual de esta fila
                            if (m.idMetodoPago === pago.idMetodoPago) return true;
                            // Permitir si NO está usado en ninguna otra fila
                            return !pagos.some((p, pIdx) => pIdx !== index && p.idMetodoPago === m.idMetodoPago);
                        })
                        .map(m => ({
                            value: m.idMetodoPago,
                            label: m.nombre,
                        }));

                    return (
                        <div
                            key={index}
                            className="flex flex-col gap-3 rounded-xl border border-ink/10 bg-white p-3 shadow-soft"
                        >
                            <div className="flex flex-col md:flex-row gap-3">
                                <div className="flex-1">
                                    <Select
                                        label={index === 0 ? 'Método de pago' : undefined}
                                        value={pago.idMetodoPago}
                                        onChange={(e) => handleChange(index, 'idMetodoPago', e.target.value)}
                                        options={rowOptions}
                                    />
                                </div>
                                <div className="flex-1">
                                    <Input
                                        label={index === 0 ? 'Importe' : undefined}
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        value={pago.importe || ''}
                                        onChange={(e) => handleChange(index, 'importe', e.target.value)}
                                        error={errors[index]?.importe}
                                    />
                                </div>
                            </div>

                            {metodosPago.find((m) => m.idMetodoPago === pago.idMetodoPago)?.nombre.toLowerCase().includes('cheque') ? (
                                (() => {
                                    const cheques = pago.numerosCheque ? pago.numerosCheque.split(',').map(s => s.trim()) : [''];
                                    if (cheques.length === 0) cheques.push('');

                                    return (
                                        <div className="space-y-2">
                                            <label className={`text-sm font-medium text-ink/80 block ${index !== 0 && 'sr-only'}`}>
                                                Números de Cheque
                                            </label>
                                            <div className="flex flex-col gap-2">
                                                {cheques.map((chequeNum, cIndex) => (
                                                    <div key={cIndex} className="flex items-center gap-1">
                                                        <Input
                                                            value={chequeNum}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                const newCheques = [...cheques];
                                                                newCheques[cIndex] = val;
                                                                handleChange(index, 'numerosCheque', newCheques.join(', '));
                                                            }}
                                                            placeholder={`Cheque #${cIndex + 1}`}
                                                            className="w-full"
                                                        />
                                                        {cheques.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newCheques = cheques.filter((_, i) => i !== cIndex);
                                                                    handleChange(index, 'numerosCheque', newCheques.join(', '));
                                                                }}
                                                                className="text-red-500 hover:text-red-700 px-1"
                                                                tabIndex={-1}
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                {cheques.length < 3 && (
                                                    <Button
                                                        variant="secondary"
                                                        className="px-2 py-1 h-8 text-xs w-full"
                                                        onClick={() => {
                                                            const newCheques = [...cheques, ''];
                                                            handleChange(index, 'numerosCheque', newCheques.join(', '));
                                                        }}
                                                        type="button"
                                                    >
                                                        + Agregar Cheque
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()
                            ) : null}

                            <div className="flex justify-end">
                                {pagos.length > 1 && (
                                    <Button
                                        variant="danger"
                                        className="px-3 py-2"
                                        onClick={() => handleRemovePago(index)}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-4 w-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                        </svg>
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex items-center justify-between">
                <Button variant="secondary" onClick={handleAddPago} disabled={pagos.length >= metodosPago.length}>
                    + Agregar pago
                </Button>

                <div className="text-right">
                    <div className="text-xs text-ink/60 md:text-sm">
                        Total pagos:{' '}
                        <span className="font-semibold text-ink">
                            ${totalPagos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div
                        className={`text-sm ${Math.abs(diferencia) < 0.01 ? 'text-teal' : 'text-accent'
                            }`}
                    >
                        {diferencia === 0
                            ? '✓ Totales coinciden'
                            : diferencia > 0
                                ? `Faltan $${diferencia.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
                                : `Sobran $${Math.abs(diferencia).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
                    </div>
                </div>
            </div>
        </div>
    )
}
