import { useState, useEffect } from 'react'
import { useMetodosPago } from '../hooks/useMetodosPago'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Plus, Trash2 } from 'lucide-react'
import { GastoDescripcionInput } from './GastoDescripcionInput'

export interface GastoPago {
  idMetodoPago: number
  importe: string
  numerosCheque?: string
}

export interface GastoFormData {
  descripcion: string
  importe: string
  fecha: string
  pagos: GastoPago[]
}

interface GastoFormProps {
  fecha: string
  onSubmit: (data: GastoFormData) => void
  onCancel: () => void
  isLoading?: boolean
  /** Datos iniciales para modo edición */
  initialData?: {
    descripcion: string
    pagos: GastoPago[]
  }
  /** Texto del botón de submit (por defecto: "Registrar Egreso") */
  submitLabel?: string
}

export function GastoForm({ fecha, onSubmit, onCancel, isLoading, initialData, submitLabel = 'Registrar Egreso' }: GastoFormProps) {
  const { metodosPago } = useMetodosPago()
  const [descripcion, setDescripcion] = useState(initialData?.descripcion || '')
  const [pagos, setPagos] = useState<GastoPago[]>(
    initialData?.pagos || [{ idMetodoPago: 0, importe: '0' }]
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    // Solo inicializar el método de pago por defecto si no hay datos iniciales
    if (metodosPago.length > 0 && !initialized && !initialData) {
      const metodoEfectivo = metodosPago.find((m) => m.nombre.toLowerCase().includes('efectivo'))
      setPagos((prev) =>
        prev.map((p, i) =>
          i === 0 && p.idMetodoPago === 0
            ? { ...p, idMetodoPago: metodoEfectivo?.idMetodoPago || metodosPago[0].idMetodoPago }
            : p
        )
      )
      setInitialized(true)
    }
  }, [metodosPago, initialized, initialData])

  const totalPagos = pagos.reduce((sum, p) => sum + (Number(p.importe) || 0), 0)

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!descripcion.trim()) {
      newErrors.descripcion = 'La descripción es obligatoria'
    }

    if (totalPagos <= 0) {
      newErrors.total = 'El importe total debe ser mayor a 0'
    }

    if (pagos.some((p) => p.idMetodoPago === 0)) {
      newErrors.pagos = 'Debe seleccionar un método de pago para cada línea'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    onSubmit({
      descripcion,
      importe: totalPagos.toFixed(2),
      fecha,
      pagos,
    })
  }

  const handleAddPago = () => {
    const metodoEfectivo = metodosPago.find((m) => m.nombre.toLowerCase().includes('efectivo'))
    const metodoDefault = metodoEfectivo?.idMetodoPago || metodosPago[0]?.idMetodoPago || 0
    setPagos([...pagos, { idMetodoPago: metodoDefault, importe: '0' }])
  }

  const handleRemovePago = (index: number) => {
    if (pagos.length > 1) {
      const newPagos = [...pagos]
      newPagos.splice(index, 1)
      setPagos(newPagos)
    }
  }

  const handleChangePago = (
    index: number,
    field: keyof GastoPago,
    value: string | number
  ) => {
    const newPagos = [...pagos]
    newPagos[index] = {
      ...newPagos[index],
      [field]:
        field === 'idMetodoPago'
          ? Number(value)
          : value,
    }
    setPagos(newPagos)
  }

  const metodoOptions = metodosPago
    .filter((m) => m.activo)
    .map((m) => ({
      value: m.idMetodoPago,
      label: m.nombre,
    }))

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <GastoDescripcionInput
        label="Descripción"
        value={descripcion}
        onChange={(val) => setDescripcion(val)}
        placeholder="Ej: Pago de servicios, compra de insumos"
        error={errors.descripcion}
      />

      <div>
        <label className="mb-3 block text-sm font-medium text-ink/80">
          Métodos de Pago
        </label>
        <div className="space-y-3">
          {pagos.map((pago, index) => (
            <div
              key={index}
              className="flex flex-col gap-3 rounded-xl border border-ink/10 bg-white p-3 shadow-soft"
            >
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <Select
                    label={index === 0 ? 'Método de pago' : undefined}
                    value={pago.idMetodoPago}
                    onChange={(e) =>
                      handleChangePago(index, 'idMetodoPago', e.target.value)
                    }
                    options={metodoOptions}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    label={index === 0 ? 'Importe' : undefined}
                    type="number"
                    min={0}
                    step={0.01}
                    value={pago.importe || ''}
                    onChange={(e) =>
                      handleChangePago(index, 'importe', e.target.value)
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>

              {metodosPago.find((m) => m.idMetodoPago === pago.idMetodoPago)?.nombre.toLowerCase().includes('cheque') ? (
                <Input
                  label={index === 0 ? 'Números de Cheque' : undefined}
                  value={pago.numerosCheque || ''}
                  onChange={(e) =>
                    handleChangePago(index, 'numerosCheque', e.target.value)
                  }
                  placeholder="Números de cheque (separados por comas)"
                />
              ) : null}

              <div className="flex justify-end">
                {pagos.length > 1 && (
                  <Button
                    variant="danger"
                    className="px-3 py-2"
                    onClick={() => handleRemovePago(index)}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="secondary"
          className="mt-3"
          onClick={handleAddPago}
        >
          <Plus className="mr-2 h-4 w-4" />
          Agregar método de pago
        </Button>

        {errors.pagos && (
          <p className="mt-2 text-sm text-red-500">{errors.pagos}</p>
        )}
      </div>

      <div className="rounded-xl bg-paper p-3.5 md:p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink/60">Importe Total:</span>
          <span className="text-lg font-bold text-ink md:text-xl">
            ${totalPagos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        {errors.total && (
          <p className="mt-2 text-sm text-red-500">{errors.total}</p>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          isLoading={isLoading}
          disabled={!descripcion.trim() || totalPagos <= 0}
        >
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
