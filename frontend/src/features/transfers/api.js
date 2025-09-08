import {
  getStockTransfers as getTransfersSvc,
  getStockTransferById as getTransferByIdSvc,
  createStockTransfer as createTransferSvc,
  updateTransferStatus as updateTransferStatusSvc,
} from '@shared/api';

export const listTransfers = (params) => getTransfersSvc(params);
export const getTransferById = (id) => getTransferByIdSvc(id);
export const createTransfer = (payload) => createTransferSvc(payload);
export const updateTransferStatus = (id, status) => updateTransferStatusSvc(id, status);

