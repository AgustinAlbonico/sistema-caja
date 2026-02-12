import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, DollarSign, FileText, Menu } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState } from 'react';

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { name: 'Home', href: '/', icon: LayoutDashboard },
    { name: 'Clientes', href: '/clientes', icon: Users },
    { name: 'Recibos', href: '/recibos', icon: FileText },
    { name: 'Caja', href: '/caja', icon: DollarSign },
  ];

  return (
    <>
      {/* Spacer to prevent content from being hidden behind nav */}
      <div className="h-14 md:hidden" />
      
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-14 items-center justify-around border-t border-ink-900/5 bg-white/90 px-2 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] backdrop-blur-lg md:hidden">
        {links.map((link) => (
          <NavLink
            key={link.name}
            to={link.href}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center rounded-xl p-2 transition-all duration-200',
                isActive
                  ? 'text-brand-600'
                  : 'text-ink-400 hover:text-ink-700'
              )
            }
          >
            <link.icon className={cn("h-6 w-6 transition-transform duration-200 active:scale-90")} />
            <span className="mt-1 text-[10px] font-medium">{link.name}</span>
          </NavLink>
        ))}
        
        {/* More Menu Trigger (for things that don't fit) */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex flex-col items-center justify-center rounded-xl p-2 text-ink-400 hover:text-ink-700 transition-all duration-200"
        >
          <Menu className="h-6 w-6" />
          <span className="mt-1 text-[10px] font-medium">Menú</span>
        </button>
      </nav>
      
      {/* Mobile Drawer/Menu (Simple Overlay for now) */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-ink-900/20 backdrop-blur-sm md:hidden" onClick={() => setIsOpen(false)}>
          <div className="absolute bottom-16 right-0 m-4 w-48 rounded-2xl bg-white p-2 shadow-elevated animate-in slide-in-from-bottom-5 fade-in duration-200" onClick={e => e.stopPropagation()}>
             <NavLink to="/reportes" className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-surface-50">
               Reportes
             </NavLink>
             <NavLink to="/auditoria" className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-surface-50">
               Auditoría
             </NavLink>
          </div>
        </div>
      )}
    </>
  );
}
