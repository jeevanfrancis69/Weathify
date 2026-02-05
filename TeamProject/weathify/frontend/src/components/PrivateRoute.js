import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, requireAdmin = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <div className="loading"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // For admin routes, you'd check user.isAdmin or similar
  // For now, we'll just check if user exists
  if (requireAdmin && !user.isAdmin) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

export default PrivateRoute;
