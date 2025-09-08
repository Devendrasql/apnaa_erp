import { useQuery, useMutation, useQueryClient } from 'react-query';
import { listProducts, getProductById, createProduct, updateProduct, deleteProduct, searchIngredients } from './api';

export function useProducts(params) {
  return useQuery(['products', params], () => listProducts(params).then(r => r.data));
}

export function useProduct(id) {
  return useQuery(['product', id], () => getProductById(id).then(r => r.data?.data ?? r.data), { enabled: !!id });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation((payload) => createProduct(payload).then(r => r.data?.data ?? r.data), {
    onSuccess: () => qc.invalidateQueries(['products']),
  });
}

export function useUpdateProduct(id) {
  const qc = useQueryClient();
  return useMutation((payload) => updateProduct(id, payload).then(r => r.data?.data ?? r.data), {
    onSuccess: () => {
      qc.invalidateQueries(['products']);
      qc.invalidateQueries(['product', id]);
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation((id) => deleteProduct(id).then(r => r.data?.data ?? r.data), {
    onSuccess: () => qc.invalidateQueries(['products']),
  });
}

export function useSearchIngredients(params) {
  return useQuery(['products:ingredients', params], () => searchIngredients(params).then(r => r.data?.data ?? r.data), { enabled: !!params });
}

