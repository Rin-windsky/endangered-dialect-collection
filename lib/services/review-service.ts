/**
 * 文件职责：实现审核员核心业务链路（审核列表、审核详情、通过并发布、退回补充及审核日志写入）。
 */

import { getDb } from '@/lib/db/client';
import type { ProfileRow } from '@/lib/db/types';
import { notFound, statusConflict } from '@/lib/http/errors';
import { cleanupPublicKeys, copyItemMediaToPublic } from '@/lib/storage/publish';
import { signPrivatePreview } from '@/lib/storage/signed';
import type {
  ItemStatus,
  PaginatedResult,
  ReviewSubmissionDetail,
  ReviewSubmissionListItem,
  User,
} from '@/lib/types';
import type { ReviewListQueryInput } from '@/lib/validation/review';
import {
  buildLanguageMap,
  buildRegionMap,
  toReviewSubmissionDetail,
  toReviewSubmissionListItem,
} from './projections';
import { transition } from './state-machine';

export type PublishReviewResult = {
  id: string;
  status: ItemStatus;
  publishedAt: string;
};

export type ReturnReviewResult = {
  id: string;
  status: ItemStatus;
};

/**
 * 分页查询审核工作台投稿列表。
 * 输入：审核列表查询参数（默认 status=pending，sort=oldest）。
 * 输出：PaginatedResult<ReviewSubmissionListItem>。
 * 业务规则：附带投稿者最小账号信息（username、displayName）及最近一条审核日志。
 */
export async function listReviewSubmissions(
  query: ReviewListQueryInput
): Promise<PaginatedResult<ReviewSubmissionListItem>> {
  const db = await getDb();
  const pageResult = await db.items.listForReview(
    query.status,
    query.sort,
    query.page,
    query.limit
  );

  const regions = await db.regions.listAll();
  const regionMap = buildRegionMap(regions);

  const itemIds: string[] = [];
  for (const row of pageResult.rows) {
    itemIds.push(row.id);
  }
  const latestLogsMap = await db.reviewLogs.findLatestByItemIds(itemIds);

  const profileCache = new Map<string, ProfileRow>();
  const items: ReviewSubmissionListItem[] = [];

  for (const row of pageResult.rows) {
    let submitter = profileCache.get(row.submitterId);
    if (!submitter) {
      const loaded = await db.profiles.findById(row.submitterId);
      if (!loaded) {
        throw new Error(`数据完整性异常: 投稿 ${row.id} 的投稿者 ${row.submitterId} 不存在`);
      }
      submitter = loaded;
      profileCache.set(row.submitterId, submitter);
    }

    const lastLog = latestLogsMap.get(row.id);
    items.push(toReviewSubmissionListItem(row, regionMap, submitter, lastLog));
  }

  return {
    items,
    total: pageResult.total,
    page: query.page,
    limit: query.limit,
  };
}

/**
 * 查询审核详情（任意状态均可供审核员查看）。
 * 输入：投稿 ID。
 * 输出：ReviewSubmissionDetail（包含 10 分钟私有媒体预览 URL、审核日志及投稿者账号信息）。
 * 业务规则：找不到资源返回 404；仅在主视觉存在时返回 visual 字段，不返回联系方式。
 */
export async function getReviewSubmissionDetail(itemId: string): Promise<ReviewSubmissionDetail> {
  const db = await getDb();
  const item = await db.items.findById(itemId);
  if (!item) {
    throw notFound();
  }

  const [submitter, languages, regions, logs, signedAudioUrl] = await Promise.all([
    db.profiles.findById(item.submitterId),
    db.languages.listAll(),
    db.regions.listAll(),
    db.reviewLogs.listByItemId(item.id),
    signPrivatePreview(item.privateAudioKey),
  ]);

  if (!submitter) {
    throw new Error(`数据完整性异常: 投稿 ${item.id} 的投稿者 ${item.submitterId} 不存在`);
  }

  let signedVisualUrl: string | null = null;
  if (item.privateVisualKey) {
    signedVisualUrl = await signPrivatePreview(item.privateVisualKey);
  }

  const languageMap = buildLanguageMap(languages);
  const regionMap = buildRegionMap(regions);

  return toReviewSubmissionDetail(
    item,
    languageMap,
    regionMap,
    signedAudioUrl,
    signedVisualUrl,
    logs,
    submitter
  );
}

/**
 * 审核员通过并发布投稿。
 * 输入：当前审核员 User 与投稿 ID。
 * 输出：{ id, status: 'published', publishedAt }。
 * 业务规则：
 * 1. 仅 pending 状态可发布，否则抛出 409 STATUS_CONFLICT。
 * 2. 确认录音授权声明已勾选；缺少选填展示资料不阻止发布。
 * 3. 在事务外先复制媒体到公开区，复制失败抛 502 并保持 pending。
 * 4. 在事务内更新状态/公开地址并追加 publish 审核日志；事务失败时补偿删除本次写入的公开媒体。
 */
export async function publishSubmission(
  reviewer: User,
  itemId: string
): Promise<PublishReviewResult> {
  const db = await getDb();
  const item = await db.items.findById(itemId);
  if (!item) {
    throw notFound();
  }

  // 状态机守卫：仅 pending 状态允许发布
  const nextStatus = transition('publish', item);

  if (!item.recordingAuthorized) {
    throw statusConflict('未勾选录音授权声明，不允许发布');
  }

  const copyResult = await copyItemMediaToPublic(item);
  const publishedAt = new Date().toISOString();

  try {
    await db.transaction(async (tx) => {
      await tx.items.update(item.id, {
        status: nextStatus,
        visibility: 'public',
        publishedAt,
        publicAudioUrl: copyResult.publicAudioUrl,
        publicVisualUrl: copyResult.publicVisualUrl,
      });

      await tx.reviewLogs.insert({
        collectionItemId: item.id,
        reviewerId: reviewer.id,
        action: 'publish',
        reason: null,
        fromStatus: item.status,
        toStatus: nextStatus,
      });
    });
  } catch (err) {
    // 事务落库失败时补偿清理已复制到公开桶的媒体，确保公开桶无未发布文件
    await cleanupPublicKeys(copyResult.writtenKeys);
    throw err;
  }

  return {
    id: item.id,
    status: nextStatus,
    publishedAt,
  };
}

/**
 * 审核员退回投稿并记录具体退回原因。
 * 输入：当前审核员 User、投稿 ID、退回原因 reason（5-500 字）。
 * 输出：{ id, status: 'needs_changes' }。
 * 业务规则：
 * 1. 仅 pending 状态可退回，否则抛出 409 STATUS_CONFLICT。
 * 2. 在事务中更新状态为 needs_changes 并追加 return 审核日志。
 * 3. 保留私有桶文件，方便投稿者修改后重提。
 */
export async function returnSubmission(
  reviewer: User,
  itemId: string,
  reason: string
): Promise<ReturnReviewResult> {
  const db = await getDb();
  const item = await db.items.findById(itemId);
  if (!item) {
    throw notFound();
  }

  // 状态机守卫：仅 pending 状态允许退回补充
  const nextStatus = transition('return', item);

  await db.transaction(async (tx) => {
    await tx.items.update(item.id, {
      status: nextStatus,
      visibility: 'private',
    });

    await tx.reviewLogs.insert({
      collectionItemId: item.id,
      reviewerId: reviewer.id,
      action: 'return',
      reason,
      fromStatus: item.status,
      toStatus: nextStatus,
    });
  });

  return {
    id: item.id,
    status: nextStatus,
  };
}
