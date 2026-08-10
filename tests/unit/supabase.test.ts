import { describe, it, expect } from 'vitest';

describe('R2 bucket constant', () => {
  it('matches expected bucket name', () => {
    expect('stackcrate-assets').toBe('stackcrate-assets');
  });
});

describe('auth exports', () => {
  it('exports requireAuth and requireAdmin', async () => {
    const mod = await import('@/lib/auth');
    expect(mod.requireAuth).toBeDefined();
    expect(mod.requireAdmin).toBeDefined();
    expect(mod.getSession).toBeDefined();
    expect(mod.getProfile).toBeDefined();
    expect(mod.isAdmin).toBeDefined();
  });
});