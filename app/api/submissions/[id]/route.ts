/**
 * 文件职责：投稿者个人投稿详情查询（GET）与退回后修改重提（PATCH）接口（/api/submissions/{id}）。
 */

import { requireContributor } from '@/lib/auth/guards';
import { readJson } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';
import { withRoute } from '@/lib/http/route';
import {
  getMySubmission,
  resubmitSubmission,
} from '@/lib/services/submission-service';
import { parseIdParam } from '@/lib/validation/common';
import { patchSubmissionSchema } from '@/lib/validation/submission';

export const dynamic = 'force-dynamic';

/**
 * 处理 GET /api/submissions/{id} 请求。
 * 输入：路径参数 id。
 * 输出：200 SubmissionDetail。
 * 业务规则：仅投稿者本人可查看，非本人返回 404 NOT_FOUND。
 */
export const GET = withRoute(async (req, ctx) => {
  const user = await requireContributor(req);
  const params = await ctx.params;
  const itemId = parseIdParam(params.id);
  const detail = await getMySubmission(user, itemId);
  return jsonOk(detail);
});

/**
 * 处理 PATCH /api/submissions/{id} 请求。
 * 输入：路径参数 id 与局部修改字段。
 * 输出：200 { id, status: 'pending' }。
 * 业务规则：仅投稿者本人且处于 needs_changes 状态可修改重提，其他状态返回 409。
 */
export const PATCH = withRoute(async (req, ctx) => {
  const user = await requireContributor(req);
  const params = await ctx.params;
  const itemId = parseIdParam(params.id);
  const body = await readJson(req);
  const patch = patchSubmissionSchema.parse(body);
  const result = await resubmitSubmission(user, itemId, patch);
  return jsonOk(result);
});
