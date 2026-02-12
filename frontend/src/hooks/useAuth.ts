import { useContext } from 'react'

import { AuthContext, type AuthContextType } from '../contexts/AuthContext'

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  
  return context
}
