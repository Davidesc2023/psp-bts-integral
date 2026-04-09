import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { authStore } from '@stores/auth.store';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN_INSTITUCION'] as const;

/**
 * Ruta protegida para roles administrativos (SUPER_ADMIN, ADMIN_INSTITUCION).
 * Redirige a /dashboard si el usuario no tiene permisos.
 */
export const AdminRoute = () => {
  const location = useLocation();
  const { isAuthenticated, isTokenExpired, user } = authStore();

  const isUserAuthenticated = isAuthenticated && !isTokenExpired();

  if (!isUserAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const hasAdminRole = user && ADMIN_ROLES.includes(user.role as typeof ADMIN_ROLES[number]);

  if (!hasAdminRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
