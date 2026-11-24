import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function getDashboardPathForRole(role) {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'faculty' || role === 'staff') return '/faculty/dashboard';
  return '/dashboard';
}

/**
 * Protects routes that require authentication.
 * Redirects to login if not authenticated, or to the user's role dashboard if unauthorized.
 */
export function PrivateRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles) {
    const expanded = allowedRoles.includes('staff') && !allowedRoles.includes('faculty')
      ? [...allowedRoles, 'faculty']
      : allowedRoles;
    if (!expanded.includes(user?.role)) {
      return <Navigate to={getDashboardPathForRole(user?.role)} replace />;
    }
  }

  return children;
}

/**
 * Protects Student Dashboard routes (/dashboard).
 * Faculty and Admin users are redirected to their dedicated dashboards.
 */
export function StudentRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'student') {
    return <Navigate to={getDashboardPathForRole(user?.role)} replace />;
  }

  return children;
}

/**
 * Protects Faculty Dashboard routes (/faculty/*).
 * Students and Admins cannot access Faculty Dashboard pages.
 */
export function FacultyRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/faculty/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'faculty' && user?.role !== 'staff') {
    return <Navigate to={getDashboardPathForRole(user?.role)} replace />;
  }

  return children;
}

/**
 * Protects administrator routes (/admin/*).
 */
export function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to={getDashboardPathForRole(user?.role)} replace />;
  }

  return children;
}
