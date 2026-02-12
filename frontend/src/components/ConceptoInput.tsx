
import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Trash2 } from 'lucide-react'
import { Input } from './ui/Input'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { fetchWithAuth } from '../lib/api'

interface Concepto {
    idConcepto: number
    descripcion: string
}

interface ConceptoInputProps {
    readonly value: string
    readonly onChange: (value: string) => void
    readonly label?: string
    readonly placeholder?: string
    readonly className?: string
    readonly inputClassName?: string
    readonly error?: string
}

export function ConceptoInput({
    value,
    onChange,
    label,
    placeholder,
    className,
    inputClassName,
    error
}: ConceptoInputProps) {
    const [suggestions, setSuggestions] = useState<Concepto[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [conceptToDelete, setConceptToDelete] = useState<Concepto | null>(null)
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
        try {
            const url = query ? `/conceptos?q=${encodeURIComponent(query)}` : '/conceptos';
            const response = await fetchWithAuth(url)
            if (response.ok) {
                const data = await response.json()
                setSuggestions(data)
                // Solo mostrar si hay resultados o si no hay query (lista inicial)
                if (data.length > 0) {
                    // Mantener cerrado si no se ha pedido abrir explícitamente, pero aquí actualizamos data
                }
            }
        } catch (error) {
            console.error('Error fetching suggestions:', error)
        }
    }

    // Efecto debounced solo para cuando escribe
    useEffect(() => {
        if (!showSuggestions && value.length > 0) return; // Evitar fetch innecesario si está cerrado

        const timeoutId = setTimeout(() => {
            fetchSuggestions(value)
        }, 300)
        return () => clearTimeout(timeoutId)
    }, [value])

    const handleFocus = () => {
        fetchSuggestions(value)
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

    const handleDeleteClick = (e: React.MouseEvent, concepto: Concepto) => {
        e.stopPropagation(); // Evitar seleccionar el concepto al hacer click en borrar
        setConceptToDelete(concepto);
        setShowSuggestions(false); // Cerrar dropdown para mostrar modal
    }

    const confirmDelete = async () => {
        if (!conceptToDelete) return;

        try {
            const response = await fetchWithAuth(`/conceptos/${conceptToDelete.idConcepto}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Actualizar la lista local quitando el eliminado
                setSuggestions(prev => prev.filter(c => c.idConcepto !== conceptToDelete.idConcepto));
                // Si el valor actual era el eliminado, quizás limpiarlo, pero mejor dejarlo como texto libre
            } else {
                console.error("Error al eliminar concepto");
            }
        } catch (error) {
            console.error("Error deleting concept:", error);
        } finally {
            setConceptToDelete(null);
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

                {showSuggestions && suggestions.length > 0 && (
                    <ul className="absolute z-50 w-full mt-1 bg-white border border-surface-200 rounded-lg shadow-lg max-h-60 overflow-auto py-1 animate-in fade-in zoom-in-95 duration-100">
                        {suggestions.map((concepto) => (
                            <li
                                key={concepto.idConcepto}
                                className="group flex items-center justify-between px-4 py-2 hover:bg-surface-50 cursor-pointer text-sm text-ink-700 transition-colors focus:bg-surface-50 focus:outline-none"
                                onClick={() => handleSelect(concepto.descripcion)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        handleSelect(concepto.descripcion)
                                    }
                                }}
                                tabIndex={0}
                            >
                                <span className="flex-1">{concepto.descripcion}</span>
                                <button
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-ink-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all focus:opacity-100"
                                    onClick={(e) => handleDeleteClick(e, concepto)}
                                    title="Eliminar concepto"
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
                isOpen={!!conceptToDelete}
                onClose={() => setConceptToDelete(null)}
                title="Eliminar Concepto"
            >
                <div className="space-y-4 pt-2">
                    <p className="text-ink-600">
                        ¿Está seguro que desea eliminar el concepto <span className="font-semibold text-ink-900">"{conceptToDelete?.descripcion}"</span>?
                    </p>
                    <p className="text-xs text-ink-400 bg-surface-50 p-3 rounded-lg border border-surface-100">
                        Esta acción no modificará los recibos históricos que usen este concepto, pero ya no aparecerá en las sugerencias de autocompletado futuras.
                    </p>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setConceptToDelete(null)}
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
