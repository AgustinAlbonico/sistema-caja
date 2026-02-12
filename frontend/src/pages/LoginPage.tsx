import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Box, ArrowRight } from 'lucide-react'

import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export function LoginPage() {
  const [nombreUsuario, setNombreUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const { login, loading, error, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  if (isAuthenticated) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await login(nombreUsuario, contrasena)
      navigate('/', { replace: true })
    } catch {
      // El error ya se maneja en el contexto
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-xl md:p-8">
        <div className="flex flex-col items-center text-center mb-6 md:mb-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 shadow-lg shadow-brand-600/30 md:mb-6 md:h-14 md:w-14">
            <Box className="h-7 w-7 text-white" />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-ink-900 md:text-2xl">
            Bienvenido de nuevo
          </h2>
          <p className="mt-2 text-sm text-ink-500 max-w-xs">
            Sistema de Gestión de Caja y Recibos. Ingrese sus credenciales para acceder al panel.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              id="nombreUsuario"
              label="Usuario"
              type="text"
              placeholder="ej. admin"
              value={nombreUsuario}
              onChange={(e) => setNombreUsuario(e.target.value)}
              required
              disabled={loading}
              className="pl-10"
            />

            <Input
              id="contrasena"
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
              disabled={loading}
              className="pl-10"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-10 text-sm group md:h-11 md:text-base"
            disabled={loading || !nombreUsuario || !contrasena}
            isLoading={loading}
          >
            {!loading && (
              <>
                Iniciar Sesión
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-ink-400 md:mt-8">
          &copy; {new Date().getFullYear()} Caja Estudio. Todos los derechos reservados.
        </p>
      </div>
    </div>
  )
}
