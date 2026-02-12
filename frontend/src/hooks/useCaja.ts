import { useState, useCallback } from 'react'
import { fetchWithAuth } from '@/lib/api'

export interface MovimientoCaja {
  idMovimientoCaja: number
  tipo: 'ingreso' | 'egreso'
  concepto: string
  importe: number
  saldoAcumulado: number
  fecha: string
  metodoPago?: {
    idMetodoPago: number
    nombre: string
  }
  recibo?: {
    idRecibo: number
    nroComprobante: number
    cliente?: {
      nombre: string
    }
  }
  gasto?: {
    idGasto: number
    descripcion: string
  }
}

export interface Usuario {
  idUsuario: number
  nombreUsuario: string
  nombreCompleto: string
}

export interface CajaDiaria {
  idCajaDiaria: number
  fecha: string
  saldoInicial: string
  saldoFinal: string | null
  cerrada: boolean
  fechaCierre: Date | null
  usuarioApertura?: Usuario
  usuarioCierre?: Usuario
}

 export interface ResumenCaja {
   caja: CajaDiaria
   movimientos: MovimientoCaja[]
   ingresos: string
   egresos: string
   saldoFinal: string
   total: number
   page: number
   limit: number
   lastPage: number
 }

export interface AbrirCajaDto {
  fecha: string
  saldoInicial?: string
  idUsuarioApertura: number
}

export interface CerrarCajaDto {
  fecha: string
  saldoFinal?: string
  idUsuarioCierre: number
}

export interface ReabrirCajaDto {
  fecha: string
}

export interface VerificarPendientesResponse {
  pendientes: CajaDiaria[]
  cantidad: number
}

export interface CerrarAutomaticamenteResponse {
  cerradas: CajaDiaria[]
  cantidad: number
  mensaje: string
}

export function useCaja() {
  const [resumen, setResumen] = useState<ResumenCaja | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchResumen = useCallback(
    async (fecha: string, page?: number, limit?: number) => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (page) params.append('page', page.toString())
        if (limit) params.append('limit', limit.toString())

        const url = `/caja-diaria/${fecha}${
          params.toString() ? `?${params.toString()}` : ''
        }`

        const response = await fetchWithAuth(url)
        if (!response.ok) {
          throw new Error('Error al cargar resumen de caja')
        }
        const data = await response.json()
        setResumen(data)
        return data
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
        setResumen(null)
        throw err
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const abrirCaja = useCallback(async (dto: AbrirCajaDto): Promise<CajaDiaria> => {
    setLoading(true)
    setError(null)
    try {
const response = await fetchWithAuth('/caja-diaria/abrir', {
      method: 'POST',
      body: JSON.stringify(dto),
    })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al abrir caja')
      }
      const caja = await response.json()
      return caja
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const cerrarCaja = useCallback(async (dto: CerrarCajaDto): Promise<CajaDiaria> => {
    setLoading(true)
    setError(null)
    try {
const response = await fetchWithAuth('/caja-diaria/cerrar', {
  method: 'POST',
  body: JSON.stringify(dto),
})
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al cerrar caja')
      }
      const caja = await response.json()
      return caja
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const reabrirCaja = useCallback(async (dto: ReabrirCajaDto): Promise<CajaDiaria> => {
    setLoading(true)
    setError(null)
    try {
const response = await fetchWithAuth('/caja-diaria/reabrir', {
  method: 'POST',
  body: JSON.stringify(dto),
})
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al reabrir caja')
      }
      const caja = await response.json()
      return caja
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const verificarCajasPendientes = useCallback(
    async (fechaHoy: string): Promise<VerificarPendientesResponse> => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetchWithAuth(`/caja-diaria/verificar-pendientes/${fechaHoy}`)
        if (!response.ok) {
          throw new Error('Error al verificar cajas pendientes')
        }
        const data = await response.json()
        return data
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
        throw err
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const cerrarCajasAutomaticamente = useCallback(
    async (): Promise<CerrarAutomaticamenteResponse> => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetchWithAuth('/caja-diaria/cerrar-automaticamente', {
          method: 'POST',
        })
        if (!response.ok) {
          throw new Error('Error al cerrar cajas automáticamente')
        }
        const data = await response.json()
        return data
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
        throw err
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  return {
    resumen,
    loading,
    error,
    fetchResumen,
    abrirCaja,
    cerrarCaja,
    reabrirCaja,
    verificarCajasPendientes,
    cerrarCajasAutomaticamente,
  }
}
