'use strict';

jest.mock('./database', () => ({
  executeQuery: jest.fn(),
}));

const { executeQuery } = require('./database');
const { buildForUser } = require('./menuBuilder');

describe('menuBuilder buildForUser', () => {
  const menus = [
    { id: 1, parent_id: null, code: 'dashboard', label: 'Dashboard', route_path: '/dashboard', icon: null, sort_order: 1, is_active: 1 },
    { id: 2, parent_id: null, code: 'admin', label: 'Admin', route_path: '/admin', icon: null, sort_order: 2, is_active: 1 },
  ];

  const menuPerms = [
    { menu_id: 2, permission_name: 'admin:access' },
  ];

  beforeEach(() => {
    executeQuery.mockReset();
    executeQuery.mockImplementation((sql, params) => {
      if (sql.includes('FROM menus')) {
        return Promise.resolve(menus);
      }
      if (sql.includes('FROM menu_permissions')) {
        return Promise.resolve(menuPerms);
      }
      if (sql.includes('FROM role_permissions')) {
        const roleId = params[0];
        if (roleId === 1) {
          return Promise.resolve([{ name: 'admin:access' }]);
        }
        if (roleId === 2) {
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    });
  });

  test('includes gated menus when role has permission', async () => {
    const tree = await buildForUser({ role_id: 1 });
    expect(tree).toEqual([
      { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: null, sort_order: 1, children: [] },
      { key: 'admin', label: 'Admin', path: '/admin', icon: null, sort_order: 2, children: [] },
    ]);
  });

  test('excludes gated menus when role lacks permission', async () => {
    const tree = await buildForUser({ role_id: 2 });
    expect(tree).toEqual([
      { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: null, sort_order: 1, children: [] },
    ]);
  });
});

