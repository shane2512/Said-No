import type { MemLike } from "./memory";

/**
 * In-process stand-in for Walrus Memory (MEMORY_BACKEND=local). It keeps development and test
 * runs out of the real mainnet memory space, and the UI labels it so it is never mistaken for Walrus.
 */
export function createLocalMem(): MemLike {
  const items: { text: string; blob_id: string; namespace: string; created_at: string }[] = [];
  return {
    async remember(text, namespace) {
      items.push({ text, blob_id: `local-${items.length + 1}`, namespace: namespace ?? "default", created_at: new Date().toISOString() });
      return { job_id: String(items.length - 1), status: "pending" };
    },
    async waitForRememberJob(jobId) {
      return { blob_id: items[Number(jobId)].blob_id };
    },
    async recall({ namespace, limit }) {
      const results = items
        .filter((i) => i.namespace === (namespace ?? "default"))
        .slice(0, limit ?? 10)
        .map((i) => ({ blob_id: i.blob_id, text: i.text, distance: 0.1, created_at: i.created_at }));
      return { results, total: results.length };
    },
  };
}
