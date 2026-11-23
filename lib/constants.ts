import type { ContentType, ItemStatus, SubmitterCreditMode, VisualType } from "./types";

export const SITE_NAME = "乡音";
export const SITE_FULL_NAME = "乡音 · 方言收藏馆";
export const SITE_SLOGAN = "收藏那些正在远去的声音。";

export const CONTENT_TYPES: { value: ContentType; label: string; short: string; note: string }[] = [
  { value: "story", label: "故事 / 讲述", short: "故事", note: "一段完整讲述或口述记忆" },
  { value: "phrase", label: "日常表达", short: "表达", note: "一句话、一段对话、常用表达" },
  { value: "rhyme", label: "童谣 / 歌谣", short: "歌谣", note: "童谣、民谣、劳动歌等" },
  { value: "proverb", label: "俗语 / 谚语", short: "俗语", note: "地方俗语、俚语、谚语" },
];

export const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  story: "故事 / 讲述",
  phrase: "日常表达",
  rhyme: "童谣 / 歌谣",
  proverb: "俗语 / 谚语",
};

export const STATUS_LABEL: Record<ItemStatus, string> = {
  pending: "待审核",
  needs_changes: "需补充",
  published: "已发布",
  withdrawn: "已撤回",
};

export const CREDIT_MODE_LABEL: Record<SubmitterCreditMode, string> = {
  anonymous: "匿名展示",
  nickname: "昵称展示",
};

export const VISUAL_TYPE_LABEL: Record<VisualType, string> = {
  image: "图片",
  video: "短视频",
};

export const RECORDING_AUTH_TEXT = "我拥有该录音的授权，或已征得讲述者同意公开";

export const FILE_RULES = {
  audio: {
    label: "录音文件",
    extensions: ["mp3", "m4a", "wav"],
    mimeTypes: ["audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/wav", "audio/x-wav", "audio/wave"],
    maxBytes: 30 * 1024 * 1024,
    hint: "MP3、M4A、WAV，最大 30MB",
  },
  image: {
    label: "主视觉图片",
    extensions: ["jpg", "jpeg", "png", "webp"],
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxBytes: 8 * 1024 * 1024,
    hint: "JPG、JPEG、PNG、WebP，最大 8MB",
  },
  video: {
    label: "主视觉短视频",
    extensions: ["mp4", "webm"],
    mimeTypes: ["video/mp4", "video/webm"],
    maxBytes: 50 * 1024 * 1024,
    hint: "MP4、WebM，最大 50MB，建议 15–30 秒",
  },
} as const;

export const PAGE_LIMIT = 12;

export const REVIEW_STATUS_TABS: { value: ItemStatus | "all"; label: string }[] = [
  { value: "pending", label: "待审核" },
  { value: "needs_changes", label: "需补充" },
  { value: "published", label: "已发布" },
  { value: "withdrawn", label: "已撤回" },
  { value: "all", label: "全部" },
];

export const MY_STATUS_TABS: { value: ItemStatus | "all"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待审核" },
  { value: "needs_changes", label: "需补充" },
  { value: "published", label: "已发布" },
  { value: "withdrawn", label: "已撤回" },
];

export const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: "请检查填写的内容",
  FILE_TYPE_NOT_ALLOWED: "文件格式不支持",
  AUTH_REQUIRED: "请先登录",
  INVALID_CREDENTIALS: "用户名或密码错误",
  FORBIDDEN: "没有权限进行此操作",
  NOT_FOUND: "内容不存在",
  USERNAME_TAKEN: "用户名已存在",
  STATUS_CONFLICT: "当前状态已变化，请刷新后重试",
  FILE_TOO_LARGE: "文件超过大小限制",
  RATE_LIMITED: "尝试过于频繁，请稍后再试",
  INTERNAL_ERROR: "服务暂时不可用，请稍后再试",
  STORAGE_ERROR: "文件存储暂时不可用，请重试",
};

export const isMockMode = process.env.NEXT_PUBLIC_API_MODE !== "http";

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "--:--";
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

export function formatTimecode(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function cx(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(" ");
}