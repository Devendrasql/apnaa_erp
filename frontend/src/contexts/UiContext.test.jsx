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
});

