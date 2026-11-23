/**
 * 文件职责：提供全项目唯一的路由统一包装器 withRoute，负责同源校验、异常转 HTTP 响应与脱敏请求日志。
 */

import type { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { clearSessionCookie } from '@/lib/auth/session';
import { getConfig } from '@/lib/config';
import { AppError, ERROR_CODES, forbidden } from './errors';
import { errorResponse } from './response';

export type RouteContext = {
  params: Promise<Record<string, string | string[] | undefined>>;
};

type RouteHandler = (req: NextRequest, ctx: RouteContext) => Promise<Response>;

const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

function assertSameOriginOnWrite(req: NextRequest): void {
  if (!WRITE_METHODS.has(req.method)) {
    return;
  }

  const origin = req.headers.get('origin');
  // 未携带 Origin 头的非浏览器/同源脚本请求按技术方案放行；浏览器跨站写请求必带 Origin
  if (!origin) {
    return;
  }

  const expectedOrigin = getConfig().siteOrigin;
  if (origin !== expectedOrigin) {
    throw forbidden('跨站请求被拒绝');
  }
}

function extractZodFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const fieldKey = issue.path.length > 0 ? issue.path.join('.') : '_root';
    if (!(fieldKey in fields)) {
      fields[fieldKey] = issue.message;
    }
  }
  return fields;
}

function logRequest(method: string, path: string, status: number, durationMs: number, errorCode?: string): void {
  if (errorCode) {
    console.info(`[api] ${method} ${path} ${status} ${durationMs}ms ${errorCode}`);
    return;
  }
  console.info(`[api] ${method} ${path} ${status} ${durationMs}ms`);
}

/**
 * 包装 Next.js Route Handler，集中执行写操作同源检查、统一异常捕获和脱敏日志打印。
 * 输入：业务路由处理函数 handler。
 * 输出：标准 Next.js Route Handler 函数。
 * 业务规则：
 * 1. 写操作存在 Origin 头且与 SITE_URL 不同源时返回 403 FORBIDDEN。
 * 2. AppError 按状态码与错误码转换，ZodError 转为 400 VALIDATION_ERROR，未知异常转为 500 INTERNAL_ERROR。
 * 3. 错误码为 AUTH_REQUIRED 时自动清除会话 Cookie。
 * 4. 请求日志严禁打印密码、Cookie、JWT 与完整请求体。
 */
export function withRoute(
  handler: RouteHandler
): (req: NextRequest, ctx: RouteContext) => Promise<Response> {
  return async (req: NextRequest, ctx: RouteContext): Promise<Response> => {
    const startMs = Date.now();
    const method = req.method;
    const path = req.nextUrl.pathname;

    try {
      assertSameOriginOnWrite(req);
      const response = await handler(req, ctx);
      const durationMs = Date.now() - startMs;
      logRequest(method, path, response.status, durationMs);
      return response;
    } catch (err) {
      const durationMs = Date.now() - startMs;

      if (err instanceof AppError) {
        const res = errorResponse(err.code, err.status, err.message, err.fields);
        // 会话失效或无权凭证时主动清理客户端 Cookie
        if (err.code === ERROR_CODES.AUTH_REQUIRED) {
          clearSessionCookie(res);
        }
        logRequest(method, path, err.status, durationMs, err.code);
        return res;
      }

      if (err instanceof ZodError) {
        const fields = extractZodFields(err);
        const res = errorResponse(ERROR_CODES.VALIDATION_ERROR, 400, '请检查表单', fields);
        logRequest(method, path, 400, durationMs, ERROR_CODES.VALIDATION_ERROR);
        return res;
      }

      console.error(`[api] 未预期异常 ${method} ${path}:`, err);
      const res = errorResponse(ERROR_CODES.INTERNAL_ERROR, 500, '服务器内部错误');
      logRequest(method, path, 500, durationMs, ERROR_CODES.INTERNAL_ERROR);
      return res;
    }
  };
}
