import {
  getProducts as getProductsSvc,
  getProductById as getProductByIdSvc,
  createProduct as createProductSvc,
  updateProduct as updateProductSvc,
  deleteProduct as deleteProductSvc,
  searchIngredients as searchIngredientsSvc,
} from '@shared/api';

export const listProducts = (params) => getProductsSvc(params);
export const getProductById = (id) => getProductByIdSvc(id);
export const createProduct = (payload) => createProductSvc(payload);
export const updateProduct = (id, payload) => updateProductSvc(id, payload);
export const deleteProduct = (id) => deleteProductSvc(id);
export const searchIngredients = (params) => searchIngredientsSvc(params);

