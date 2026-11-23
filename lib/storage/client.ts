/**
 * 文件职责：对外暴露对象存储网关入口 getStorage()；后续接入真实云存储时仅需替换本文件实例化逻辑。
 */

import { getGlobalSingleton } from '@/lib/runtime/global-singleton';
import { MemoryStorage } from './memory-storage';
import type { StorageGateway } from './types';

function getMemoryStorageSingleton(): MemoryStorage {
  return getGlobalSingleton<MemoryStorage>('storage.memory_instance', () => {
    return new MemoryStorage();
  });
}

/**
 * 获取统一对象存储网关实例。
 * 输入：无。
 * 输出：StorageGateway 接口实例。
 * 业务规则：业务 Service 与存储辅助层统一通过该接口访问对象存储，不耦合具体存储厂商实现。
 */
export function getStorage(): StorageGateway {
  return getMemoryStorageSingleton();
}

/**
 * 获取内存存储具体实例（仅限 app/api/mock-storage/** 模拟直传/读取路由使用）。
 * 输入：无。
 * 输出：MemoryStorage 实例。
 * 业务规则：接入真实对象存储后连同 mock-storage 路由一并移除。
 */
export function getMemoryStorage(): MemoryStorage {
  return getMemoryStorageSingleton();
}
