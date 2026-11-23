/**
 * 文件职责：审核工作台单条投稿详情接口（GET /api/review/submissions/{id}）。
 */

import { requireReviewer } from '@/lib/auth/guards';
import { jsonOk } from '@/lib/http/response';
import { withRoute } from '@/lib/http/route';
import { getReviewSubmissionDetail } from '@/lib/services/review-service';
import { parseIdParam } from '@/lib/validation/common';

export const dynamic = 'force-dynamic';

/**
 * 处理 GET /api/review/submissions/{id} 请求。
 * 输入：路径参数 id。
 * 输出：200 ReviewSubmissionDetail。
 * 业务规则：仅审核员可访问，任意状态均可查看，包含 10 分钟私有预览链接及审核日志。
 */
export const GET = withRoute(async (req, ctx) => {
  await requireReviewer(req);
  const params = await ctx.params;
  const itemId = parseIdParam(params.id);
  const detail = await getReviewSubmissionDetail(itemId);
  return jsonOk(detail);
});
