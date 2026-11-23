/**
 * 文件职责：账号登录接口（POST /api/auth/login），校验凭据并签发会话 Cookie。
 */

import { setSessionCookie, signSession } from '@/lib/auth/session';
import { getClientIp, readJson } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';
import { withRoute } from '@/lib/http/route';
import { loginUser } from '@/lib/services/auth-service';
import { loginSchema } from '@/lib/validation/auth';

export const dynamic = 'force-dynamic';

/**
 * 处理 POST /api/auth/login 请求。
 * 输入：包含 username、password 的 JSON 请求体。
 * 输出：200 { user } 并写入 HttpOnly 会话 Cookie。
 * 业务规则：公开可访问，受 IP + 用户名维度登录限流保护。
 */
export const POST = withRoute(async (req) => {
  const body = await readJson(req);
  const input = loginSchema.parse(body);
  const clientIp = getClientIp(req);
  const user = await loginUser(input, clientIp);
  const token = await signSession(user);

  const response = jsonOk({ user }, 200);
  setSessionCookie(response, token);
  return response;
});
