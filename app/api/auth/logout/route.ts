/**
 * 文件职责：账号退出登录接口（POST /api/auth/logout），清除客户端会话 Cookie。
 */

import { requireUser } from '@/lib/auth/guards';
import { clearSessionCookie } from '@/lib/auth/session';
import { noContent } from '@/lib/http/response';
import { withRoute } from '@/lib/http/route';

export const dynamic = 'force-dynamic';

/**
 * 处理 POST /api/auth/logout 请求。
 * 输入：无请求体，需携带有效登录 Cookie。
 * 输出：204 无内容响应并清除 xy_session Cookie。
 * 业务规则：仅已登录用户可退出，未登录返回 401 AUTH_REQUIRED。
 */
export const POST = withRoute(async (req) => {
  await requireUser(req);
  const response = noContent();
  clearSessionCookie(response);
  return response;
});
