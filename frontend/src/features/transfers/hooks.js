import { useQuery, useMutation, useQueryClient } from 'react-query';
import { listTransfers, getTransferById, createTransfer, updateTransferStatus } from './api';

export function useTransfers(params) {
  return useQuery(['transfers', params], () => listTransfers(params).then(r => r.data));
}

export function useTransfer(id) {
  return useQuery(['transfer', id], () => getTransferById(id).then(r => r.data), { enabled: !!id });
}

export function useCreateTransfer() {
  const qc = useQueryClient();
  return useMutation((payload) => createTransfer(payload).then(r => r.data), {
    onSuccess: () => qc.invalidateQueries(['transfers'])
  });
}

export function useUpdateTransferStatus(id) {
  const qc = useQueryClient();
  return useMutation((status) => updateTransferStatus(id, status).then(r => r.data), {
    onSuccess: () => {
      qc.invalidateQueries(['transfers']);
      qc.invalidateQueries(['transfer', id]);
    }
  });
}

