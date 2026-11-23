/**
 * 文件职责：初始化内存数据库的基础字典数据（34 个省级行政区、预置语言）与可选审核员账号。
 */

import { randomUUID } from 'node:crypto';
import { hashPassword } from '@/lib/auth/password';
import { getConfig } from '@/lib/config';
import type { MemoryDatabase } from './memory-database';

const PROVINCIAL_REGION_NAMES: readonly string[] = [
  '北京市',
  '天津市',
  '河北省',
  '山西省',
  '内蒙古自治区',
  '辽宁省',
  '吉林省',
  '黑龙江省',
  '上海市',
  '江苏省',
  '浙江省',
  '安徽省',
  '福建省',
  '江西省',
  '山东省',
  '河南省',
  '湖北省',
  '湖南省',
  '广东省',
  '广西壮族自治区',
  '海南省',
  '重庆市',
  '四川省',
  '贵州省',
  '云南省',
  '西藏自治区',
  '陕西省',
  '甘肃省',
  '青海省',
  '宁夏回族自治区',
  '新疆维吾尔自治区',
  '台湾省',
  '香港特别行政区',
  '澳门特别行政区',
];

const INITIAL_LANGUAGE_NAMES: readonly string[] = ['闽南语', '粤语', '吴语'];

/**
 * 向内存数据库注入预置省级地区、预置语言以及环境配置的审核员账号。
 * 输入：MemoryDatabase 实例。
 * 输出：Promise<void>。
 * 业务规则：
 * 1. 写入 34 个省级地区（mapKey 与 name 完全一致，匹配中国省级地图 GeoJSON）。
 * 2. 写入基础方言/语言选项。
 * 3. 当 SEED_REVIEWER_USERNAME 与 SEED_REVIEWER_PASSWORD 均配置时预置审核员账号，不编造任何示例收藏品。
 */
export async function seedMemoryDatabase(db: MemoryDatabase): Promise<void> {
  for (let i = 0; i < PROVINCIAL_REGION_NAMES.length; i++) {
    const name = PROVINCIAL_REGION_NAMES[i];
    db.regions.seedRow({
      id: randomUUID(),
      name,
      mapKey: name,
      sortOrder: i + 1,
    });
  }

  for (let i = 0; i < INITIAL_LANGUAGE_NAMES.length; i++) {
    const name = INITIAL_LANGUAGE_NAMES[i];
    db.languages.seedRow({
      id: randomUUID(),
      name,
      sortOrder: i + 1,
    });
  }

  const config = getConfig();
  if (config.seedReviewerUsername && config.seedReviewerPassword) {
    const normalizedUsername = config.seedReviewerUsername.toLowerCase();
    const passwordHash = await hashPassword(config.seedReviewerPassword);
    await db.profiles.insert({
      username: normalizedUsername,
      passwordHash,
      displayName: config.seedReviewerUsername,
      role: 'reviewer',
    });
  } else {
    console.warn('[seed] 未同时配置 SEED_REVIEWER_USERNAME 与 SEED_REVIEWER_PASSWORD，跳过预置审核员账号创建');
  }
}
