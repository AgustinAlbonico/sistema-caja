import { useState, useEffect, useCallback } from 'react'

import { writeConfig, configExists, type AppConfig } from '@/lib/app-config-client'

/**
 * Hook personalizado para gestionar la configuración de la aplicación
 * Lee/escribe config.json a través del backend en modo setup
 */
export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [hasConfig, setHasConfig] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar configuración al montar el componente
  useEffect(() => {
    loadConfig()
  }, [])

  /**
   * Carga la configuración persistida por el backend
   */
  const loadConfig = async () => {
    setLoading(true)
    setError(null)

    try {
      // Primero verificar si existe el archivo
      const exists = await configExists()
      setHasConfig(exists)

      if (!exists) {
        setConfig(null)
        return
      }

      // En modo normal el endpoint /api/config/current puede no estar disponible.
      // Para evitar errores 404 en consola, nos quedamos con el indicador de existencia.
      setConfig(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar configuración'
      console.error('[useAppConfig] Error:', errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Guarda una nueva configuración
   * @param newConfig Configuración a guardar
   */
  const saveConfig = useCallback(async (newConfig: AppConfig): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      await writeConfig(newConfig)
      setConfig(newConfig)
      setHasConfig(true)
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al guardar configuración'
      console.error('[useAppConfig] Error:', errorMessage)
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    config,
    loading,
    error,
    hasConfig,
    loadConfig,
    saveConfig,
  }
}
