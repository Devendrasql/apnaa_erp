import {
  getStock as getStockSvc,
  addStock as addStockSvc,
  adjustStock as adjustStockSvc,
} from '@/services/api';

export const listStock = (params) => getStockSvc(params);
export const addStock = (payload) => addStockSvc(payload);
export const adjustStock = (payload) => adjustStockSvc(payload);

