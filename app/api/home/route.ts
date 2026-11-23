/**
 * 文件职责：首页公开精选与最新收藏品接口（GET /api/home）。
 */

import { jsonOk } from '@/lib/http/response';
import { withRoute } from '@/lib/http/route';
import { getHomeData } from '@/lib/services/public-service';

export const dynamic = 'force-dynamic';

/**
 * 处理 GET /api/home 请求。
 * 输入：无。
 * 输出：200 { featured, latest }。
 * 业务规则：公开接口不读 Cookie，仅返回 published + public 条目。
 */
export const GET = withRoute(async () => {
  const data = await getHomeData();
  return jsonOk(data);
});
