import {
  getUsers as getUsersSvc,
  getUserById as getUserByIdSvc,
  createUser as createUserSvc,
  updateUser as updateUserSvc,
  deleteUser as deleteUserSvc,
} from '@/services/api';

export const listUsers = (params) => getUsersSvc(params);
export const getUserById = (id) => getUserByIdSvc(id);
export const createUser = (payload) => createUserSvc(payload);
export const updateUser = (id, payload) => updateUserSvc(id, payload);
export const deleteUser = (id) => deleteUserSvc(id);

