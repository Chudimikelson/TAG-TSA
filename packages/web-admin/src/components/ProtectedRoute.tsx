import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

export interface ProtectedRouteProps {
  requiredRole?: string;
}

export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export function RoleGuard({ children, requiredRole }: { children: React.ReactNode; requiredRole: string }) {
  const { user } = useAuth();

  if (user?.adminRole !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export function ExcludedRoleGuard({
  children,
  excludedRoles,
}: {
  children: React.ReactNode;
  excludedRoles: string[];
}) {
  const { user } = useAuth();

  if (user?.adminRole && excludedRoles.includes(user.adminRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
