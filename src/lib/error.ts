/**
 * Extract a human-readable error message from an unknown thrown value.
 * Replaces the use of `catch (e: any)` everywhere in the API layer.
 */
export function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  if (e && typeof e === 'object' && 'message' in e) {
    const msg = (e as { message: unknown }).message;
    if (typeof msg === 'string') return msg;
  }
  return 'Unknown error';
}
