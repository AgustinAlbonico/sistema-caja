import { useState, useEffect, useRef, useCallback } from 'react'
import type { Cliente } from '../hooks/useClientes'
import { Input } from './ui/Input'
import { Loader2, Search, X } from 'lucide-react'
import { fetchWithAuth } from '../lib/api'

interface ClientesSearchSelectProps {
  readonly onSelect: (cliente: Cliente | null) => void
  readonly value?: Cliente | null
  readonly placeholder?: string
  readonly loadOnMount?: boolean
}

export function ClientesSearchSelect({
  onSelect,
  value,
  placeholder = 'Buscar cliente...',
  loadOnMount = false,
}: ClientesSearchSelectProps) {
  const [query, setQuery] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Debounce para la búsqueda
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cargar todos los clientes al montar si loadOnMount es true
  useEffect(() => {
    if (loadOnMount && clientes.length === 0) {
      const loadAllClientes = async () => {
        setLoading(true)
        try {
          const response = await fetchWithAuth('/clientes?limit=100')
          if (!response.ok) {
            throw new Error('Error al cargar clientes')
          }
          const data = await response.json()
          setClientes(data.data || [])
        } catch (err) {
          console.error('Error loading all clients:', err)
          setClientes([])
        } finally {
          setLoading(false)
        }
      }
      loadAllClientes()
    }
  }, [loadOnMount])

  const searchClientes = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      // Si loadOnMount es true, no limpiar clientes (mantener lista completa)
      if (!loadOnMount) {
        setClientes([])
      }
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const response = await fetchWithAuth(`/clientes/search?q=${encodeURIComponent(searchQuery)}`)
      if (!response.ok) {
        throw new Error('Error al buscar clientes')
      }
      const data = await response.json()
      setClientes(data)
    } catch (err) {
      console.error('Error searching clients:', err)
      setClientes([])
    } finally {
      setLoading(false)
    }
  }, [loadOnMount])

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (query && !value) {
      setLoading(true); // Mostrar loading inmediatamente al escribir
      debounceRef.current = setTimeout(() => {
        searchClientes(query)
      }, 300)
    } else {
      setLoading(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, searchClientes, value])

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (cliente: Cliente) => {
    onSelect(cliente)
    setQuery('')
    setIsOpen(false)
  }

  const handleClear = () => {
    onSelect(null)
    setQuery('')
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }

  const handleFocus = () => {
    setIsOpen(true)
    if (query && !value) {
      searchClientes(query)
    } else if (!query && !value && loadOnMount && clientes.length > 0) {
      // Mostrar clientes pre-cargados al hacer focus
      setIsOpen(true)
    }
  }

  return (
    <div ref={containerRef} className="relative group">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">
          <Search className="h-4 w-4" />
        </div>
        <Input
          ref={inputRef}
          value={value ? `${value.nombre} (${value.localidad || 'Sin localidad'})` : query}
          onChange={(e) => {
            if (!value) {
              setQuery(e.target.value)
              setIsOpen(true)
            }
          }}
          onFocus={handleFocus}
          placeholder={value ? undefined : placeholder}
          className={`h-9 pl-9 w-full transition-all duration-200 md:h-10 ${value ? 'pr-9 bg-brand-50/50 border-brand-200 text-brand-900 font-medium' : ''}`}
          disabled={!!value}
        />

        {/* Right Icon: Loader or Clear */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
          ) : value ? (
            <button
              onClick={handleClear}
              className="text-brand-400 hover:text-brand-600 rounded-full p-0.5 hover:bg-brand-100 transition-colors"
              type="button"
              aria-label="Limpiar selección"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {isOpen && !value && (
        <div className="absolute z-50 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-surface-200 bg-white shadow-elevated animate-in fade-in zoom-in-95 duration-100 md:max-h-64">
          {loading && clientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-sm text-ink-400">
              {/* Loader is already in input, but we can show something here too or keep it clean */}
              <p>Buscando coincidencias...</p>
            </div>
          ) : clientes.length > 0 ? (
            <ul className="py-1">
              <div className="px-3 py-2 text-xs font-semibold text-ink-400 uppercase tracking-wider bg-surface-50/50">
                {query ? 'Resultados de búsqueda' : 'Clientes'}
              </div>
              {clientes.map((cliente) => (
                <li
                  key={cliente.idCliente}
                  className="cursor-pointer px-4 py-3 hover:bg-surface-50 transition-colors flex flex-col gap-0.5"
                  onClick={() => handleSelect(cliente)}
                >
                  <div className="text-sm font-medium text-ink-900">{cliente.nombre}</div>
                  <div className="text-xs text-ink-500 flex items-center gap-2">
                    {cliente.localidad && <span>📍 {cliente.localidad}</span>}
                    {cliente.cuit && <span>🆔 {cliente.cuit}</span>}
                  </div>
                </li>
              ))}
            </ul>
          ) : query ? (
            <div className="flex flex-col items-center justify-center py-6 text-center px-4">
              <div className="bg-surface-100 p-2 rounded-full mb-2">
                <Search className="h-5 w-5 text-ink-400" />
              </div>
              <p className="text-sm font-medium text-ink-900">No encontramos a nadie</p>
              <p className="text-xs text-ink-500 mt-1">Intenta con otro nombre o crea un cliente nuevo.</p>
            </div>
          ) : loadOnMount ? (
            <div className="flex flex-col items-center justify-center py-6 text-center px-4">
              <div className="bg-surface-100 p-2 rounded-full mb-2">
                <Search className="h-5 w-5 text-ink-400" />
              </div>
              <p className="text-sm font-medium text-ink-900">No hay clientes disponibles</p>
              <p className="text-xs text-ink-500 mt-1">Crea un nuevo cliente para comenzar.</p>
            </div>
          ) : (
            <div className="px-4 py-3 text-xs text-ink-400 text-center">
              Escribe el nombre para buscar...
            </div>
          )}
        </div>
      )}
    </div>
  )
}
