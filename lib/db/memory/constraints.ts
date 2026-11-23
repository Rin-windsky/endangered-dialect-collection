/**
 * 文件职责：在内存数据库写入阶段模拟技术方案第 4.2 节 collection_items 表的数据库 CHECK 约束。
 */

import type { CollectionItemRow } from '@/lib/db/types';

/**
 * 校验收藏品行记录是否满足全部数据库级不变式约束。
 * 输入：待写入或更新后的 CollectionItemRow。
 * 输出：无（全部满足则通过，违反任意约束直接抛出 Error）。
 * 业务规则：
 * 1. recordingAuthorized 必须为 true。
 * 2. 署名模式为 nickname 时 submitterPublicName 不能为空。
 * 3. subtitleSegments 为 null 或非空数组。
 * 4. visualType 与 privateVisualKey/publicVisualUrl 成对一致。
 * 5. published 状态必须为 public 且具备 publicAudioUrl；非 published 状态必须为 private。
 */
export function assertItemConstraints(row: CollectionItemRow): void {
  if (!row.recordingAuthorized) {
    throw new Error('数据库约束违反: recording_authorized 必须为 true');
  }

  if (row.submitterCreditMode === 'nickname') {
    if (!row.submitterPublicName || row.submitterPublicName.trim() === '') {
      throw new Error('数据库约束违反: nickname 模式下 submitter_public_name 不能为空');
    }
  }

  if (row.subtitleSegments !== null) {
    if (!Array.isArray(row.subtitleSegments) || row.subtitleSegments.length === 0) {
      throw new Error('数据库约束违反: subtitle_segments 必须为 null 或非空数组');
    }
  }

  if (row.visualType !== null) {
    if (!row.privateVisualKey) {
      throw new Error('数据库约束违反: visual_type 非空时 private_visual_key 不能为空');
    }
    if (row.visualType !== 'image' && row.visualType !== 'video') {
      throw new Error('数据库约束违反: visual_type 必须为 image 或 video');
    }
  } else {
    if (row.privateVisualKey !== null || row.publicVisualUrl !== null) {
      throw new Error('数据库约束违反: visual_type 为 null 时视觉路径必须全为 null');
    }
  }

  if (row.status === 'published') {
    if (row.visibility !== 'public' || !row.publicAudioUrl) {
      throw new Error('数据库约束违反: published 状态必须满足 visibility=public 且 public_audio_url 非空');
    }
  } else {
    if (row.visibility !== 'private') {
      throw new Error('数据库约束违反: 非 published 状态必须保持 visibility=private');
    }
  }
}
