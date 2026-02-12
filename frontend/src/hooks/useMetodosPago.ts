import { useState, useEffect, useCallback } from 'react'
import { fetchWithAuth } from '@/lib/api'

export interface MetodoPago {
  idMetodoPago: number
  nombre: string
  activo: boolean
}

export interface CreateMetodoPagoDto {
  nombre: string
  activo?: boolean
}

export interface UpdateMetodoPagoDto {
  nombre?: string
  activo?: boolean
}

export function useMetodosPago() {
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMetodosPago = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchWithAuth('/metodos-pago')
      if (!response.ok) {
        throw new Error('Error al cargar métodos de pago')
      }
      const data = await response.json()
      // Poner "Efectivo" primero, luego ordenar alfabéticamente el resto
      const efectivo = data.find((m: MetodoPago) => m.nombre.toLowerCase().includes('efectivo'))
      const otros = data.filter((m: MetodoPago) => !m.nombre.toLowerCase().includes('efectivo'))
      const sortedOtros = otros.sort((a: MetodoPago, b: MetodoPago) => a.nombre.localeCompare(b.nombre))
      setMetodosPago(efectivo ? [efectivo, ...sortedOtros] : sortedOtros)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  const createMetodoPago = useCallback(async (dto: CreateMetodoPagoDto): Promise<MetodoPago> => {
    setLoading(true)
    setError(null)
    try {
const response = await fetchWithAuth('/metodos-pago', {
      method: 'POST',
      body: JSON.stringify(dto),
    })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al crear método de pago')
      }
      const newMetodo = await response.json()
      setMetodosPago((prev) => {
        // Poner "Efectivo" primero, luego ordenar alfabéticamente el resto
        const efectivo = [...prev, newMetodo].find(m => m.nombre.toLowerCase().includes('efectivo'))
        const otros = [...prev, newMetodo].filter(m => !m.nombre.toLowerCase().includes('efectivo'))
        const sortedOtros = otros.sort((a: MetodoPago, b: MetodoPago) => a.nombre.localeCompare(b.nombre))
        return efectivo ? [efectivo, ...sortedOtros] : sortedOtros
      })
      return newMetodo
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateMetodoPago = useCallback(async (idMetodoPago: number, dto: UpdateMetodoPagoDto): Promise<MetodoPago> => {
    setLoading(true)
    setError(null)
    try {
const response = await fetchWithAuth(`/metodos-pago/${idMetodoPago}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al actualizar método de pago')
      }
      const updatedMetodo = await response.json()
      setMetodosPago((prev) => {
        // Actualizar el método modificado y luego reordenar
        const updated = prev.map((m) => (m.idMetodoPago === idMetodoPago ? updatedMetodo : m))
        // Poner "Efectivo" primero, luego ordenar alfabéticamente el resto
        const efectivo = updated.find(m => m.nombre.toLowerCase().includes('efectivo'))
        const otros = updated.filter(m => !m.nombre.toLowerCase().includes('efectivo'))
        const sortedOtros = otros.sort((a: MetodoPago, b: MetodoPago) => a.nombre.localeCompare(b.nombre))
        return efectivo ? [efectivo, ...sortedOtros] : sortedOtros
      })
      return updatedMetodo
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteMetodoPago = useCallback(async (idMetodoPago: number): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
const response = await fetchWithAuth(`/metodos-pago/${idMetodoPago}`, {
      method: 'DELETE',
    })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al eliminar método de pago')
      }
      setMetodosPago((prev) => prev.filter((m) => m.idMetodoPago !== idMetodoPago))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetodosPago()
  }, [fetchMetodosPago])

  return {
    metodosPago,
    loading,
    error,
    fetchMetodosPago,
    createMetodoPago,
    updateMetodoPago,
    deleteMetodoPago,
  }
}
