import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@modules/auth/ProtectedRoute';
import { AdminRoute } from '@modules/auth/AdminRoute';
import { LoginPage } from '@modules/auth/LoginPage';
import { MainLayout } from '@modules/shared/layout/MainLayout';
import { LoadingFallback } from '@modules/shared/components/LoadingFallback';

// Lazy loading de rutas
const DashboardPage = lazy(() => import('@modules/dashboard/DashboardPageEnriched'));

// Admin lazy routes
const AdminDashboardPage = lazy(() => import('@modules/admin/pages/AdminDashboardPage'));
const EpsAdminPage = lazy(() => import('@modules/admin/pages/EpsAdminPage'));
const DiagnosticosAdminPage = lazy(() => import('@modules/admin/pages/DiagnosticosAdminPage'));
const UsersAdminPage = lazy(() => import('@modules/admin/pages/UsersAdminPage'));
const ProgramasPspAdminPage = lazy(() => import('@modules/admin/pages/ProgramasPspAdminPage'));
const IpsAdminPage = lazy(() => import('@modules/admin/pages/IpsAdminPage'));
const LogisticsOperatorsAdminPage = lazy(() => import('@modules/admin/pages/LogisticsOperatorsAdminPage'));
const CitiesAdminPage = lazy(() => import('@modules/admin/pages/CitiesAdminPage'));
const TiposParaclinicoAdminPage = lazy(() => import('@modules/admin/pages/TiposParaclinicoAdminPage'));
const MedicamentosAdminPage = lazy(() => import('@modules/admin/pages/MedicamentosAdminPage'));
const MedicosAdminPage = lazy(() => import('@modules/admin/pages/MedicosAdminPage'));
const AuditoriaPage = lazy(() => import('@modules/admin/pages/AuditoriaPage'));
const PacientesPage = lazy(() => import('@modules/patients/pages/PacientesPage'));
const PatientDetailPage = lazy(() => import('@modules/patients/pages/PatientDetailPage'));
const PacienteFormPage = lazy(() => import ('@modules/patients/pages/PacienteFormPage'));

// Nuevos módulos
const PrescripcionesPage = lazy(() => import('@modules/prescripciones/PrescripcionesPage').then(m => ({ default: m.PrescripcionesPage })));
const AplicacionesPage = lazy(() => import('@modules/aplicaciones/AplicacionesPage').then(m => ({ default: m.AplicacionesPage })));
const EntregasPage = lazy(() => import('@modules/entregas/EntregasPage').then(m => ({ default: m.EntregasPage })));
const FollowupsPage = lazy(() => import('@modules/followups/pages/FollowupsPage'));
const BarriersPage = lazy(() => import('@modules/barriers/pages/BarriersPage'));
const TasksPage = lazy(() => import('@modules/tasks/pages/TasksPage'));
const ParaclinicosPage = lazy(() => import('@modules/diagnostics/pages/ParaclinicosPage'));
const InventarioPage = lazy(() => import('@modules/inventario/pages/InventarioPage'));
const TransportesPage = lazy(() => import('@modules/transportes/pages/TransportesPage'));
const ServiciosEspecialesPage = lazy(() => import('@modules/servicios-especiales/pages/ServiciosEspecialesPage'));
const ReportesPage = lazy(() => import('@modules/reportes/pages/ReportesPage'));
const ConfiguracionPage = lazy(() => import('@modules/configuracion/pages/ConfiguracionPage'));
const ConsultasPage = lazy(() => import('@modules/consultas/ConsultasPage'));
const ConsentimientosPage = lazy(() => import('@modules/consentimientos/pages/ConsentimientosPage'));

/**
 * Configuración de rutas de la aplicación
 */
export const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<LoginPage />} />

        {/* Rutas protegidas */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            <Route
              path="/dashboard"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <DashboardPage />
                </Suspense>
              }
            />

            {/* Rutas de Pacientes */}
            <Route
              path="/patients"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <PacientesPage />
                </Suspense>
              }
            />
            <Route
              path="/patients/new"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <PacienteFormPage />
                </Suspense>
              }
            />
            <Route
              path="/patients/:id"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <PatientDetailPage />
                </Suspense>
              }
            />
            <Route
              path="/patients/:id/editar"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <PacienteFormPage />
                </Suspense>
              }
            />

            {/* Rutas de Prescripciones */}
            <Route
              path="/prescriptions"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <PrescripcionesPage />
                </Suspense>
              }
            />

            {/* Rutas de Aplicaciones */}
            <Route
              path="/applications"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <AplicacionesPage />
                </Suspense>
              }
            />

            {/* Rutas de Entregas */}
            <Route
              path="/deliveries"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <EntregasPage />
                </Suspense>
              }
            />

            {/* Rutas de Seguimientos */}
            <Route
              path="/followups"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <FollowupsPage />
                </Suspense>
              }
            />

            {/* Rutas de Barreras */}
            <Route
              path="/barriers"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <BarriersPage />
                </Suspense>
              }
            />

            {/* Rutas de Tareas — redirige a Seguimientos */}
            <Route
              path="/tasks"
              element={<Navigate to="/followups" replace />}
            />

            {/* Rutas de Paraclínicos */}
            <Route
              path="/diagnostics"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <ParaclinicosPage />
                </Suspense>
              }
            />

            {/* Rutas de Inventario */}
            <Route
              path="/inventory"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <InventarioPage />
                </Suspense>
              }
            />

            {/* Rutas de Transportes */}
            <Route
              path="/transport"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <TransportesPage />
                </Suspense>
              }
            />

            {/* Rutas de Servicios Especiales */}
            <Route
              path="/special-services"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <ServiciosEspecialesPage />
                </Suspense>
              }
            />

            {/* Rutas de Reportes */}
            <Route
              path="/reports"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <ReportesPage />
                </Suspense>
              }
            />

            {/* Configuración del Sistema */}
            <Route
              path="/settings"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <ConfiguracionPage />
                </Suspense>
              }
            />

            {/* Consultas Médicas */}
            <Route
              path="/consultas"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <ConsultasPage />
                </Suspense>
              }
            />

            {/* Consentimientos */}
            <Route
              path="/consents"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <ConsentimientosPage />
                </Suspense>
              }
            />
          </Route>
        </Route>

        {/* Rutas de Administración — solo SUPER_ADMIN y ADMIN_INSTITUCION */}
        <Route element={<AdminRoute />}>
          <Route element={<MainLayout />}>
            <Route
              path="/admin"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <AdminDashboardPage />
                </Suspense>
              }
            />
            <Route
              path="/admin/eps"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <EpsAdminPage />
                </Suspense>
              }
            />
            <Route
              path="/admin/diagnosticos-cie10"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <DiagnosticosAdminPage />
                </Suspense>
              }
            />
            <Route
              path="/admin/users"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <UsersAdminPage />
                </Suspense>
              }
            />
            <Route
              path="/admin/programas-psp"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <ProgramasPspAdminPage />
                </Suspense>
              }
            />
            <Route
              path="/admin/ips"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <IpsAdminPage />
                </Suspense>
              }
            />
            <Route
              path="/admin/logistics-operators"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <LogisticsOperatorsAdminPage />
                </Suspense>
              }
            />
            <Route
              path="/admin/cities"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <CitiesAdminPage />
                </Suspense>
              }
            />
            <Route
              path="/admin/tipos-paraclinico"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <TiposParaclinicoAdminPage />
                </Suspense>
              }
            />
            <Route
              path="/admin/medicamentos"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <MedicamentosAdminPage />
                </Suspense>
              }
            />
            <Route
              path="/admin/medicos"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <MedicosAdminPage />
                </Suspense>
              }
            />
            <Route
              path="/admin/auditoria"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <AuditoriaPage />
                </Suspense>
              }
            />
          </Route>
        </Route>

        {/* 404 - Ruta no encontrada */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
