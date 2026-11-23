/**
 * 文件职责：集中维护系统枚举常量、会话参数、分页参数、签名有效期及存储桶名称。
 */

export const ROLES = ['contributor', 'reviewer'] as const;
export const ITEM_STATUSES = ['pending', 'needs_changes', 'published', 'withdrawn'] as const;
export const CONTENT_TYPES = ['story', 'phrase', 'rhyme', 'proverb'] as const;
export const VISUAL_TYPES = ['image', 'video'] as const;
export const SUBMITTER_CREDIT_MODES = ['anonymous', 'nickname'] as const;

export const SESSION_COOKIE_NAME = 'xy_session';
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 12;
export const MAX_LIMIT = 50;

export const UPLOAD_SIGN_EXPIRES_SECONDS = 3600;
export const DOWNLOAD_SIGN_EXPIRES_SECONDS = 600;

export const PRIVATE_BUCKET = 'private-uploads' as const;
export const PUBLIC_BUCKET = 'public-media' as const;

export const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 10;
export const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
