
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { ConceptoInput } from './ConceptoInput'

export interface Linea {
  descripcion: string
  mesComprobante: number
  anioComprobante: number
  importe: number
}

interface ReciboLineasProps {
  lineas: Linea[]
  onChange: (lineas: Linea[]) => void
  errors?: Record<number, Record<string, string>>
}

export function ReciboLineas({ lineas, onChange, errors = {} }: ReciboLineasProps) {
  const handleAddLinea = () => {
    if (lineas.length >= 5) return

    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    onChange([
      ...lineas,
      {
        descripcion: '',
        mesComprobante: lastMonth.getMonth() + 1,
        anioComprobante: lastMonth.getFullYear(),
        importe: 0,
      },
    ])
  }

  const handleRemoveLinea = (index: number) => {
    if (lineas.length > 1) {
      const newLineas = [...lineas]
      newLineas.splice(index, 1)
      onChange(newLineas)
    }
  }

  const handleChange = (index: number, field: keyof Linea, value: string | number) => {
    const newLineas = [...lineas]
    newLineas[index] = {
      ...newLineas[index],
      [field]: field === 'descripcion' ? value : Number(value),
    }
    onChange(newLineas)
  }

  const total = lineas.reduce((sum, linea) => sum + (Number(linea.importe) || 0), 0)

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        {lineas.map((linea, index) => (
          <div
            key={index}
            className="rounded-xl border border-ink/10 bg-white p-2.5 shadow-soft md:p-3"
          >
            <div className="flex flex-col gap-2 sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
              <div className="flex-1 min-w-[200px]">
                <ConceptoInput
                  label={index === 0 ? 'Descripción' : undefined}
                  className="text-sm"
                  value={linea.descripcion}
                  onChange={(val) => handleChange(index, 'descripcion', val)}
                  placeholder="Descripción del concepto"
                />
              </div>

              <div className="w-20">
                <Input
                  label={index === 0 ? 'Mes' : undefined}
                  type="number"
                  min={1}
                  max={12}
                  className="text-sm"
                  value={linea.mesComprobante}
                  onChange={(e) => handleChange(index, 'mesComprobante', e.target.value)}
                  error={errors[index]?.mesComprobante}
                />
              </div>

              <div className="w-24">
                <Input
                  label={index === 0 ? 'Año' : undefined}
                  type="number"
                  min={2000}
                  max={2100}
                  className="text-sm"
                  value={linea.anioComprobante}
                  onChange={(e) => handleChange(index, 'anioComprobante', e.target.value)}
                  error={errors[index]?.anioComprobante}
                />
              </div>

              <div className="w-28">
                <Input
                  label={index === 0 ? 'Importe' : undefined}
                  type="number"
                  min={0}
                  step={0.01}
                  className="text-sm"
                  value={linea.importe || ''}
                  onChange={(e) => handleChange(index, 'importe', e.target.value)}
                  error={errors[index]?.importe}
                />
              </div>

              <div className="flex items-end">
                {lineas.length > 1 && (
                  <Button
                    variant="danger"
                    className="px-2 py-2"
                    onClick={() => handleRemoveLinea(index)}
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
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={handleAddLinea} disabled={lineas.length >= 5}>
          + Agregar línea ({lineas.length}/5)
        </Button>

        <div className="text-right">
          <span className="text-sm text-ink/60">Total: </span>
          <span className="text-base font-semibold md:text-lg">
            ${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  )
}
