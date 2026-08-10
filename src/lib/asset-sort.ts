export type SortColumn = 'created_at' | 'download_count' | 'view_count' | 'title';

export interface SortClause {
  column: SortColumn;
  ascending: boolean;
}

/**
 * Maps the ?sort= query param to a Supabase order clause.
 * Unknown/empty values default to newest (created_at desc).
 */
export function resolveSort(sort: string): SortClause {
  switch (sort) {
    case 'oldest':
      return { column: 'created_at', ascending: true };
    case 'downloads':
      return { column: 'download_count', ascending: false };
    case 'views':
      return { column: 'view_count', ascending: false };
    case 'title':
      return { column: 'title', ascending: true };
    case 'newest':
    default:
      return { column: 'created_at', ascending: false };
  }
}
