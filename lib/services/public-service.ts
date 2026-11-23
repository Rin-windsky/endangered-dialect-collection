/**
 * 文件职责：实现访客与公开浏览业务链路（首页、收藏馆列表/详情、语言/地区选项、省级地图统计）。
 */

import { getDb } from '@/lib/db/client';
import { notFound } from '@/lib/http/errors';
import type {
  ItemCard,
  ItemDetail,
  LanguageOption,
  MapRegionStat,
  PaginatedResult,
  RegionOption,
} from '@/lib/types';
import type { CollectionsQueryInput } from '@/lib/validation/public';
import {
  buildLanguageMap,
  buildRegionMap,
  toPublicItemCard,
  toPublicItemDetail,
} from './projections';

export type HomeData = {
  featured: ItemCard[];
  latest: ItemCard[];
};

const HOME_FEATURED_LIMIT = 6;
const HOME_LATEST_LIMIT = 8;
const RELATED_ITEMS_LIMIT = 4;

/**
 * 获取首页精选与最新公开收藏品。
 * 输入：无。
 * 输出：{ featured: ItemCard[], latest: ItemCard[] }。
 * 业务规则：仅返回 published + public 条目，featured 最多 6 条，latest 最多 8 条。
 */
export async function getHomeData(): Promise<HomeData> {
  const db = await getDb();
  const [featuredRows, latestRows, languages, regions] = await Promise.all([
    db.items.listPublicFeatured(HOME_FEATURED_LIMIT),
    db.items.listPublicLatest(HOME_LATEST_LIMIT),
    db.languages.listAll(),
    db.regions.listAll(),
  ]);

  const languageMap = buildLanguageMap(languages);
  const regionMap = buildRegionMap(regions);

  const featured: ItemCard[] = [];
  for (const row of featuredRows) {
    featured.push(toPublicItemCard(row, languageMap, regionMap));
  }

  const latest: ItemCard[] = [];
  for (const row of latestRows) {
    latest.push(toPublicItemCard(row, languageMap, regionMap));
  }

  return { featured, latest };
}

/**
 * 分页检索公开收藏馆列表。
 * 输入：检索筛选与分页参数 CollectionsQueryInput。
 * 输出：PaginatedResult<ItemCard>。
 * 业务规则：仅检索 published + public 条目，绝不输出私有字段或审核信息。
 */
export async function listPublicCollections(
  query: CollectionsQueryInput
): Promise<PaginatedResult<ItemCard>> {
  const db = await getDb();
  const [pageResult, languages, regions] = await Promise.all([
    db.items.listPublic({
      q: query.q,
      type: query.type,
      languageId: query.languageId,
      regionId: query.regionId,
      sort: query.sort,
      page: query.page,
      limit: query.limit,
    }),
    db.languages.listAll(),
    db.regions.listAll(),
  ]);

  const languageMap = buildLanguageMap(languages);
  const regionMap = buildRegionMap(regions);

  const items: ItemCard[] = [];
  for (const row of pageResult.rows) {
    items.push(toPublicItemCard(row, languageMap, regionMap));
  }

  return {
    items,
    total: pageResult.total,
    page: query.page,
    limit: query.limit,
  };
}

/**
 * 查询单个公开收藏品详情及最多 4 条相关推荐。
 * 输入：收藏品 ID。
 * 输出：ItemDetail。
 * 业务规则：记录不存在或非 published + public 状态时统一抛出 404 NOT_FOUND。
 */
export async function getPublicCollectionDetail(itemId: string): Promise<ItemDetail> {
  const db = await getDb();
  const item = await db.items.findById(itemId);

  // 公开访问硬守卫：非已发布或非公开条目统一按不存在处理
  if (!item || item.status !== 'published' || item.visibility !== 'public') {
    throw notFound();
  }

  const [relatedRows, languages, regions] = await Promise.all([
    db.items.listPublicRelated(item, RELATED_ITEMS_LIMIT),
    db.languages.listAll(),
    db.regions.listAll(),
  ]);

  const languageMap = buildLanguageMap(languages);
  const regionMap = buildRegionMap(regions);

  const related: ItemCard[] = [];
  for (const rel of relatedRows) {
    related.push(toPublicItemCard(rel, languageMap, regionMap));
  }

  return toPublicItemDetail(item, languageMap, regionMap, related);
}

/**
 * 查询方言/语言筛选或表单选项列表。
 * 输入：scope（public 仅返回有公开内容的语言并附带 count；all 返回全部预置语言）。
 * 输出：LanguageOption 数组。
 * 业务规则：默认 scope=public 时只返回 count > 0 的语言。
 */
export async function listLanguages(scope: 'public' | 'all'): Promise<LanguageOption[]> {
  const db = await getDb();
  const languages = await db.languages.listAll();

  if (scope === 'all') {
    const options: LanguageOption[] = [];
    for (const lang of languages) {
      options.push({
        id: lang.id,
        name: lang.name,
      });
    }
    return options;
  }

  const counts = await db.items.countPublicByLanguage();
  const publicOptions: LanguageOption[] = [];
  for (const lang of languages) {
    const count = counts.get(lang.id) ?? 0;
    if (count > 0) {
      publicOptions.push({
        id: lang.id,
        name: lang.name,
        count,
      });
    }
  }
  return publicOptions;
}

/**
 * 查询省级地区筛选或表单选项列表。
 * 输入：scope（public 仅返回有公开内容的省份并附带 count；all 返回全部 34 个省级地区）。
 * 输出：RegionOption 数组。
 * 业务规则：默认 scope=public 时只返回 count > 0 的地区。
 */
export async function listRegions(scope: 'public' | 'all'): Promise<RegionOption[]> {
  const db = await getDb();
  const regions = await db.regions.listAll();

  if (scope === 'all') {
    const options: RegionOption[] = [];
    for (const region of regions) {
      options.push({
        id: region.id,
        name: region.name,
        mapKey: region.mapKey,
      });
    }
    return options;
  }

  const counts = await db.items.countPublicByRegion();
  const publicOptions: RegionOption[] = [];
  for (const region of regions) {
    const count = counts.get(region.id) ?? 0;
    if (count > 0) {
      publicOptions.push({
        id: region.id,
        name: region.name,
        mapKey: region.mapKey,
        count,
      });
    }
  }
  return publicOptions;
}

/**
 * 查询省级地图各省份公开收藏品统计数据。
 * 输入：无。
 * 输出：MapRegionStat 数组（仅包含 count > 0 的省份，不返回任何坐标）。
 * 业务规则：只统计 published + public 条目，确保与 /api/collections?regionId= 的 total 一致。
 */
export async function getMapRegionStats(): Promise<MapRegionStat[]> {
  const db = await getDb();
  const [regions, counts] = await Promise.all([
    db.regions.listAll(),
    db.items.countPublicByRegion(),
  ]);

  const stats: MapRegionStat[] = [];
  for (const region of regions) {
    const count = counts.get(region.id) ?? 0;
    if (count > 0) {
      stats.push({
        regionId: region.id,
        name: region.name,
        mapKey: region.mapKey,
        count,
      });
    }
  }
  return stats;
}
