/**
 * 文件职责：实现基于进程内存的登录失败频率限制（同一 IP + 用户名 15 分钟内最多 10 次失败）。
 */

import {
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
  LOGIN_RATE_LIMIT_WINDOW_MS,
} from '@/lib/constants';
import { rateLimited } from '@/lib/http/errors';
import { getGlobalSingleton } from '@/lib/runtime/global-singleton';

type FailureRecord = {
  timestamps: number[];
};

function getFailureStore(): Map<string, FailureRecord> {
  return getGlobalSingleton<Map<string, FailureRecord>>('auth.login_rate_limit', () => {
    return new Map<string, FailureRecord>();
  });
}

function pruneExpired(timestamps: number[], now: number): number[] {
  const windowStart = now - LOGIN_RATE_LIMIT_WINDOW_MS;
  const active: number[] = [];
  for (const ts of timestamps) {
    if (ts > windowStart) {
      active.push(ts);
    }
  }
  return active;
}

/**
 * 检查当前 IP + 用户名是否允许继续尝试登录。
 * 输入：限流键 key（格式通常为 `${ip}:${username}`）。
 * 输出：无（允许继续则正常返回，超出限制则抛出 429 RATE_LIMITED）。
 * 业务规则：滑动窗口 15 分钟内累计失败次数达到 10 次即拦截。
 */
export function assertLoginAllowed(key: string): void {
  const store = getFailureStore();
  const record = store.get(key);
  if (!record) {
    return;
  }

  const now = Date.now();
  const active = pruneExpired(record.timestamps, now);
  if (active.length === 0) {
    store.delete(key);
    return;
  }

  record.timestamps = active;
  if (active.length >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
    throw rateLimited();
  }
}

/**
 * 记录一次登录失败尝试。
 * 输入：限流键 key。
 * 输出：无。
 * 业务规则：无论是用户不存在还是密码错误，均调用本方法累计失败次数。
 */
export function recordLoginFailure(key: string): void {
  const store = getFailureStore();
  const now = Date.now();
  const existing = store.get(key);

  if (!existing) {
    store.set(key, { timestamps: [now] });
    return;
  }

  const active = pruneExpired(existing.timestamps, now);
  active.push(now);
  existing.timestamps = active;
}

/**
 * 登录成功后清除该键的失败计数。
 * 输入：限流键 key。
 * 输出：无。
 * 业务规则：避免正常用户后续登录受历史误输影响。
 */
export function clearLoginFailures(key: string): void {
  const store = getFailureStore();
  store.delete(key);
}
