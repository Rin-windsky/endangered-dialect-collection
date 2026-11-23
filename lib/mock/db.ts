import { createSeedDb, type MockDb, type MockItem, type MockProfile } from "./seed";

const DB_KEY = "xy_mock_db_v1";
const SESSION_KEY = "xy_mock_session_v1";

let cache: MockDb | null = null;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getDb(): MockDb {
  if (cache) return cache;
  if (!canUseStorage()) {
    cache = createSeedDb();
    return cache;
  }
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MockDb;
      if (parsed && parsed.version === 1 && Array.isArray(parsed.items)) {
        cache = parsed;
        return cache;
      }
    }
  } catch {
    // fall through to reseed
  }
  cache = createSeedDb();
  persist();
  return cache;
}

export function persist(): void {
  if (!cache || !canUseStorage()) return;
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(cache));
  } catch {
    // demo only: quota errors are non-fatal
  }
}

export function resetMockDb(): void {
  cache = createSeedDb();
  if (canUseStorage()) {
    window.localStorage.removeItem(SESSION_KEY);
    persist();
  }
}

export function getSessionUser(): MockProfile | null {
  if (!canUseStorage()) return null;
  const id = window.localStorage.getItem(SESSION_KEY);
  if (!id) return null;
  return getDb().profiles.find((profile) => profile.id === id) ?? null;
}

export function setSessionUser(userId: string): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(SESSION_KEY, userId);
}

export function clearSessionUser(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(SESSION_KEY);
}

export function findItem(id: string): MockItem | undefined {
  return getDb().items.find((item) => item.id === id);
}

export function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}