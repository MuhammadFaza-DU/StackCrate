/**
 * Shared constants for the StackCrate API.
 */

/** Rate-limit: max downloads per IP per window */
export const RATE_LIMIT_MAX = 10;
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/** File size limits (bytes) */
export const MAX_AUDIO_SIZE = 100 * 1024 * 1024;   // 100 MB
export const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB

/** Allowed MIME types for upload */
export const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp3',
  'audio/x-m4a',
  'audio/aac',
];

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
];

export const ALLOWED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];
export const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogv', '.mov'];

/** Pagination defaults */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** R2 storage keys prefix */
export const R2_PREFIX_AUDIO = 'audio/';
export const R2_PREFIX_VIDEO = 'video/';