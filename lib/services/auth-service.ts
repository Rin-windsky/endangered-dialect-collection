/**
 * 文件职责：实现用户注册与登录核心业务逻辑（对应技术方案第 3.2、6.2 节）。
 */

import { hashPassword, verifyPassword } from '@/lib/auth/password';
import {
  assertLoginAllowed,
  clearLoginFailures,
  recordLoginFailure,
} from '@/lib/auth/rate-limit';
import { getDb } from '@/lib/db/client';
import { invalidCredentials, usernameTaken } from '@/lib/http/errors';
import type { User } from '@/lib/types';
import type { LoginInput, RegisterInput } from '@/lib/validation/auth';

/**
 * 注册新投稿者账号。
 * 输入：经过 Zod 校验的注册参数 RegisterInput。
 * 输出：新创建的 User 对象（不含 passwordHash）。
 * 业务规则：
 * 1. 用户名统一小写并检查全局唯一，冲突抛出 409 USERNAME_TAKEN。
 * 2. 密码以 bcrypt cost=12 哈希保存。
 * 3. displayName 未传时默认等于 username；角色固定为 contributor，忽略外部传入角色。
 */
export async function registerUser(input: RegisterInput): Promise<User> {
  const db = await getDb();
  const existing = await db.profiles.findByUsername(input.username);
  if (existing) {
    throw usernameTaken();
  }

  const passwordHash = await hashPassword(input.password);
  const displayName = input.displayName ?? input.username;

  const profile = await db.profiles.insert({
    username: input.username,
    passwordHash,
    displayName,
    role: 'contributor',
  });

  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.displayName,
    role: profile.role,
  };
}

/**
 * 校验用户名与密码并执行登录频率限制。
 * 输入：经过 Zod 校验的登录参数 LoginInput 与客户端 IP 地址。
 * 输出：认证通过的 User 对象（不含 passwordHash）。
 * 业务规则：
 * 1. 按 IP + 用户名执行 15 分钟 10 次失败限流，超出抛出 429 RATE_LIMITED。
 * 2. 用户不存在或密码错误统一累计失败次数并抛出 401 INVALID_CREDENTIALS，不泄露账号是否存在。
 */
export async function loginUser(input: LoginInput, clientIp: string): Promise<User> {
  const rateKey = `${clientIp}:${input.username}`;
  assertLoginAllowed(rateKey);

  const db = await getDb();
  const profile = await db.profiles.findByUsername(input.username);
  if (!profile) {
    recordLoginFailure(rateKey);
    throw invalidCredentials();
  }

  const matched = await verifyPassword(input.password, profile.passwordHash);
  if (!matched) {
    recordLoginFailure(rateKey);
    throw invalidCredentials();
  }

  clearLoginFailures(rateKey);

  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.displayName,
    role: profile.role,
  };
}
