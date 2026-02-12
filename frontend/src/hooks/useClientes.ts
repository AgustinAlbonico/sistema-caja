import { useState, useEffect, useCallback } from 'react'

import { fetchWithAuth } from '@/lib/api'

export interface Cliente {
    idCliente: number
    nombre: string
    localidad?: string
    direccion?: string
    codPostal?: string
    telefono?: string
    cuit?: string
    categoria?: string
    provincia?: string
}

export interface CreateClienteDto {
    nombre: string
    localidad?: string
    direccion?: string
    codPostal?: string
    telefono?: string
    cuit?: string
    categoria?: string
    provincia?: string
}

export function useClientes() {
    const [clientes, setClientes] = useState<Cliente[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Pagination & Search limits
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(10)
    const [search, setSearch] = useState('')
    const [total, setTotal] = useState(0)
    const [totalPages, setTotalPages] = useState(1)

    const fetchClientes = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                q: search
            })
            const response = await fetchWithAuth(`/clientes?${queryParams}`)
            if (!response.ok) {
                throw new Error('Error al cargar clientes')
            }
            const result = await response.json()
            // result structure: { data, total, page, lastPage }
            setClientes(result.data)
            setTotal(result.total)
            setTotalPages(result.lastPage)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido')
        } finally {
            setLoading(false)
        }
    }, [page, limit, search])

    const searchClientes = useCallback(async (query: string) => {
        // Legacy support or autocomplete support
        if (!query.trim()) return []
        try {
            const response = await fetchWithAuth(`/clientes/search?q=${encodeURIComponent(query)}`)
            if (!response.ok) throw new Error('Error al buscar clientes')
            return await response.json()
        } catch (err) {
            console.error('Error searching clients:', err)
            return []
        }
    }, [])

    const createCliente = useCallback(async (cliente: CreateClienteDto): Promise<Cliente> => {
        setLoading(true)
        setError(null)
        try {
            const response = await fetchWithAuth(`/clientes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cliente),
            })
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.message || 'Error al crear cliente')
            }
            const newCliente = await response.json()
            // If we are solely adding to list:
            // setClientes((prev) => [...prev, newCliente]) 
            // But since we are paginated, we should probably refetch or add to top if valid.
            // Easiest is to refetch to ensure correct ordering/pagination.
            fetchClientes()
            return newCliente
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido')
            throw err
        } finally {
            setLoading(false)
        }
    }, [fetchClientes])

    const updateCliente = useCallback(async (id: number, cliente: Partial<CreateClienteDto>): Promise<Cliente> => {
        setLoading(true)
        setError(null)
        try {
            const response = await fetchWithAuth(`/clientes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cliente),
            })
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.message || 'Error al actualizar cliente')
            }
            const updatedCliente = await response.json()
            // Optimistic update
            setClientes((prev) =>
                prev.map((c) => (c.idCliente === id ? updatedCliente : c))
            )
            return updatedCliente
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido')
            throw err
        } finally {
            setLoading(false)
        }
    }, [])

    const deleteCliente = useCallback(async (id: number): Promise<void> => {
        setLoading(true)
        setError(null)
        try {
            const response = await fetchWithAuth(`/clientes/${id}`, {
                method: 'DELETE',
            })
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.message || 'Error al eliminar cliente')
            }
            // Refetch to adjust pagination if needed, or simple local filter
            fetchClientes() // Refetch is safer for pagination counts
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido')
            throw err
        } finally {
            setLoading(false)
        }
    }, [fetchClientes])

    useEffect(() => {
        fetchClientes()
    }, [fetchClientes])

    const handleLimitChange = useCallback((newLimit: number) => {
        setLimit(newLimit)
        setPage(1) // Reset to first page when limit changes
    }, [])

    return {
        clientes,
        loading,
        error,
        fetchClientes,
        searchClientes, // Kept for other uses if any
        createCliente,
        updateCliente,
        deleteCliente,
        // Pagination exposed
        page,
        setPage,
        totalPages,
        limit,
        setLimit: handleLimitChange,
        setSearch,
        search,
        total
    }
}