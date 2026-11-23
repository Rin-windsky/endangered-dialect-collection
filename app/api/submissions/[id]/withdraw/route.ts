/**
 * 文件职责：投稿者主动撤回投稿接口（POST /api/submissions/{id}/withdraw）。
 */

import { requireContributor } from '@/lib/auth/guards';
import { jsonOk } from '@/lib/http/response';
import { withRoute } from '@/lib/http/route';
import { withdrawSubmission } from '@/lib/services/submission-service';
import { parseIdParam } from '@/lib/validation/common';

export const dynamic = 'force-dynamic';

/**
 * 处理 POST /api/submissions/{id}/withdraw 请求。
 * 输入：路径参数 id（无请求体）。
 * 输出：200 { id, status: 'withdrawn' }。
 * 业务规则：仅投稿者本人可撤回；支持 pending/needs_changes/published，已撤回返回 409。
 */
export const POST = withRoute(async (req, ctx) => {
  const user = await requireContributor(req);
  const params = await ctx.params;
  const itemId = parseIdParam(params.id);
  const result = await withdrawSubmission(user, itemId);
  return jsonOk(result);
});
