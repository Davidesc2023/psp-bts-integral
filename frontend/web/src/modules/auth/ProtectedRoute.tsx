import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { authStore } from '@stores/auth.store';

/**
 * Componente para rutas protegidas
 * Redirige a /login si el usuario no está autenticado
 */
export const ProtectedRoute = () => {
  const location = useLocation();
  const { isAuthenticated, isTokenExpired } = authStore();

  // Verificar autenticación y token válido
  const isUserAuthenticated = isAuthenticated && !isTokenExpired();

  if (!isUserAuthenticated) {
    // Redirigir a login, guardando la ruta intentada
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
