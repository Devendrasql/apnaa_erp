import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import Cookies from 'js-cookie';
import api, { getUIBootstrap, setActiveBranchId, login as loginApi } from '../services/api';

const AuthContext = createContext(null);

// ---- helpers -------------------------------------------------
const normalizeRoleName = (r) => String(r || '').toLowerCase().replace(/\s+/g, '_');
const isElevatedByRoleName = (name) =>
  ['super_admin', 'admin', 'manager', 'system_admin', 'sa'].includes(normalizeRoleName(name));

function extractRoleIds(user) {
  // support many shapes: {role_id}, {roles:[{id},..]}, {roles:[number,...]}
  const ids = new Set();
  if (user?.role_id) ids.add(Number(user.role_id));
  if (Array.isArray(user?.roles)) {
    user.roles.forEach((r) => {
      if (typeof r === 'number') ids.add(r);
      else if (r?.id) ids.add(Number(r.id));
    });
  }
  if (Array.isArray(user?.roleIds)) user.roleIds.forEach((id) => ids.add(Number(id)));
  return Array.from(ids).filter(Number.isFinite);
}

function extractRoleNames(user) {
  const names = [];
  if (typeof user?.role === 'string') names.push(user.role);
  else if (user?.role?.name) names.push(user.role.name);
  if (Array.isArray(user?.roles)) {
    user.roles.forEach((r) => {
      if (typeof r === 'string') names.push(r);
      else if (r?.name) names.push(r.name);
    });
  }
  return names.map(normalizeRoleName);
}

// ---- main provider -------------------------------------------
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissionNames, setPermissionNames] = useState([]); // ['pos.discount.edit', ...]
  const [loading, setLoading] = useState(true);
  const [permLoading, setPermLoading] = useState(true);

  // Branch mgmt
  const [accessibleBranches, setAccessibleBranches] = useState([]);
  const [currentBranch, setCurrentBranch] = useState(null);

  const elevated = useMemo(() => {
    const names = extractRoleNames(user);
    if (names.some(isElevatedByRoleName)) return true;
    // Optional flags your backend might set
    if (user?.is_admin || user?.isAdmin || user?.isManager) return true;
    return false;
  }, [user]);

  // fetch all permission names for the user’s roles, store into state + cookie
  const hydratePermissions = async (u) => {
    setPermLoading(true);
    try {
      const nameBag = new Set();

      // If backend already put permissions on user, merge them first
      const existing = []
        .concat(u?.effectivePermissions || [])
        .concat(u?.permission_names || [])
        .concat(u?.permissions || [])
        .concat(u?.granted_permissions || []);
      existing.forEach((p) => {
        if (!p) return;
        if (typeof p === 'string') nameBag.add(p.toLowerCase());
        if (p?.name) nameBag.add(String(p.name).toLowerCase());
      });


      // If no permissions were present, proceed with an empty list.
      // The backend should supply `effectivePermissions` during login; the
      // frontend no longer falls back to fetching roles which required
      // elevated rights and caused 403 errors for non-admin users.
      // Resolve from roles API if we still have none
      if (nameBag.size === 0) {
        const roleIds = extractRoleIds(u);
        for (const rid of roleIds) {
          try {
            const res = await api.getRoleById(rid);
            const role = res?.data?.data;
            (role?.permissions || []).forEach((perm) => {
              if (perm?.name) nameBag.add(String(perm.name).toLowerCase());
            });
          } catch (err) {
            // ignore role fetch errors; we'll proceed with what we have
            console.error('getRoleById failed', err);
          }
        }
      }

      const names = Array.from(nameBag);
      setPermissionNames(names);

      // also persist on the user object we keep in state/cookie
      const mergedUser = { ...(u || {}), permission_names: names };
      setUser(mergedUser);
      Cookies.set('user', JSON.stringify(mergedUser), { expires: 1 });
    } catch (e) {
      // If something fails, keep going with empty permissions (elevated roles still work)
      console.error('hydratePermissions failed', e);
      setPermissionNames([]);
    } finally {
      setPermLoading(false);
    }
  };

  // Initial load from cookies
  useEffect(() => {
    (async () => {
      const userCookie = Cookies.get('user');
      const tokenCookie = Cookies.get('accessToken');
      if (userCookie && tokenCookie) {
        const u = JSON.parse(userCookie);
        setUser(u);

        // branches
        const branchesCookie = Cookies.get('accessibleBranches');
        const currentBranchCookie = Cookies.get('currentBranch');
        if (branchesCookie) setAccessibleBranches(JSON.parse(branchesCookie));
        if (currentBranchCookie) {
          setCurrentBranch(JSON.parse(currentBranchCookie));
        } else if (u.default_branch_id) {
          setCurrentBranch({ id: u.default_branch_id, name: u.branch_name });
        }

        // permissions
        await hydratePermissions(u);
      } else {
        setPermLoading(false);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (credentials) => {
    // v2 login
    const response = await loginApi(credentials);
    const { user: u, accessToken, refreshToken } = response.data.data || {};

    // Persist tokens (needed for subsequent bootstrap call)
    if (accessToken) Cookies.set('accessToken', accessToken, { expires: 1 });
    if (refreshToken) Cookies.set('refreshToken', refreshToken, { expires: 7 });

    // Try bootstrap (menus, permissions, features). Fall back to login user on error (403/Network)
    let mergedUser = { ...(u || {}) };
    try {
      const boot = await getUIBootstrap();
      const data = boot?.data?.data || {};
      if (data.me) mergedUser = { ...data.me };
    } catch (e) {
      // proceed with login payload; permissions hydration will fill missing bits
    }

    // Set user + branches
    setUser(mergedUser);
    const branches = mergedUser.accessibleBranches || [];
    setAccessibleBranches(branches);
    const defBranch = branches.find((b) => b.id === mergedUser.default_branch_id) || branches[0] || null;
    setCurrentBranch(defBranch || null);
    if (defBranch) setActiveBranchId(defBranch.id);

    // Cookies for persistence
    Cookies.set('user', JSON.stringify(mergedUser), { expires: 1 });
    Cookies.set('accessibleBranches', JSON.stringify(branches), { expires: 1 });
    if (defBranch) Cookies.set('currentBranch', JSON.stringify(defBranch), { expires: 1 });

    // Hydrate permissions (fallback in case bootstrap didn’t include)
    await hydratePermissions(mergedUser);
    return mergedUser;
  };

  const logout = () => {
    setUser(null);
    setPermissionNames([]);
    setPermLoading(false);
    setAccessibleBranches([]);
    setCurrentBranch(null);
    Cookies.remove('user');
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
    Cookies.remove('accessibleBranches');
    Cookies.remove('currentBranch');
  };

  const switchBranch = (branch) => {
    setCurrentBranch(branch);
    Cookies.set('currentBranch', JSON.stringify(branch), { expires: 1 });
    setActiveBranchId(branch?.id);
    window.location.reload();
  };

  // single source of truth for permission checks from components
  const hasPermission = (...keys) => {
    if (permLoading) return false;
    if (elevated) return true; // admin/manager override
    if (!keys?.length) return false;
    const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    const bag = new Set((permissionNames || []).map(norm));
    return keys.some((k) => bag.has(norm(k)));
  };


  const value = useMemo(
    () => ({
      user,
      loading,
      permLoading,
      login,
      logout,
      accessibleBranches,
      currentBranch,
      switchBranch,
      permissionNames,
      hasPermission,
      isElevated: elevated,
    }),
    [user, loading, permLoading, accessibleBranches, currentBranch, permissionNames, elevated]
  );

  return (
    <AuthContext.Provider value={value}>
      {!loading && !permLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
