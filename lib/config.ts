/**
 * 文件职责：惰性读取并校验服务端环境变量，避免在构建期顶层加载触发配置缺失错误。
 */

import { z } from 'zod';

export type AppConfig = {
  jwtSecret: string;
  siteUrl: string;
  siteOrigin: string;
  isHttps: boolean;
  seedReviewerUsername?: string;
  seedReviewerPassword?: string;
};

const envSchema = z.object({
  JWT_SECRET: z.string().min(32, 'JWT_SECRET 长度至少 32 位'),
  SITE_URL: z.string().url('SITE_URL 必须是合法 URL'),
  SEED_REVIEWER_USERNAME: z.string().trim().min(3).max(20).optional(),
  SEED_REVIEWER_PASSWORD: z.string().min(8).max(72).optional(),
});

let cachedConfig: AppConfig | null = null;

/**
 * 读取并校验服务端运行配置。
 * 输入：无（从 process.env 惰性读取）。
 * 输出：经过 Zod 校验后的 AppConfig 对象。
 * 业务规则：仅在运行时首次调用时解析并缓存；环境变量不合法时直接抛出 Error 阻断错误配置。
 */
export function getConfig(): AppConfig {
  if (cachedConfig !== null) {
    return cachedConfig;
  }

  const rawEnv = {
    JWT_SECRET: process.env.JWT_SECRET,
    SITE_URL: process.env.SITE_URL,
    SEED_REVIEWER_USERNAME: process.env.SEED_REVIEWER_USERNAME || undefined,
    SEED_REVIEWER_PASSWORD: process.env.SEED_REVIEWER_PASSWORD || undefined,
  };

  const parsed = envSchema.safeParse(rawEnv);
  if (!parsed.success) {
    const messages: string[] = [];
    for (const issue of parsed.error.issues) {
      const pathText = issue.path.join('.');
      messages.push(`${pathText}: ${issue.message}`);
    }
    throw new Error(`环境变量校验失败: ${messages.join('; ')}`);
  }

  const parsedUrl = new URL(parsed.data.SITE_URL);
  const normalizedSiteUrl = parsed.data.SITE_URL.replace(/\/+$/, '');

  cachedConfig = {
    jwtSecret: parsed.data.JWT_SECRET,
    siteUrl: normalizedSiteUrl,
    siteOrigin: parsedUrl.origin,
    isHttps: parsedUrl.protocol === 'https:',
    seedReviewerUsername: parsed.data.SEED_REVIEWER_USERNAME,
    seedReviewerPassword: parsed.data.SEED_REVIEWER_PASSWORD,
  };

  return cachedConfig;
}
