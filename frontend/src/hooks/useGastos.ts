import { useState, useEffect, useCallback } from 'react'
import { fetchWithAuth } from '@/lib/api'

export interface GastoPago {
  idMetodoPago: number
  importe: string
  numerosCheque?: string
}

export interface Gasto {
  idGasto: number
  descripcion: string | null
  importe: string
  fecha: string
  createdAt: string
  pagos: {
    idGastoPago: number
    idMetodoPago: number
    importe: string
    numerosCheque: string | null
    metodoPago: {
      idMetodoPago: number
      nombre: string
    }
  }[]
}

export interface CreateGastoDto {
  descripcion?: string
  importe: string
  fecha: string
  pagos: GastoPago[]
}

export interface UpdateGastoDto {
  descripcion?: string
  importe?: string
  fecha?: string
  pagos?: GastoPago[]
}

export function useGastos() {
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGastos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchWithAuth('/gastos')
      if (!response.ok) {
        throw new Error('Error al cargar gastos')
      }
      const data = await response.json()
      setGastos(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchGasto = useCallback(async (idGasto: number): Promise<Gasto> => {
    const response = await fetchWithAuth(`/gastos/${idGasto}`)
    if (!response.ok) {
      throw new Error('Error al cargar el gasto')
    }
    return response.json()
  }, [])

  const createGasto = useCallback(async (dto: CreateGastoDto): Promise<Gasto> => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchWithAuth('/gastos', {
        method: 'POST',
        body: JSON.stringify(dto),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al crear gasto')
      }
      const newGasto = await response.json()
      setGastos((prev) => [newGasto, ...prev])
      return newGasto
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateGasto = useCallback(async (idGasto: number, dto: UpdateGastoDto): Promise<Gasto> => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchWithAuth(`/gastos/${idGasto}`, {
        method: 'PUT',
        body: JSON.stringify(dto),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al actualizar gasto')
      }
      const updatedGasto = await response.json()
      setGastos((prev) =>
        prev.map((g) => (g.idGasto === idGasto ? updatedGasto : g))
      )
      return updatedGasto
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteGasto = useCallback(async (idGasto: number): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchWithAuth(`/gastos/${idGasto}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al eliminar gasto')
      }
      setGastos((prev) => prev.filter((g) => g.idGasto !== idGasto))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGastos()
  }, [fetchGastos])

  return {
    gastos,
    loading,
    error,
    fetchGastos,
    fetchGasto,
    createGasto,
    updateGasto,
    deleteGasto,
  }
}
