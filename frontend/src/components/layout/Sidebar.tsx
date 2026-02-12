import { NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, Users, DollarSign, Box, BarChart3, FileText, History, Settings, Activity } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SidebarProps {
  isOpen?: boolean;
}

export function Sidebar({ isOpen = true }: SidebarProps) {
  const links = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Clientes', href: '/clientes', icon: Users },
    { name: 'Recibos', href: '/recibos', icon: FileText },
    { name: 'Caja', href: '/caja', icon: DollarSign },
  ];

  const secondaryLinks = [
    { name: 'Reportes', href: '/reportes', icon: BarChart3 },
  ];

  const configLinks = [
    { name: 'Auditoría', href: '/auditoria', icon: History },
    { name: 'Diagnóstico', href: '/diagnostico', icon: Activity },
  ];

  return (
    <aside className={cn(
      'h-screen flex-col border-r border-dashed border-slate-200 bg-surface-50/50 transition-all duration-300 ease-in-out',
      isOpen
        ? 'w-[200px] translate-x-0'
        : 'w-0 -translate-x-full md:w-0 md:translate-x-0',
      isOpen ? 'flex' : 'hidden'
    )}>
      {/* Brand */}
      <Link to="/" className={cn('flex h-14 items-center hover:opacity-80 transition-opacity', isOpen ? 'px-4' : 'justify-center')}>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 shadow-sm shadow-brand-600/20">
          <Box className="h-5 w-5 text-white" />
        </div>
        <span className={cn('ml-2.5 text-base font-bold tracking-tight text-ink-900', !isOpen && 'hidden')}>Caja Estudio</span>
      </Link>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {/* Main Section */}
        <div className="space-y-1">
          <p className={cn("px-2 text-xs font-semibold uppercase tracking-wider text-ink-400", !isOpen && 'hidden')}>Principal</p>
          {links.map((link) => (
            <NavLink
              key={link.name}
              to={link.href}
              className={({ isActive }) =>
                cn(
                  'group flex items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ease-in-out',
                  isActive
                    ? 'bg-white text-brand-700 shadow-card'
                    : 'text-ink-500 hover:bg-white/60 hover:text-ink-900',
                  !isOpen && 'justify-center px-0'
                )
              }
            >
              <link.icon className={cn("transition-colors", isOpen ? "mr-3 h-4 w-4" : "h-5 w-5", ({ isActive }: { isActive: boolean }) => isActive ? "text-brand-600" : "text-ink-400 group-hover:text-ink-600")} />
              <span className={isOpen ? undefined : 'hidden'}>{link.name}</span>
            </NavLink>
          ))}
        </div>

        {/* Secondary Section */}
        <div className="space-y-1">
          <p className={cn("px-2 text-xs font-semibold uppercase tracking-wider text-ink-400", !isOpen && 'hidden')}>Gestión</p>
          {secondaryLinks.map((link) => (
            <NavLink
              key={link.name}
              to={link.href}
              className={({ isActive }) =>
                cn(
                  'group flex items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ease-in-out',
                  isActive
                    ? 'bg-white text-brand-700 shadow-card'
                    : 'text-ink-500 hover:bg-white/60 hover:text-ink-900',
                  !isOpen && 'justify-center px-0'
                )
              }
            >
              <link.icon className={cn("transition-colors", isOpen ? "mr-3 h-4 w-4" : "h-5 w-5", ({ isActive }: { isActive: boolean }) => isActive ? "text-brand-600" : "text-ink-400 group-hover:text-ink-600")} />
              <span className={isOpen ? undefined : 'hidden'}>{link.name}</span>
            </NavLink>
          ))}
        </div>

        {/* Config Section */}
        <div className="space-y-1">
          <p className={cn("px-2 text-xs font-semibold uppercase tracking-wider text-ink-400", !isOpen && 'hidden')}>Configuración</p>
          {configLinks.map((link) => (
            <NavLink
              key={link.name}
              to={link.href}
              className={({ isActive }) =>
                cn(
                  'group flex items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ease-in-out',
                  isActive
                    ? 'bg-white text-brand-700 shadow-card'
                    : 'text-ink-500 hover:bg-white/60 hover:text-ink-900',
                  !isOpen && 'justify-center px-0'
                )
              }
            >
              <link.icon className={cn("transition-colors", isOpen ? "mr-3 h-4 w-4" : "h-5 w-5", ({ isActive }: { isActive: boolean }) => isActive ? "text-brand-600" : "text-ink-400 group-hover:text-ink-600")} />
              <span className={isOpen ? undefined : 'hidden'}>{link.name}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Footer Profile */}
      <div className={cn("border-t border-dashed border-slate-200 p-3", !isOpen && 'p-2')}>
        <button className={cn("group flex w-full items-center rounded-xl border border-transparent transition-all hover:bg-white hover:shadow-card", isOpen ? 'p-1.5' : 'justify-center p-2')}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-indigo-100 text-brand-700 font-bold shadow-sm">
            A
          </div>
          <div className={cn("ml-3 text-left", !isOpen && 'hidden')}>
            <p className="text-sm font-medium text-ink-900 group-hover:text-brand-700">Admin User</p>
            <p className="text-xs text-ink-400">admin@estudio.com</p>
          </div>
          <Settings className={cn("ml-auto h-4 w-4 text-ink-400 transition-opacity group-hover:opacity-100", !isOpen && 'hidden')} />
        </button>
      </div>
    </aside>
  );
}
