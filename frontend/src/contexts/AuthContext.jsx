import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import Cookies from 'js-cookie';
import api from '../services/api';

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
    try {
      const roleIds = extractRoleIds(u);
      const nameBag = new Set();

      // If backend already put permissions on user, merge them first
      const existing = []
        .concat(u?.permission_names || [])
        .concat(u?.permissions || [])
        .concat(u?.granted_permissions || []);
      existing.forEach((p) => {
        if (!p) return;
        if (typeof p === 'string') nameBag.add(p.toLowerCase());
        if (p?.name) nameBag.add(String(p.name).toLowerCase());
      });

      // Resolve from roles API (guaranteed)
      for (const rid of roleIds) {
        const res = await api.getRoleById(rid);
        const role = res?.data?.data;
        (role?.permissions || []).forEach((perm) => {
          if (perm?.name) nameBag.add(String(perm.name).toLowerCase());
        });
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
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (credentials) => {
    const response = await api.login(credentials);
    const { user: u, accessToken, refreshToken } = response.data.data;

    // set base user + branches
    setUser(u);
    setAccessibleBranches(u.accessibleBranches || []);
    const defBranch = (u.accessibleBranches || []).find((b) => b.id === u.default_branch_id)
      || (u.accessibleBranches || [])[0]
      || null;
    setCurrentBranch(defBranch || null);

    // cookies
    Cookies.set('user', JSON.stringify(u), { expires: 1 });
    Cookies.set('accessToken', accessToken, { expires: 1 });
    Cookies.set('refreshToken', refreshToken, { expires: 7 });
    Cookies.set('accessibleBranches', JSON.stringify(u.accessibleBranches || []), { expires: 1 });
    if (defBranch) Cookies.set('currentBranch', JSON.stringify(defBranch), { expires: 1 });

    // permissions (await before returning so POS gets it immediately)
    await hydratePermissions(u);
    return u;
  };

  const logout = () => {
    setUser(null);
    setPermissionNames([]);
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
    window.location.reload();
  };

  // single source of truth for permission checks from components
  const hasPermission = (...keys) => {
    if (elevated) return true; // admin/manager override
    if (!keys?.length) return false;
    const bag = new Set((permissionNames || []).map((s) => String(s).toLowerCase()));
    return keys.some((k) => bag.has(String(k).toLowerCase()));
  };


const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      accessibleBranches,
      currentBranch,
      switchBranch,
      permissionNames,
      hasPermission,
      isElevated: elevated,
    }),
    [user, loading, accessibleBranches, currentBranch, permissionNames, elevated]
  );

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

  // const value = {
  //   user,
  //   loading,
  //   login,
  //   logout,
  //   accessibleBranches,
  //   currentBranch,
  //   switchBranch,
  //   // permissions
  //   permissionNames,
  //   hasPermission,
  //   isElevated: elevated,
  // };

  // return (
  //   <AuthContext.Provider value={value}>
  //     {!loading && children}
  //   </AuthContext.Provider>
  // );
// };

export const useAuth = () => useContext(AuthContext);

