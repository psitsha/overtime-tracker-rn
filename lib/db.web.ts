// lib/db.web.ts — web stub to avoid importing expo-sqlite
export async function initSchema() {
  // No-op on web. Web persistence is provided by repo.web.ts (localStorage).
  return;
}

export const dbPromise = Promise.resolve(null as any);
