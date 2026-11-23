/**
 * 文件职责：封装标准 JSON 成功响应、204 无内容响应与统一错误响应格式（对应技术方案第 0.2 节）。
 */

import { NextResponse } from 'next/server';
import type { ErrorCode } from './errors';

/**
 * 返回标准 JSON 成功响应。
 * 输入：响应体对象 data，可选 HTTP 状态码（默认 200）。
 * 输出：NextResponse 实例。
 * 业务规则：单资源或列表直接序列化返回，不做额外外层包装。
 */
export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * 返回 204 无内容成功响应。
 * 输入：无。
 * 输出：HTTP 204 NextResponse 实例。
 * 业务规则：用于退出登录等无需响应体的接口。
 */
export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * 返回符合契约的错误 JSON 响应。
 * 输入：错误码 code、HTTP 状态码 status、错误描述 message、可选字段错误映射 fields。
 * 输出：NextResponse 实例，结构为 { error: { code, message, fields? } }。
 * 业务规则：仅在 fields 存在且非空时输出 fields 属性。
 */
export function errorResponse(
  code: ErrorCode,
  status: number,
  message: string,
  fields?: Record<string, string>
): NextResponse {
  const errorPayload: {
    code: ErrorCode;
    message: string;
    fields?: Record<string, string>;
  } = {
    code,
    message,
  };

  if (fields && Object.keys(fields).length > 0) {
    errorPayload.fields = fields;
  }

  return NextResponse.json({ error: errorPayload }, { status });
}
