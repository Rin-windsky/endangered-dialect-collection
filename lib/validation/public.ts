/**
 * 文件职责：定义公开浏览接口与我的投稿列表接口的查询参数 Zod 校验 Schema。
 */

import { z } from 'zod';
import { CONTENT_TYPES, ITEM_STATUSES } from '@/lib/constants';
import { paginationFields } from './common';

function emptyToUndefined(val: unknown): unknown {
  if (typeof val === 'string' && val.trim() === '') {
    return undefined;
  }
  return val;
}

export const collectionsQuerySchema = z.object({
  q: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(50, '搜索关键字最多 50 个字').optional()
  ),
  type: z.preprocess(
    emptyToUndefined,
    z.enum(CONTENT_TYPES, { error: '内容类型参数无效' }).optional()
  ),
  languageId: z.preprocess(
    emptyToUndefined,
    z.uuid('方言 ID 格式无效').optional()
  ),
  regionId: z.preprocess(
    emptyToUndefined,
    z.uuid('地区 ID 格式无效').optional()
  ),
  sort: z
    .enum(['latest', 'featured'], { error: '排序参数无效' })
    .default('latest'),
  ...paginationFields,
});

export const scopeQuerySchema = z.object({
  scope: z
    .enum(['public', 'all'], { error: 'scope 参数必须为 public 或 all' })
    .default('public'),
});

export const mySubmissionsQuerySchema = z.object({
  status: z
    .enum([...ITEM_STATUSES, 'all'], { error: '状态筛选参数无效' })
    .default('all'),
  ...paginationFields,
});

export type CollectionsQueryInput = z.infer<typeof collectionsQuerySchema>;
export type ScopeQueryInput = z.infer<typeof scopeQuerySchema>;
export type MySubmissionsQueryInput = z.infer<typeof mySubmissionsQuerySchema>;
