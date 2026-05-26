import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function AdminRoute({ children }) {
  const { isAdminAuthenticated, adminToken } = useAdminAuth();

  // Check token expiry client-side
  if (adminToken) {
    try {
      const payload = JSON.parse(atob(adminToken.split('.')[1]));
      if (payload.exp * 1000 < Date.now() || payload.role !== 'ADMIN') {
        return <Navigate to="/admin-login" replace />;
      }
    } catch {
      return <Navigate to="/admin-login" replace />;
    }
  }

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin-login" replace />;
  }

  return children;
}
