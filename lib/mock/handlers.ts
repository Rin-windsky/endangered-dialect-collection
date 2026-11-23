import { ApiError } from "../api/errors";
import { FILE_RULES } from "../constants";
import { flattenZodErrors, returnReasonSchema, submissionInputSchema } from "../validation";
import type {
  HomePayload,
  ItemCard,
  ItemDetail,
  LanguageOption,
  MapRegion,
  MySubmissionListItem,
  Paginated,
  RegionOption,
  ReviewDetail,
  ReviewListItem,
  ReviewLog,
  Role,
  SignResponse,
  SignedUpload,
  SubmissionDetail,
  SubmitterCredit,
  SubtitleInput,
  User,
  VisualType,
} from "../types";
import {
  clearSessionUser,
  findItem,
  getDb,
  getSessionUser,
  newId,
  nowIso,
  persist,
  setSessionUser,
} from "./db";
import { resolveMedia } from "./media";
import type { MockDb, MockItem, MockProfile } from "./seed";

type Query = URLSearchParams;

function delay(): Promise<void> {
  const ms = 120 + Math.floor(Math.random() * 160);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toUser(profile: MockProfile): User {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.displayName,
    role: profile.role as Role,
  };
}

function languageRef(db: MockDb, id: string | null) {
  if (!id) return null;
  const language = db.languages.find((entry) => entry.id === id);
  return language ? { id: language.id, name: language.name } : null;
}

function regionRef(db: MockDb, id: string) {
  const region = db.regions.find((entry) => entry.id === id);
  return region ?? { id, name: "未知地区", mapKey: "" };
}

function isPublic(item: MockItem): boolean {
  return item.status === "published" && item.visibility === "public";
}

function credit(item: MockItem): SubmitterCredit {
  return {
    mode: item.submitterCreditMode,
    name: item.submitterCreditMode === "nickname" ? item.submitterPublicName : null,
  };
}

function latestLog(db: MockDb, itemId: string) {
  const logs = db.logs
    .filter((log) => log.collectionItemId === itemId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const log = logs[0];
  return log ? { action: log.action, reason: log.reason, createdAt: log.createdAt } : null;
}

function logDto(log: { action: "publish" | "return"; reason: string | null; fromStatus: ReviewLog["fromStatus"]; toStatus: ReviewLog["toStatus"]; createdAt: string }): ReviewLog {
  return {
    action: log.action,
    reason: log.reason,
    fromStatus: log.fromStatus,
    toStatus: log.toStatus,
    createdAt: log.createdAt,
  };
}

function cardDto(db: MockDb, item: MockItem): ItemCard {
  return {
    id: item.id,
    title: item.title,
    summary: item.summary,
    contentType: item.contentType,
    language: languageRef(db, item.languageId),
    region: regionRef(db, item.regionId),
    audioUrl: resolveMedia(item.publicAudioUrl, "audio") ?? resolveMedia(item.privateAudioPath, "audio") ?? "",
    visualType: item.visualType,
    visualUrl: resolveMedia(item.publicVisualUrl, "visual"),
    durationSeconds: item.audioDurationSeconds,
    submitterCredit: credit(item),
    featured: item.featured,
    publishedAt: item.publishedAt ?? item.createdAt,
  };
}

function detailDto(db: MockDb, item: MockItem): ItemDetail {
  const related = db.items
    .filter(
      (candidate) =>
        candidate.id !== item.id &&
        isPublic(candidate) &&
        ((item.languageId && candidate.languageId === item.languageId) || candidate.regionId === item.regionId),
    )
    .sort((a, b) => ((a.publishedAt ?? "") < (b.publishedAt ?? "") ? 1 : -1))
    .slice(0, 4)
    .map((candidate) => cardDto(db, candidate));

  return {
    ...cardDto(db, item),
    language: languageRef(db, item.languageId),
    region: { ...regionRef(db, item.regionId), mapKey: regionRef(db, item.regionId).mapKey },
    translationZh: item.translationZh,
    subtitleSegments: (item.subtitleSegments ?? []).map((segment) => ({
      start: segment.start,
      ...(segment.end != null ? { end: segment.end } : {}),
      text: segment.text,
      ...(segment.translation ? { translation: segment.translation } : {}),
    })),
    cultureContext: item.cultureContext,
    related,
  };
}

function submissionDto(db: MockDb, item: MockItem): SubmissionDetail {
  const logs = db.logs
    .filter((log) => log.collectionItemId === item.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
    .map(logDto);
  return {
    id: item.id,
    title: item.title,
    summary: item.summary,
    contentType: item.contentType,
    status: item.status,
    language: languageRef(db, item.languageId),
    region: regionRef(db, item.regionId),
    translationZh: item.translationZh,
    subtitleSegments: (item.subtitleSegments ?? []).map((segment) => ({
      start: segment.start,
      ...(segment.end != null ? { end: segment.end } : {}),
      text: segment.text,
      ...(segment.translation ? { translation: segment.translation } : {}),
    })),
    cultureContext: item.cultureContext,
    submitterCredit: credit(item),
    recordingAuthorized: item.recordingAuthorized,
    audio: {
      url: resolveMedia(item.privateAudioPath, "audio") ?? "",
      durationSeconds: item.audioDurationSeconds,
    },
    visual:
      item.visualType && item.privateVisualPath
        ? { type: item.visualType, url: resolveMedia(item.privateVisualPath, "visual") ?? "" }
        : null,
    logs,
    lastReview: latestLog(db, item.id),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    publishedAt: item.publishedAt,
  };
}

function requireUser(): MockProfile {
  const profile = getSessionUser();
  if (!profile) throw new ApiError(401, "AUTH_REQUIRED", "请先登录");
  return profile;
}

function requireContributor(): MockProfile {
  const profile = requireUser();
  if (profile.role !== "contributor") throw new ApiError(403, "FORBIDDEN", "没有权限进行此操作");
  return profile;
}

function requireReviewer(): MockProfile {
  const profile = requireUser();
  if (profile.role !== "reviewer") throw new ApiError(403, "FORBIDDEN", "没有权限进行此操作");
  return profile;
}

function pageParams(query: Query, defaultLimit = 12) {
  const page = Math.max(1, Number(query.get("page")) || 1);
  const raw = Number(query.get("limit")) || defaultLimit;
  const limit = Math.min(50, Math.max(1, raw));
  return { page, limit };
}

function paginate<T>(items: T[], page: number, limit: number): Paginated<T> {
  return {
    items: items.slice((page - 1) * limit, page * limit),
    total: items.length,
    page,
    limit,
  };
}

function readBody<T>(init?: RequestInit): T {
  if (!init?.body) return {} as T;
  if (typeof init.body === "string") {
    try {
      return JSON.parse(init.body) as T;
    } catch {
      throw new ApiError(400, "VALIDATION_ERROR", "请求格式不正确");
    }
  }
  return {} as T;
}

function validateSubmissionPayload(input: unknown) {
  const parsed = submissionInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(400, "VALIDATION_ERROR", "请检查表单", flattenZodErrors(parsed.error));
  }
  return parsed.data;
}

function validateUpload(
  file: { fileName?: string; mimeType?: string; sizeBytes?: number },
  kind: keyof typeof FILE_RULES,
): string {
  const rules = FILE_RULES[kind];
  const fileName = (file.fileName ?? "").toLowerCase();
  const ext = fileName.includes(".") ? fileName.split(".").pop() ?? "" : "";
  if (!(rules.extensions as readonly string[]).includes(ext)) {
    throw new ApiError(400, "FILE_TYPE_NOT_ALLOWED", `文件格式不支持，请上传 ${rules.hint}`);
  }
  if (file.mimeType && !(rules.mimeTypes as readonly string[]).includes(file.mimeType)) {
    throw new ApiError(400, "FILE_TYPE_NOT_ALLOWED", `文件格式不支持，请上传 ${rules.hint}`);
  }
  if (!file.sizeBytes || file.sizeBytes <= 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "文件内容为空");
  }
  if (file.sizeBytes > rules.maxBytes) {
    throw new ApiError(413, "FILE_TOO_LARGE", `文件超过大小限制，${rules.hint}`);
  }
  return ext;
}

function sortCards(items: MockItem[], sort: string | null) {
  return [...items].sort((a, b) => {
    if (sort === "featured" && Number(b.featured) !== Number(a.featured)) {
      return Number(b.featured) - Number(a.featured);
    }
    return (a.publishedAt ?? "") < (b.publishedAt ?? "") ? 1 : -1;
  });
}

function submissionIdFromPath(path: string, prefix: string): string | null {
  const match = path.match(new RegExp(`^${prefix}/([^/]+)$`));
  return match ? match[1] : null;
}

export async function mockRequest<T>(path: string, init?: RequestInit): Promise<T> {
  await delay();
  const url = new URL(path, "http://mock.local");
  const route = url.pathname;
  const query = url.searchParams;
  const method = (init?.method ?? "GET").toUpperCase();
  const db = getDb();

  if (method === "POST" && route === "/auth/register") {
    const body = readBody<{ username?: string; password?: string; displayName?: string }>(init);
    const username = (body.username ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    const displayName = (body.displayName ?? "").trim();
    const fields: Record<string, string> = {};
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) fields.username = "用户名为 3–20 位字母、数字或下划线";
    if (password.length < 8 || password.length > 72) fields.password = "密码需为 8–72 位";
    if (displayName.length > 30) fields.displayName = "昵称不能超过 30 字";
    if (Object.keys(fields).length) {
      throw new ApiError(400, "VALIDATION_ERROR", "请检查注册信息", fields);
    }
    if (db.profiles.some((profile) => profile.username === username)) {
      throw new ApiError(409, "USERNAME_TAKEN", "用户名已存在", { username: "用户名已存在" });
    }
    const profile: MockProfile = {
      id: newId("profile"),
      username,
      password,
      displayName: displayName || username,
      role: "contributor",
      createdAt: nowIso(),
    };
    db.profiles.push(profile);
    persist();
    setSessionUser(profile.id);
    return { user: toUser(profile) } as T;
  }

  if (method === "POST" && route === "/auth/login") {
    const body = readBody<{ username?: string; password?: string }>(init);
    const username = (body.username ?? "").trim().toLowerCase();
    const profile = db.profiles.find((entry) => entry.username === username && entry.password === body.password);
    if (!profile) throw new ApiError(401, "INVALID_CREDENTIALS", "用户名或密码错误");
    setSessionUser(profile.id);
    return { user: toUser(profile) } as T;
  }

  if (method === "POST" && route === "/auth/logout") {
    clearSessionUser();
    return undefined as T;
  }

  if (method === "GET" && route === "/me") {
    const profile = requireUser();
    return toUser(profile) as T;
  }

  if (method === "GET" && route === "/home") {
    const publicItems = db.items.filter(isPublic);
    const featured = sortCards(publicItems.filter((item) => item.featured), "latest")
      .slice(0, 6)
      .map((item) => cardDto(db, item));
    const latest = sortCards(publicItems, "latest")
      .slice(0, 8)
      .map((item) => cardDto(db, item));
    return { featured, latest } satisfies HomePayload as T;
  }

  if (method === "GET" && route === "/collections") {
    const q = (query.get("q") ?? "").trim().slice(0, 50).toLowerCase();
    const type = query.get("type");
    const languageId = query.get("languageId");
    const regionId = query.get("regionId");
    const sort = query.get("sort");
    const { page, limit } = pageParams(query);

    const rows = db.items.filter((item) => {
      if (!isPublic(item)) return false;
      if (type && item.contentType !== type) return false;
      if (languageId && item.languageId !== languageId) return false;
      if (regionId && item.regionId !== regionId) return false;
      if (q) {
        const language = languageRef(db, item.languageId)?.name ?? "";
        const region = regionRef(db, item.regionId).name;
        const haystack = `${item.title} ${language} ${region}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    const sorted = sortCards(rows, sort).map((item) => cardDto(db, item));
    return paginate(sorted, page, limit) as T;
  }

  {
    const match = route.match(/^\/collections\/([^/]+)$/);
    if (method === "GET" && match) {
      const item = findItem(decodeURIComponent(match[1]));
      if (!item || !isPublic(item)) throw new ApiError(404, "NOT_FOUND", "内容不存在");
      return detailDto(db, item) as T;
    }
  }

  if (method === "GET" && route === "/languages") {
    const scope = query.get("scope") === "all" ? "all" : "public";
    const counts = new Map<string, number>();
    for (const item of db.items) {
      if (!isPublic(item) || !item.languageId) continue;
      counts.set(item.languageId, (counts.get(item.languageId) ?? 0) + 1);
    }
    const options: LanguageOption[] = db.languages
      .filter((language) => scope === "all" || (counts.get(language.id) ?? 0) > 0)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((language) => ({ id: language.id, name: language.name, count: counts.get(language.id) ?? 0 }));
    return options as T;
  }

  if (method === "GET" && route === "/regions") {
    const scope = query.get("scope") === "all" ? "all" : "public";
    const counts = new Map<string, number>();
    for (const item of db.items) {
      if (!isPublic(item)) continue;
      counts.set(item.regionId, (counts.get(item.regionId) ?? 0) + 1);
    }
    const options: RegionOption[] = db.regions
      .filter((region) => scope === "all" || (counts.get(region.id) ?? 0) > 0)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((region) => ({
        id: region.id,
        name: region.name,
        mapKey: region.mapKey,
        count: counts.get(region.id) ?? 0,
      }));
    return options as T;
  }

  if (method === "GET" && route === "/map/regions") {
    const counts = new Map<string, number>();
    for (const item of db.items) {
      if (!isPublic(item)) continue;
      counts.set(item.regionId, (counts.get(item.regionId) ?? 0) + 1);
    }
    const regions: MapRegion[] = db.regions
      .filter((region) => (counts.get(region.id) ?? 0) > 0)
      .map((region) => ({
        regionId: region.id,
        name: region.name,
        mapKey: region.mapKey,
        count: counts.get(region.id) ?? 0,
      }))
      .sort((a, b) => b.count - a.count);
    return regions as T;
  }

  if (method === "POST" && route === "/uploads/sign") {
    const user = requireContributor();
    const body = readBody<{
      audio?: { fileName?: string; mimeType?: string; sizeBytes?: number };
      visual?: { type?: VisualType; fileName?: string; mimeType?: string; sizeBytes?: number };
    }>(init);
    if (!body.audio) throw new ApiError(400, "VALIDATION_ERROR", "请选择录音文件", { audio: "请选择录音文件" });
    const audioExt = validateUpload(body.audio, "audio");
    const result: SignResponse = {
      audio: {
        path: `${user.id}/audio/${crypto.randomUUID()}.${audioExt}`,
        uploadUrl: "",
        token: "mock-token",
      } satisfies SignedUpload,
    };
    if (body.visual) {
      const type = body.visual.type;
      if (type !== "image" && type !== "video") {
        throw new ApiError(400, "VALIDATION_ERROR", "主视觉素材类型不正确");
      }
      const visualExt = validateUpload(body.visual, type === "image" ? "image" : "video");
      result.visual = {
        path: `${user.id}/visual/${crypto.randomUUID()}.${visualExt}`,
        uploadUrl: "",
        token: "mock-token",
      };
    }
    result.audio.uploadUrl = `mock://upload/${result.audio.path}`;
    if (result.visual) result.visual.uploadUrl = `mock://upload/${result.visual.path}`;
    return result as T;
  }

  if (method === "POST" && route === "/submissions") {
    const user = requireContributor();
    const input = validateSubmissionPayload(readBody(init));
    const languageExists = input.languageId ? db.languages.some((entry) => entry.id === input.languageId) : true;
    if (!languageExists) {
      throw new ApiError(400, "VALIDATION_ERROR", "方言/语言不存在", { languageId: "请选择有效的方言/语言" });
    }
    if (!db.regions.some((entry) => entry.id === input.regionId)) {
      throw new ApiError(400, "VALIDATION_ERROR", "地区不存在", { regionId: "请选择有效的地区" });
    }
    if (!input.audio.path.startsWith(`${user.id}/`) && !input.audio.path.startsWith("/mock/")) {
      throw new ApiError(400, "VALIDATION_ERROR", "录音文件归属不正确", { audio: "请重新上传录音" });
    }
    if (input.visual && !input.visual.path.startsWith(`${user.id}/`) && !input.visual.path.startsWith("/mock/")) {
      throw new ApiError(400, "VALIDATION_ERROR", "主视觉文件归属不正确", { visual: "请重新上传主视觉素材" });
    }
    const segments =
      input.subtitleSegments && input.subtitleSegments.length > 0
        ? input.subtitleSegments.map((segment: SubtitleInput) => ({
            start: segment.start,
            ...(segment.end != null ? { end: segment.end } : {}),
            text: segment.text.trim(),
          }))
        : null;
    const now = nowIso();
    const item: MockItem = {
      id: newId("item"),
      title: input.title,
      summary: input.summary,
      contentType: input.contentType,
      languageId: input.languageId ?? null,
      regionId: input.regionId,
      translationZh: input.translationZh?.trim() || null,
      subtitleSegments: segments,
      cultureContext: input.cultureContext?.trim() || null,
      visualType: input.visual?.type ?? null,
      privateAudioPath: input.audio.path,
      publicAudioUrl: null,
      privateVisualPath: input.visual?.path ?? null,
      publicVisualUrl: null,
      audioDurationSeconds:
        input.audio.durationSeconds != null ? Math.max(0, Math.round(input.audio.durationSeconds)) : null,
      recordingAuthorized: true,
      submitterId: user.id,
      submitterCreditMode: input.submitterCredit?.mode ?? "anonymous",
      submitterPublicName:
        input.submitterCredit?.mode === "nickname" ? input.submitterCredit.name?.trim() ?? null : null,
      status: "pending",
      visibility: "private",
      featured: false,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    db.items.push(item);
    persist();
    return { id: item.id, status: "pending" } as T;
  }

  if (method === "GET" && route === "/my-submissions") {
    const user = requireContributor();
    const status = query.get("status") ?? "all";
    const { page, limit } = pageParams(query);
    const rows = db.items
      .filter((item) => item.submitterId === user.id)
      .filter((item) => status === "all" || item.status === status)
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    const items: MySubmissionListItem[] = rows.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      contentType: item.contentType,
      region: regionRef(db, item.regionId),
      visualType: item.visualType,
      visualUrl: resolveMedia(item.privateVisualPath, "visual"),
      updatedAt: item.updatedAt,
      lastReview: latestLog(db, item.id),
    }));
    return paginate(items, page, limit) as T;
  }

  {
    const match = route.match(/^\/submissions\/([^/]+)$/);
    if (match && method === "GET") {
      const user = requireContributor();
      const item = findItem(decodeURIComponent(match[1]));
      if (!item || item.submitterId !== user.id) throw new ApiError(404, "NOT_FOUND", "内容不存在");
      return submissionDto(db, item) as T;
    }

    if (match && method === "PATCH") {
      const user = requireContributor();
      const item = findItem(decodeURIComponent(match[1]));
      if (!item || item.submitterId !== user.id) throw new ApiError(404, "NOT_FOUND", "内容不存在");
      if (item.status !== "needs_changes") {
        throw new ApiError(409, "STATUS_CONFLICT", "当前状态不允许修改");
      }
      const body = readBody<Record<string, unknown>>(init);
      const merged = {
        title: body.title ?? item.title,
        summary: body.summary ?? item.summary,
        contentType: body.contentType ?? item.contentType,
        languageId: "languageId" in body ? body.languageId : item.languageId,
        regionId: body.regionId ?? item.regionId,
        subtitleSegments:
          "subtitleSegments" in body ? body.subtitleSegments : item.subtitleSegments,
        translationZh: "translationZh" in body ? body.translationZh : item.translationZh,
        cultureContext: "cultureContext" in body ? body.cultureContext : item.cultureContext,
        submitterCredit:
          "submitterCredit" in body
            ? body.submitterCredit
            : {
                mode: item.submitterCreditMode,
                name: item.submitterPublicName,
              },
        recordingAuthorized: body.recordingAuthorized ?? item.recordingAuthorized,
        audio: "audio" in body
          ? body.audio
          : { path: item.privateAudioPath, durationSeconds: item.audioDurationSeconds },
        visual: "visual" in body
          ? body.visual
          : item.visualType && item.privateVisualPath
            ? { type: item.visualType, path: item.privateVisualPath }
            : null,
      };
      const input = validateSubmissionPayload(merged);
      if (!db.regions.some((entry) => entry.id === input.regionId)) {
        throw new ApiError(400, "VALIDATION_ERROR", "地区不存在", { regionId: "请选择有效的地区" });
      }
      if (input.languageId && !db.languages.some((entry) => entry.id === input.languageId)) {
        throw new ApiError(400, "VALIDATION_ERROR", "方言/语言不存在", { languageId: "请选择有效的方言/语言" });
      }
      if (!input.audio.path.startsWith(`${user.id}/`) && !input.audio.path.startsWith("/mock/")) {
        throw new ApiError(400, "VALIDATION_ERROR", "录音文件归属不正确", { audio: "请重新上传录音" });
      }
      const segments =
        input.subtitleSegments && input.subtitleSegments.length > 0
          ? input.subtitleSegments.map((segment) => ({
              start: segment.start,
              ...(segment.end != null ? { end: segment.end } : {}),
              text: segment.text.trim(),
            }))
          : null;
      const now = nowIso();
      item.title = input.title;
      item.summary = input.summary;
      item.contentType = input.contentType;
      item.languageId = input.languageId ?? null;
      item.regionId = input.regionId;
      item.translationZh = input.translationZh?.trim() || null;
      item.subtitleSegments = segments;
      item.cultureContext = input.cultureContext?.trim() || null;
      item.visualType = input.visual?.type ?? null;
      item.privateAudioPath = input.audio.path;
      item.privateVisualPath = input.visual?.path ?? null;
      item.audioDurationSeconds =
        input.audio.durationSeconds != null ? Math.max(0, Math.round(input.audio.durationSeconds)) : null;
      item.submitterCreditMode = input.submitterCredit?.mode ?? "anonymous";
      item.submitterPublicName =
        input.submitterCredit?.mode === "nickname" ? input.submitterCredit.name?.trim() ?? null : null;
      item.status = "pending";
      item.updatedAt = now;
      persist();
      return { id: item.id, status: "pending" } as T;
    }
  }

  {
    const match = route.match(/^\/submissions\/([^/]+)\/withdraw$/);
    if (match && method === "POST") {
      const user = requireContributor();
      const item = findItem(decodeURIComponent(match[1]));
      if (!item || item.submitterId !== user.id) throw new ApiError(404, "NOT_FOUND", "内容不存在");
      if (!["pending", "needs_changes", "published"].includes(item.status)) {
        throw new ApiError(409, "STATUS_CONFLICT", "当前状态不能撤回");
      }
      if (item.status === "published") {
        item.publicAudioUrl = null;
        item.publicVisualUrl = null;
      }
      item.status = "withdrawn";
      item.visibility = "private";
      item.updatedAt = nowIso();
      persist();
      return { id: item.id, status: "withdrawn" } as T;
    }
  }

  if (method === "GET" && route === "/review/submissions") {
    requireReviewer();
    const status = query.get("status") ?? "pending";
    const sort = query.get("sort") === "newest" ? "newest" : "oldest";
    const { page, limit } = pageParams(query);
    const rows = db.items
      .filter((item) => status === "all" || item.status === status)
      .sort((a, b) => {
        const left = a.createdAt;
        const right = b.createdAt;
        if (left === right) return 0;
        return sort === "oldest" ? (left < right ? -1 : 1) : left < right ? 1 : -1;
      });
    const items: ReviewListItem[] = rows.map((item) => {
      const submitter = db.profiles.find((profile) => profile.id === item.submitterId);
      return {
        id: item.id,
        title: item.title,
        status: item.status,
        contentType: item.contentType,
        region: regionRef(db, item.regionId),
        submitter: {
          username: submitter?.username ?? "unknown",
          displayName: submitter?.displayName ?? "未知用户",
        },
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        lastReview: latestLog(db, item.id),
      };
    });
    return paginate(items, page, limit) as T;
  }

  {
    const detailMatch = route.match(/^\/review\/submissions\/([^/]+)$/);
    if (detailMatch && method === "GET") {
      requireReviewer();
      const item = findItem(decodeURIComponent(detailMatch[1]));
      if (!item) throw new ApiError(404, "NOT_FOUND", "内容不存在");
      const submitter = db.profiles.find((profile) => profile.id === item.submitterId);
      const detail: ReviewDetail = {
        ...submissionDto(db, item),
        submitter: {
          username: submitter?.username ?? "unknown",
          displayName: submitter?.displayName ?? "未知用户",
        },
      };
      return detail as T;
    }

    const publishMatch = route.match(/^\/review\/submissions\/([^/]+)\/publish$/);
    if (publishMatch && method === "POST") {
      const reviewer = requireReviewer();
      const item = findItem(decodeURIComponent(publishMatch[1]));
      if (!item) throw new ApiError(404, "NOT_FOUND", "内容不存在");
      if (item.status !== "pending") throw new ApiError(409, "STATUS_CONFLICT", "仅待审核投稿可以发布");
      if (!item.recordingAuthorized) {
        throw new ApiError(400, "VALIDATION_ERROR", "录音授权声明未勾选，不能发布");
      }
      item.publicAudioUrl = item.privateAudioPath;
      item.publicVisualUrl = item.visualType ? item.privateVisualPath : null;
      item.status = "published";
      item.visibility = "public";
      item.publishedAt = nowIso();
      item.updatedAt = item.publishedAt;
      db.logs.push({
        id: newId("log"),
        collectionItemId: item.id,
        reviewerId: reviewer.id,
        action: "publish",
        reason: null,
        fromStatus: "pending",
        toStatus: "published",
        createdAt: item.publishedAt,
      });
      persist();
      return { id: item.id, status: "published", publishedAt: item.publishedAt } as T;
    }

    const returnMatch = route.match(/^\/review\/submissions\/([^/]+)\/return$/);
    if (returnMatch && method === "POST") {
      const reviewer = requireReviewer();
      const item = findItem(decodeURIComponent(returnMatch[1]));
      if (!item) throw new ApiError(404, "NOT_FOUND", "内容不存在");
      if (item.status !== "pending") throw new ApiError(409, "STATUS_CONFLICT", "仅待审核投稿可以退回");
      const parsed = returnReasonSchema.safeParse(readBody(init));
      if (!parsed.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "请填写退回原因", flattenZodErrors(parsed.error));
      }
      item.status = "needs_changes";
      item.updatedAt = nowIso();
      db.logs.push({
        id: newId("log"),
        collectionItemId: item.id,
        reviewerId: reviewer.id,
        action: "return",
        reason: parsed.data.reason,
        fromStatus: "pending",
        toStatus: "needs_changes",
        createdAt: item.updatedAt,
      });
      persist();
      return { id: item.id, status: "needs_changes" } as T;
    }
  }

  if (method === "POST" && route === "/mock/upload") {
    return { ok: true } as T;
  }

  throw new ApiError(404, "NOT_FOUND", "接口不存在");
}