import React, { createContext, useContext, useMemo } from 'react';
import { useQuery } from 'react-query';
import { getUIMenus, getUIPermissions, getUIFeatures } from '@/services/api';

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

const UiContext = createContext(null);

export function UiProvider({ children }) {
  const menusQ = useQuery(
    ['ui:menus'],
    async () => {
      const res = await getUIMenus();
      return res.data?.data ?? [];
    },
    { staleTime: 60_000, retry: 1 }
  );

  const permsQ = useQuery(
    ['ui:perms'],
    async () => {
      const res = await getUIPermissions();
      return new Set(res.data?.data || []);
    },
    { staleTime: 60_000, retry: 1 }
  );

  const featsQ = useQuery(
    ['ui:features'],
    async () => {
      const res = await getUIFeatures();
      return res.data?.data || {};
    },
    { staleTime: 60_000, retry: 1 }
  );

  const loading = menusQ.isLoading || permsQ.isLoading || featsQ.isLoading;

  const value = useMemo(() => {
    const menus = menusQ.data || [];
    const perms = permsQ.data || new Set();
    const features = featsQ.data || {};

    const can = (p) => perms.has(p);
    const canAny = (arr = []) => arr.some((p) => perms.has(p));
    const canAll = (arr = []) => arr.every((p) => perms.has(p));
    const enabled = (k) => !!features[k];

    const trailIndex = buildTrailIndex(menus);
    const findTrailByPath = (path) => trailIndex.get(path) || null;

    return { menus, perms, features, can, canAny, canAll, enabled, findTrailByPath, loading };
  }, [menusQ.data, permsQ.data, featsQ.data]);

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used inside <UiProvider>');
  return ctx;
}
