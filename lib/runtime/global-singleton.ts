/**
 * 文件职责：在 globalThis 上维护进程级单例，确保 Next.js 不同路由打包副本共享同一份内存状态。
 */

const GLOBAL_REGISTRY_KEY = Symbol.for('echo_vault.global_singletons');

type SingletonMap = Map<string, unknown>;

function getRegistry(): SingletonMap {
  const holder = globalThis as Record<symbol, SingletonMap | undefined>;
  let registry = holder[GLOBAL_REGISTRY_KEY];
  if (!registry) {
    registry = new Map<string, unknown>();
    holder[GLOBAL_REGISTRY_KEY] = registry;
  }
  return registry;
}

/**
 * 获取或创建挂在 globalThis 上的单例对象。
 * 输入：全局唯一键名 key，首次创建时的工厂函数 factory。
 * 输出：与 key 对应的单例实例。
 * 业务规则：同一进程内多次调用同一 key 只会执行一次 factory。
 */
export function getGlobalSingleton<T>(key: string, factory: () => T): T {
  const registry = getRegistry();
  if (registry.has(key)) {
    return registry.get(key) as T;
  }
  const instance = factory();
  registry.set(key, instance);
  return instance;
}
