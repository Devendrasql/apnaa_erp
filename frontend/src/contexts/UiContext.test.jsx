import { describe, expect, it } from 'vitest';
import { evaluate } from './UiContext';

describe('evaluate', () => {
  it('denies access for unsupported condition arrays', () => {
    const policy = { conditions: [] };
    expect(evaluate(policy, { user: { role: 'admin' } })).toBe(false);
  });

  it('denies access for malformed rules', () => {
    const policy = { conditions: { '==': [{ var: 'flag' }, { unsupported: true }] } };
    expect(evaluate(policy, { flag: true })).toBe(false);
  });

  it('denies access when conditions are missing', () => {
    const policy = {};
    expect(evaluate(policy, { user: { role: 'admin' } })).toBe(false);
  });

  it('denies access for invalid JSON condition strings', () => {
    const policy = { condition: '{invalid}' };
    expect(evaluate(policy, { user: { role: 'admin' } })).toBe(false);
  });

  it('denies access for unknown operators', () => {
    const policy = { conditions: { unknown: [{ var: 'role' }, 'admin'] } };
    expect(evaluate(policy, { role: 'admin' })).toBe(false);
  });

  it('denies access when "in" operand is not an array', () => {
    const policy = { conditions: { in: [{ var: 'role' }, 'admin'] } };
    expect(evaluate(policy, { role: 'admin' })).toBe(false);
  });

  it('denies access when conditions are not objects', () => {
    const policy = { conditions: 42 };
    expect(evaluate(policy, { role: 'admin' })).toBe(false);
  });
});

