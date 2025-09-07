import { useQuery, useMutation, useQueryClient } from 'react-query';
import { listSales, getSaleById, createSale } from './api';

export function useSales(params) {
  return useQuery(['sales', params], () => listSales(params).then(r => r.data));
}

export function useSale(id) {
  return useQuery(['sale', id], () => getSaleById(id).then(r => r.data), { enabled: !!id });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation((payload) => createSale(payload).then(r => r.data), {
    onSuccess: () => qc.invalidateQueries(['sales']),
  });
}

