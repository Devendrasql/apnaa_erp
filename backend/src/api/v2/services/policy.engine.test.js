'use strict';

const { evaluate } = require('./policy.engine');

describe('policy engine safety', () => {
  const ctx = { user: { org_id: 1, permissions: [] }, branchId: 1 };

  test('does not allow access when conditions are null', () => {
    const policies = [{ effect: 'allow', conditions: null }];
    const result = evaluate(policies, ctx);
    expect(result.decision).toBe('neutral');
  });

  test('does not allow access when conditions are not objects', () => {
    const policies = [{ effect: 'allow', conditions: 'bad' }];
    const result = evaluate(policies, ctx);
    expect(result.decision).toBe('neutral');
  });

  test('does not allow access for unsupported node types', () => {
    const policies = [{ effect: 'allow', conditions: { foo: 'bar' } }];
    const result = evaluate(policies, ctx);
    expect(result.decision).toBe('neutral');
  });
});

