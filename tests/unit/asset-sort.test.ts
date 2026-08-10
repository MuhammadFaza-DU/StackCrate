import { describe, it, expect } from 'vitest';
import { resolveSort } from '@/lib/asset-sort';

describe('resolveSort', () => {
  it('maps newest → created_at desc (default)', () => {
    expect(resolveSort('newest')).toEqual({ column: 'created_at', ascending: false });
    expect(resolveSort('')).toEqual({ column: 'created_at', ascending: false });
    expect(resolveSort('garbage')).toEqual({ column: 'created_at', ascending: false });
  });

  it('maps oldest → created_at asc', () => {
    expect(resolveSort('oldest')).toEqual({ column: 'created_at', ascending: true });
  });

  it('maps downloads → download_count desc', () => {
    expect(resolveSort('downloads')).toEqual({ column: 'download_count', ascending: false });
  });

  it('maps views → view_count desc', () => {
    expect(resolveSort('views')).toEqual({ column: 'view_count', ascending: false });
  });

  it('maps title → title asc', () => {
    expect(resolveSort('title')).toEqual({ column: 'title', ascending: true });
  });
});
