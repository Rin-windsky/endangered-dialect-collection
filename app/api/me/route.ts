/**
 * 文件职责：获取当前登录用户信息接口（GET /api/me）。
 */

import { requireUser } from '@/lib/auth/guards';
import { jsonOk } from '@/lib/http/response';
import { withRoute } from '@/lib/http/route';

export const dynamic = 'force-dynamic';

/**
 * 处理 GET /api/me 请求。
 * 输入：会话 Cookie。
 * 输出：200 直接返回当前 User 对象。
 * 业务规则：需登录且从数据库读取实时角色；未登录或会话无效返回 401。
 */
export const GET = withRoute(async (req) => {
  const user = await requireUser(req);
  return jsonOk(user);
});
