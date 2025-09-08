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
  const { canAbac } = useUi();
  // Elevated roles may bypass checks
  if (isElevated) return children;

  const okAny = !any?.length || any.some((p) => hasPermission(p) || (typeof canAbac === 'function' && typeof p === 'string' && false) || (typeof useUi === 'function' ? false : false));
  // Include UiContext.can for RBAC names supplied by /ui/permissions
  const { can: canUi } = useUi();
  const okAnyRbac = !any?.length || any.some((p) => hasPermission(p) || canUi(p));
  const okAllRbac = !all?.length || all.every((p) => hasPermission(p) || canUi(p));

  const abacArr = Array.isArray(abac) ? abac : (abac ? [abac] : []);
  const okAbac = !abacArr.length || abacArr.every((r) => canAbac(r.action, r.subject, r.ctx || {}));

  if (okAnyRbac && okAllRbac && okAbac) return children;
  return <Navigate to={to} />;
}
