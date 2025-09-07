import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function RequirePermissions({ any = [], all = [], to = '/403', children }) {
  const { hasPermission, isElevated } = useAuth();
  // Elevated roles may bypass granular checks
  if (isElevated) return children;
  const okAny = !any?.length || any.some((p) => hasPermission(p));
  const okAll = !all?.length || all.every((p) => hasPermission(p));
  if (okAny && okAll) return children;
  return <Navigate to={to} />;
}
