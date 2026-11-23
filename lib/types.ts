/**
 * 文件职责：定义前后端共享的 API 契约类型与核心业务枚举类型（对应技术方案第 6.6 节）。
 */

export type Role = 'contributor' | 'reviewer';
export type ItemStatus = 'pending' | 'needs_changes' | 'published' | 'withdrawn';
export type Visibility = 'private' | 'public';
export type ContentType = 'story' | 'phrase' | 'rhyme' | 'proverb';
export type VisualType = 'image' | 'video';
export type SubmitterCreditMode = 'anonymous' | 'nickname';
export type ReviewAction = 'publish' | 'return';

export type SubmitterCredit = {
  mode: SubmitterCreditMode;
  name: string | null;
};

export type LanguageRef = {
  id: string;
  name: string;
};

export type LanguageDetail = LanguageRef;

export type RegionRef = {
  id: string;
  name: string;
};

export type RegionDetail = RegionRef & {
  mapKey: string;
};

export type LanguageOption = LanguageRef & {
  count?: number;
};

export type RegionOption = RegionDetail & {
  count?: number;
};

export type SubtitleSegment = {
  start: number;
  end?: number;
  text: string;
  translation?: string;
};

export type ItemCard = {
  id: string;
  title: string;
  summary: string;
  contentType: ContentType;
  language: LanguageRef | null;
  region: RegionRef;
  audioUrl: string;
  visualType: VisualType | null;
  visualUrl: string | null;
  durationSeconds: number | null;
  submitterCredit: SubmitterCredit;
  featured: boolean;
  publishedAt: string;
};

export type ItemDetail = Omit<ItemCard, 'language' | 'region'> & {
  language: LanguageDetail | null;
  region: RegionDetail;
  translationZh: string | null;
  subtitleSegments: SubtitleSegment[];
  cultureContext: string | null;
  related: ItemCard[];
};

export type ReviewLog = {
  action: ReviewAction;
  reason: string | null;
  fromStatus: ItemStatus;
  toStatus: ItemStatus;
  createdAt: string;
};

export type User = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
};

export type LastReviewSummary = {
  action: ReviewAction;
  reason: string | null;
  createdAt: string;
};

export type MySubmissionListItem = {
  id: string;
  title: string;
  status: ItemStatus;
  contentType: ContentType;
  region: RegionRef;
  visualType: VisualType | null;
  visualUrl: string | null;
  updatedAt: string;
  lastReview: LastReviewSummary | null;
};

export type SubmissionDetail = {
  id: string;
  title: string;
  summary: string;
  contentType: ContentType;
  status: ItemStatus;
  language: LanguageRef | null;
  region: RegionRef;
  translationZh: string | null;
  subtitleSegments: SubtitleSegment[];
  cultureContext: string | null;
  submitterCredit: SubmitterCredit;
  recordingAuthorized: boolean;
  audio: {
    url: string;
    durationSeconds: number | null;
  };
  visual: {
    type: VisualType;
    url: string;
  } | null;
  logs: ReviewLog[];
  lastReview: LastReviewSummary | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type ReviewSubmissionListItem = {
  id: string;
  title: string;
  status: ItemStatus;
  contentType: ContentType;
  region: RegionRef;
  submitter: {
    username: string;
    displayName: string;
  };
  createdAt: string;
  updatedAt: string;
  lastReview: LastReviewSummary | null;
};

export type ReviewSubmissionDetail = SubmissionDetail & {
  submitter: {
    username: string;
    displayName: string;
  };
};

export type MapRegionStat = {
  regionId: string;
  name: string;
  mapKey: string;
  count: number;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};
