/**
 * 文件职责：公开收藏馆筛选检索与分页接口（GET /api/collections）。
 */

import { searchParamsToObject } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';
import { withRoute } from '@/lib/http/route';
import { listPublicCollections } from '@/lib/services/public-service';
import { collectionsQuerySchema } from '@/lib/validation/public';

export const dynamic = 'force-dynamic';

/**
 * 处理 GET /api/collections 请求。
 * 输入：查询参数 q/type/languageId/regionId/sort/page/limit。
 * 输出：200 { items, total, page, limit }。
 * 业务规则：公开接口不读 Cookie，严格执行公开字段白名单投影。
 */
export const GET = withRoute(async (req) => {
  const rawQuery = searchParamsToObject(req);
  const query = collectionsQuerySchema.parse(rawQuery);
  const result = await listPublicCollections(query);
  return jsonOk(result);
});
