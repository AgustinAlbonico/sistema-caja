const setupApiBaseUrl = 'http://127.0.0.1:47832/api/config'

export interface AppConfig {
  port: number
  host: string
  database: {
    host: string
    port: number
    username: string
    password: string
    database: string
  }
  jwt: {
    secret: string
    expiration: string
  }
  schemaVersion: string
  frontendUrl?: string
}

export async function readConfig(): Promise<AppConfig | null> {
  try {
    const response = await fetch(`${setupApiBaseUrl}/current`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    })

    if (response.status === 404) {
      return null
    }

    if (!response.ok) {
      throw new Error('No se pudo obtener la configuracion actual')
    }

    return (await response.json()) as AppConfig
  } catch (error) {
    console.error('[Config] Error al leer config:', error)
    return null
  }
}

export async function writeConfig(config: AppConfig): Promise<boolean> {
  try {
    const response = await fetch(`${setupApiBaseUrl}/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      throw new Error(payload?.message || 'Error desconocido al guardar config')
    }

    return true
  } catch (error) {
    console.error('[Config] Error al escribir config:', error)
    throw error
  }
}

export async function configExists(): Promise<boolean> {
  try {
    const response = await fetch('http://127.0.0.1:47832/api/health', {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    })

    if (!response.ok) {
      return false
    }

    const payload = (await response.json()) as { status?: string }
    return payload.status !== 'setup'
  } catch (error) {
    console.error('[Config] Error al verificar existencia de config:', error)
    return false
  }
}
