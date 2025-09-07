import {
  getAllRoles as getAllRolesSvc,
  getRoleById as getRoleByIdSvc,
  updateRole as updateRoleSvc,
  getAllPermissions as listPermissionsSvc,
  createPermission as createPermissionSvc,
} from '@/services/api';

const API_PREFIX = import.meta.env.VITE_API_PREFIX || '/api/v2';

export const listRoles = (params) => getAllRolesSvc(params);
export const getRoleById = (id) => getRoleByIdSvc(id);
export const updateRole = (id, payload) => updateRoleSvc(id, payload);
export const listPermissions = () => listPermissionsSvc();
export const createPermission = (payload) => createPermissionSvc(payload);
