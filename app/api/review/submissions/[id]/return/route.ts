/**
 * 文件职责：审核退回补充接口（POST /api/review/submissions/{id}/return）。
 */

import { requireReviewer } from '@/lib/auth/guards';
import { readJson } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';
import { withRoute } from '@/lib/http/route';
import { returnSubmission } from '@/lib/services/review-service';
import { parseIdParam } from '@/lib/validation/common';
import { returnSchema } from '@/lib/validation/review';

export const dynamic = 'force-dynamic';

/**
 * 处理 POST /api/review/submissions/{id}/return 请求。
 * 输入：路径参数 id 与包含 reason（5-500 字）的 JSON 请求体。
 * 输出：200 { id, status: 'needs_changes' }。
 * 业务规则：仅审核员可调用，仅 pending 状态可退回，同步追加 return 审核日志。
 */
export const POST = withRoute(async (req, ctx) => {
  const reviewer = await requireReviewer(req);
  const params = await ctx.params;
  const itemId = parseIdParam(params.id);
  const body = await readJson(req);
  const { reason } = returnSchema.parse(body);
  const result = await returnSubmission(reviewer, itemId, reason);
  return jsonOk(result);
});
