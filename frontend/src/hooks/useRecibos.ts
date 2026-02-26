import { useState, useEffect, useCallback } from 'react'

import { fetchWithAuth } from '../lib/api'

export interface ReciboItem {
  descripcion: string
  mesComprobante: number
  anioComprobante: number
  importe: string
}

export interface ReciboPago {
  idMetodoPago: number
  importe: string
  numerosCheque?: string
}

export interface Recibo {
  idRecibo: number
  idCliente: number
  nroComprobante: number
  fechaEmision: string
  total: number
  cliente?: {
    idCliente: number
    nombre: string
  }
  items?: ReciboItem[]
  pagos?: ReciboPago[]
}

export interface CreateReciboDto {
  idCliente: number
  nroComprobante: number
  items: ReciboItem[]
  pagos: ReciboPago[]
}

export interface MetodoPago {
  idMetodoPago: number
  nombre: string
}

import { startOfMonth, endOfMonth, format } from 'date-fns';

export function useRecibos(options?: { autoFetch?: boolean; idCliente?: number }) {
  const [recibos, setRecibos] = useState<Recibo[]>([])
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pagination & Filtering
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState(options?.idCliente ? '' : format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(options?.idCliente ? '' : format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const fetchRecibos = useCallback(async (filters?: { idCliente?: number }) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      const filterId = filters?.idCliente ?? options?.idCliente

      // API Pagination & Filters
      params.append('page', page.toString())
      params.append('limit', limit.toString())
      if (search) params.append('q', search)
      if (filterId) {
        params.append('idCliente', filterId.toString())
      }

      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const queryString = params.toString()
      const response = await fetchWithAuth(`/recibos${queryString ? `?${queryString}` : ''}`)
      if (!response.ok) {
        throw new Error('Error al cargar recibos')
      }
      const result = await response.json()

      // Handle both paginated and non-paginated responses (if backend changed)
      if (result.data) {
        setRecibos(result.data)
        setTotal(result.total)
        setTotalPages(result.lastPage)
      } else {
        // Fallback if backend returns array directly (shouldn't happen with our recent change)
        setRecibos(result)
        setTotal(result.length)
        setTotalPages(1)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [options?.idCliente, page, limit, search, startDate, endDate])

  const fetchMetodosPago = useCallback(async () => {
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
      console.error('Error fetching payment methods:', err)
    }
  }, [])

  const createRecibo = useCallback(async (recibo: CreateReciboDto): Promise<Recibo> => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchWithAuth('/recibos', {
        method: 'POST',
        body: JSON.stringify(recibo),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al crear recibo')
      }
      const newRecibo = await response.json()

      // Refresh list to show new receipt in correct order/page
      fetchRecibos()

      return newRecibo
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [fetchRecibos])

  /**
   * Genera y abre el PDF de un recibo en una nueva pestaña
   */
  const [pdfLoading, setPdfLoading] = useState<number | null>(null) // ID of invoice being generated

  // ...

  /**
   * Genera y abre el PDF de un recibo en el navegador del sistema
   */
  const generarPdfRecibo = useCallback(async (idRecibo: number) => {
    setPdfLoading(idRecibo)
    try {
      const response = await fetchWithAuth(`/recibos/${idRecibo}/pdf`)
      if (!response.ok) throw new Error('Error al generar PDF')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 60000)

    } catch (err) {
      console.error('Error al generar PDF:', err)
      throw err
    } finally {
      setPdfLoading(null)
    }
  }, [])

  const anularUltimoRecibo = useCallback(async (): Promise<{ reciboAnulado: number; nroComprobante: number }> => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchWithAuth('/recibos/ultimo', {
        method: 'DELETE',
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al anular el último recibo')
      }
      const result = await response.json()

      // Refrescar lista para reflejar el cambio
      fetchRecibos()

      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [fetchRecibos])

  const fetchUltimoRecibo = useCallback(async (): Promise<Recibo | null> => {
    try {
      const response = await fetchWithAuth('/recibos/ultimo')
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error('Error al obtener el último recibo')
      }
      return await response.json()
    } catch (err) {
      console.error('Error fetching ultimo recibo:', err)
      return null
    }
  }, [])

  /**
   * Elimina un recibo sin modificar el contador de números correlativos.
   * Útil para eliminar recibos antiguos.
   */
  const eliminarRecibo = useCallback(async (idRecibo: number): Promise<{ reciboEliminado: number; nroComprobante: number }> => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchWithAuth(`/recibos/${idRecibo}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al eliminar el recibo')
      }
      const result = await response.json()

      // Refrescar lista para reflejar el cambio
      fetchRecibos()

      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [fetchRecibos])



  useEffect(() => {
    if (options?.autoFetch !== false) {
      fetchRecibos()
    }
    fetchMetodosPago()
  }, [fetchRecibos, fetchMetodosPago, options?.autoFetch])

  // Reset page to 1 when filters change
  const setLimitWithReset = useCallback((l: number) => { setLimit(l); setPage(1); }, [])
  const setSearchWithReset = useCallback((s: string) => { setSearch(s); setPage(1); }, [])
  const setStartDateWithReset = useCallback((d: string) => { setStartDate(d); setPage(1); }, [])
  const setEndDateWithReset = useCallback((d: string) => { setEndDate(d); setPage(1); }, [])

  return {
    recibos,
    metodosPago,
    loading,
    error,
    fetchRecibos,
    fetchMetodosPago,
    createRecibo,
    generarPdfRecibo,
    pdfLoading,
    anularUltimoRecibo,
    fetchUltimoRecibo,
    eliminarRecibo,
    // Pagination & Filters
    page,
    setPage,
    limit,
    setLimit: setLimitWithReset,
    totalPages,
    total,
    search,
    setSearch: setSearchWithReset,
    startDate,
    setStartDate: setStartDateWithReset,
    endDate,
    setEndDate: setEndDateWithReset,
  }
}
