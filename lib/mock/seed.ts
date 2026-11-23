import type {
  ContentType,
  ItemStatus,
  SubtitleSegment,
  SubmitterCreditMode,
  VisualType,
} from "../types";

export type MockProfile = {
  id: string;
  username: string;
  password: string;
  displayName: string;
  role: "contributor" | "reviewer";
  createdAt: string;
};

export type MockLanguage = {
  id: string;
  name: string;
  sortOrder: number;
};

export type MockRegion = {
  id: string;
  name: string;
  mapKey: string;
  sortOrder: number;
};

export type MockItem = {
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
  privateAudioPath: string;
  publicAudioUrl: string | null;
  privateVisualPath: string | null;
  publicVisualUrl: string | null;
  audioDurationSeconds: number | null;
  recordingAuthorized: boolean;
  submitterId: string;
  submitterCreditMode: SubmitterCreditMode;
  submitterPublicName: string | null;
  status: ItemStatus;
  visibility: "private" | "public";
  featured: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MockReviewLog = {
  id: string;
  collectionItemId: string;
  reviewerId: string;
  action: "publish" | "return";
  reason: string | null;
  fromStatus: ItemStatus;
  toStatus: ItemStatus;
  createdAt: string;
};

export type MockDb = {
  version: number;
  profiles: MockProfile[];
  languages: MockLanguage[];
  regions: MockRegion[];
  items: MockItem[];
  logs: MockReviewLog[];
};

const PROVINCES = [
  "北京市", "天津市", "河北省", "山西省", "内蒙古自治区", "辽宁省", "吉林省", "黑龙江省",
  "上海市", "江苏省", "浙江省", "安徽省", "福建省", "江西省", "山东省", "河南省",
  "湖北省", "湖南省", "广东省", "广西壮族自治区", "海南省", "重庆市", "四川省", "贵州省",
  "云南省", "西藏自治区", "陕西省", "甘肃省", "青海省", "宁夏回族自治区", "新疆维吾尔自治区",
  "台湾省", "香港特别行政区", "澳门特别行政区",
];

const PROVINCE_SLUGS: Record<string, string> = {
  北京市: "beijing", 天津市: "tianjin", 河北省: "hebei", 山西省: "shanxi",
  内蒙古自治区: "neimenggu", 辽宁省: "liaoning", 吉林省: "jilin", 黑龙江省: "heilongjiang",
  上海市: "shanghai", 江苏省: "jiangsu", 浙江省: "zhejiang", 安徽省: "anhui",
  福建省: "fujian", 江西省: "jiangxi", 山东省: "shandong", 河南省: "henan",
  湖北省: "hubei", 湖南省: "hunan", 广东省: "guangdong", 广西壮族自治区: "guangxi",
  海南省: "hainan", 重庆市: "chongqing", 四川省: "sichuan", 贵州省: "guizhou",
  云南省: "yunnan", 西藏自治区: "xizang", 陕西省: "shaanxi", 甘肃省: "gansu",
  青海省: "qinghai", 宁夏回族自治区: "ningxia", 新疆维吾尔自治区: "xinjiang",
  台湾省: "taiwan", 香港特别行政区: "hongkong", 澳门特别行政区: "macau",
};

export const seedRegions: MockRegion[] = PROVINCES.map((name, index) => ({
  id: `region-${PROVINCE_SLUGS[name]}`,
  name,
  mapKey: name,
  sortOrder: index,
}));

export const seedLanguages: MockLanguage[] = [
  { id: "lang-mindong", name: "闽东语", sortOrder: 1 },
  { id: "lang-hakka", name: "客家话", sortOrder: 2 },
  { id: "lang-yue", name: "粤语", sortOrder: 3 },
  { id: "lang-jin", name: "晋语（陕北）", sortOrder: 4 },
  { id: "lang-wu", name: "吴语（温州）", sortOrder: 5 },
];

export const seedProfiles: MockProfile[] = [
  {
    id: "profile-reviewer",
    username: "reviewer",
    password: "review123",
    displayName: "青禾",
    role: "reviewer",
    createdAt: "2026-10-01T08:00:00Z",
  },
  {
    id: "profile-demo",
    username: "demo_user",
    password: "password123",
    displayName: "阿禾",
    role: "contributor",
    createdAt: "2026-10-20T09:30:00Z",
  },
  {
    id: "profile-linxi",
    username: "linxi",
    password: "password123",
    displayName: "林溪",
    role: "contributor",
    createdAt: "2026-10-22T11:20:00Z",
  },
  {
    id: "profile-yuan",
    username: "yuanshang",
    password: "password123",
    displayName: "塬上",
    role: "contributor",
    createdAt: "2026-10-25T16:40:00Z",
  },
];

const regionId = (name: string) => `region-${PROVINCE_SLUGS[name]}`;

type SeedItemInput = Omit<MockItem, "visibility" | "recordingAuthorized">;
const published = (input: SeedItemInput): MockItem => ({
  ...input,
  visibility: "public",
  recordingAuthorized: true,
});

export const seedItems: MockItem[] = [
  published({
    id: "item-1",
    title: "阿婆讲端午",
    summary: "阿婆用闽东话讲小时候包粽、看龙舟的记忆，说到最后自己先笑了。",
    contentType: "story",
    languageId: "lang-mindong",
    regionId: regionId("福建省"),
    translationZh:
      "阿婆说，五月初五要吃粽子、看龙舟。粽叶是清早在溪边采的，要浸一夜；糯米里掺一点红豆，包的时候要扎紧。龙舟鼓一响，孩子们都跑到桥头去看。她说，如今会包粽子的人，越来越少了。",
    subtitleSegments: [
      { start: 0, end: 13, text: "阿婆讲，五月五，食粽看龙船。" },
      { start: 13, end: 27, text: "粽叶是溪边采的，浸一暝。" },
      { start: 27, end: 42, text: "糯米掺红豆，扎紧一点。" },
      { start: 42, end: 58, text: "龙船鼓一响，囝仔都跑到桥头。" },
      { start: 58, end: 74, text: "现在会包的人，少了。" },
      { start: 74, end: 92, text: "话讲到这里，阿婆就笑了。" },
    ],
    cultureContext:
      "端午包粽、看龙舟是闽东沿海村镇常见的节俗。阿婆的讲述里保留着当地对孩子的称呼「囝仔」，以及把包粽叫作「食粽」的日常说法。",
    visualType: "image",
    privateAudioPath: "/mock/audio/ambient-3.wav",
    publicAudioUrl: "/mock/audio/ambient-3.wav",
    privateVisualPath: "/mock/visuals/village-tea.webp",
    publicVisualUrl: "/mock/visuals/village-tea.webp",
    audioDurationSeconds: 94,
    submitterId: "profile-linxi",
    submitterCreditMode: "anonymous",
    submitterPublicName: null,
    status: "published",
    featured: true,
    publishedAt: "2026-11-18T09:20:00Z",
    createdAt: "2026-11-16T14:05:00Z",
    updatedAt: "2026-11-18T09:20:00Z",
  }),
  published({
    id: "item-2",
    title: "月光光，照地堂",
    summary: "一首在客家村落里传唱的月光童谣，从月亮一路唱到猪肚和子姜。",
    contentType: "rhyme",
    languageId: "lang-hakka",
    regionId: regionId("广东省"),
    translationZh:
      "月光照着屋前的空地。年三十的晚上摘槟榔；槟榔香，就摘子姜；子姜辣，就去买蒲达（苦瓜）；蒲达苦，就买猪肚。童谣靠一件件事物顶针相连，孩子在跟唱时认得了身边的草木和吃食。",
    subtitleSegments: [
      { start: 0, end: 11, text: "月光光，照地堂。" },
      { start: 11, end: 24, text: "年卅晚，摘槟榔。" },
      { start: 24, end: 37, text: "槟榔香，摘子姜。" },
      { start: 37, end: 51, text: "子姜辣，买蒲达。" },
      { start: 51, end: 66, text: "蒲达苦，买猪肚。" },
    ],
    cultureContext:
      "「月光光」是岭南多地方言中常见的童谣起句，各地会接着唱出不同的风物。客家版本常用顶针的方式，把槟榔、子姜、苦瓜、猪肚串成一条好记的链子，适合大人拍着孩子入睡时慢慢念。",
    visualType: "image",
    privateAudioPath: "/mock/audio/ambient-2.wav",
    publicAudioUrl: "/mock/audio/ambient-2.wav",
    privateVisualPath: "/mock/visuals/rainy-lane.webp",
    publicVisualUrl: "/mock/visuals/rainy-lane.webp",
    audioDurationSeconds: 78,
    submitterId: "profile-demo",
    submitterCreditMode: "nickname",
    submitterPublicName: "阿禾",
    status: "published",
    featured: true,
    publishedAt: "2026-11-19T14:10:00Z",
    createdAt: "2026-11-17T10:20:00Z",
    updatedAt: "2026-11-19T14:10:00Z",
  }),
  published({
    id: "item-3",
    title: "食茶先",
    summary: "一句闽东人挂在嘴边的招呼：先坐下，喝口茶，再慢慢讲。",
    contentType: "phrase",
    languageId: "lang-mindong",
    regionId: regionId("福建省"),
    translationZh: "先喝口茶。坐下来，慢慢说。茶还热着，人还没有散。",
    subtitleSegments: [
      { start: 0, end: 7, text: "食茶先。" },
      { start: 8, end: 18, text: "坐下，慢慢讲。" },
      { start: 20, end: 33, text: "茶还热，人未散。" },
    ],
    cultureContext:
      "在闽东的日常待客里，「食茶」不只是喝茶，也是请人坐下、把话说完的意思。短短三个字，常常是一段家常的开场。",
    visualType: "image",
    privateAudioPath: "/mock/audio/ambient-1.wav",
    publicAudioUrl: "/mock/audio/ambient-1.wav",
    privateVisualPath: "/mock/visuals/tulou.webp",
    publicVisualUrl: "/mock/visuals/tulou.webp",
    audioDurationSeconds: 62,
    submitterId: "profile-linxi",
    submitterCreditMode: "anonymous",
    submitterPublicName: null,
    status: "published",
    featured: false,
    publishedAt: "2026-11-15T07:45:00Z",
    createdAt: "2026-11-13T18:10:00Z",
    updatedAt: "2026-11-15T07:45:00Z",
  }),
  published({
    id: "item-4",
    title: "羊肚子手巾",
    summary: "一句从黄土坡上传下来的信天游，见面容易，拉话话难。",
    contentType: "rhyme",
    languageId: "lang-jin",
    regionId: regionId("陕西省"),
    translationZh:
      "头巾上染着三道蓝。隔着一道沟，见一面容易，说上几句话却很难。一个在山上，一个在沟里，见不着面，就远远招一招手。",
    subtitleSegments: [
      { start: 0, end: 15, text: "羊肚子手巾哟，三道道蓝。" },
      { start: 16, end: 36, text: "见个面面容易，拉话话难。" },
      { start: 38, end: 57, text: "一个在那山上哟，一个在那沟。" },
      { start: 58, end: 76, text: "见不上个面面，招一招手。" },
    ],
    cultureContext:
      "信天游是陕北高原上常见的山歌形式，句子长、音调扬，常用来抒发隔着山沟的思念。歌词里的「羊肚子手巾」指白羊肚手巾，是当地劳作时常见的头巾。",
    visualType: "image",
    privateAudioPath: "/mock/audio/ambient-2.wav",
    publicAudioUrl: "/mock/audio/ambient-2.wav",
    privateVisualPath: "/mock/visuals/loess.webp",
    publicVisualUrl: "/mock/visuals/loess.webp",
    audioDurationSeconds: 78,
    submitterId: "profile-yuan",
    submitterCreditMode: "nickname",
    submitterPublicName: "塬上",
    status: "published",
    featured: false,
    publishedAt: "2026-11-20T11:30:00Z",
    createdAt: "2026-11-19T19:15:00Z",
    updatedAt: "2026-11-20T11:30:00Z",
  }),
  published({
    id: "item-5",
    title: "落雨大，水浸街",
    summary: "落雨天，水浸街。一首把雨声、柴担和花鞋都唱进去的粤语童谣。",
    contentType: "rhyme",
    languageId: "lang-yue",
    regionId: regionId("广东省"),
    translationZh:
      "雨下得很大，街道都被水浸了。哥哥挑着柴到街上卖，嫂子穿着花鞋出门。花鞋、花袜、花腰带，一样一样地唱过去。",
    subtitleSegments: [
      { start: 0, end: 10, text: "落雨大，水浸街。" },
      { start: 12, end: 26, text: "阿哥担柴上街卖。" },
      { start: 28, end: 43, text: "阿嫂出街着花鞋。" },
      { start: 45, end: 64, text: "花鞋花袜花腰带。" },
    ],
    cultureContext:
      "「落雨大，水浸街」是广府地区流传很广的童谣。旧时街巷排水不畅，一场大雨就能水浸街面，童谣把雨天的街景和一家人的日常穿在同一首歌里。",
    visualType: "image",
    privateAudioPath: "/mock/audio/ambient-2.wav",
    publicAudioUrl: "/mock/audio/ambient-2.wav",
    privateVisualPath: "/mock/visuals/canal.webp",
    publicVisualUrl: "/mock/visuals/canal.webp",
    audioDurationSeconds: 78,
    submitterId: "profile-linxi",
    submitterCreditMode: "anonymous",
    submitterPublicName: null,
    status: "published",
    featured: false,
    publishedAt: "2026-11-17T06:20:00Z",
    createdAt: "2026-11-15T20:00:00Z",
    updatedAt: "2026-11-17T06:20:00Z",
  }),
  published({
    id: "item-6",
    title: "天光",
    summary: "一声「天光」，是清早推开木门时最平常的问候。",
    contentType: "phrase",
    languageId: "lang-wu",
    regionId: regionId("浙江省"),
    translationZh: "天亮了。",
    subtitleSegments: null,
    cultureContext: "在温州话里，「天光」既指天亮，也可以指早晨。清早见面说一声「天光」，就是道一声早。",
    visualType: null,
    privateAudioPath: "/mock/audio/ambient-1.wav",
    publicAudioUrl: "/mock/audio/ambient-1.wav",
    privateVisualPath: null,
    publicVisualUrl: null,
    audioDurationSeconds: 62,
    submitterId: "profile-demo",
    submitterCreditMode: "anonymous",
    submitterPublicName: null,
    status: "published",
    featured: false,
    publishedAt: "2026-11-16T08:30:00Z",
    createdAt: "2026-11-14T21:10:00Z",
    updatedAt: "2026-11-16T08:30:00Z",
  }),
  {
    id: "item-7",
    title: "讨海人的一句话",
    summary: "出海前，家里人总要交代一句「顺风」。短短两个字，是海边人家最朴素的牵挂。",
    contentType: "phrase",
    languageId: "lang-mindong",
    regionId: regionId("福建省"),
    translationZh: "一路顺风，平安回来。",
    subtitleSegments: [
      { start: 0, end: 9, text: "顺风去，顺风回。" },
      { start: 11, end: 24, text: "船到埠，人就到家。" },
    ],
    cultureContext: "闽东沿海的渔村在家人出海时常说「顺风」，既是祝一路顺风，也是盼平安归来。",
    visualType: "image",
    privateAudioPath: "/mock/audio/ambient-3.wav",
    publicAudioUrl: null,
    privateVisualPath: "/mock/visuals/canal.webp",
    publicVisualUrl: null,
    audioDurationSeconds: 94,
    recordingAuthorized: true,
    submitterId: "profile-demo",
    submitterCreditMode: "anonymous",
    submitterPublicName: null,
    status: "pending",
    visibility: "private",
    featured: false,
    publishedAt: null,
    createdAt: "2026-11-21T08:40:00Z",
    updatedAt: "2026-11-21T08:40:00Z",
  },
  {
    id: "item-8",
    title: "灶前的话",
    summary: "阿嬷在灶前教孙女做红糟，一边做一边讲以前的事。",
    contentType: "story",
    languageId: "lang-mindong",
    regionId: regionId("福建省"),
    translationZh: null,
    subtitleSegments: null,
    cultureContext: null,
    visualType: null,
    privateAudioPath: "/mock/audio/ambient-3.wav",
    publicAudioUrl: null,
    privateVisualPath: null,
    publicVisualUrl: null,
    audioDurationSeconds: 94,
    recordingAuthorized: true,
    submitterId: "profile-demo",
    submitterCreditMode: "anonymous",
    submitterPublicName: null,
    status: "needs_changes",
    visibility: "private",
    featured: false,
    publishedAt: null,
    createdAt: "2026-11-20T16:00:00Z",
    updatedAt: "2026-11-20T16:35:00Z",
  },
];

export const seedLogs: MockReviewLog[] = [
  ...[
    ["item-1", "2026-11-18T09:20:00Z"],
    ["item-2", "2026-11-19T14:10:00Z"],
    ["item-3", "2026-11-15T07:45:00Z"],
    ["item-4", "2026-11-20T11:30:00Z"],
    ["item-5", "2026-11-17T06:20:00Z"],
    ["item-6", "2026-11-16T08:30:00Z"],
  ].map(([itemId, createdAt], index) => ({
    id: `log-seed-publish-${index + 1}`,
    collectionItemId: itemId,
    reviewerId: "profile-reviewer",
    action: "publish" as const,
    reason: null,
    fromStatus: "pending" as const,
    toStatus: "published" as const,
    createdAt,
  })),
  {
    id: "log-seed-return-1",
    collectionItemId: "item-8",
    reviewerId: "profile-reviewer",
    action: "return",
    reason:
      "内容说明只交代了场景，还没写清讲述者与孩子的关系、这段录音为什么值得留下，请补充后再提交。",
    fromStatus: "pending",
    toStatus: "needs_changes",
    createdAt: "2026-11-20T16:35:00Z",
  },
];

export function createSeedDb(): MockDb {
  return {
    version: 1,
    profiles: structuredClone(seedProfiles),
    languages: structuredClone(seedLanguages),
    regions: structuredClone(seedRegions),
    items: structuredClone(seedItems),
    logs: structuredClone(seedLogs),
  };
}