import { useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MapPin, Clock, Eye, Globe, MousePointerClick, ScrollText, Film, ChevronDown, ChevronUp, Layers, Maximize2 } from "lucide-react";
import type { ProposalVisit } from "./ProposalVisitorsBell";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const fmtDuration = (s: number | null | undefined) => {
  const v = Math.max(0, Math.round(s ?? 0));
  if (v < 60) return `${v}s`;
  const m = Math.floor(v / 60);
  const r = v % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
};

const fmtWhen = (iso: string) => {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

const pageLabel = (p: string) => {
  if (p.includes("/proof/")) return "Proof of Representation page";
  if (p.match(/\/(club-proposal|clubs)\//)) return "Proposal page";
  if (p.match(/\/agents\//)) return "Agent proposal page";
  if (p.match(/\/risewithus\//)) return "Player offer page";
  return p;
};

const deviceFromUA = (ua: string | null) => {
  if (!ua) return "Unknown device";
  const s = ua.toLowerCase();
  const mobile = /iphone|android.+mobile|ipod/.test(s);
  const tablet = /ipad|android(?!.*mobile)/.test(s);
  const browser = /edg\//.test(s) ? "Edge"
    : /chrome\//.test(s) ? "Chrome"
    : /safari\//.test(s) ? "Safari"
    : /firefox\//.test(s) ? "Firefox"
    : "Browser";
  const os = /windows/.test(s) ? "Windows"
    : /mac os/.test(s) ? "macOS"
    : /android/.test(s) ? "Android"
    : /iphone|ipad|ipod/.test(s) ? "iOS"
    : /linux/.test(s) ? "Linux"
    : "";
  const kind = mobile ? "Mobile" : tablet ? "Tablet" : "Desktop";
  return [kind, browser, os].filter(Boolean).join(" · ");
};

const fmtEvtTime = (s: number) => {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m${r}s` : `${m}m`;
};

export function VisitDetail({ v, defaultOpen = false, allTaps = false }: { v: ProposalVisit; defaultOpen?: boolean; allTaps?: boolean }) {
  const [openDetail, setOpenDetail] = useState(defaultOpen);
  const engaged = v.engaged_seconds ?? 0;
  const scrollMax = v.scroll_max_pct ?? 0;
  const events = Array.isArray(v.events) ? v.events : [];
  const sections = v.sections && typeof v.sections === "object" ? v.sections : {};
  const videos = v.video_stats && typeof v.video_stats === "object" ? v.video_stats : {};
  const viewport = (v as any).viewport ?? null;

  const allClicks = events.filter((e: any) => e?.type === "click");
  const clickList = allTaps ? allClicks : allClicks.slice(-12);
  const sectionEntries = allTaps
    ? Object.entries(sections).sort((a, b) => Number(b[1]) - Number(a[1]))
    : Object.entries(sections).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 6);
  const videoEntries = Object.entries(videos);

  const hasDetail =
    engaged > 0 || scrollMax > 0 || events.length > 0 ||
    sectionEntries.length > 0 || videoEntries.length > 0 || !!viewport;

  return (
    <li className="text-[10.5px] text-muted-foreground/90">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate flex-1">• {pageLabel(v.page_path)}</span>
        <span className="opacity-70 whitespace-nowrap">{fmtDuration(v.duration)} · {fmtWhen(v.visited_at)}</span>
        {hasDetail && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setOpenDetail((o) => !o); }}
            className="ml-1 text-[#cbb96b]/80 hover:text-[#cbb96b]"
            aria-label={openDetail ? "Hide details" : "Show details"}
          >
            {openDetail ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
      </div>
      {hasDetail && (
        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground/80">
          {engaged > 0 && (
            <span className="inline-flex items-center gap-1"><Clock className="h-2.5 w-2.5" />Engaged {fmtDuration(engaged)}</span>
          )}
          {scrollMax > 0 && (
            <span className="inline-flex items-center gap-1"><ScrollText className="h-2.5 w-2.5" />Scrolled {scrollMax}%</span>
          )}
          {clickList.length > 0 && (
            <span className="inline-flex items-center gap-1"><MousePointerClick className="h-2.5 w-2.5" />{clickList.length} taps</span>
          )}
          {videoEntries.length > 0 && (
            <span className="inline-flex items-center gap-1"><Film className="h-2.5 w-2.5" />{videoEntries.length} video{videoEntries.length === 1 ? "" : "s"}</span>
          )}
        </div>
      )}
      {openDetail && (
        <div className="mt-2 ml-3 space-y-2 border-l border-[#cbb96b]/20 pl-2">
          {sectionEntries.length > 0 && (
            <div>
              <div className="text-[9.5px] uppercase tracking-wider text-[#cbb96b]/80 flex items-center gap-1 mb-0.5">
                <Layers className="h-2.5 w-2.5" /> Time on sections
              </div>
              <ul className="space-y-0.5">
                {sectionEntries.map(([name, secs]) => (
                  <li key={name} className="flex justify-between gap-2">
                    <span className="truncate">{name}</span>
                    <span className="opacity-70">{fmtDuration(Number(secs))}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {videoEntries.length > 0 && (
            <div>
              <div className="text-[9.5px] uppercase tracking-wider text-[#cbb96b]/80 flex items-center gap-1 mb-0.5">
                <Film className="h-2.5 w-2.5" /> Video engagement
              </div>
              <ul className="space-y-0.5">
                {videoEntries.map(([key, raw]) => {
                  const s: any = raw ?? {};
                  return (
                    <li key={key} className="flex justify-between gap-2">
                      <span className="truncate">{s.label || key}</span>
                      <span className="opacity-70 whitespace-nowrap">
                        {s.plays ?? 0}× · {fmtDuration(s.watched ?? 0)} · {s.maxPct ?? 0}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {clickList.length > 0 && (
            <div>
              <div className="text-[9.5px] uppercase tracking-wider text-[#cbb96b]/80 flex items-center gap-1 mb-0.5">
                <MousePointerClick className="h-2.5 w-2.5" /> {allTaps ? `All taps (${allClicks.length})` : "Recent taps"}
              </div>
              <ul className={`space-y-0.5 ${allTaps ? "max-h-[60vh]" : "max-h-32"} overflow-y-auto`}>
                {clickList.slice().reverse().map((e: any, idx: number) => (
                  <li key={idx} className="flex justify-between gap-2">
                    <span className="truncate">{e.label || "element"}</span>
                    <span className="opacity-60 whitespace-nowrap">{fmtEvtTime(Number(e.t) || 0)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {viewport && (
            <div className="opacity-70 text-[9.5px]">
              Viewport {viewport.w}×{viewport.h} · {viewport.orientation}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function buildSessions(visits: ProposalVisit[]) {
  const map = new Map<string, ProposalVisit[]>();
  [...visits]
    .sort((a, b) => new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime())
    .forEach((v) => {
      const key = v.visitor_id || v.id;
      const arr = map.get(key) ?? [];
      arr.push(v);
      map.set(key, arr);
    });
  return Array.from(map.entries()).map(([key, vs]) => {
    const latest = vs[0];
    const loc = (latest.location ?? {}) as any;
    return {
      key,
      latest,
      visits: vs,
      city: loc.city ?? null,
      region: loc.region ?? null,
      country: loc.country || "Location unknown",
      ip: loc.ip ?? null,
      totalDuration: vs.reduce((s, v) => s + (v.duration ?? 0), 0),
      device: deviceFromUA(latest.user_agent),
      referrer: latest.referrer,
    };
  });
}

export function FullVisitorDetailDialog({
  visits,
  open,
  onOpenChange,
  title = "Full visitor breakdown",
}: {
  visits: ProposalVisit[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title?: string;
}) {
  const sessions = useMemo(() => buildSessions(visits), [visits]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[88vh] overflow-y-auto p-0 border-[#cbb96b]/40">
        <DialogHeader className="px-5 pt-4 pb-2 border-b border-border/60">
          <DialogTitle className="text-sm text-[#cbb96b] uppercase tracking-[0.18em] font-semibold flex items-center gap-2">
            <Eye className="h-3.5 w-3.5" /> {title}
            <span className="text-[10px] text-muted-foreground normal-case tracking-normal">{sessions.length} visitor{sessions.length === 1 ? "" : "s"}</span>
          </DialogTitle>
        </DialogHeader>
        {sessions.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">No visitor activity recorded yet.</div>
        ) : (
          <ul className="divide-y divide-border/50">
            {sessions.map((s) => (
              <li key={s.key} className="px-5 py-4 text-xs space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-[#cbb96b]" />
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">
                        {[s.city, s.region].filter(Boolean).join(", ") || s.country}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {s.country}{s.ip ? ` · ${s.ip}` : ""}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">{fmtWhen(s.latest.visited_at)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground pl-6">
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{fmtDuration(s.totalDuration)} total</span>
                  <span>{s.device}</span>
                  {s.referrer && (
                    <span className="truncate max-w-[260px]" title={s.referrer}>via {(() => { try { return new URL(s.referrer!).hostname; } catch { return s.referrer; } })()}</span>
                  )}
                </div>
                <ul className="pl-6 space-y-1.5">
                  {s.visits.map((v) => (
                    <VisitDetail key={v.id} v={v} defaultOpen allTaps />
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ViewedVisitorsExpansion({ visits, children }: { visits: ProposalVisit[]; children: ReactNode }) {
  // Group by visitor_id so each card row is a single person.
  const sessions = useMemo(() => buildSessions(visits), [visits]);

  const [open, setOpen] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<number | null>(null);

  const computePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const panelWidth = 420;
    let left = r.left;
    if (left + panelWidth > window.innerWidth - 12) left = Math.max(12, window.innerWidth - panelWidth - 12);
    setPos({ top: r.bottom + 8, left });
  };

  const handleEnter = () => {
    if (closeTimer.current) { window.clearTimeout(closeTimer.current); closeTimer.current = null; }
    computePosition();
    setOpen(true);
  };
  const handleLeave = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 140);
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleEnter}
        onBlur={handleLeave}
        onClick={() => { computePosition(); setOpen((o) => !o); }}
        className="contents"
      >
        {children}
      </div>
      {open && pos && typeof document !== "undefined" && createPortal(
        <div
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: 420, maxWidth: "92vw", zIndex: 1000 }}
          className="rounded-md border border-[#cbb96b]/40 bg-popover text-popover-foreground shadow-xl shadow-black/50 p-0 animate-in fade-in-0 zoom-in-95"
        >
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#cbb96b] font-semibold flex items-center gap-1.5">
            <Eye className="h-3 w-3" /> Visitor detail
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFullOpen(true); }}
              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-[#cbb96b]/50 text-[#cbb96b] hover:bg-[#cbb96b]/10"
            >
              <Maximize2 className="h-2.5 w-2.5" /> Full detail
            </button>
            <span className="text-[10px] text-muted-foreground">
              {sessions.length} visitor{sessions.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <ul className="divide-y divide-border/50 max-h-[360px] overflow-y-auto">
          {sessions.map((s) => (
            <li key={s.key} className="px-3 py-2.5 text-xs space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-1.5 min-w-0">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-[#cbb96b]" />
                  <div className="min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {[s.city, s.region].filter(Boolean).join(", ") || s.country}
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Globe className="h-2.5 w-2.5" />
                      {s.country}{s.ip ? ` · ${s.ip}` : ""}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{fmtWhen(s.latest.visited_at)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-muted-foreground pl-5">
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{fmtDuration(s.totalDuration)} total</span>
                <span>{s.device}</span>
                {s.referrer && (
                  <span className="truncate max-w-[180px]" title={s.referrer}>via {(() => { try { return new URL(s.referrer!).hostname; } catch { return s.referrer; } })()}</span>
                )}
              </div>
              <ul className="pl-5 space-y-0.5">
                {s.visits.map((v) => (
                  <VisitDetail key={v.id} v={v} />
                ))}
              </ul>
            </li>
          ))}
        </ul>
        </div>,
        document.body,
      )}
      <FullVisitorDetailDialog visits={visits} open={fullOpen} onOpenChange={setFullOpen} />
    </>
  );
}
