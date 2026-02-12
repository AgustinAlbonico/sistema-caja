import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Trash2 } from 'lucide-react'
import { Input } from './ui/Input'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { fetchWithAuth } from '../lib/api'

interface GastoDescripcion {
    idGastoDescripcion: number
    descripcion: string
}

interface GastoDescripcionInputProps {
    readonly value: string
    readonly onChange: (value: string) => void
    readonly label?: string
    readonly placeholder?: string
    readonly className?: string
    readonly inputClassName?: string
    readonly error?: string
}

export function GastoDescripcionInput({
    value,
    onChange,
    label,
    placeholder,
    className,
    inputClassName,
    error
}: GastoDescripcionInputProps) {
    const [suggestions, setSuggestions] = useState<GastoDescripcion[]>([])
    const [suggestionsEnabled, setSuggestionsEnabled] = useState(true)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [descripcionToDelete, setDescripcionToDelete] = useState<GastoDescripcion | null>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const fetchSuggestions = async (query: string = '') => {
        if (!suggestionsEnabled) {
            return
        }

        const normalizedQuery = query.trim()
        if (normalizedQuery.length < 2) {
            setSuggestions([])
            return
        }

        try {
            const url = `/gasto-descripciones?q=${encodeURIComponent(normalizedQuery)}`
            const response = await fetchWithAuth(url)

            if (response.ok) {
                const data = await response.json()
                setSuggestions(data)
                return
            }

            setSuggestions([])

            if (response.status >= 500 || response.status === 404 || response.status === 405 || response.status === 501) {
                setSuggestionsEnabled(false)
            }
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                return
            }

            console.error('Error fetching suggestions:', error)
        }
    }

    useEffect(() => {
        if (!showSuggestions) return

        const timeoutId = setTimeout(() => {
            fetchSuggestions(value)
        }, 300)
        return () => clearTimeout(timeoutId)
    }, [showSuggestions, value, suggestionsEnabled])

    const handleFocus = () => {
        setShowSuggestions(true)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value.toUpperCase()
        onChange(newValue)
        setShowSuggestions(true)
    }

    const handleSelect = (descripcion: string) => {
        onChange(descripcion)
        setShowSuggestions(false)
    }

    const toggleDropdown = () => {
        if (showSuggestions) {
            setShowSuggestions(false)
        } else {
            handleFocus()
        }
    }

    const handleDeleteClick = (e: React.MouseEvent, descripcion: GastoDescripcion) => {
        e.stopPropagation();
        setDescripcionToDelete(descripcion);
        setShowSuggestions(false);
    }

    const confirmDelete = async () => {
        if (!descripcionToDelete) return;

        try {
            const response = await fetchWithAuth(`/gasto-descripciones/${descripcionToDelete.idGastoDescripcion}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setSuggestions(prev => prev.filter(d => d.idGastoDescripcion !== descripcionToDelete.idGastoDescripcion));
            } else {
                console.error("Error al eliminar descripción de gasto");
            }
        } catch (error) {
            console.error("Error deleting gasto description:", error);
        } finally {
            setDescripcionToDelete(null);
        }
    }

    return (
        <>
            <div className={`relative ${className}`} ref={wrapperRef}>
                <div className="relative">
                    <Input
                        label={label}
                        value={value}
                        onChange={handleChange}
                        onFocus={handleFocus}
                        placeholder={placeholder}
                        className={`${inputClassName} pr-8`}
                        error={error}
                        autoComplete="off"
                    />
                    <button
                        type="button"
                        className={`absolute right-3 ${label ? 'top-[34px]' : 'top-3'} cursor-pointer text-gray-400 hover:text-gray-600 focus:outline-none`}
                        onClick={toggleDropdown}
                        tabIndex={-1}
                    >
                        <ChevronDown size={16} />
                    </button>
                </div>

                {showSuggestions && suggestionsEnabled && suggestions.length > 0 && (
                    <ul className="absolute z-50 w-full mt-1 bg-white border border-surface-200 rounded-lg shadow-lg max-h-60 overflow-auto py-1 animate-in fade-in zoom-in-95 duration-100">
                        {suggestions.map((descripcion) => (
                            <li
                                key={descripcion.idGastoDescripcion}
                                className="group flex items-center justify-between px-4 py-2 hover:bg-surface-50 cursor-pointer text-sm text-ink-700 transition-colors focus:bg-surface-50 focus:outline-none"
                                onClick={() => handleSelect(descripcion.descripcion)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        handleSelect(descripcion.descripcion)
                                    }
                                }}
                                tabIndex={0}
                            >
                                <span className="flex-1">{descripcion.descripcion}</span>
                                <button
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-ink-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all focus:opacity-100"
                                    onClick={(e) => handleDeleteClick(e, descripcion)}
                                    title="Eliminar descripción"
                                    type="button"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <Modal
                isOpen={!!descripcionToDelete}
                onClose={() => setDescripcionToDelete(null)}
                title="Eliminar Descripción de Gasto"
            >
                <div className="space-y-4 pt-2">
                    <p className="text-ink-600">
                        ¿Está seguro que desea eliminar la descripción <span className="font-semibold text-ink-900">"{descripcionToDelete?.descripcion}"</span>?
                    </p>
                    <p className="text-xs text-ink-400 bg-surface-50 p-3 rounded-lg border border-surface-100">
                        Esta acción no modificará los gastos históricos que usen esta descripción, pero ya no aparecerá en las sugerencias de autocompletado futuras.
                    </p>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setDescripcionToDelete(null)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="danger"
                            onClick={confirmDelete}
                        >
                            Eliminar
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    )
}
