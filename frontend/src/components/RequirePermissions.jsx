import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUi } from '@/contexts/UiContext';

// Props:
// - any: RBAC any-of permissions
// - all: RBAC all-of permissions
// - abac: optional { action, subject, ctx } or array of such
export default function RequirePermissions({ any = [], all = [], abac = [], to = '/403', children }) {
  const { hasPermission, isElevated } = useAuth();
  const { can: canUi, canAbac } = useUi();

  // Elevated roles bypass all checks
  if (isElevated) return children;

  const anyArr = Array.isArray(any) ? any : [any];
  const allArr = Array.isArray(all) ? all : [all];
  const abacArr = Array.isArray(abac) ? abac : [abac];

  const okAny = !anyArr.length || anyArr.some((p) => hasPermission(p) || canUi(p));
  const okAll = !allArr.length || allArr.every((p) => hasPermission(p) || canUi(p));
  const okAbac = !abacArr.length || abacArr.every((r) => canAbac(r.action, r.subject, r.ctx || {}));

  return okAny && okAll && okAbac ? children : <Navigate to={to} />;
}
