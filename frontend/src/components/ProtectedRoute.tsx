/**
 * ProtectedRoute Component
 *
 * Guards routes requiring authentication. Unauthenticated users are
 * redirected to the /login page. While authentication state is initializing,
 * renders a loading indicator.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="auth-loading-container" role="status" aria-label="Verifying session">
        <div className="auth-loading-spinner" />
        <p className="auth-loading-text">Verifying secure session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
