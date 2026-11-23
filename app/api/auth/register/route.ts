/**
 * 文件职责：账号注册接口（POST /api/auth/register），创建投稿者账号并签发登录 Cookie。
 */

import { setSessionCookie, signSession } from '@/lib/auth/session';
import { readJson } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';
import { withRoute } from '@/lib/http/route';
import { registerUser } from '@/lib/services/auth-service';
import { registerSchema } from '@/lib/validation/auth';

export const dynamic = 'force-dynamic';

/**
 * 处理 POST /api/auth/register 请求。
 * 输入：包含 username、password、可选 displayName 的 JSON 请求体。
 * 输出：201 { user } 并写入 HttpOnly 会话 Cookie。
 * 业务规则：公开可访问，注册成功自动登录，角色固定为 contributor。
 */
export const POST = withRoute(async (req) => {
  const body = await readJson(req);
  const input = registerSchema.parse(body);
  const user = await registerUser(input);
  const token = await signSession(user);

  const response = jsonOk({ user }, 201);
  setSessionCookie(response, token);
  return response;
});
