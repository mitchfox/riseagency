import { lazy, type ComponentType } from "react";

// Wrap React.lazy so a failed dynamic import (typically a stale chunk hash
// after a deploy) doesn't permanently break the section. We retry the import
// a couple of times with cache-busting query params, and if it still fails we
// clear caches/service workers and reload once so the user lands on the new
// build instead of staring at an empty pane.
const RELOAD_FLAG = "__lovable_chunk_reload__";

async function nukeCachesAndReload() {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return; // already tried once
    sessionStorage.setItem(RELOAD_FLAG, "1");
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.allSettled(regs.map((r) => r.unregister()));
    }
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.allSettled(keys.map((k) => caches.delete(k)));
    }
  } catch {}
  window.location.reload();
}

function isChunkLoadError(err: unknown): boolean {
  if (!err) return false;
  const msg = (err as Error).message ?? String(err);
  return /Failed to fetch dynamically imported module|Loading chunk|Importing a module script failed|ChunkLoadError/i.test(
    msg,
  );
}

export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): ReturnType<typeof lazy<T>> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err1) {
      if (!isChunkLoadError(err1)) throw err1;
      await new Promise((r) => setTimeout(r, 400));
      try {
        return await factory();
      } catch (err2) {
        if (!isChunkLoadError(err2)) throw err2;
        nukeCachesAndReload();
        // Surface the original error so the ErrorBoundary doesn't loop while
        // the reload is in flight.
        throw err2;
      }
    }
  });
}

// Clear the reload flag once a session boots successfully so a future stale
// chunk can trigger another recovery cycle.
if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    setTimeout(() => sessionStorage.removeItem(RELOAD_FLAG), 5000);
  });
}