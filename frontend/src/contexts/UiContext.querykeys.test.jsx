/* eslint-env jest */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';

const useQueryMock = vi.fn(() => ({ data: undefined, isLoading: false }));
vi.mock('react-query', () => ({ useQuery: useQueryMock }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 1 } }) }));

import { UiProvider } from './UiContext.jsx';

describe('UiContext query keys', () => {
  it('include user id for ui metadata queries', () => {
    const div = document.createElement('div');
    act(() => {
      createRoot(div).render(<UiProvider>test</UiProvider>);
    });
    const keys = useQueryMock.mock.calls.map(c => c[0]);
    expect(keys).toContainEqual(['ui:menus', 1]);
    expect(keys).toContainEqual(['ui:perms', 1]);
    expect(keys).toContainEqual(['ui:features', 1]);
    expect(keys).toContainEqual(['ui:abac', 1]);
  });
});
