/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act } from 'react-dom/test-utils';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from 'react-query';
import Cookies from 'js-cookie';
import api, { getUIBootstrap, login as loginApi } from '../services/api';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('../services/api', () => ({
  __esModule: true,
  default: {
    getRoleById: vi.fn(),
  },
  getUIBootstrap: vi.fn(),
  setActiveBranchId: vi.fn(),
  login: vi.fn(),
}));

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Cookies.remove('user');
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
    Cookies.remove('accessibleBranches');
    Cookies.remove('currentBranch');
  });

  it('does not fetch roles for non-elevated users with permissions', async () => {
    loginApi.mockResolvedValue({
      data: { data: { user: { id: 1, permission_names: ['x.read'] } } },
    });
    getUIBootstrap.mockResolvedValue({ data: { data: {} } });

    let loginFn, logoutFn;
    function Child() {
      const { login, logout } = useAuth();
      loginFn = login;
      logoutFn = logout;
      return null;
    }

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const div = document.createElement('div');
    const root = ReactDOM.createRoot(div);
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Child />
          </AuthProvider>
        </QueryClientProvider>,
      );
    });

    await act(async () => {
      await loginFn({ username: 'u', password: 'p' });
    });

    expect(invalidateSpy).toHaveBeenCalledWith(['ui:menus']);
    expect(invalidateSpy).toHaveBeenCalledWith(['ui:perms']);
    expect(invalidateSpy).toHaveBeenCalledWith(['ui:features']);
    expect(invalidateSpy).toHaveBeenCalledWith(['ui:abac']);

    invalidateSpy.mockClear();

    await act(async () => {
      logoutFn();
    });

    expect(invalidateSpy).toHaveBeenCalledWith(['ui:menus']);
    expect(invalidateSpy).toHaveBeenCalledWith(['ui:perms']);
    expect(invalidateSpy).toHaveBeenCalledWith(['ui:features']);
    expect(invalidateSpy).toHaveBeenCalledWith(['ui:abac']);

    expect(api.getRoleById).not.toHaveBeenCalled();
  });

  it('skips role lookups for non-admins without permissions', async () => {
    loginApi.mockResolvedValue({ data: { data: { user: { id: 2 } } } });
    getUIBootstrap.mockResolvedValue({ data: { data: {} } });

    let loginFn;
    function Child() {
      const { login } = useAuth();
      loginFn = login;
      return null;
    }

    const queryClient = new QueryClient();
    const div = document.createElement('div');
    const root = ReactDOM.createRoot(div);
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Child />
          </AuthProvider>
        </QueryClientProvider>,
      );
    });

    await act(async () => {
      await loginFn({ username: 'u', password: 'p' });
    });

    expect(api.getRoleById).not.toHaveBeenCalled();
  });
});

