import { formatMessage } from '@/i18n/server';
import type { Dictionary, Message, MessageValues } from '@/i18n/types';

type ErrorMessageKey = keyof Dictionary['errors'];

const CODE_TO_MESSAGE: Record<string, ErrorMessageKey> = {
  unauthorized: 'unauthorized',
  forbidden: 'forbidden',
  required_fields: 'requiredFields',
  invalid_credentials: 'invalidCredentials',
  duplicate_account: 'duplicateAccount',
  invalid_email: 'validationFailed',
  weak_password: 'validationFailed',
  validation_failed: 'validationFailed',
  rate_limited: 'rateLimited',
  not_found: 'generic',
  asset_not_found: 'assetNotFound',
  asset_fetch_failed: 'failedToLoadAssets',
  assets_fetch_failed: 'failedToLoadAssets',
  asset_create_failed: 'failedToCreateAsset',
  assets_create_failed: 'failedToCreateAsset',
  asset_update_failed: 'failedToUpdateAsset',
  asset_delete_failed: 'failedToDeleteAsset',
  category_not_found: 'categoryNotFound',
  category_fetch_failed: 'failedToLoadCategories',
  category_create_failed: 'failedToCreateCategory',
  category_update_failed: 'failedToUpdateCategory',
  category_delete_failed: 'failedToDeleteCategory',
  download_failed: 'failedToDownload',
  generic_failure: 'generic',
};

const text = (message: Message) => typeof message === 'function' ? message() : message;

export function getApiErrorCode(error: unknown): string | undefined {
  try {
    if (!error || typeof error !== 'object' || !Object.prototype.hasOwnProperty.call(error, 'code')) return undefined;
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  } catch {
    return undefined;
  }
}

function getApiErrorParams(error: unknown): MessageValues {
  try {
    if (!error || typeof error !== 'object' || !Object.prototype.hasOwnProperty.call(error, 'params')) return {};
    const params = (error as { params?: unknown }).params;
    if (!params || typeof params !== 'object') return {};
    return Object.fromEntries(
      Object.entries(params).filter(([, value]) => typeof value === 'string' || typeof value === 'number'),
    );
  } catch {
    return {};
  }
}

function localizeRateLimit(dictionary: Dictionary, params: MessageValues): string {
  if (!Object.prototype.hasOwnProperty.call(params, 'retryAfterSeconds')) {
    return text(dictionary.errors.rateLimitedGeneric);
  }

  return formatMessage(text(dictionary.errors.rateLimited), params);
}

export function localizeApiError(
  dictionary: Dictionary,
  error: unknown,
  status: number,
  fallback: Message,
): string {
  const code = getApiErrorCode(error);
  if (code) {
    const key = Object.prototype.hasOwnProperty.call(CODE_TO_MESSAGE, code)
      ? CODE_TO_MESSAGE[code]
      : undefined;
    if (!key) return text(dictionary.errors.generic);
     const params = getApiErrorParams(error);
     return code === 'rate_limited'
       ? localizeRateLimit(dictionary, params)
       : formatMessage(text(dictionary.errors[key]), params);
  }

  if (status === 401) return text(dictionary.errors.unauthorized);
  if (status === 403) return text(dictionary.errors.forbidden);
   if (status === 429) return text(dictionary.errors.rateLimitedGeneric);
  if (status === 404) return text(dictionary.errors.generic);
  return text(fallback);
}

export async function localizeResponseError(
  response: Response,
  dictionary: Dictionary,
  fallback: Message,
): Promise<string> {
  const body = await response.json().catch(() => null) as { error?: unknown } | null;
  return localizeApiError(dictionary, body?.error, response.status, fallback);
}
