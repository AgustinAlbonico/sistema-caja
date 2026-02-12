// Puerto del backend HTTP
const API_URL = `http://127.0.0.1:47832/api`

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return true
  }

  return false
}

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('token')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    })

    // Si el token expiró (401), redirigir a login
    if (response.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
      throw new Error('Sesión expirada')
    }

    return response
  } catch (error) {
    if (isAbortError(error)) {
      throw error
    }

    console.error('[API] Error en fetch:', error)
    throw error
  }
}
