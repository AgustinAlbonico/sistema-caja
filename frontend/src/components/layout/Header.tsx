import { useNavigate } from 'react-router-dom'
import { LogOut, Menu } from 'lucide-react'

import { Button } from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'

interface HeaderProps {
  title?: string;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export function Header({ title, onToggleSidebar, isSidebarOpen }: HeaderProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-slate-200/60 bg-white/80 px-3 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="group relative flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-2 shadow-sm ring-1 ring-slate-200/60 transition-all duration-200 hover:from-brand-50 hover:to-brand-100 hover:shadow-md hover:ring-brand-200/60 active:scale-95"
          aria-label={isSidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          <Menu className="h-4 w-4 text-slate-600 transition-colors duration-200 group-hover:text-brand-600" />
        </button>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold tracking-tight text-ink-900 md:text-xl">{title}</h1>
          {/* Breadcrumb or subtitle could go here */}
        </div>
      </div>
      
      <div className="flex items-center gap-2.5 md:gap-4">
        <div className="h-8 w-[1px] bg-slate-200 hidden md:block" />

        {user && (
          <div className="hidden items-center gap-2 text-sm md:flex">
            <span className="font-medium text-ink-700">{user.nombreCompleto}</span>
          </div>
        )}
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-ink-500 hover:text-red-600 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Salir</span>
        </Button>
      </div>
    </header>
  )
}
