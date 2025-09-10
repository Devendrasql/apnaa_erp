import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  listRoles,
  getRoleById,
  updateRole,
  listPermissions,
  createPermission,
  getRoleFeatures,
  updateRoleFeatures,
} from './api';

export function useRoles(params) {
  return useQuery(['roles', params], () => listRoles(params).then(r => r.data?.data ?? r.data));
}

export function useRole(id) {
  return useQuery(['role', id], () => getRoleById(id).then(r => r.data?.data ?? r.data), { enabled: !!id });
}

export function useUpdateRole(id) {
  const qc = useQueryClient();
  return useMutation((payload) => updateRole(id, payload).then(r => r.data?.data ?? r.data), {
    onSuccess: () => {
      qc.invalidateQueries(['roles']);
      qc.invalidateQueries(['role', id]);
    }
  });
}

export function usePermissions() {
  return useQuery(['roles:permissions'], () => listPermissions().then(r => r.data?.data ?? r.data));
}

export function useCreatePermission() {
  const qc = useQueryClient();
  return useMutation((payload) => createPermission(payload).then(r => r.data?.data ?? r.data), {
    onSuccess: () => qc.invalidateQueries(['roles:permissions'])
  });
}

export function useRoleFeatures(id, options = {}) {
  return useQuery(['roleFeatures', id], () => getRoleFeatures(id).then(r => r.data?.data ?? r.data), { enabled: !!id, ...options });
}

export function useUpdateRoleFeatures(id) {
  const qc = useQueryClient();
  return useMutation((payload) => updateRoleFeatures(id, payload).then(r => r.data?.data ?? r.data), {
    onSuccess: () => {
      qc.invalidateQueries(['roleFeatures', id]);
    }
  });
}

