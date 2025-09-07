import { useQuery, useMutation, useQueryClient } from 'react-query';
import { listCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer } from './api';

export function useCustomers(params) {
  return useQuery(['customers', params], () => listCustomers(params).then(r => r.data));
}

export function useCustomer(id) {
  return useQuery(['customer', id], () => getCustomerById(id).then(r => r.data), { enabled: !!id });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation((payload) => createCustomer(payload).then(r => r.data), {
    onSuccess: () => qc.invalidateQueries(['customers']),
  });
}

export function useUpdateCustomer(id) {
  const qc = useQueryClient();
  return useMutation((payload) => updateCustomer(id, payload).then(r => r.data), {
    onSuccess: () => {
      qc.invalidateQueries(['customers']);
      qc.invalidateQueries(['customer', id]);
    },
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation((id) => deleteCustomer(id).then(r => r.data), {
    onSuccess: () => qc.invalidateQueries(['customers']),
  });
}

