import { createContext, useState, useCallback, useEffect, type ReactNode } from 'react'

// Puerto del backend HTTP
const API_URL = `http://127.0.0.1:47832/api`

export interface Usuario {
  idUsuario: number
  nombreUsuario: string
  nombreCompleto: string
}

export interface AuthContextType {
  user: Usuario | null
  isAuthenticated: boolean
  loading: boolean
  isInitializing: boolean
  error: string | null
  login: (nombreUsuario: string, contrasena: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Verificar si hay token al iniciar
  useEffect(() => {
    const token = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')

    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        setUser(parsedUser)
      } catch {
        // Si hay error al parsear, limpiar storage
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    setIsInitializing(false)
  }, [])

  const login = useCallback(async (nombreUsuario: string, contrasena: string) => {
    setLoading(true)
    setError(null)

    try {
      let lastNetworkError: unknown = null
      let response: Response | null = null

      for (let attempt = 0; attempt < 8; attempt++) {
        try {
          response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombreUsuario, contrasena }),
          })
          break
        } catch (networkError) {
          lastNetworkError = networkError
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }

      if (!response) {
        throw (lastNetworkError instanceof Error
          ? lastNetworkError
          : new Error('No se pudo conectar con el backend'))
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Credenciales inválidas')
      }

      const data = await response.json()

      // Guardar token y usuario
      localStorage.setItem('token', data.accessToken)
      localStorage.setItem('user', JSON.stringify(data.usuario))

      setUser(data.usuario)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setError(null)
  }, [])

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    loading,
    isInitializing,
    error,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
