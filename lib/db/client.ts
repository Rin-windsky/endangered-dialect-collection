/**
 * 文件职责：对外暴露统一的数据库访问入口 getDb()；后续接入真实数据库时仅需替换本文件中的实例构造逻辑。
 */

import type { Database } from '@/lib/db/types';
import { getGlobalSingleton } from '@/lib/runtime/global-singleton';
import { MemoryDatabase } from './memory/memory-database';
import { seedMemoryDatabase } from './memory/seed';

/**
 * 获取已初始化完成的 Database 实例。
 * 输入：无。
 * 输出：Promise<Database>。
 * 业务规则：通过 globalThis 单例缓存初始化 Promise，保证整个进程内只初始化并播种一次。
 */
export async function getDb(): Promise<Database> {
  const initPromise = getGlobalSingleton<Promise<Database>>('db.instance_promise', async () => {
    const memoryDb = new MemoryDatabase();
    await seedMemoryDatabase(memoryDb);
    return memoryDb;
  });

  return initPromise;
}
