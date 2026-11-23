/**
 * 文件职责：我的投稿列表接口（GET /api/my-submissions）。
 */

import { requireContributor } from '@/lib/auth/guards';
import { searchParamsToObject } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';
import { withRoute } from '@/lib/http/route';
import { listMySubmissions } from '@/lib/services/submission-service';
import { mySubmissionsQuerySchema } from '@/lib/validation/public';

export const dynamic = 'force-dynamic';

/**
 * 处理 GET /api/my-submissions 请求。
 * 输入：查询参数 status/page/limit（默认 status=all）。
 * 输出：200 { items, total, page, limit }。
 * 业务规则：仅投稿者可调用，仅返回当前用户本人投稿。
 */
export const GET = withRoute(async (req) => {
  const user = await requireContributor(req);
  const rawQuery = searchParamsToObject(req);
  const query = mySubmissionsQuerySchema.parse(rawQuery);
  const result = await listMySubmissions(user, query);
  return jsonOk(result);
});
