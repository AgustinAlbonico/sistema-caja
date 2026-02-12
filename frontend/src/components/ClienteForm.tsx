import { useState, useEffect } from 'react'
import type { Cliente, CreateClienteDto } from '../hooks/useClientes'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Select } from './ui/Select'

interface ClienteFormProps {
    onSubmit: (cliente: CreateClienteDto) => Promise<void>
    initialValues?: Partial<Cliente>
    onCancel?: () => void
    isLoading?: boolean
}

const initialFormState: CreateClienteDto = {
    nombre: '',
    localidad: '',
    direccion: '',
    codPostal: '',
    telefono: '',
    cuit: '',
    categoria: 'Monotributista',
    provincia: '',
}

const CATEGORIAS = [
    { value: 'Monotributista', label: 'Monotributista' },
    { value: 'Responsable Inscripto', label: 'Responsable Inscripto' },
    { value: 'Exento', label: 'Exento' },
    { value: 'Consumidor Final', label: 'Consumidor Final' },
]

export function ClienteForm({
    onSubmit,
    initialValues,
    onCancel,
    isLoading,
}: ClienteFormProps) {
    const [formData, setFormData] = useState<CreateClienteDto>(initialFormState)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [submitError, setSubmitError] = useState<string | null>(null)

    useEffect(() => {
        if (initialValues) {
            setFormData({
                nombre: initialValues.nombre || '',
                localidad: initialValues.localidad || '',
                direccion: initialValues.direccion || '',
                codPostal: initialValues.codPostal || '',
                telefono: initialValues.telefono || '',
                cuit: initialValues.cuit || '',
                categoria: initialValues.categoria || '',
                provincia: initialValues.provincia || '',
            })
        }
    }, [initialValues])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }))
        }
    }

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {}

        if (!formData.nombre.trim()) {
            newErrors.nombre = 'El nombre es obligatorio'
        }

        if (!formData.categoria) {
            newErrors.categoria = 'La categoría es obligatoria'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (validate()) {
            setSubmitError(null)
            try {
                await onSubmit(formData)
            } catch (err) {
                setSubmitError(err instanceof Error ? err.message : 'Error al guardar cliente')
            }
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input
                label="Nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                error={errors.nombre}
                required
                placeholder="Nombre del cliente"
            />

            <div className="grid gap-4 md:grid-cols-2">
                <Input
                    label="Localidad"
                    name="localidad"
                    value={formData.localidad}
                    onChange={handleChange}
                    placeholder="Localidad"
                />

                <Input
                    label="Dirección"
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleChange}
                    placeholder="Dirección"
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Input
                    label="Código Postal"
                    name="codPostal"
                    value={formData.codPostal}
                    onChange={handleChange}
                    placeholder="Código postal"
                />

                <Input
                    label="Provincia"
                    name="provincia"
                    value={formData.provincia}
                    onChange={handleChange}
                    placeholder="Provincia"
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Input
                    label="Teléfono"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                    placeholder="Teléfono"
                />

                <Input
                    label="CUIT"
                    name="cuit"
                    value={formData.cuit}
                    onChange={handleChange}
                    placeholder="CUIT/CUIL"
                />
            </div>

            <Select
                label="Categoría"
                name="categoria"
                value={formData.categoria}
                onChange={handleChange}
                options={CATEGORIAS}
                required
                error={errors.categoria}
            />

            <div className="flex gap-3 pt-4">
                <Button type="submit" isLoading={isLoading}>
                    {initialValues?.idCliente ? 'Actualizar' : 'Crear'} Cliente
                </Button>
                {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancelar
                    </Button>
                )}
            </div>

            {submitError && (
                <p className="text-sm text-red-600">{submitError}</p>
            )}
        </form>
    )
}
