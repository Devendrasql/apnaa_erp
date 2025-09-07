import { useQuery, useMutation, useQueryClient } from 'react-query';
import { listStock, addStock, adjustStock } from './api';

export function useInventory(params) {
  return useQuery(['inventory', params], () => listStock(params).then(r => r.data));
}

export function useAddStock() {
  const qc = useQueryClient();
  return useMutation((payload) => addStock(payload).then(r => r.data), {
    onSuccess: () => qc.invalidateQueries(['inventory']),
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation((payload) => adjustStock(payload).then(r => r.data), {
    onSuccess: () => qc.invalidateQueries(['inventory']),
  });
}

