/**
 * 文件职责：实现投稿者核心业务链路（上传签名、创建投稿、我的投稿列表/详情、退回后修改重提、主动撤回）。
 */

import { requireOwner } from '@/lib/auth/guards';
import { getDb } from '@/lib/db/client';
import type { UpdateCollectionItemPatch } from '@/lib/db/types';
import { notFound, validationError } from '@/lib/http/errors';
import { deletePublicMedia } from '@/lib/storage/publish';
import {
  signPrivatePreview,
  signUploads,
  verifyUploadedObject,
  type SignUploadsOutput,
} from '@/lib/storage/signed';
import type {
  ItemStatus,
  MySubmissionListItem,
  PaginatedResult,
  SubmissionDetail,
  User,
} from '@/lib/types';
import type { MySubmissionsQueryInput } from '@/lib/validation/public';
import type {
  CreateSubmissionInput,
  PatchSubmissionInput,
} from '@/lib/validation/submission';
import type { SignUploadRequestInput } from '@/lib/validation/upload';
import {
  buildLanguageMap,
  buildRegionMap,
  toMySubmissionListItem,
  toSubmissionDetail,
} from './projections';
import { transition } from './state-machine';

export type SubmissionMutationResult = {
  id: string;
  status: ItemStatus;
};

/**
 * 为投稿者签发私有区上传地址。
 * 输入：当前投稿者 User 与上传文件元数据。
 * 输出：包含 audio（及可选 visual）的签名上传描述。
 * 业务规则：仅签发属于当前用户目录的随机文件名路径，未传 visual 时不返回 visual 键。
 */
export async function signSubmissionUploads(
  user: User,
  input: SignUploadRequestInput
): Promise<SignUploadsOutput> {
  return signUploads(user.id, input);
}

/**
 * 创建并直接提交投稿（无草稿，初始状态为 pending、可见性为 private）。
 * 输入：当前投稿者 User 与经过 Zod 校验的投稿参数 CreateSubmissionInput。
 * 输出：{ id, status: 'pending' }。
 * 业务规则：
 * 1. 校验 languageId（非空时）与 regionId 真实存在。
 * 2. 服务端二次核验私有桶音频及可选主视觉文件的归属、存在性、类型和大小。
 * 3. 未传署名方式时默认匿名，空数组字幕落库为 null。
 * 4. 在事务中落库，不生成公开 URL。
 */
export async function createSubmission(
  user: User,
  input: CreateSubmissionInput
): Promise<SubmissionMutationResult> {
  const db = await getDb();

  const resolvedLanguageId = input.languageId ?? null;
  if (resolvedLanguageId !== null) {
    const language = await db.languages.findById(resolvedLanguageId);
    if (!language) {
      throw validationError({ languageId: '所选方言/语言不存在' });
    }
  }

  const region = await db.regions.findById(input.regionId);
  if (!region) {
    throw validationError({ regionId: '所选地区不存在' });
  }

  // 服务端二次校验私有区对象存在性、归属、格式和大小
  await verifyUploadedObject(user.id, 'audio', 'audio', input.audio.path, 'audio.path');

  let visualType = null;
  let privateVisualKey = null;
  if (input.visual) {
    await verifyUploadedObject(
      user.id,
      input.visual.type,
      'visual',
      input.visual.path,
      'visual.path'
    );
    visualType = input.visual.type;
    privateVisualKey = input.visual.path;
  }

  const subtitleSegments =
    input.subtitleSegments && input.subtitleSegments.length > 0 ? input.subtitleSegments : null;

  const creditMode = input.submitterCredit ? input.submitterCredit.mode : 'anonymous';
  const creditPublicName =
    creditMode === 'nickname' && input.submitterCredit?.name
      ? input.submitterCredit.name
      : null;

  const created = await db.transaction(async (tx) => {
    return tx.items.insert({
      title: input.title,
      summary: input.summary,
      contentType: input.contentType,
      languageId: resolvedLanguageId,
      regionId: input.regionId,
      translationZh: input.translationZh ?? null,
      subtitleSegments,
      cultureContext: input.cultureContext ?? null,
      visualType,
      privateAudioKey: input.audio.path,
      publicAudioUrl: null,
      privateVisualKey,
      publicVisualUrl: null,
      audioDurationSeconds: input.audio.durationSeconds ?? null,
      recordingAuthorized: input.recordingAuthorized,
      submitterId: user.id,
      submitterCreditMode: creditMode,
      submitterPublicName: creditPublicName,
      status: 'pending',
      visibility: 'private',
      featured: false,
      publishedAt: null,
    });
  });

  return {
    id: created.id,
    status: created.status,
  };
}

/**
 * 分页查询当前登录投稿者的投稿列表。
 * 输入：当前投稿者 User 与列表查询参数（status/page/limit）。
 * 输出：PaginatedResult<MySubmissionListItem>。
 * 业务规则：仅查询本人投稿；有主视觉时签发 10 分钟预览 URL；附带最新一条审核记录。
 */
export async function listMySubmissions(
  user: User,
  query: MySubmissionsQueryInput
): Promise<PaginatedResult<MySubmissionListItem>> {
  const db = await getDb();
  const pageResult = await db.items.listBySubmitter(
    user.id,
    query.status,
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

  const items: MySubmissionListItem[] = [];
  for (const row of pageResult.rows) {
    let signedVisualUrl: string | null = null;
    if (row.privateVisualKey) {
      signedVisualUrl = await signPrivatePreview(row.privateVisualKey);
    }
    const lastLog = latestLogsMap.get(row.id);
    items.push(toMySubmissionListItem(row, regionMap, signedVisualUrl, lastLog));
  }

  return {
    items,
    total: pageResult.total,
    page: query.page,
    limit: query.limit,
  };
}

/**
 * 查询投稿者本人的单条投稿详情（含 10 分钟私有媒体预览 URL 与正序审核日志）。
 * 输入：当前投稿者 User 与投稿 ID。
 * 输出：SubmissionDetail。
 * 业务规则：不存在或非本人访问统一抛出 404 NOT_FOUND，不泄露审核员账号信息。
 */
export async function getMySubmission(user: User, itemId: string): Promise<SubmissionDetail> {
  const db = await getDb();
  const item = await db.items.findById(itemId);
  if (!item) {
    throw notFound();
  }

  // 归属守卫：非本人一律返回 404
  requireOwner(item, user);

  const [languages, regions, logs, signedAudioUrl] = await Promise.all([
    db.languages.listAll(),
    db.regions.listAll(),
    db.reviewLogs.listByItemId(item.id),
    signPrivatePreview(item.privateAudioKey),
  ]);

  let signedVisualUrl: string | null = null;
  if (item.privateVisualKey) {
    signedVisualUrl = await signPrivatePreview(item.privateVisualKey);
  }

  const languageMap = buildLanguageMap(languages);
  const regionMap = buildRegionMap(regions);

  return toSubmissionDetail(item, languageMap, regionMap, signedAudioUrl, signedVisualUrl, logs);
}

/**
 * 投稿者在被退回（needs_changes）后修改并重新提交。
 * 输入：当前投稿者 User、投稿 ID、局部更新补丁 PatchSubmissionInput。
 * 输出：{ id, status: 'pending' }。
 * 业务规则：
 * 1. 仅本人可修改，且当前状态必须为 needs_changes，否则抛出 409 STATUS_CONFLICT。
 * 2. 未出现在请求体中的字段保留原值；显式传 null 的可空字段清空；visual=null 移除主视觉。
 * 3. 状态流转回 pending，保留历史审核日志。
 */
export async function resubmitSubmission(
  user: User,
  itemId: string,
  patch: PatchSubmissionInput
): Promise<SubmissionMutationResult> {
  const db = await getDb();
  const item = await db.items.findById(itemId);
  if (!item) {
    throw notFound();
  }

  // 归属守卫与状态机前置校验（仅 needs_changes 允许重提）
  requireOwner(item, user);
  const nextStatus = transition('resubmit', item);

  const updatePatch: UpdateCollectionItemPatch = {
    status: nextStatus,
    visibility: 'private',
  };

  if (patch.title !== undefined) {
    updatePatch.title = patch.title;
  }
  if (patch.summary !== undefined) {
    updatePatch.summary = patch.summary;
  }
  if (patch.contentType !== undefined) {
    updatePatch.contentType = patch.contentType;
  }

  if (patch.languageId !== undefined) {
    if (patch.languageId !== null) {
      const language = await db.languages.findById(patch.languageId);
      if (!language) {
        throw validationError({ languageId: '所选方言/语言不存在' });
      }
    }
    updatePatch.languageId = patch.languageId;
  }

  if (patch.regionId !== undefined) {
    const region = await db.regions.findById(patch.regionId);
    if (!region) {
      throw validationError({ regionId: '所选地区不存在' });
    }
    updatePatch.regionId = patch.regionId;
  }

  if (patch.translationZh !== undefined) {
    updatePatch.translationZh = patch.translationZh;
  }
  if (patch.cultureContext !== undefined) {
    updatePatch.cultureContext = patch.cultureContext;
  }
  if (patch.recordingAuthorized !== undefined) {
    updatePatch.recordingAuthorized = patch.recordingAuthorized;
  }

  if (patch.subtitleSegments !== undefined) {
    if (patch.subtitleSegments === null || patch.subtitleSegments.length === 0) {
      updatePatch.subtitleSegments = null;
    } else {
      updatePatch.subtitleSegments = patch.subtitleSegments;
    }
  }

  if (patch.submitterCredit !== undefined) {
    if (patch.submitterCredit === null) {
      updatePatch.submitterCreditMode = 'anonymous';
      updatePatch.submitterPublicName = null;
    } else {
      updatePatch.submitterCreditMode = patch.submitterCredit.mode;
      updatePatch.submitterPublicName =
        patch.submitterCredit.mode === 'nickname'
          ? (patch.submitterCredit.name ?? null)
          : null;
    }
  }

  if (patch.audio !== undefined) {
    await verifyUploadedObject(user.id, 'audio', 'audio', patch.audio.path, 'audio.path');
    updatePatch.privateAudioKey = patch.audio.path;
    if (patch.audio.durationSeconds !== undefined) {
      updatePatch.audioDurationSeconds = patch.audio.durationSeconds;
    }
  }

  if (patch.visual !== undefined) {
    if (patch.visual === null) {
      updatePatch.visualType = null;
      updatePatch.privateVisualKey = null;
      updatePatch.publicVisualUrl = null;
    } else {
      await verifyUploadedObject(
        user.id,
        patch.visual.type,
        'visual',
        patch.visual.path,
        'visual.path'
      );
      updatePatch.visualType = patch.visual.type;
      updatePatch.privateVisualKey = patch.visual.path;
    }
  }

  const updated = await db.transaction(async (tx) => {
    return tx.items.update(item.id, updatePatch);
  });

  return {
    id: updated.id,
    status: updated.status,
  };
}

/**
 * 投稿者主动撤回本人投稿（支持 pending / needs_changes / published）。
 * 输入：当前投稿者 User 与投稿 ID。
 * 输出：{ id, status: 'withdrawn' }。
 * 业务规则：
 * 1. 非本人返回 404；已处于 withdrawn 状态再次撤回抛出 409 STATUS_CONFLICT。
 * 2. 若原状态为 published，先删除公开桶音频和主视觉；删除失败则中断且不修改数据库状态。
 * 3. 撤回后状态变为 withdrawn、visibility 变为 private、清空公开 URL，保留私有桶文件。
 */
export async function withdrawSubmission(
  user: User,
  itemId: string
): Promise<SubmissionMutationResult> {
  const db = await getDb();
  const item = await db.items.findById(itemId);
  if (!item) {
    throw notFound();
  }

  // 归属守卫与状态机前置校验（withdrawn 终态再次撤回将抛出 409）
  requireOwner(item, user);
  const nextStatus = transition('withdraw', item);

  // 已发布内容撤回前必须先删除公开媒体；删除失败时抛 502 且不改数据库状态
  if (item.status === 'published') {
    await deletePublicMedia(item);
  }

  const updated = await db.transaction(async (tx) => {
    return tx.items.update(item.id, {
      status: nextStatus,
      visibility: 'private',
      publicAudioUrl: null,
      publicVisualUrl: null,
    });
  });

  return {
    id: updated.id,
    status: updated.status,
  };
}
