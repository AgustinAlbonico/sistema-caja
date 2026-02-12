import { Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';

export function MainLayout() {
  const location = useLocation();
  // Persistir estado de la sidebar en localStorage
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(isSidebarOpen));
  }, [isSidebarOpen]);

  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case '/': return 'Dashboard';
      case '/clientes': return 'Gestión de Clientes';
      case '/recibos': return 'Recibos';
      case '/pagos': return 'Pagos';
      case '/reportes': return 'Reportes Financieros';
      case '/auditoria': return 'Auditoría';
      default: return 'Sistema Caja';
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface-50 text-ink-900 font-sans antialiased selection:bg-brand-100 selection:text-brand-700">
      <Sidebar isOpen={isSidebarOpen} />

      <div className="flex flex-1 flex-col overflow-hidden relative z-0">
        <Header
          title={getPageTitle(location.pathname)}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
        />
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-5 lg:p-6 scroll-smooth">
          <div className="mx-auto max-w-6xl animate-in fade-in duration-500 slide-in-from-bottom-2">
            <Outlet />
          </div>
          
          {/* Bottom spacer for mobile nav */}
          <div className="h-14 md:hidden" /> 
        </main>

        <MobileNav />
      </div>
    </div>
  );
}
