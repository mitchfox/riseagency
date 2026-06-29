import { useEffect } from "react";

// Captures rich, Wix-style in-page behaviour: scroll depth, section dwell,
// clicks/taps, video engagement, engaged-vs-idle time. Flushes every 10s
// and on visibilitychange/unload via sendBeacon so we never lose the tail
// of a visit even when the tab closes.
export function useBehaviourTracking(visitId: string | null, pathname: string) {
  useEffect(() => {
    if (!visitId) return;
    if (typeof window === "undefined") return;

    const FN_URL = `${(import.meta as any).env?.VITE_SUPABASE_URL ?? ""}/functions/v1/track-visit`;
    const startedAt = Date.now();

    type Evt = { t: number; type: string; [k: string]: any };
    const buffer: {
      events: Evt[];
      sections: Record<string, number>;
      sectionStarts: Map<string, number>;
      scrollMax: number;
      engagedSeconds: number;
      videoStats: Record<string, any>;
      milestones: Set<number>;
    } = {
      events: [],
      sections: {},
      sectionStarts: new Map(),
      scrollMax: 0,
      engagedSeconds: 0,
      videoStats: {},
      milestones: new Set(),
    };

    let viewportSent = false;
    let utmSent = false;
    let lastActivity = Date.now();
    let hidden = document.visibilityState === "hidden";
    const IDLE_MS = 30_000;

    const t = () => Math.round((Date.now() - startedAt) / 1000);
    const push = (type: string, data: Record<string, any> = {}) => {
      buffer.events.push({ t: t(), type, ...data });
      if (buffer.events.length > 200) buffer.events.splice(0, buffer.events.length - 200);
    };

    push("open", { path: pathname });

    // ---- UTM + viewport on first flush ----
    const utm: Record<string, string> = {};
    try {
      const sp = new URLSearchParams(window.location.search);
      ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach((k) => {
        const v = sp.get(k);
        if (v) utm[k.replace("utm_", "")] = v;
      });
    } catch { /* noop */ }
    const viewport = {
      w: window.innerWidth,
      h: window.innerHeight,
      dpr: window.devicePixelRatio || 1,
      orientation: window.innerWidth >= window.innerHeight ? "landscape" : "portrait",
    };

    // ---- Engaged-seconds ticker ----
    const tick = window.setInterval(() => {
      if (!hidden && Date.now() - lastActivity < IDLE_MS) {
        buffer.engagedSeconds += 1;
      }
    }, 1000);

    const markActive = () => { lastActivity = Date.now(); };
    const activityEvents: Array<keyof DocumentEventMap> = ["mousemove", "touchstart", "keydown", "scroll", "click"];
    activityEvents.forEach((ev) => document.addEventListener(ev, markActive, { passive: true } as any));

    // ---- Visibility ----
    const onVis = () => {
      hidden = document.visibilityState === "hidden";
      if (hidden) { flush(true); }
    };
    document.addEventListener("visibilitychange", onVis);

    // ---- Scroll depth ----
    let scrollRaf = 0;
    const onScroll = () => {
      if (scrollRaf) return;
      scrollRaf = window.requestAnimationFrame(() => {
        scrollRaf = 0;
        const doc = document.documentElement;
        const scrollable = Math.max(1, doc.scrollHeight - window.innerHeight);
        const pct = Math.min(100, Math.round(((window.scrollY + window.innerHeight) / doc.scrollHeight) * 100));
        const rawPct = Math.min(100, Math.round((window.scrollY / scrollable) * 100));
        const value = Math.max(pct, rawPct);
        if (value > buffer.scrollMax) buffer.scrollMax = value;
        for (const m of [25, 50, 75, 100]) {
          if (value >= m && !buffer.milestones.has(m)) {
            buffer.milestones.add(m);
            push("scroll", { pct: m });
          }
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // ---- Click capture ----
    const labelFor = (el: HTMLElement): string => {
      const explicit = el.closest<HTMLElement>("[data-track]");
      if (explicit?.dataset.track) return explicit.dataset.track.slice(0, 80);
      const aria = el.closest<HTMLElement>("[aria-label]");
      if (aria?.getAttribute("aria-label")) return aria.getAttribute("aria-label")!.slice(0, 80);
      const btn = el.closest("button, a, [role='button']") as HTMLElement | null;
      if (btn) {
        const text = (btn.innerText || btn.textContent || "").trim().replace(/\s+/g, " ");
        if (text) return text.slice(0, 80);
        const tag = btn.tagName.toLowerCase();
        return tag === "a" ? "link" : "button";
      }
      if (el.tagName === "IMG") return (el as HTMLImageElement).alt?.slice(0, 80) || "image";
      if (el.tagName === "VIDEO") return "video";
      return el.tagName.toLowerCase();
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const label = labelFor(target);
      const x = window.innerWidth ? Math.round((e.clientX / window.innerWidth) * 100) : 0;
      const y = window.innerHeight ? Math.round((e.clientY / window.innerHeight) * 100) : 0;
      push("click", { label, x, y });
    };
    document.addEventListener("click", onClick, true);

    // ---- Section dwell ----
    const io = new IntersectionObserver((entries) => {
      const now = Date.now();
      entries.forEach((entry) => {
        const el = entry.target as HTMLElement;
        const name = (el.dataset.trackSection || el.id || "section").slice(0, 60);
        if (entry.isIntersecting && entry.intersectionRatio >= 0.4) {
          if (!buffer.sectionStarts.has(name)) {
            buffer.sectionStarts.set(name, now);
            push("section_in", { name });
          }
        } else {
          const startedSection = buffer.sectionStarts.get(name);
          if (startedSection) {
            const seconds = Math.round((now - startedSection) / 1000);
            buffer.sections[name] = (buffer.sections[name] ?? 0) + seconds;
            buffer.sectionStarts.delete(name);
          }
        }
      });
    }, { threshold: [0, 0.4, 1] });
    const observeSections = () => {
      document.querySelectorAll<HTMLElement>("[data-track-section]").forEach((el) => io.observe(el));
    };
    observeSections();

    // ---- Video tracking ----
    const attachedVideos = new WeakSet<HTMLVideoElement>();
    const attachVideo = (v: HTMLVideoElement) => {
      if (attachedVideos.has(v)) return;
      attachedVideos.add(v);
      const key = v.dataset.trackVideo || v.getAttribute("data-name") || v.src?.split("/").pop()?.split("?")[0] || `video_${Math.random().toString(36).slice(2, 7)}`;
      const labelV = v.dataset.trackVideo || v.getAttribute("aria-label") || key;
      const ensure = () => {
        if (!buffer.videoStats[key]) buffer.videoStats[key] = { label: labelV, plays: 0, watched: 0, maxPct: 0, duration: 0, fullscreen: false };
        return buffer.videoStats[key];
      };
      let lastTs: number | null = null;
      v.addEventListener("play", () => { ensure().plays += 1; lastTs = Date.now(); push("video_play", { key, label: labelV }); });
      v.addEventListener("pause", () => {
        const s = ensure();
        if (lastTs) { s.watched += Math.round((Date.now() - lastTs) / 1000); lastTs = null; }
        s.duration = v.duration || s.duration;
        if (v.duration) s.maxPct = Math.max(s.maxPct, Math.round((v.currentTime / v.duration) * 100));
      });
      v.addEventListener("ended", () => {
        const s = ensure();
        if (lastTs) { s.watched += Math.round((Date.now() - lastTs) / 1000); lastTs = null; }
        s.maxPct = 100; s.duration = v.duration || s.duration;
        push("video_ended", { key, label: labelV });
      });
      v.addEventListener("timeupdate", () => {
        if (v.duration) {
          const s = ensure();
          s.maxPct = Math.max(s.maxPct, Math.round((v.currentTime / v.duration) * 100));
          s.duration = v.duration;
        }
      });
    };
    const scanVideos = () => document.querySelectorAll<HTMLVideoElement>("video").forEach(attachVideo);
    scanVideos();
    document.addEventListener("fullscreenchange", () => {
      const el = document.fullscreenElement as HTMLVideoElement | null;
      if (el && el.tagName === "VIDEO" && (el as any).dataset) {
        const key = (el as any).dataset.trackVideo || el.src?.split("/").pop()?.split("?")[0];
        if (key && buffer.videoStats[key]) buffer.videoStats[key].fullscreen = true;
      }
    });

    const mo = new MutationObserver(() => { scanVideos(); observeSections(); });
    mo.observe(document.body, { childList: true, subtree: true });

    // ---- Flush ----
    const flush = (useBeacon = false) => {
      // Close any still-open sections so dwell is current.
      const now = Date.now();
      buffer.sectionStarts.forEach((startedSection, name) => {
        const seconds = Math.round((now - startedSection) / 1000);
        buffer.sections[name] = (buffer.sections[name] ?? 0) + seconds;
        buffer.sectionStarts.set(name, now);
      });
      const partial: any = {
        events: buffer.events,
        sections: buffer.sections,
        scrollMax: buffer.scrollMax,
        engagedSeconds: buffer.engagedSeconds,
        videoStats: buffer.videoStats,
      };
      if (!viewportSent) { partial.viewport = viewport; viewportSent = true; }
      if (!utmSent && Object.keys(utm).length) { partial.utm = utm; utmSent = true; }

      const payload = JSON.stringify({ kind: "behaviour", visitId, partial });
      // Reset events + sections after sending so the next flush is delta-only.
      buffer.events = [];
      buffer.sections = {};
      buffer.videoStats = {};

      try {
        if (useBeacon && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
          navigator.sendBeacon(FN_URL, new Blob([payload], { type: "text/plain" }));
        } else {
          fetch(FN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true,
          }).catch(() => {});
        }
      } catch { /* noop */ }
    };

    const interval = window.setInterval(() => flush(false), 10_000);
    const onPageHide = () => flush(true);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onPageHide);

    return () => {
      window.clearInterval(tick);
      window.clearInterval(interval);
      activityEvents.forEach((ev) => document.removeEventListener(ev, markActive as any));
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onPageHide);
      io.disconnect();
      mo.disconnect();
      flush(true);
    };
  }, [visitId, pathname]);
}