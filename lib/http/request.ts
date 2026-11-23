/**
 * 文件职责：提供 HTTP 请求体解析、查询参数提取与客户端 IP 提取工具函数。
 */

import type { NextRequest } from 'next/server';
import { validationError } from './errors';

/**
 * 安全读取 JSON 请求体。
 * 输入：NextRequest 请求对象。
 * 输出：解析后的未知类型 JSON 值（空请求体时返回 {}）。
 * 业务规则：请求体存在但非合法 JSON 时抛出 400 VALIDATION_ERROR，不吞掉解析异常。
 */
export async function readJson(req: NextRequest): Promise<unknown> {
  const rawText = await req.text();
  if (rawText.trim() === '') {
    return {};
  }

  try {
    return JSON.parse(rawText);
  } catch {
    throw validationError(undefined, '请求体不是合法的 JSON 格式');
  }
}

/**
 * 将 URL 查询参数转换为普通键值对象，便于交由 Zod 校验。
 * 输入：NextRequest 请求对象。
 * 输出：键值对记录（同一参数仅保留首次出现的值）。
 * 业务规则：保持原始字符串值，由下游 Zod schema 统一执行类型转换与校验。
 */
export function searchParamsToObject(req: NextRequest): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of req.nextUrl.searchParams.entries()) {
    if (!(key in result)) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * 提取请求来源 IP 地址（用于登录限流键生成）。
 * 输入：NextRequest 请求对象。
 * 输出：IP 字符串；无法识别时返回 'unknown'。
 * 业务规则：优先取 x-forwarded-for 的第一段非空地址，其次取 x-real-ip。
 */
export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstPart = forwardedFor.split(',')[0].trim();
    if (firstPart.length > 0) {
      return firstPart;
    }
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp && realIp.trim().length > 0) {
    return realIp.trim();
  }

  return 'unknown';
}
