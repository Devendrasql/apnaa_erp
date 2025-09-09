/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act } from 'react-dom/test-utils';
import ReactDOM from 'react-dom/client';
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
  });

  it('does not fetch roles for non-elevated users with permissions', async () => {
    loginApi.mockResolvedValue({
      data: { data: { user: { id: 1, permission_names: ['x.read'] } } },
    });
    getUIBootstrap.mockResolvedValue({ data: { data: {} } });

    let loginFn;
    function Child() {
      const { login } = useAuth();
      loginFn = login;
      return null;
    }

    const div = document.createElement('div');
    const root = ReactDOM.createRoot(div);
    await act(async () => {
      root.render(
        <AuthProvider>
          <Child />
        </AuthProvider>,
      );
    });

    await act(async () => {
      await loginFn({ username: 'u', password: 'p' });
    });

    expect(api.getRoleById).not.toHaveBeenCalled();
  });
});

