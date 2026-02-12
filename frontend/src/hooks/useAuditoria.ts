import { useState, useEffect, useCallback } from 'react'

import { fetchWithAuth } from '@/lib/api'

export interface Auditoria {
  idAuditoria: number
  idUsuario: number
  usuario: {
    idUsuario: number
    nombreUsuario: string
    nombreCompleto: string
  }
  accion: string
  entidad: string
  idEntidad: number | null
  detalle: string | null
  fechaAccion: string
}

export interface FiltrosAuditoria {
  idUsuario?: number
  entidad?: string
  accion?: string
  fechaDesde?: string
  fechaHasta?: string
}

export function useAuditoria() {
  const [auditoria, setAuditoria] = useState<Auditoria[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const fetchAuditoria = useCallback(async (filtros?: FiltrosAuditoria) => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', limit.toString())
      
      if (filtros?.idUsuario) params.append('idUsuario', filtros.idUsuario.toString())
      if (filtros?.entidad) params.append('entidad', filtros.entidad)
      if (filtros?.accion) params.append('accion', filtros.accion)
      if (filtros?.fechaDesde) params.append('fechaDesde', filtros.fechaDesde)
      if (filtros?.fechaHasta) params.append('fechaHasta', filtros.fechaHasta)
      
      const queryString = params.toString()
      const response = await fetchWithAuth(`/auditoria${queryString ? `?${queryString}` : ''}`)
      
      if (!response.ok) {
        throw new Error('Error al cargar auditoría')
      }
      
      const result = await response.json()
      setAuditoria(result.data)
      setTotal(result.total)
      setTotalPages(result.lastPage)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [page, limit])

  useEffect(() => {
    fetchAuditoria()
  }, [fetchAuditoria])

  return {
    auditoria,
    loading,
    error,
    fetchAuditoria,
    page,
    setPage,
    limit,
    setLimit,
    total,
    totalPages,
  }
}
