import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Database, Loader2, Server, TestTube2, Save } from 'lucide-react'

import { useAppConfig } from '../hooks/useAppConfig'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

interface FormConfig {
  dbHost: string
  dbPort: number
  dbUsername: string
  dbPassword: string
  dbDatabase: string
  jwtSecret: string
}

export function SetupConfigPage() {
  const navigate = useNavigate()
  const { error: configError, hasConfig, saveConfig } = useAppConfig()

  const [form, setForm] = useState<FormConfig>({
    dbHost: '127.0.0.1',
    dbPort: 5432,
    dbUsername: 'postgres',
    dbPassword: '',
    dbDatabase: 'sistema_caja',
    jwtSecret: ''
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [testSuccess, setTestSuccess] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)
  const [restarting, setRestarting] = useState(false)
  const [allowAutoRedirect, setAllowAutoRedirect] = useState(true)

  // Redirigir si ya existe configuración
  useEffect(() => {
    if (allowAutoRedirect && hasConfig) {
      navigate('/login', { replace: true })
    }
  }, [allowAutoRedirect, hasConfig, navigate])

  // Si el backend no está en modo setup, esta pantalla no corresponde
  useEffect(() => {
    let cancelled = false

    const ensureSetupMode = async () => {
      try {
        const response = await fetch('http://127.0.0.1:47832/api/health', {
          method: 'GET',
          signal: AbortSignal.timeout(3000),
        })

        if (!response.ok) {
          return
        }

        const data = await response.json()
        if (!cancelled && data.status && data.status !== 'setup') {
          navigate('/login', { replace: true })
        }
      } catch {
        // Si el backend no responde aún, no forzar navegación
      }
    }

    ensureSetupMode()

    return () => {
      cancelled = true
    }
  }, [navigate])

  const handleChange = (field: keyof FormConfig, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    // Limpiar mensajes de error y prueba cuando el usuario cambia un campo
    setError(null)
    setTestSuccess(false)
    setTestError(null)
  }

  const validateForm = (): boolean => {
    if (!form.dbHost.trim()) {
      setError('El host de la base de datos es requerido')
      return false
    }
    if (form.dbPort < 1 || form.dbPort > 65535) {
      setError('El puerto debe estar entre 1 y 65535')
      return false
    }
    if (!form.dbUsername.trim()) {
      setError('El usuario de la base de datos es requerido')
      return false
    }
    if (!form.dbDatabase.trim()) {
      setError('El nombre de la base de datos es requerido')
      return false
    }
    if (!form.jwtSecret.trim()) {
      setError('El secreto JWT es requerido')
      return false
    }
    return true
  }

  const testConnection = async () => {
    setError(null)
    setTestSuccess(false)
    setTestError(null)
    setTesting(true)

    try {
      // Intentar conectar al backend en modo setup
      const response = await fetch('http://127.0.0.1:47832/api/config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: form.dbHost,
          port: form.dbPort,
          username: form.dbUsername,
          password: form.dbPassword,
          database: form.dbDatabase
        })
      })

      const data = await response.json()

      if (response.ok) {
        setTestSuccess(true)
        setTestError(null)
      } else {
        if (response.status === 404 && data?.message === 'Cannot POST /api/config/test') {
          setTestSuccess(false)
          setTestError('El backend ya está configurado. Redirigiendo al login...')
          setTimeout(() => {
            navigate('/login', { replace: true })
          }, 800)
          return
        }
        setTestSuccess(false)
        setTestError(data.message || 'Error al conectar con la base de datos')
      }
    } catch {
      setTestSuccess(false)
      setTestError('No se pudo conectar con el backend. Asegúrese de que el servidor backend esté ejecutándose.')
    } finally {
      setTesting(false)
    }
  }

  /**
   * Espera a que el backend NestJS esté listo verificando el endpoint /api/health.
   * Reintenta cada 2 segundos hasta un máximo de intentos.
   */
  const waitForBackendReady = async (maxRetries = 15): Promise<boolean> => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch('http://127.0.0.1:47832/api/health', {
          method: 'GET',
          signal: AbortSignal.timeout(3000),
        })
        const data = await response.json()
        // En modo NestJS el status es 'ok' o 'degraded', en modo setup es 'setup'
        if (data.status && data.status !== 'setup') {
          return true
        }
      } catch {
        // El backend todavía no está listo (puede estar reiniciando)
      }
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    return false
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setAllowAutoRedirect(false)

    setSaving(true)
    setError(null)

    try {
      const newConfig = {
        port: 47832,
        host: '127.0.0.1',
        database: {
          host: form.dbHost,
          port: form.dbPort,
          username: form.dbUsername,
          password: form.dbPassword,
          database: form.dbDatabase
        },
        jwt: {
          secret: form.jwtSecret,
          expiration: '24h'
        },
        schemaVersion: '1.0.0',
        frontendUrl: 'http://127.0.0.1:47832'
      }

      // Paso 1: Guardar config.json en %APPDATA%
      const success = await saveConfig(newConfig)

      if (!success) {
        setError('No se pudo guardar la configuración')
        return
      }

      // Paso 2: Señalizar al setup-server que reinicie con la nueva config
      setRestarting(true)
      try {
        await fetch('http://127.0.0.1:47832/api/config/restart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      } catch {
        // Es esperable que falle porque el servidor se está cerrando
      }

      // Paso 3: Esperar a que NestJS arranque con la nueva configuración
      const backendReady = await waitForBackendReady()

      if (backendReady) {
        navigate('/', { replace: true })
      } else {
        setRestarting(false)
        setError('El backend no pudo arrancar con la configuración proporcionada. Verifique los datos de conexión e intente reiniciar la aplicación.')
      }
    } catch {
      setRestarting(false)
      setError('Ocurrió un error al guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  // Si ya existe configuración, no mostrar nada (la redirección se maneja en useEffect)
  if (hasConfig) {
    return null
  }

  // Pantalla de espera mientras el backend reinicia con la nueva configuración
  if (restarting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-xl text-center md:p-8">
          <Loader2 className="h-12 w-12 text-brand-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-ink-900 mb-2">
            Iniciando el sistema...
          </h2>
          <p className="text-sm text-ink-500">
            Conectando a la base de datos e inicializando tablas. Esto puede tomar unos segundos.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="w-full max-w-2xl bg-white p-6 rounded-2xl shadow-xl md:p-8">
        <div className="flex flex-col items-center text-center mb-6 md:mb-8">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-600 shadow-lg shadow-brand-600/30 md:mb-6 md:h-16 md:w-16">
            <Database className="h-8 w-8 text-white" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-ink-900 md:text-3xl">
            Configuración Inicial
          </h2>
          <p className="mt-2 text-sm text-ink-500 max-w-md md:mt-3 md:text-base">
            Configure la conexión a la base de datos PostgreSQL. Esta configuración se guardará localmente en su sistema.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* Configuración de la base de datos */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Server className="h-5 w-5 text-brand-600" />
              <h3 className="text-lg font-semibold text-ink-900">Base de Datos</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                id="dbHost"
                label="Host del Servidor"
                type="text"
                placeholder="ej. 127.0.0.1 o 192.168.1.100"
                value={form.dbHost}
                onChange={(e) => handleChange('dbHost', e.target.value)}
                required
                disabled={saving}
                className="pl-10"
              />

              <Input
                id="dbPort"
                label="Puerto"
                type="number"
                placeholder="5432"
                value={form.dbPort}
                onChange={(e) => handleChange('dbPort', parseInt(e.target.value) || 5432)}
                required
                disabled={saving}
                className="pl-10"
              />

              <Input
                id="dbUsername"
                label="Usuario"
                type="text"
                placeholder="ej. postgres"
                value={form.dbUsername}
                onChange={(e) => handleChange('dbUsername', e.target.value)}
                required
                disabled={saving}
                className="pl-10"
              />

              <Input
                id="dbDatabase"
                label="Nombre de la Base de Datos"
                type="text"
                placeholder="ej. sistema_caja"
                value={form.dbDatabase}
                onChange={(e) => handleChange('dbDatabase', e.target.value)}
                required
                disabled={saving}
                className="pl-10"
              />

              <Input
                id="dbPassword"
                label="Contraseña"
                type="password"
                placeholder="••••••••"
                value={form.dbPassword}
                onChange={(e) => handleChange('dbPassword', e.target.value)}
                disabled={saving}
                className="pl-10 col-span-1 md:col-span-2"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={testConnection}
              disabled={testing || saving}
              isLoading={testing}
            >
              {!testing && (
                <>
                  <TestTube2 className="mr-2 h-4 w-4" />
                  Probar Conexión
                </>
              )}
            </Button>

            {testSuccess && (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700 flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>Conexión exitosa a la base de datos</span>
              </div>
            )}

            {testError && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{testError}</span>
              </div>
            )}
          </div>

          {/* Configuración JWT */}
          <div className="space-y-4 pt-4 border-t border-surface-200">
            <h3 className="text-lg font-semibold text-ink-900">Seguridad (JWT)</h3>

            <Input
              id="jwtSecret"
              label="Secreto JWT"
              type="password"
              placeholder="Ingrese un secreto JWT"
              value={form.jwtSecret}
              onChange={(e) => handleChange('jwtSecret', e.target.value)}
              required
              disabled={saving}
              className="pl-10"
              helperText="Use una cadena segura y aleatoria para firmar tokens de autenticación"
            />
          </div>

          {/* Mensajes de error globales */}
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {configError && (
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700 flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{configError}</span>
            </div>
          )}

          {/* Botón de guardar */}
          <div className="pt-4 border-t border-surface-200">
            <Button
              type="submit"
              variant="default"
              className="w-full h-11 text-base"
              disabled={saving || !testSuccess}
              isLoading={saving}
            >
              {!saving && (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Configuración
                </>
              )}
            </Button>
            <p className="mt-3 text-center text-xs text-ink-400">
              La configuración se guardará en el directorio de datos de la aplicación
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
