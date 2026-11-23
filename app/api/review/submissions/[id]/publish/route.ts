/**
 * 文件职责：审核通过并发布接口（POST /api/review/submissions/{id}/publish）。
 */

import { requireReviewer } from '@/lib/auth/guards';
import { jsonOk } from '@/lib/http/response';
import { withRoute } from '@/lib/http/route';
import { publishSubmission } from '@/lib/services/review-service';
import { parseIdParam } from '@/lib/validation/common';

export const dynamic = 'force-dynamic';

/**
 * 处理 POST /api/review/submissions/{id}/publish 请求。
 * 输入：路径参数 id（无请求体）。
 * 输出：200 { id, status: 'published', publishedAt }。
 * 业务规则：仅审核员可调用，仅 pending 状态可发布，并复制媒体到公开桶。
 */
export const POST = withRoute(async (req, ctx) => {
  const reviewer = await requireReviewer(req);
  const params = await ctx.params;
  const itemId = parseIdParam(params.id);
  const result = await publishSubmission(reviewer, itemId);
  return jsonOk(result);
});
