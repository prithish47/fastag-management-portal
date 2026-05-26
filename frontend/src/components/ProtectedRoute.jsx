import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('access_token');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Check if token has expired
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('access_token');
      return <Navigate to="/" replace />;
    }
  } catch (err) {
    localStorage.removeItem('access_token');
    return <Navigate to="/" replace />;
  }

  return children;
}
