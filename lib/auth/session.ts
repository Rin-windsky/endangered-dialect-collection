/**
 * 文件职责：封装会话 JWT 签发、验证与 HttpOnly Cookie 读写清理（对应技术方案第 3.3 节）。
 */

import { SignJWT, jwtVerify } from 'jose';
import type { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/constants';
import { AppError, authRequired } from '@/lib/http/errors';
import type { Role, User } from '@/lib/types';

export type SessionPayload = {
  sub: string;
  username: string;
  role: Role;
};

function getJwtSecretBytes(): Uint8Array {
  const secret = getConfig().jwtSecret;
  return new TextEncoder().encode(secret);
}

/**
 * 签发 HS256 会话 JWT。
 * 输入：已认证的 User 对象。
 * 输出：签发后的 JWT 字符串（7 天有效）。
 * 业务规则：载荷包含 sub、username、role、iat、exp。
 */
export async function signSession(user: User): Promise<string> {
  const secretBytes = getJwtSecretBytes();
  const jwt = await new SignJWT({
    username: user.username,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretBytes);

  return jwt;
}

/**
 * 校验会话 JWT 并解析载荷。
 * 输入：JWT 字符串。
 * 输出：SessionPayload（含 sub、username、role）。
 * 业务规则：JWT 过期、签名无效或缺少必要字段时统一抛出 401 AUTH_REQUIRED。
 */
export async function verifySessionToken(token: string): Promise<SessionPayload> {
  const secretBytes = getJwtSecretBytes();
  try {
    const verified = await jwtVerify(token, secretBytes, {
      algorithms: ['HS256'],
    });
    const payload = verified.payload;
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.username !== 'string' ||
      (payload.role !== 'contributor' && payload.role !== 'reviewer')
    ) {
      throw authRequired('会话无效，请重新登录');
    }

    return {
      sub: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw authRequired('会话已失效，请重新登录');
  }
}

/**
 * 将会话 JWT 写入 HttpOnly Cookie。
 * 输入：NextResponse 响应对象与 JWT 字符串。
 * 输出：无（直接修改响应 Cookie）。
 * 业务规则：使用 HttpOnly、SameSite=Lax、Path=/，仅在站点为 HTTPS 时开启 Secure。
 */
export function setSessionCookie(res: NextResponse, token: string): void {
  const { isHttps } = getConfig();
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: isHttps,
  });
}

/**
 * 清除会话 Cookie。
 * 输入：NextResponse 响应对象。
 * 输出：无（直接修改响应 Cookie，maxAge 置为 0）。
 * 业务规则：用于退出登录或会话无效时清理客户端 Cookie。
 */
export function clearSessionCookie(res: NextResponse): void {
  const { isHttps } = getConfig();
  res.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    secure: isHttps,
  });
}

/**
 * 从请求中读取会话 Cookie。
 * 输入：NextRequest 请求对象。
 * 输出：Cookie 值或 null。
 * 业务规则：仅从指定会话 Cookie 名读取，不读取 Authorization 头或查询参数。
 */
export function readSessionToken(req: NextRequest): string | null {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  if (!cookie || cookie.value.trim() === '') {
    return null;
  }
  return cookie.value;
}
