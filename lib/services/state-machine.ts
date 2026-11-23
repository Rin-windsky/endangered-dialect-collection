/**
 * 文件职责：集中定义投稿状态机流转规则表并执行状态合法性守卫（对应 PRD 第 5.5 节与技术方案第 0.5 节）。
 */

import { requireStatus } from '@/lib/auth/guards';
import type { CollectionItemRow } from '@/lib/db/types';
import type { ItemStatus } from '@/lib/types';

export type StateAction = 'publish' | 'return' | 'resubmit' | 'withdraw';

type TransitionRule = {
  from: readonly ItemStatus[];
  to: ItemStatus;
};

const TRANSITIONS: Record<StateAction, TransitionRule> = {
  // 审核员通过并发布：仅允许待审核（pending）流转为已发布（published）
  publish: {
    from: ['pending'],
    to: 'published',
  },
  // 审核员退回补充：仅允许待审核（pending）流转为需补充（needs_changes）
  return: {
    from: ['pending'],
    to: 'needs_changes',
  },
  // 投稿者修改并重新提交：仅允许需补充（needs_changes）流转为待审核（pending）
  resubmit: {
    from: ['needs_changes'],
    to: 'pending',
  },
  // 投稿者主动撤回：允许 pending / needs_changes / published 流转为终态 withdrawn
  withdraw: {
    from: ['pending', 'needs_changes', 'published'],
    to: 'withdrawn',
  },
};

/**
 * 校验当前投稿状态是否允许执行目标动作，并返回目标状态。
 * 输入：动作名 action 与当前投稿行记录 item。
 * 输出：流转后的目标 ItemStatus。
 * 业务规则：若当前状态不在允许的前置状态集合内（例如对 withdrawn 再次撤回），直接抛出 409 STATUS_CONFLICT。
 */
export function transition(action: StateAction, item: CollectionItemRow): ItemStatus {
  const rule = TRANSITIONS[action];
  // 强制校验前置状态，不允许非法跨态或重复流转
  requireStatus(item, rule.from);
  return rule.to;
}
