import { useMemo, type ReactNode } from "react";
import { MapPin, Clock, Eye, Globe } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { ProposalVisit } from "./ProposalVisitorsBell";

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

export default function ViewedVisitorsExpansion({ visits, children }: { visits: ProposalVisit[]; children: ReactNode }) {
  // Group by visitor_id so each card row is a single person.
  const sessions = useMemo(() => {
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
        country: loc.country ?? "Unknown",
        ip: loc.ip ?? null,
        totalDuration: vs.reduce((s, v) => s + (v.duration ?? 0), 0),
        device: deviceFromUA(latest.user_agent),
        referrer: latest.referrer,
      };
    });
  }, [visits]);

  return (
    <HoverCard openDelay={80} closeDelay={120}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        align="start"
        sideOffset={6}
        className="w-[360px] max-w-[92vw] p-0 border-[#cbb96b]/40 bg-popover shadow-xl shadow-black/50"
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#cbb96b] font-semibold flex items-center gap-1.5">
            <Eye className="h-3 w-3" /> Visitor detail
          </span>
          <span className="text-[10px] text-muted-foreground">
            {sessions.length} visitor{sessions.length === 1 ? "" : "s"}
          </span>
        </div>
        <ul className="divide-y divide-border/50 max-h-[320px] overflow-y-auto">
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
                  <li key={v.id} className="text-[10.5px] text-muted-foreground/90 flex items-center justify-between gap-2">
                    <span className="truncate">• {pageLabel(v.page_path)}</span>
                    <span className="opacity-70 whitespace-nowrap">{fmtDuration(v.duration)} · {fmtWhen(v.visited_at)}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </HoverCardContent>
    </HoverCard>
  );
}
