/**
 * 文件职责：定义数据持久化层的行实体类型、各 Repository 接口及统一 Database 边界接口（便于后续无缝替换内存实现为真实数据库）。
 */

import type {
  ContentType,
  ItemStatus,
  ReviewAction,
  Role,
  SubmitterCreditMode,
  SubtitleSegment,
  Visibility,
  VisualType,
} from '@/lib/types';

export type ProfileRow = {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
  role: Role;
  createdAt: string;
};

export type NewProfileRow = Omit<ProfileRow, 'id' | 'createdAt'>;

export type LanguageRow = {
  id: string;
  name: string;
  sortOrder: number;
};

export type RegionRow = {
  id: string;
  name: string;
  mapKey: string;
  sortOrder: number;
};

export type CollectionItemRow = {
  id: string;
  title: string;
  summary: string;
  contentType: ContentType;
  languageId: string | null;
  regionId: string;
  translationZh: string | null;
  subtitleSegments: SubtitleSegment[] | null;
  cultureContext: string | null;
  visualType: VisualType | null;
  privateAudioKey: string;
  publicAudioUrl: string | null;
  privateVisualKey: string | null;
  publicVisualUrl: string | null;
  audioDurationSeconds: number | null;
  recordingAuthorized: boolean;
  submitterId: string;
  submitterCreditMode: SubmitterCreditMode;
  submitterPublicName: string | null;
  status: ItemStatus;
  visibility: Visibility;
  featured: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewCollectionItemRow = Omit<CollectionItemRow, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateCollectionItemPatch = Partial<Omit<CollectionItemRow, 'id' | 'submitterId' | 'createdAt' | 'updatedAt'>>;

export type ReviewLogRow = {
  id: string;
  collectionItemId: string;
  reviewerId: string;
  action: ReviewAction;
  reason: string | null;
  fromStatus: ItemStatus;
  toStatus: ItemStatus;
  createdAt: string;
};

export type NewReviewLogRow = Omit<ReviewLogRow, 'id' | 'createdAt'>;

export type PublicCollectionsQuery = {
  q?: string;
  type?: ContentType;
  languageId?: string;
  regionId?: string;
  sort: 'latest' | 'featured';
  page: number;
  limit: number;
};

export type PageResult<TRow> = {
  rows: TRow[];
  total: number;
};

export interface ProfileRepository {
  findById(id: string): Promise<ProfileRow | null>;
  findByUsername(username: string): Promise<ProfileRow | null>;
  insert(row: NewProfileRow): Promise<ProfileRow>;
}

export interface LanguageRepository {
  listAll(): Promise<LanguageRow[]>;
  findById(id: string): Promise<LanguageRow | null>;
}

export interface RegionRepository {
  listAll(): Promise<RegionRow[]>;
  findById(id: string): Promise<RegionRow | null>;
}

export interface CollectionItemRepository {
  insert(row: NewCollectionItemRow): Promise<CollectionItemRow>;
  findById(id: string): Promise<CollectionItemRow | null>;
  update(id: string, patch: UpdateCollectionItemPatch): Promise<CollectionItemRow>;
  listBySubmitter(
    submitterId: string,
    status: ItemStatus | 'all',
    page: number,
    limit: number
  ): Promise<PageResult<CollectionItemRow>>;
  listForReview(
    status: ItemStatus | 'all',
    sort: 'oldest' | 'newest',
    page: number,
    limit: number
  ): Promise<PageResult<CollectionItemRow>>;
  listPublic(query: PublicCollectionsQuery): Promise<PageResult<CollectionItemRow>>;
  listPublicFeatured(limit: number): Promise<CollectionItemRow[]>;
  listPublicLatest(limit: number): Promise<CollectionItemRow[]>;
  listPublicRelated(item: CollectionItemRow, limit: number): Promise<CollectionItemRow[]>;
  countPublicByRegion(): Promise<Map<string, number>>;
  countPublicByLanguage(): Promise<Map<string, number>>;
}

export interface ReviewLogRepository {
  insert(row: NewReviewLogRow): Promise<ReviewLogRow>;
  listByItemId(collectionItemId: string): Promise<ReviewLogRow[]>;
  findLatestByItemIds(collectionItemIds: string[]): Promise<Map<string, ReviewLogRow>>;
}

export interface Database {
  profiles: ProfileRepository;
  languages: LanguageRepository;
  regions: RegionRepository;
  items: CollectionItemRepository;
  reviewLogs: ReviewLogRepository;
  transaction<T>(fn: (tx: Database) => Promise<T>): Promise<T>;
}
