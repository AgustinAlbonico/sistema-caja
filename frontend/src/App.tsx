import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'

import { AuthProvider } from './contexts/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ConfigCheck } from './components/ConfigCheck'
import { MainLayout } from './components/layout/MainLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { RecibosAccessGuard } from './components/RecibosAccessGuard'
import { CajaAutoCloseNotification } from './components/CajaAutoCloseNotification'
import { DatabaseErrorPage } from './pages/DatabaseErrorPage'
import { DiagnosticsPage } from './pages/DiagnosticsPage'
import { DashboardPage } from './pages/DashboardPage'
import { ClientesPage } from './pages/ClientesPage'
import { CajaPage } from './pages/CajaPage'
import { RecibosPage } from './pages/RecibosPage'
import { ReciboCreatePage } from './pages/ReciboCreatePage'
import { ReportesPage } from './pages/ReportesPage'
import { AuditoriaPage } from './pages/AuditoriaPage'
import { MetodosPagoPage } from './pages/MetodosPagoPage'
import { LoginPage } from './pages/LoginPage'
import { SetupConfigPage } from './pages/SetupConfigPage'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ConfigCheck>
          <Toaster position="top-right" richColors />
          <Routes>
            {/* Ruta de configuración inicial */}
            <Route path="/setup" element={<SetupConfigPage />} />

            {/* Ruta de error de base de datos */}
            <Route path="/database-error" element={<DatabaseErrorPage />} />

            {/* Ruta pública de login */}
            <Route path="/login" element={<LoginPage />} />

            {/* Rutas protegidas */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <CajaAutoCloseNotification />
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="reportes" element={<ReportesPage />} />
              <Route path="clientes" element={<ClientesPage />} />
              <Route
                path="recibos"
                element={
                  <RecibosAccessGuard>
                    <RecibosPage />
                  </RecibosAccessGuard>
                }
              />
              <Route
                path="recibos/nuevo"
                element={
                  <RecibosAccessGuard>
                    <ReciboCreatePage />
                  </RecibosAccessGuard>
                }
              />
              <Route path="caja" element={<CajaPage />} />
              <Route path="metodos-pago" element={<MetodosPagoPage />} />
              <Route path="auditoria" element={<AuditoriaPage />} />
              <Route path="diagnostico" element={<DiagnosticsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </ConfigCheck>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
