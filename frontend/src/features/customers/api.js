import {
  getCustomers as getCustomersSvc,
  createCustomer as createCustomerSvc,
  updateCustomer as updateCustomerSvc,
  deleteCustomer as deleteCustomerSvc,
  getCustomerById as getCustomerByIdSvc,
} from '@/services/api';

export const listCustomers = (params) => getCustomersSvc(params);
export const getCustomerById = (id) => getCustomerByIdSvc(id);
export const createCustomer = (payload) => createCustomerSvc(payload);
export const updateCustomer = (id, payload) => updateCustomerSvc(id, payload);
export const deleteCustomer = (id) => deleteCustomerSvc(id);

