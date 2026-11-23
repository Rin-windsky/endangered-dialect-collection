/**
 * 文件职责：负责审核发布时将私有区媒体复制到公开区（含失败补偿清理），以及撤回时删除公开媒体（对应技术方案第 5.4、5.5 节）。
 */

import { PRIVATE_BUCKET, PUBLIC_BUCKET } from '@/lib/constants';
import type { CollectionItemRow } from '@/lib/db/types';
import { storageError } from '@/lib/http/errors';
import { getStorage } from './client';
import { extractExtension } from './media-rules';

export type PublicMediaCopyResult = {
  publicAudioUrl: string;
  publicVisualUrl: string | null;
  writtenKeys: string[];
};

export type PublicMediaKeys = {
  audioKey: string;
  visualKey: string | null;
};

/**
 * 根据投稿记录生成对应的公开桶对象路径。
 * 输入：CollectionItemRow。
 * 输出：{ audioKey, visualKey }。
 * 业务规则：路径固定为 `items/{itemId}/audio.{ext}` 与 `items/{itemId}/visual.{ext}`。
 */
export function buildPublicKeys(item: CollectionItemRow): PublicMediaKeys {
  const audioExt = extractExtension(item.privateAudioKey);
  if (!audioExt) {
    throw storageError('音频存储路径缺少扩展名');
  }

  const audioKey = `items/${item.id}/audio.${audioExt}`;
  let visualKey: string | null = null;

  if (item.privateVisualKey) {
    const visualExt = extractExtension(item.privateVisualKey);
    if (!visualExt) {
      throw storageError('主视觉存储路径缺少扩展名');
    }
    visualKey = `items/${item.id}/visual.${visualExt}`;
  }

  return { audioKey, visualKey };
}

/**
 * 将投稿的音频和实际存在的主视觉素材从私有区复制到公开区。
 * 输入：待发布的 CollectionItemRow。
 * 输出：公开音频 URL、公开主视觉 URL（无视觉时为 null）及本次写入的公开键列表。
 * 业务规则：复制过程中任一步失败，立即补偿删除本次已写入公开桶的文件并抛出异常。
 */
export async function copyItemMediaToPublic(
  item: CollectionItemRow
): Promise<PublicMediaCopyResult> {
  const storage = getStorage();
  const keys = buildPublicKeys(item);
  const writtenKeys: string[] = [];

  try {
    await storage.copyObject(
      { bucket: PRIVATE_BUCKET, key: item.privateAudioKey },
      { bucket: PUBLIC_BUCKET, key: keys.audioKey }
    );
    writtenKeys.push(keys.audioKey);

    let publicVisualUrl: string | null = null;
    if (item.privateVisualKey && keys.visualKey) {
      await storage.copyObject(
        { bucket: PRIVATE_BUCKET, key: item.privateVisualKey },
        { bucket: PUBLIC_BUCKET, key: keys.visualKey }
      );
      writtenKeys.push(keys.visualKey);
      publicVisualUrl = storage.getPublicUrl(keys.visualKey);
    }

    return {
      publicAudioUrl: storage.getPublicUrl(keys.audioKey),
      publicVisualUrl,
      writtenKeys,
    };
  } catch (err) {
    // 补偿清理：确保发布失败时不向公开桶遗留半成品媒体
    for (const key of writtenKeys) {
      await storage.deleteObject(PUBLIC_BUCKET, key);
    }
    throw err;
  }
}

/**
 * 按公开键列表删除公开桶媒体（用于数据库事务失败后的补偿回滚）。
 * 输入：公开桶对象键数组 writtenKeys。
 * 输出：Promise<void>。
 * 业务规则：逐个从 public-media 删除对象。
 */
export async function cleanupPublicKeys(writtenKeys: string[]): Promise<void> {
  const storage = getStorage();
  for (const key of writtenKeys) {
    await storage.deleteObject(PUBLIC_BUCKET, key);
  }
}

/**
 * 删除已发布投稿在公开桶中的音频与主视觉媒体。
 * 输入：CollectionItemRow。
 * 输出：Promise<void>。
 * 业务规则：先删公开媒体再改数据库状态，私有桶文件保留用于审计。
 */
export async function deletePublicMedia(item: CollectionItemRow): Promise<void> {
  const storage = getStorage();
  const keys = buildPublicKeys(item);

  await storage.deleteObject(PUBLIC_BUCKET, keys.audioKey);
  if (keys.visualKey) {
    await storage.deleteObject(PUBLIC_BUCKET, keys.visualKey);
  }
}
