import {
  getSales as getSalesSvc,
  getSaleDetails as getSaleDetailsSvc,
  createSale as createSaleSvc,
} from '@/services/api';

export const listSales = (params) => getSalesSvc(params);
export const getSaleById = (id) => getSaleDetailsSvc(id);
export const createSale = (payload) => createSaleSvc(payload);

