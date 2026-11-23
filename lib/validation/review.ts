/**
 * 文件职责：定义审核工作台列表查询与退回补充请求体的 Zod 校验 Schema（对应技术方案第 6.5 节）。
 */

import { z } from 'zod';
import { ITEM_STATUSES } from '@/lib/constants';
import { paginationFields } from './common';

export const reviewListQuerySchema = z.object({
  status: z
    .enum([...ITEM_STATUSES, 'all'], { error: '状态筛选参数无效' })
    .default('pending'),
  sort: z
    .enum(['oldest', 'newest'], { error: '排序参数无效' })
    .default('oldest'),
  ...paginationFields,
});

export const returnSchema = z.object({
  reason: z
    .string({ error: '退回原因不能为空' })
    .trim()
    .min(5, '退回原因至少 5 个字')
    .max(500, '退回原因最多 500 个字'),
});

export type ReviewListQueryInput = z.infer<typeof reviewListQuerySchema>;
export type ReturnInput = z.infer<typeof returnSchema>;
