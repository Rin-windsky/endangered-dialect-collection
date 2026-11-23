/**
 * 文件职责：基于内存 Map 实现 Repository 与 Database 接口，完整模拟关系查询、公开过滤、排序与事务回滚。
 */

import { randomUUID } from 'node:crypto';
import type {
  CollectionItemRepository,
  CollectionItemRow,
  Database,
  LanguageRepository,
  LanguageRow,
  NewCollectionItemRow,
  NewProfileRow,
  NewReviewLogRow,
  PageResult,
  ProfileRepository,
  ProfileRow,
  PublicCollectionsQuery,
  RegionRepository,
  RegionRow,
  ReviewLogRepository,
  ReviewLogRow,
  UpdateCollectionItemPatch,
} from '@/lib/db/types';
import type { ItemStatus } from '@/lib/types';
import { assertItemConstraints } from './constraints';

function compareSortOrderAsc<T extends { sortOrder: number }>(a: T, b: T): number {
  return a.sortOrder - b.sortOrder;
}

function compareCreatedAtDesc(a: CollectionItemRow, b: CollectionItemRow): number {
  return b.createdAt.localeCompare(a.createdAt);
}

function compareCreatedAtAsc(a: CollectionItemRow, b: CollectionItemRow): number {
  return a.createdAt.localeCompare(b.createdAt);
}

function comparePublishedAtDesc(a: CollectionItemRow, b: CollectionItemRow): number {
  const timeA = a.publishedAt ?? '';
  const timeB = b.publishedAt ?? '';
  return timeB.localeCompare(timeA);
}

function compareFeaturedThenPublishedDesc(a: CollectionItemRow, b: CollectionItemRow): number {
  if (a.featured !== b.featured) {
    return a.featured ? -1 : 1;
  }
  return comparePublishedAtDesc(a, b);
}

function compareLogCreatedAtAsc(a: ReviewLogRow, b: ReviewLogRow): number {
  return a.createdAt.localeCompare(b.createdAt);
}

function paginateRows<T>(rows: T[], page: number, limit: number): PageResult<T> {
  const total = rows.length;
  const offset = (page - 1) * limit;
  const paged: T[] = [];
  const end = Math.min(offset + limit, total);
  for (let i = offset; i < end; i++) {
    paged.push(structuredClone(rows[i]));
  }
  return { rows: paged, total };
}

class MemoryProfileRepository implements ProfileRepository {
  private readonly store: Map<string, ProfileRow>;

  constructor(store: Map<string, ProfileRow>) {
    this.store = store;
  }

  /**
   * 按主键 ID 查询账号。
   * 输入：用户 UUID。
   * 输出：ProfileRow 副本或 null。
   * 业务规则：返回深拷贝，避免外部修改污染内存表。
   */
  async findById(id: string): Promise<ProfileRow | null> {
    const row = this.store.get(id);
    if (!row) {
      return null;
    }
    return structuredClone(row);
  }

  /**
   * 按用户名查询账号（统一小写匹配）。
   * 输入：用户名字符串。
   * 输出：ProfileRow 副本或 null。
   * 业务规则：用户名大小写不敏感，统一按小写检索。
   */
  async findByUsername(username: string): Promise<ProfileRow | null> {
    const normalized = username.toLowerCase();
    for (const row of this.store.values()) {
      if (row.username === normalized) {
        return structuredClone(row);
      }
    }
    return null;
  }

  /**
   * 新增用户账号记录。
   * 输入：不含 id 和 createdAt 的 NewProfileRow。
   * 输出：落库后的 ProfileRow 副本。
   * 业务规则：强制检查 username 全局唯一，违反唯一约束时抛出 Error。
   */
  async insert(row: NewProfileRow): Promise<ProfileRow> {
    const normalizedUsername = row.username.toLowerCase();
    for (const existing of this.store.values()) {
      if (existing.username === normalizedUsername) {
        throw new Error(`数据库唯一约束违反: username=${normalizedUsername} 已存在`);
      }
    }

    const created: ProfileRow = {
      id: randomUUID(),
      username: normalizedUsername,
      passwordHash: row.passwordHash,
      displayName: row.displayName,
      role: row.role,
      createdAt: new Date().toISOString(),
    };
    this.store.set(created.id, structuredClone(created));
    return structuredClone(created);
  }
}

class MemoryLanguageRepository implements LanguageRepository {
  private readonly store: Map<string, LanguageRow>;

  constructor(store: Map<string, LanguageRow>) {
    this.store = store;
  }

  /**
   * 列出全部预置语言（按 sortOrder 升序）。
   * 输入：无。
   * 输出：LanguageRow 数组副本。
   * 业务规则：返回全部预置方言/语言选项。
   */
  async listAll(): Promise<LanguageRow[]> {
    const rows: LanguageRow[] = [];
    for (const row of this.store.values()) {
      rows.push(structuredClone(row));
    }
    rows.sort(compareSortOrderAsc);
    return rows;
  }

  /**
   * 按 ID 查找语言记录。
   * 输入：语言 UUID。
   * 输出：LanguageRow 副本或 null。
   * 业务规则：供外键存在性校验及展示投影关联使用。
   */
  async findById(id: string): Promise<LanguageRow | null> {
    const row = this.store.get(id);
    if (!row) {
      return null;
    }
    return structuredClone(row);
  }

  /**
   * 内部种子写入辅助方法，不暴露在通用接口中。
   */
  seedRow(row: LanguageRow): void {
    this.store.set(row.id, structuredClone(row));
  }
}

class MemoryRegionRepository implements RegionRepository {
  private readonly store: Map<string, RegionRow>;

  constructor(store: Map<string, RegionRow>) {
    this.store = store;
  }

  /**
   * 列出全部预置省级地区（按 sortOrder 升序）。
   * 输入：无。
   * 输出：RegionRow 数组副本。
   * 业务规则：返回全部 34 个省级行政区。
   */
  async listAll(): Promise<RegionRow[]> {
    const rows: RegionRow[] = [];
    for (const row of this.store.values()) {
      rows.push(structuredClone(row));
    }
    rows.sort(compareSortOrderAsc);
    return rows;
  }

  /**
   * 按 ID 查找地区记录。
   * 输入：地区 UUID。
   * 输出：RegionRow 副本或 null。
   * 业务规则：供外键存在性校验及展示投影关联使用。
   */
  async findById(id: string): Promise<RegionRow | null> {
    const row = this.store.get(id);
    if (!row) {
      return null;
    }
    return structuredClone(row);
  }

  /**
   * 内部种子写入辅助方法，不暴露在通用接口中。
   */
  seedRow(row: RegionRow): void {
    this.store.set(row.id, structuredClone(row));
  }
}

class MemoryCollectionItemRepository implements CollectionItemRepository {
  private readonly store: Map<string, CollectionItemRow>;
  private readonly languagesStore: Map<string, LanguageRow>;
  private readonly regionsStore: Map<string, RegionRow>;

  constructor(
    store: Map<string, CollectionItemRow>,
    languagesStore: Map<string, LanguageRow>,
    regionsStore: Map<string, RegionRow>
  ) {
    this.store = store;
    this.languagesStore = languagesStore;
    this.regionsStore = regionsStore;
  }

  private isPublicItem(row: CollectionItemRow): boolean {
    // 公开查询强制过滤条件：status='published' 且 visibility='public'
    return row.status === 'published' && row.visibility === 'public';
  }

  /**
   * 插入一条新投稿记录。
   * 输入：NewCollectionItemRow（不含 id、createdAt、updatedAt）。
   * 输出：写入后的 CollectionItemRow 副本。
   * 业务规则：写入前执行数据库 CHECK 约束检查，失败直接抛出 Error。
   */
  async insert(row: NewCollectionItemRow): Promise<CollectionItemRow> {
    const nowIso = new Date().toISOString();
    const created: CollectionItemRow = {
      ...structuredClone(row),
      id: randomUUID(),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    assertItemConstraints(created);
    this.store.set(created.id, structuredClone(created));
    return structuredClone(created);
  }

  /**
   * 按 ID 查询收藏品/投稿。
   * 输入：条目 UUID。
   * 输出：CollectionItemRow 副本或 null。
   * 业务规则：内部基础查询方法，不附加公开条件，由调用方按权限/公开性过滤。
   */
  async findById(id: string): Promise<CollectionItemRow | null> {
    const row = this.store.get(id);
    if (!row) {
      return null;
    }
    return structuredClone(row);
  }

  /**
   * 更新指定投稿记录，并自动刷新 updatedAt（模拟数据库触发器 touch_updated_at）。
   * 输入：条目 ID 与待更新字段补丁 patch。
   * 输出：更新后的 CollectionItemRow 副本。
   * 业务规则：合并补丁后立即校验全部 CHECK 约束，违反时抛出 Error。
   */
  async update(id: string, patch: UpdateCollectionItemPatch): Promise<CollectionItemRow> {
    const existing = this.store.get(id);
    if (!existing) {
      throw new Error(`更新失败: collection_items 中不存在 id=${id}`);
    }

    const updated: CollectionItemRow = {
      ...structuredClone(existing),
      ...structuredClone(patch),
      updatedAt: new Date().toISOString(),
    };
    assertItemConstraints(updated);
    this.store.set(id, structuredClone(updated));
    return structuredClone(updated);
  }

  /**
   * 查询指定投稿者的投稿列表（按 createdAt 倒序分页）。
   * 输入：submitterId、状态筛选（或 'all'）、页码、每页条数。
   * 输出：分页后的 CollectionItemRow 列表与总数。
   * 业务规则：仅返回归属该用户的记录。
   */
  async listBySubmitter(
    submitterId: string,
    status: ItemStatus | 'all',
    page: number,
    limit: number
  ): Promise<PageResult<CollectionItemRow>> {
    const matched: CollectionItemRow[] = [];
    for (const row of this.store.values()) {
      if (row.submitterId !== submitterId) {
        continue;
      }
      if (status !== 'all' && row.status !== status) {
        continue;
      }
      matched.push(row);
    }

    matched.sort(compareCreatedAtDesc);
    return paginateRows(matched, page, limit);
  }

  /**
   * 查询审核工作台列表。
   * 输入：状态筛选（或 'all'）、排序方式（oldest/newest）、页码、每页条数。
   * 输出：分页后的 CollectionItemRow 列表与总数。
   * 业务规则：按 createdAt 升序（oldest）或降序（newest）排列。
   */
  async listForReview(
    status: ItemStatus | 'all',
    sort: 'oldest' | 'newest',
    page: number,
    limit: number
  ): Promise<PageResult<CollectionItemRow>> {
    const matched: CollectionItemRow[] = [];
    for (const row of this.store.values()) {
      if (status !== 'all' && row.status !== status) {
        continue;
      }
      matched.push(row);
    }

    if (sort === 'oldest') {
      matched.sort(compareCreatedAtAsc);
    } else {
      matched.sort(compareCreatedAtDesc);
    }
    return paginateRows(matched, page, limit);
  }

  /**
   * 公开收藏馆列表条件检索与分页。
   * 输入：检索关键字 q、类型 type、languageId、regionId、排序 sort、页码、每页条数。
   * 输出：分页后的公开收藏品列表与总数。
   * 业务规则：强制过滤 published + public；换成真实 SQL 时，对 q 必须转义 %、_、\。
   */
  async listPublic(query: PublicCollectionsQuery): Promise<PageResult<CollectionItemRow>> {
    const keyword = query.q ? query.q.trim().toLowerCase() : '';
    const matched: CollectionItemRow[] = [];

    for (const row of this.store.values()) {
      if (!this.isPublicItem(row)) {
        continue;
      }
      if (query.type && row.contentType !== query.type) {
        continue;
      }
      if (query.languageId && row.languageId !== query.languageId) {
        continue;
      }
      if (query.regionId && row.regionId !== query.regionId) {
        continue;
      }

      if (keyword !== '') {
        const titleMatched = row.title.toLowerCase().includes(keyword);
        const language = row.languageId ? this.languagesStore.get(row.languageId) : undefined;
        const languageMatched = language ? language.name.toLowerCase().includes(keyword) : false;
        const region = this.regionsStore.get(row.regionId);
        const regionMatched = region ? region.name.toLowerCase().includes(keyword) : false;

        if (!titleMatched && !languageMatched && !regionMatched) {
          continue;
        }
      }

      matched.push(row);
    }

    if (query.sort === 'featured') {
      matched.sort(compareFeaturedThenPublishedDesc);
    } else {
      matched.sort(comparePublishedAtDesc);
    }

    return paginateRows(matched, query.page, query.limit);
  }

  /**
   * 查询首页精选公开收藏品（按发布时间倒序）。
   * 输入：最大条数 limit。
   * 输出：CollectionItemRow 数组副本。
   * 业务规则：强制过滤 published + public 且 featured=true。
   */
  async listPublicFeatured(limit: number): Promise<CollectionItemRow[]> {
    const matched: CollectionItemRow[] = [];
    for (const row of this.store.values()) {
      if (this.isPublicItem(row) && row.featured) {
        matched.push(row);
      }
    }
    matched.sort(comparePublishedAtDesc);

    const result: CollectionItemRow[] = [];
    const maxCount = Math.min(limit, matched.length);
    for (let i = 0; i < maxCount; i++) {
      result.push(structuredClone(matched[i]));
    }
    return result;
  }

  /**
   * 查询首页最新公开收藏品（按发布时间倒序）。
   * 输入：最大条数 limit。
   * 输出：CollectionItemRow 数组副本。
   * 业务规则：强制过滤 published + public。
   */
  async listPublicLatest(limit: number): Promise<CollectionItemRow[]> {
    const matched: CollectionItemRow[] = [];
    for (const row of this.store.values()) {
      if (this.isPublicItem(row)) {
        matched.push(row);
      }
    }
    matched.sort(comparePublishedAtDesc);

    const result: CollectionItemRow[] = [];
    const maxCount = Math.min(limit, matched.length);
    for (let i = 0; i < maxCount; i++) {
      result.push(structuredClone(matched[i]));
    }
    return result;
  }

  /**
   * 查询相关公开收藏品（同方言或同地区，排除自身）。
   * 输入：当前条目 item 与最大条数 limit。
   * 输出：CollectionItemRow 数组副本。
   * 业务规则：强制过滤 published + public，按发布时间倒序返回最多 limit 条。
   */
  async listPublicRelated(item: CollectionItemRow, limit: number): Promise<CollectionItemRow[]> {
    const matched: CollectionItemRow[] = [];
    for (const row of this.store.values()) {
      if (!this.isPublicItem(row)) {
        continue;
      }
      if (row.id === item.id) {
        continue;
      }
      const sameLanguage = item.languageId !== null && row.languageId === item.languageId;
      const sameRegion = row.regionId === item.regionId;
      if (!sameLanguage && !sameRegion) {
        continue;
      }
      matched.push(row);
    }

    matched.sort(comparePublishedAtDesc);

    const result: CollectionItemRow[] = [];
    const maxCount = Math.min(limit, matched.length);
    for (let i = 0; i < maxCount; i++) {
      result.push(structuredClone(matched[i]));
    }
    return result;
  }

  /**
   * 按省级地区聚合统计公开收藏品数量。
   * 输入：无。
   * 输出：Map<regionId, count>（仅统计 published + public）。
   * 业务规则：计数为 0 的地区不出现在 Map 中。
   */
  async countPublicByRegion(): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    for (const row of this.store.values()) {
      if (!this.isPublicItem(row)) {
        continue;
      }
      const prev = counts.get(row.regionId) ?? 0;
      counts.set(row.regionId, prev + 1);
    }
    return counts;
  }

  /**
   * 按语言/方言聚合统计公开收藏品数量。
   * 输入：无。
   * 输出：Map<languageId, count>（仅统计 published + public 且 languageId 非空的条目）。
   * 业务规则：languageId 为 null（暂不确定）的条目不计入语言筛选选项统计。
   */
  async countPublicByLanguage(): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    for (const row of this.store.values()) {
      if (!this.isPublicItem(row) || row.languageId === null) {
        continue;
      }
      const prev = counts.get(row.languageId) ?? 0;
      counts.set(row.languageId, prev + 1);
    }
    return counts;
  }
}

class MemoryReviewLogRepository implements ReviewLogRepository {
  private readonly store: Map<string, ReviewLogRow>;

  constructor(store: Map<string, ReviewLogRow>) {
    this.store = store;
  }

  /**
   * 追加一条审核日志（只追加，不提供更新或删除接口）。
   * 输入：NewReviewLogRow。
   * 输出：落库后的 ReviewLogRow 副本。
   * 业务规则：action='return' 时 reason 必须非空。
   */
  async insert(row: NewReviewLogRow): Promise<ReviewLogRow> {
    if (row.action === 'return' && (!row.reason || row.reason.trim() === '')) {
      throw new Error('数据库约束违反: action=return 时 reason 不能为空');
    }

    const created: ReviewLogRow = {
      ...structuredClone(row),
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.store.set(created.id, structuredClone(created));
    return structuredClone(created);
  }

  /**
   * 查询指定投稿的全部审核记录（按时间正序）。
   * 输入：collectionItemId。
   * 输出：ReviewLogRow 数组副本。
   * 业务规则：按 createdAt 升序排列，同毫秒按写入顺序保持稳定。
   */
  async listByItemId(collectionItemId: string): Promise<ReviewLogRow[]> {
    const matched: ReviewLogRow[] = [];
    for (const row of this.store.values()) {
      if (row.collectionItemId === collectionItemId) {
        matched.push(structuredClone(row));
      }
    }
    matched.sort(compareLogCreatedAtAsc);
    return matched;
  }

  /**
   * 批量获取多条投稿的最新一条审核日志。
   * 输入：collectionItemIds 数组。
   * 输出：Map<collectionItemId, ReviewLogRow>。
   * 业务规则：用于在列表页高效展示最近一次审核记录。
   */
  async findLatestByItemIds(collectionItemIds: string[]): Promise<Map<string, ReviewLogRow>> {
    const idSet = new Set(collectionItemIds);
    const latestMap = new Map<string, ReviewLogRow>();

    for (const row of this.store.values()) {
      if (!idSet.has(row.collectionItemId)) {
        continue;
      }
      const existing = latestMap.get(row.collectionItemId);
      // 同一毫秒内按插入顺序覆盖，确保同一事务或连续操作取到最后写入的记录
      if (!existing || row.createdAt >= existing.createdAt) {
        latestMap.set(row.collectionItemId, structuredClone(row));
      }
    }

    return latestMap;
  }
}

export class MemoryDatabase implements Database {
  private readonly profilesStore = new Map<string, ProfileRow>();
  private readonly languagesStore = new Map<string, LanguageRow>();
  private readonly regionsStore = new Map<string, RegionRow>();
  private readonly itemsStore = new Map<string, CollectionItemRow>();
  private readonly reviewLogsStore = new Map<string, ReviewLogRow>();

  public readonly profiles: MemoryProfileRepository;
  public readonly languages: MemoryLanguageRepository;
  public readonly regions: MemoryRegionRepository;
  public readonly items: MemoryCollectionItemRepository;
  public readonly reviewLogs: MemoryReviewLogRepository;

  constructor() {
    this.profiles = new MemoryProfileRepository(this.profilesStore);
    this.languages = new MemoryLanguageRepository(this.languagesStore);
    this.regions = new MemoryRegionRepository(this.regionsStore);
    this.items = new MemoryCollectionItemRepository(
      this.itemsStore,
      this.languagesStore,
      this.regionsStore
    );
    this.reviewLogs = new MemoryReviewLogRepository(this.reviewLogsStore);
  }

  /**
   * 在事务语义下执行回调，异常时回滚 items 与 reviewLogs 状态。
   * 输入：事务执行函数 fn(tx)。
   * 输出：fn 的返回值。
   * 业务规则：内存版通过执行前快照回滚保证原子性，不隔离并发请求；接入真实 DB 后替换为数据库原生事务。
   */
  async transaction<T>(fn: (tx: Database) => Promise<T>): Promise<T> {
    const itemsBackup = structuredClone(this.itemsStore);
    const reviewLogsBackup = structuredClone(this.reviewLogsStore);

    try {
      return await fn(this);
    } catch (err) {
      this.itemsStore.clear();
      for (const [key, val] of itemsBackup.entries()) {
        this.itemsStore.set(key, val);
      }

      this.reviewLogsStore.clear();
      for (const [key, val] of reviewLogsBackup.entries()) {
        this.reviewLogsStore.set(key, val);
      }
      throw err;
    }
  }
}
