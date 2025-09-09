import React, { createContext, useContext, useMemo } from 'react';
import { useQuery } from 'react-query';
import { getUIMenus, getUIPermissions, getUIFeatures, getAbacPolicies } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

// Build path->trail index (for active menu/breadcrumbs)
function buildTrailIndex(nodes) {
  const byPath = new Map();
  const stack = nodes.map((n) => ({ node: n, trail: [n] }));
  while (stack.length) {
    const { node, trail } = stack.pop();
    if (node.path) byPath.set(node.path, trail);
    for (const c of node.children || []) stack.push({ node: c, trail: [...trail, c] });
  }
  return byPath;
}

// Minimal ABAC evaluator used by canAbac
export function evaluate(policy, ctx = {}) {
  let conds = policy?.conditions;
  // Also accept string-based `condition` as JSONLogic
  if (!conds && policy?.condition) {
    try {
      conds = JSON.parse(policy.condition);
    } catch {
      conds = null;
    }
  }
  // Default deny when no conditions provided
  if (!conds) return false;

  const get = (path) => path.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), ctx);

  // Support simple JSON object with equality and {in:[...]}
  if (typeof conds === 'object' && !Array.isArray(conds) && !conds['=='] && !conds['in']) {
    return Object.entries(conds).every(([field, expected]) => {
      const actual = get(field);
      if (expected && typeof expected === 'object' && Array.isArray(expected.in)) return expected.in.includes(actual);
      return actual === expected;
    });
  }

  // Minimal JSONLogic: {"==": [ {"var":"field"}, value ] } and {"in": [ {"var":"field"}, [..] ]}
  const evalJson = (rule) => {
    if (!rule || typeof rule !== 'object') return false;
    if (rule.var) return get(String(rule.var));
    if (rule['==']) {
      const [a, b] = rule['=='];
      return evalJson(a) === evalJson(b);
    }
    if (rule.in) {
      const [a, arr] = rule.in;
      const v = evalJson(a);
      if (!Array.isArray(arr)) return false;
      return arr.includes(v);
    }
    // Unsupported operations default to deny
    return false;
  };
  return evalJson(conds);
}

const UiContext = createContext(null);

export function UiProvider({ children }) {
  const { user } = useAuth();
  const abacEnabled = String(import.meta.env.VITE_ENABLE_ABAC ?? 'false').toLowerCase() === 'true';
  const menusQ = useQuery(
    ['ui:menus', user?.id],
    async () => {
      const res = await getUIMenus();
      return res.data?.data ?? [];
    },
    { staleTime: 60_000, retry: 1, enabled: !!user }
  );

  const permsQ = useQuery(
    ['ui:perms', user?.id],
    async () => {
      const res = await getUIPermissions();
      return new Set(res.data?.data || []);
    },
    { staleTime: 60_000, retry: 1, enabled: !!user }
  );

  const featsQ = useQuery(
    ['ui:features', user?.id],
    async () => {
      const res = await getUIFeatures();
      return res.data?.data || {};
    },
    { staleTime: 60_000, retry: 1, enabled: !!user }
  );

  const loading = menusQ.isLoading || permsQ.isLoading || featsQ.isLoading;
  const abacQ = useQuery(
    ['ui:abac', user?.id],
    async () => {
      try {
        const res = await getAbacPolicies();
        return Array.isArray(res?.data?.data) ? res.data.data : [];
      } catch {
        return [];
      }
    },
    { staleTime: 60_000, retry: 0, enabled: !!user && abacEnabled, placeholderData: [] }
  );

  const value = useMemo(() => {
    const menus = menusQ.data || [];
    const perms = permsQ.data || new Set();
    const features = featsQ.data || {};
    const policies = abacQ.data || [];

    const can = (p) => perms.has(p);
    const canAny = (arr = []) => arr.some((p) => perms.has(p));
    const canAll = (arr = []) => arr.every((p) => perms.has(p));
    const enabled = (k) => !!features[k];

    const trailIndex = buildTrailIndex(menus);
    const findTrailByPath = (path) => trailIndex.get(path) || null;
    const canAbac = (action, subject, ctx = {}) => {
      if (!abacEnabled) return true;
      const relevant = policies.filter((p) => p.action === action && (p.subject === subject || p.resource === subject));
      if (!relevant.length) return false;
      // deny-overrides if effect provided
      const sorted = relevant.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      for (const p of sorted) {
        const ok = evaluate(p, ctx);
        if (!ok) continue;
        if (p.effect === 'deny') return false;
        if (p.effect === 'allow' || !p.effect) return true;
      }
      return false;
    };

    return { menus, perms, features, can, canAny, canAll, enabled, findTrailByPath, canAbac, policies, loading };
  }, [menusQ.data, permsQ.data, featsQ.data, abacQ.data, user, loading, abacEnabled]);

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used inside <UiProvider>');
  return ctx;
}
