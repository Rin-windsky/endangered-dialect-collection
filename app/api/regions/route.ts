/**
 * 文件职责：省级地区选项接口（GET /api/regions）。
 */

import { searchParamsToObject } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';
import { withRoute } from '@/lib/http/route';
import { listRegions } from '@/lib/services/public-service';
import { scopeQuerySchema } from '@/lib/validation/public';

export const dynamic = 'force-dynamic';

/**
 * 处理 GET /api/regions 请求。
 * 输入：查询参数 scope=public|all（默认 public）。
 * 输出：200 RegionOption[]。
 * 业务规则：public 仅返回有公开内容的省份并附带 count；all 返回全部 34 个省级行政区。
 */
export const GET = withRoute(async (req) => {
  const rawQuery = searchParamsToObject(req);
  const { scope } = scopeQuerySchema.parse(rawQuery);
  const options = await listRegions(scope);
  return jsonOk(options);
});
