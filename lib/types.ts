export type Role = "contributor" | "reviewer";
export type ItemStatus = "pending" | "needs_changes" | "published" | "withdrawn";
export type ContentType = "story" | "phrase" | "rhyme" | "proverb";
export type VisualType = "image" | "video";
export type SubmitterCreditMode = "anonymous" | "nickname";

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

export type LanguageOption = LanguageRef & { count?: number };
export type RegionOption = RegionDetail & { count?: number };

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

export type ItemDetail = Omit<ItemCard, "language" | "region"> & {
  language: LanguageDetail | null;
  region: RegionDetail;
  translationZh: string | null;
  subtitleSegments: SubtitleSegment[];
  cultureContext: string | null;
  related: ItemCard[];
};

export type SubtitleSegment = {
  start: number;
  end?: number;
  text: string;
  translation?: string;
};

export type ReviewLog = {
  action: "publish" | "return";
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

export type HomePayload = {
  featured: ItemCard[];
  latest: ItemCard[];
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export type LastReview = {
  action: "publish" | "return";
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
  lastReview: LastReview | null;
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
  lastReview: LastReview | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type ReviewListItem = {
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
  lastReview: LastReview | null;
};

export type ReviewDetail = SubmissionDetail & {
  submitter: {
    username: string;
    displayName: string;
  };
};

export type MapRegion = {
  regionId: string;
  name: string;
  mapKey: string;
  count: number;
};

export type SubtitleInput = {
  start: number;
  text: string;
  end?: number;
};

export type SubmissionInput = {
  title: string;
  summary: string;
  contentType: ContentType;
  languageId: string | null;
  regionId: string;
  subtitleSegments?: SubtitleInput[] | null;
  translationZh?: string | null;
  cultureContext?: string | null;
  submitterCredit?: SubmitterCredit;
  recordingAuthorized: boolean;
  audio: {
    path: string;
    durationSeconds?: number | null;
  };
  visual?: {
    type: VisualType;
    path: string;
  } | null;
};

export type UploadFileInfo = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export type SignPayload = {
  audio: UploadFileInfo;
  visual?: UploadFileInfo & { type: VisualType };
};

export type SignedUpload = {
  path: string;
  uploadUrl: string;
  token?: string;
};

export type SignResponse = {
  audio: SignedUpload;
  visual?: SignedUpload;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
};