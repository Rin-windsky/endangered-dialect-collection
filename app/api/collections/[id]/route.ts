/**
 * 文件职责：公开收藏品详情接口（GET /api/collections/{id}）。
 */

import { jsonOk } from '@/lib/http/response';
import { withRoute } from '@/lib/http/route';
import { getPublicCollectionDetail } from '@/lib/services/public-service';
import { parseIdParam } from '@/lib/validation/common';

export const dynamic = 'force-dynamic';

/**
 * 处理 GET /api/collections/{id} 请求。
 * 输入：路径参数 id。
 * 输出：200 ItemDetail。
 * 业务规则：公开接口不读 Cookie；不存在或非公开状态统一返回 404 NOT_FOUND。
 */
export const GET = withRoute(async (_req, ctx) => {
  const params = await ctx.params;
  const itemId = parseIdParam(params.id);
  const detail = await getPublicCollectionDetail(itemId);
  return jsonOk(detail);
});
