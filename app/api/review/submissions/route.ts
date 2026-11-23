/**
 * 文件职责：审核工作台投稿列表接口（GET /api/review/submissions）。
 */

import { requireReviewer } from '@/lib/auth/guards';
import { searchParamsToObject } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';
import { withRoute } from '@/lib/http/route';
import { listReviewSubmissions } from '@/lib/services/review-service';
import { reviewListQuerySchema } from '@/lib/validation/review';

export const dynamic = 'force-dynamic';

/**
 * 处理 GET /api/review/submissions 请求。
 * 输入：查询参数 status（默认 pending）、sort（默认 oldest）、page、limit。
 * 输出：200 { items, total, page, limit }。
 * 业务规则：仅审核员可访问。
 */
export const GET = withRoute(async (req) => {
  await requireReviewer(req);
  const rawQuery = searchParamsToObject(req);
  const query = reviewListQuerySchema.parse(rawQuery);
  const result = await listReviewSubmissions(query);
  return jsonOk(result);
});
