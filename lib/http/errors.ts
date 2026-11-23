/**
 * 文件职责：定义标准业务错误类 AppError、错误码常量表与语义化错误工厂函数（对应技术方案第 0.4 节）。
 */

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  FILE_TYPE_NOT_ALLOWED: 'FILE_TYPE_NOT_ALLOWED',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  USERNAME_TAKEN: 'USERNAME_TAKEN',
  STATUS_CONFLICT: 'STATUS_CONFLICT',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export class AppError extends Error {
  public readonly status: number;
  public readonly code: ErrorCode;
  public readonly fields?: Record<string, string>;

  constructor(status: number, code: ErrorCode, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

/**
 * 构造 400 参数或表单校验失败错误。
 * 输入：可选的字段错误映射 fields，可选的提示文案 message。
 * 输出：AppError 实例（HTTP 400）。
 * 业务规则：错误码固定为 VALIDATION_ERROR。
 */
export function validationError(fields?: Record<string, string>, message = '请检查表单'): AppError {
  return new AppError(400, ERROR_CODES.VALIDATION_ERROR, message, fields);
}

/**
 * 构造 400 文件扩展名或 MIME 类型不支持错误。
 * 输入：可选的字段错误映射 fields，可选的提示文案 message。
 * 输出：AppError 实例（HTTP 400）。
 * 业务规则：错误码固定为 FILE_TYPE_NOT_ALLOWED。
 */
export function fileTypeNotAllowed(message = '不支持的文件类型', fields?: Record<string, string>): AppError {
  return new AppError(400, ERROR_CODES.FILE_TYPE_NOT_ALLOWED, message, fields);
}

/**
 * 构造 401 未登录或会话失效错误。
 * 输入：可选的提示文案 message。
 * 输出：AppError 实例（HTTP 401）。
 * 业务规则：错误码固定为 AUTH_REQUIRED，触发外层路由清除会话 Cookie。
 */
export function authRequired(message = '请先登录'): AppError {
  return new AppError(401, ERROR_CODES.AUTH_REQUIRED, message);
}

/**
 * 构造 401 用户名或密码错误。
 * 输入：无。
 * 输出：AppError 实例（HTTP 401）。
 * 业务规则：不区分用户不存在与密码错误，统一返回 INVALID_CREDENTIALS。
 */
export function invalidCredentials(): AppError {
  return new AppError(401, ERROR_CODES.INVALID_CREDENTIALS, '用户名或密码错误');
}

/**
 * 构造 403 权限不足错误。
 * 输入：可选的提示文案 message。
 * 输出：AppError 实例（HTTP 403）。
 * 业务规则：用于角色不符或跨站 Origin 校验失败。
 */
export function forbidden(message = '无权执行该操作'): AppError {
  return new AppError(403, ERROR_CODES.FORBIDDEN, message);
}

/**
 * 构造 404 资源不存在或无权查看错误。
 * 输入：可选的提示文案 message。
 * 输出：AppError 实例（HTTP 404）。
 * 业务规则：非本人或非公开资源统一返回 404，避免泄露资源存在性。
 */
export function notFound(message = '内容不存在'): AppError {
  return new AppError(404, ERROR_CODES.NOT_FOUND, message);
}

/**
 * 构造 409 用户名已被占用错误。
 * 输入：无。
 * 输出：AppError 实例（HTTP 409）。
 * 业务规则：注册时用户名冲突返回 USERNAME_TAKEN 并附带字段提示。
 */
export function usernameTaken(): AppError {
  return new AppError(409, ERROR_CODES.USERNAME_TAKEN, '用户名已被使用', {
    username: '用户名已被使用',
  });
}

/**
 * 构造 409 当前状态不允许该操作错误。
 * 输入：可选的提示文案 message。
 * 输出：AppError 实例（HTTP 409）。
 * 业务规则：状态机校验不通过或上传令牌重复使用时抛出 STATUS_CONFLICT。
 */
export function statusConflict(message = '当前状态不允许该操作'): AppError {
  return new AppError(409, ERROR_CODES.STATUS_CONFLICT, message);
}

/**
 * 构造 413 文件超出大小限制错误。
 * 输入：可选的提示文案 message，可选的字段错误映射 fields。
 * 输出：AppError 实例（HTTP 413）。
 * 业务规则：错误码固定为 FILE_TOO_LARGE。
 */
export function fileTooLarge(message = '文件大小超出限制', fields?: Record<string, string>): AppError {
  return new AppError(413, ERROR_CODES.FILE_TOO_LARGE, message, fields);
}

/**
 * 构造 429 请求过于频繁错误。
 * 输入：可选的提示文案 message。
 * 输出：AppError 实例（HTTP 429）。
 * 业务规则：登录失败达到限流阈值时抛出 RATE_LIMITED。
 */
export function rateLimited(message = '登录尝试过于频繁，请稍后再试'): AppError {
  return new AppError(429, ERROR_CODES.RATE_LIMITED, message);
}

/**
 * 构造 502 对象存储读写失败错误。
 * 输入：可选的提示文案 message。
 * 输出：AppError 实例（HTTP 502）。
 * 业务规则：发布复制或撤回删除公开媒体失败时抛出 STORAGE_ERROR。
 */
export function storageError(message = '文件存储服务暂时不可用'): AppError {
  return new AppError(502, ERROR_CODES.STORAGE_ERROR, message);
}
