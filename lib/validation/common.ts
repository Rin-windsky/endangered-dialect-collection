/**
 * 文件职责：提供通用分页参数校验与路径 UUID 参数解析工具。
 */

import { z } from 'zod';
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '@/lib/constants';
import { notFound } from '@/lib/http/errors';

const uuidSchema = z.uuid();

export const paginationFields = {
  page: z.coerce
    .number({ error: '页码必须是数字' })
    .int('页码必须是整数')
    .min(1, '页码至少为 1')
    .default(DEFAULT_PAGE),
  limit: z.coerce
    .number({ error: '每页条数必须是数字' })
    .int('每页条数必须是整数')
    .min(1, '每页条数至少为 1')
    .max(MAX_LIMIT, `每页最多 ${MAX_LIMIT} 条`)
    .default(DEFAULT_LIMIT),
};

export const paginationSchema = z.object(paginationFields);

/**
 * 校验并提取路径中的 UUID 参数。
 * 输入：路由动态参数值 id（可能是 string、string[] 或 undefined）。
 * 输出：合法的 UUID 字符串。
 * 业务规则：参数非合法 UUID 时统一抛出 404 NOT_FOUND，避免泄露无效 ID 格式细节。
 */
export function parseIdParam(id: string | string[] | undefined): string {
  if (typeof id !== 'string') {
    throw notFound();
  }
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) {
    throw notFound();
  }
  return parsed.data;
}
