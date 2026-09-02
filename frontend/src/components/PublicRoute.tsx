/**
 * PublicRoute Component
 *
 * Route guard for pages intended only for unauthenticated users (e.g. /login, /register).
 * If the user is already authenticated, redirects them to the main application page (/).
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface PublicRouteProps {
  children: React.ReactNode;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="auth-loading-container" role="status" aria-label="Loading">
        <div className="auth-loading-spinner" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
