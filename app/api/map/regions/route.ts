/**
 * 文件职责：2D 省级方言地图统计接口（GET /api/map/regions）。
 */

import { jsonOk } from '@/lib/http/response';
import { withRoute } from '@/lib/http/route';
import { getMapRegionStats } from '@/lib/services/public-service';

export const dynamic = 'force-dynamic';

/**
 * 处理 GET /api/map/regions 请求。
 * 输入：无。
 * 输出：200 MapRegionStat[]。
 * 业务规则：仅统计 published + public 条目，仅返回 count > 0 的省份，不返回任何坐标。
 */
export const GET = withRoute(async () => {
  const stats = await getMapRegionStats();
  return jsonOk(stats);
});
