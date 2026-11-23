/**
 * 文件职责：负责数据库行实体向 API 响应 DTO 的字段投影，严格执行公开接口白名单隔离（对应技术方案第 4.5 节）。
 */

import type {
  CollectionItemRow,
  LanguageRow,
  ProfileRow,
  RegionRow,
  ReviewLogRow,
} from '@/lib/db/types';
import type {
  ItemCard,
  ItemDetail,
  LanguageRef,
  LastReviewSummary,
  MySubmissionListItem,
  RegionDetail,
  RegionRef,
  ReviewLog,
  ReviewSubmissionDetail,
  ReviewSubmissionListItem,
  SubmissionDetail,
  SubmitterCredit,
  SubtitleSegment,
} from '@/lib/types';

function compareSubtitleStartAsc(a: SubtitleSegment, b: SubtitleSegment): number {
  return a.start - b.start;
}

/**
 * 将语言数组构建为按 ID 索引的 Map，避免重复遍历。
 * 输入：LanguageRow 数组。
 * 输出：Map<string, LanguageRow>。
 * 业务规则：供列表与详情投影批量关联使用。
 */
export function buildLanguageMap(rows: LanguageRow[]): Map<string, LanguageRow> {
  const map = new Map<string, LanguageRow>();
  for (const row of rows) {
    map.set(row.id, row);
  }
  return map;
}

/**
 * 将地区数组构建为按 ID 索引的 Map，避免重复遍历。
 * 输入：RegionRow 数组。
 * 输出：Map<string, RegionRow>。
 * 业务规则：供列表与详情投影批量关联使用。
 */
export function buildRegionMap(rows: RegionRow[]): Map<string, RegionRow> {
  const map = new Map<string, RegionRow>();
  for (const row of rows) {
    map.set(row.id, row);
  }
  return map;
}

function resolveLanguageRef(
  languageId: string | null,
  languageMap: Map<string, LanguageRow>
): LanguageRef | null {
  if (!languageId) {
    return null;
  }
  const row = languageMap.get(languageId);
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    name: row.name,
  };
}

function resolveRegionRef(regionId: string, regionMap: Map<string, RegionRow>): RegionRef {
  const row = regionMap.get(regionId);
  if (!row) {
    throw new Error(`地区关联缺失: regionId=${regionId}`);
  }
  return {
    id: row.id,
    name: row.name,
  };
}

function resolveRegionDetail(regionId: string, regionMap: Map<string, RegionRow>): RegionDetail {
  const row = regionMap.get(regionId);
  if (!row) {
    throw new Error(`地区关联缺失: regionId=${regionId}`);
  }
  return {
    id: row.id,
    name: row.name,
    mapKey: row.mapKey,
  };
}

function toSubmitterCredit(item: CollectionItemRow): SubmitterCredit {
  if (item.submitterCreditMode === 'nickname') {
    return {
      mode: 'nickname',
      name: item.submitterPublicName,
    };
  }
  return {
    mode: 'anonymous',
    name: null,
  };
}

function toSubtitleList(segments: SubtitleSegment[] | null): SubtitleSegment[] {
  if (!segments || segments.length === 0) {
    return [];
  }
  const cloned = structuredClone(segments);
  cloned.sort(compareSubtitleStartAsc);
  return cloned;
}

/**
 * 将单条审核日志行转换为对投稿者/审核员展示的 ReviewLog 结构。
 * 输入：ReviewLogRow。
 * 输出：ReviewLog（不包含 reviewerId，避免向投稿者暴露审核员身份）。
 * 业务规则：仅保留操作动作、原因、前后状态和时间戳。
 */
export function toReviewLogDto(log: ReviewLogRow): ReviewLog {
  return {
    action: log.action,
    reason: log.reason,
    fromStatus: log.fromStatus,
    toStatus: log.toStatus,
    createdAt: log.createdAt,
  };
}

/**
 * 将审核日志行转换为列表页展示用的最近审核摘要。
 * 输入：ReviewLogRow 或 undefined/null。
 * 输出：LastReviewSummary 或 null。
 * 业务规则：无审核记录时返回 null。
 */
export function toLastReviewSummary(log: ReviewLogRow | null | undefined): LastReviewSummary | null {
  if (!log) {
    return null;
  }
  return {
    action: log.action,
    reason: log.reason,
    createdAt: log.createdAt,
  };
}

/**
 * 投影公开收藏品卡片 DTO（严格白名单，绝不包含私有路径、投稿账号或审核记录）。
 * 输入：已发布的 CollectionItemRow、语言 Map、地区 Map。
 * 输出：ItemCard。
 * 业务规则：调用方须确保 item 为 published + public；无主视觉时 visualType 与 visualUrl 均为 null。
 */
export function toPublicItemCard(
  item: CollectionItemRow,
  languageMap: Map<string, LanguageRow>,
  regionMap: Map<string, RegionRow>
): ItemCard {
  if (!item.publicAudioUrl || !item.publishedAt) {
    throw new Error(`公开卡片投影异常: 条目 ${item.id} 缺少公开音频或发布时间`);
  }

  return {
    id: item.id,
    title: item.title,
    summary: item.summary,
    contentType: item.contentType,
    language: resolveLanguageRef(item.languageId, languageMap),
    region: resolveRegionRef(item.regionId, regionMap),
    audioUrl: item.publicAudioUrl,
    visualType: item.visualType,
    visualUrl: item.visualType ? item.publicVisualUrl : null,
    durationSeconds: item.audioDurationSeconds,
    submitterCredit: toSubmitterCredit(item),
    featured: item.featured,
    publishedAt: item.publishedAt,
  };
}

/**
 * 投影公开收藏品详情 DTO（严格白名单，附带释义、字幕、文化背景和相关推荐）。
 * 输入：已发布的 CollectionItemRow、语言 Map、地区 Map、相关卡片数组。
 * 输出：ItemDetail。
 * 业务规则：绝不输出 submitterId、username、privateAudioKey、privateVisualKey、status、visibility、logs。
 */
export function toPublicItemDetail(
  item: CollectionItemRow,
  languageMap: Map<string, LanguageRow>,
  regionMap: Map<string, RegionRow>,
  related: ItemCard[]
): ItemDetail {
  const card = toPublicItemCard(item, languageMap, regionMap);
  return {
    id: card.id,
    title: card.title,
    summary: card.summary,
    contentType: card.contentType,
    language: card.language,
    region: resolveRegionDetail(item.regionId, regionMap),
    audioUrl: card.audioUrl,
    visualType: card.visualType,
    visualUrl: card.visualUrl,
    durationSeconds: card.durationSeconds,
    submitterCredit: card.submitterCredit,
    featured: card.featured,
    publishedAt: card.publishedAt,
    translationZh: item.translationZh,
    subtitleSegments: toSubtitleList(item.subtitleSegments),
    cultureContext: item.cultureContext,
    related,
  };
}

/**
 * 投影「我的投稿」列表项 DTO。
 * 输入：CollectionItemRow、地区 Map、签名主视觉预览 URL（无主视觉时为 null）、最新审核记录。
 * 输出：MySubmissionListItem。
 * 业务规则：有主视觉时返回 10 分钟签名预览 URL，无主视觉时 visualType 与 visualUrl 均为 null。
 */
export function toMySubmissionListItem(
  item: CollectionItemRow,
  regionMap: Map<string, RegionRow>,
  signedVisualUrl: string | null,
  lastLog: ReviewLogRow | undefined
): MySubmissionListItem {
  return {
    id: item.id,
    title: item.title,
    status: item.status,
    contentType: item.contentType,
    region: resolveRegionRef(item.regionId, regionMap),
    visualType: item.visualType,
    visualUrl: item.visualType ? signedVisualUrl : null,
    updatedAt: item.updatedAt,
    lastReview: toLastReviewSummary(lastLog),
  };
}

/**
 * 投影「我的投稿」详情 DTO。
 * 输入：CollectionItemRow、语言 Map、地区 Map、签名音频 URL、签名主视觉 URL、正序审核日志。
 * 输出：SubmissionDetail。
 * 业务规则：包含 recordingAuthorized 确认态，不暴露审核员账号信息。
 */
export function toSubmissionDetail(
  item: CollectionItemRow,
  languageMap: Map<string, LanguageRow>,
  regionMap: Map<string, RegionRow>,
  signedAudioUrl: string,
  signedVisualUrl: string | null,
  logs: ReviewLogRow[]
): SubmissionDetail {
  const logDtos: ReviewLog[] = [];
  for (const log of logs) {
    logDtos.push(toReviewLogDto(log));
  }
  const latestLog = logs.length > 0 ? logs[logs.length - 1] : null;

  return {
    id: item.id,
    title: item.title,
    summary: item.summary,
    contentType: item.contentType,
    status: item.status,
    language: resolveLanguageRef(item.languageId, languageMap),
    region: resolveRegionRef(item.regionId, regionMap),
    translationZh: item.translationZh,
    subtitleSegments: toSubtitleList(item.subtitleSegments),
    cultureContext: item.cultureContext,
    submitterCredit: toSubmitterCredit(item),
    recordingAuthorized: item.recordingAuthorized,
    audio: {
      url: signedAudioUrl,
      durationSeconds: item.audioDurationSeconds,
    },
    visual:
      item.visualType && signedVisualUrl
        ? {
            type: item.visualType,
            url: signedVisualUrl,
          }
        : null,
    logs: logDtos,
    lastReview: toLastReviewSummary(latestLog),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    publishedAt: item.publishedAt,
  };
}

/**
 * 投影审核工作台列表项 DTO（包含投稿者最小账号信息）。
 * 输入：CollectionItemRow、地区 Map、投稿者 ProfileRow、最新审核日志。
 * 输出：ReviewSubmissionListItem。
 * 业务规则：仅限审核员接口使用，供审核员核对投稿者账号。
 */
export function toReviewSubmissionListItem(
  item: CollectionItemRow,
  regionMap: Map<string, RegionRow>,
  submitter: ProfileRow,
  lastLog: ReviewLogRow | undefined
): ReviewSubmissionListItem {
  return {
    id: item.id,
    title: item.title,
    status: item.status,
    contentType: item.contentType,
    region: resolveRegionRef(item.regionId, regionMap),
    submitter: {
      username: submitter.username,
      displayName: submitter.displayName,
    },
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    lastReview: toLastReviewSummary(lastLog),
  };
}

/**
 * 投影审核工作台详情 DTO（在投稿详情基础上增加 submitter 账号信息）。
 * 输入：CollectionItemRow、语言 Map、地区 Map、签名音频/视觉 URL、审核日志、投稿者 ProfileRow。
 * 输出：ReviewSubmissionDetail。
 * 业务规则：仅限审核员查看，不返回任何邮箱或联系方式。
 */
export function toReviewSubmissionDetail(
  item: CollectionItemRow,
  languageMap: Map<string, LanguageRow>,
  regionMap: Map<string, RegionRow>,
  signedAudioUrl: string,
  signedVisualUrl: string | null,
  logs: ReviewLogRow[],
  submitter: ProfileRow
): ReviewSubmissionDetail {
  const baseDetail = toSubmissionDetail(
    item,
    languageMap,
    regionMap,
    signedAudioUrl,
    signedVisualUrl,
    logs
  );

  return {
    ...baseDetail,
    submitter: {
      username: submitter.username,
      displayName: submitter.displayName,
    },
  };
}
