import { useQuery, useMutation, useQueryClient } from 'react-query';
import { listUsers, getUserById, createUser, updateUser, deleteUser } from './api';

export function useUsers(params) {
  return useQuery(['users', params], () => listUsers(params).then(r => r.data));
}

export function useUser(id) {
  return useQuery(['user', id], () => getUserById(id).then(r => r.data), { enabled: !!id });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation((payload) => createUser(payload).then(r => r.data), {
    onSuccess: () => qc.invalidateQueries(['users']),
  });
}

export function useUpdateUser(id) {
  const qc = useQueryClient();
  return useMutation((payload) => updateUser(id, payload).then(r => r.data), {
    onSuccess: () => {
      qc.invalidateQueries(['users']);
      qc.invalidateQueries(['user', id]);
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation((id) => deleteUser(id).then(r => r.data), {
    onSuccess: () => qc.invalidateQueries(['users']),
  });
}

