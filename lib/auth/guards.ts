/**
 * 文件职责：实现认证、角色、资源归属与状态前置守卫（对应技术方案第 3.4 节）。
 */

import type { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/client';
import type { CollectionItemRow } from '@/lib/db/types';
import { authRequired, forbidden, notFound, statusConflict } from '@/lib/http/errors';
import type { ItemStatus, User } from '@/lib/types';
import { readSessionToken, verifySessionToken } from './session';

/**
 * 校验请求中的会话 Cookie 并从数据库加载最新用户信息。
 * 输入：NextRequest 请求对象。
 * 输出：当前登录用户 User 对象。
 * 业务规则：无 Cookie、JWT 无效或数据库用户不存在时均抛出 401 AUTH_REQUIRED；角色以数据库实时值为准。
 */
export async function requireUser(req: NextRequest): Promise<User> {
  const token = readSessionToken(req);
  if (!token) {
    throw authRequired();
  }

  const payload = await verifySessionToken(token);
  const db = await getDb();
  const profile = await db.profiles.findById(payload.sub);
  if (!profile) {
    throw authRequired('账号不存在或会话已失效');
  }

  // 以数据库中的最新角色为准，不盲信 JWT 中缓存的 role
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.displayName,
    role: profile.role,
  };
}

/**
 * 校验当前用户必须为投稿者（contributor）。
 * 输入：NextRequest 请求对象。
 * 输出：投稿者 User 对象。
 * 业务规则：未登录抛出 401，角色非 contributor 抛出 403 FORBIDDEN。
 */
export async function requireContributor(req: NextRequest): Promise<User> {
  const user = await requireUser(req);
  // 投稿相关接口仅允许 contributor 角色操作
  if (user.role !== 'contributor') {
    throw forbidden('仅投稿者可执行该操作');
  }
  return user;
}

/**
 * 校验当前用户必须为审核员（reviewer）。
 * 输入：NextRequest 请求对象。
 * 输出：审核员 User 对象。
 * 业务规则：未登录抛出 401，角色非 reviewer 抛出 403 FORBIDDEN。
 */
export async function requireReviewer(req: NextRequest): Promise<User> {
  const user = await requireUser(req);
  // 审核台接口仅允许 reviewer 角色访问
  if (user.role !== 'reviewer') {
    throw forbidden('仅审核员可执行该操作');
  }
  return user;
}

/**
 * 校验投稿记录归属当前登录用户。
 * 输入：CollectionItemRow 与当前 User。
 * 输出：无（非本人直接抛出 404 NOT_FOUND）。
 * 业务规则：非本人访问统一返回 404，避免向无关用户泄露资源存在性。
 */
export function requireOwner(item: CollectionItemRow, user: User): void {
  // 权限边界：非投稿本人一律返回 404 不泄露资源是否存在
  if (item.submitterId !== user.id) {
    throw notFound();
  }
}

/**
 * 校验投稿当前状态是否允许执行目标流转操作。
 * 输入：CollectionItemRow 与允许的起始状态数组 allowedStatuses。
 * 输出：无（不在集合中抛出 409 STATUS_CONFLICT）。
 * 业务规则：用于状态机流转前置检查。
 */
export function requireStatus(item: CollectionItemRow, allowedStatuses: readonly ItemStatus[]): void {
  // 状态机守卫：当前状态不在允许的起始状态集合内时抛出 409
  if (!allowedStatuses.includes(item.status)) {
    throw statusConflict(`当前状态（${item.status}）不允许此操作`);
  }
}
