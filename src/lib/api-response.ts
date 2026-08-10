/**
 * API response helpers — consistent JSON envelope for all routes.
 */
import { NextResponse } from 'next/server';

export type ApiErrorCode =
  | 'not_found'
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limited'
  | 'required_fields'
  | 'invalid_credentials'
  | 'duplicate_account'
  | 'invalid_email'
  | 'weak_password'
  | 'validation_failed'
  | 'generic_failure'
  | 'asset_not_found'
  | 'asset_fetch_failed'
  | 'asset_create_failed'
  | 'asset_update_failed'
  | 'asset_delete_failed'
  | 'category_not_found'
  | 'category_fetch_failed'
  | 'category_create_failed'
  | 'category_update_failed'
  | 'category_delete_failed'
  | 'assets_fetch_failed'
  | 'assets_create_failed'
  | 'download_failed';

export type ApiErrorParams = Record<string, string | number>;

export interface ApiError {
  code: ApiErrorCode;
  params?: ApiErrorParams;
}

const API_ERROR_CODES = new Set<ApiErrorCode>([
  'not_found',
  'unauthorized',
  'forbidden',
  'rate_limited',
  'required_fields',
  'invalid_credentials',
  'duplicate_account',
  'invalid_email',
  'weak_password',
  'validation_failed',
  'generic_failure',
  'asset_not_found',
  'asset_fetch_failed',
  'asset_create_failed',
  'asset_update_failed',
  'asset_delete_failed',
  'category_not_found',
  'category_fetch_failed',
  'category_create_failed',
  'category_update_failed',
  'category_delete_failed',
  'assets_fetch_failed',
  'assets_create_failed',
  'download_failed',
]);

/** Standard success response */
export function success<T>(data: T, status = 200) {
  return NextResponse.json({ data, error: null }, { status });
}

/** Standard error response */
export function err(message: string, status = 400, params?: ApiErrorParams) {
  const error = API_ERROR_CODES.has(message as ApiErrorCode)
    ? { code: message, ...(params ? { params } : {}) }
    : { code: 'generic_failure' };
  return NextResponse.json({ data: null, error }, { status });
}

/** Not found */
export function notFound(code: ApiErrorCode = 'not_found') {
  return err(code, 404);
}

export function assetNotFound() {
  return notFound('asset_not_found');
}

export function categoryNotFound() {
  return notFound('category_not_found');
}

/** Unauthorized */
export function unauthorized() {
  return err('unauthorized', 401);
}

/** Forbidden */
export function forbidden() {
  return err('forbidden', 403);
}

/** Rate limited */
export function rateLimited() {
  return NextResponse.json(
    { data: null, error: { code: 'rate_limited', params: { retryAfterSeconds: 3600 } } },
    { status: 429, headers: { 'Retry-After': '3600' } },
  );
}
