import { useEffect, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, MapPin, Clock, ExternalLink, Maximize2 } from "lucide-react";
import { VisitDetail, FullVisitorDetailDialog } from "./ViewedVisitorsExpansion";

export interface ProposalVisit {
  id: string;
  visitor_id: string | null;
  page_path: string;
  duration: number | null;
  location: any;
  user_agent: string | null;
  referrer: string | null;
  visited_at: string;
  scroll_max_pct?: number | null;
  engaged_seconds?: number | null;
  events?: any[] | null;
  sections?: Record<string, number> | null;
  viewport?: any;
  utm?: any;
  video_stats?: Record<string, any> | null;
}

const LS_KEY = "proposal_visitors_last_seen_v1";

const formatDuration = (s: number | null | undefined) => {
  const v = Math.max(0, Math.round(s ?? 0));
  if (v < 60) return `${v}s`;
  const m = Math.floor(v / 60);
  const r = v % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
};

const formatWhen = (iso: string) => {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

const shortPath = (p: string) => {
  if (p.includes("/proof/")) return "Proof of Representation";
  const m = p.match(/\/(club-proposal|clubs|agents)\/([^/]+)/);
  return m ? `/${m[1]}/${m[2]}` : p;
};

export default function ProposalVisitorsBell({ visits }: { visits: ProposalVisit[] }) {
  const [lastSeen, setLastSeen] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const raw = localStorage.getItem(LS_KEY);
    return raw ? Number(raw) || 0 : 0;
  });
  const [open, setOpen] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);

  const sorted = useMemo(
    () => [...visits].sort((a, b) => new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime()),
    [visits],
  );

  const newCount = useMemo(
    () => sorted.filter((v) => new Date(v.visited_at).getTime() > lastSeen).length,
    [sorted, lastSeen],
  );

  // Group by visitor_id for the popover (one row per visitor, all pages they hit)
  const sessions = useMemo(() => {
    const map = new Map<string, ProposalVisit[]>();
    sorted.forEach((v) => {
      const key = v.visitor_id || v.id;
      const arr = map.get(key) ?? [];
      arr.push(v);
      map.set(key, arr);
    });
    return Array.from(map.entries()).map(([key, vs]) => {
      const latest = vs[0];
      const totalDuration = vs.reduce((s, v) => s + (v.duration ?? 0), 0);
      const loc = (latest.location ?? {}) as any;
      const city = loc.city ?? null;
      const region = loc.region ?? null;
      const country = loc.country ?? "Unknown";
      const isNew = new Date(latest.visited_at).getTime() > lastSeen;
      return { key, visits: vs, latest, totalDuration, city, region, country, isNew };
    });
  }, [sorted, lastSeen]);

  const handleClick = () => {
    setOpen((o) => !o);
    const now = Date.now();
    setLastSeen(now);
    try { localStorage.setItem(LS_KEY, String(now)); } catch {}
  };

  const total = sorted.length;
  const pulsing = newCount > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          title={total === 0 ? "No non-UK visitors yet" : `${total} non-UK visitor${total === 1 ? "" : "s"}${newCount > 0 ? ` — ${newCount} new` : ""}`}
          className={`relative inline-flex items-center justify-center h-9 w-9 rounded-md border border-[#cbb96b]/40 bg-background hover:bg-[#cbb96b]/10 transition ${pulsing ? "animate-pulse shadow-[0_0_0_2px_rgba(203,185,107,0.35)]" : ""}`}
        >
          <Bell className={`h-4 w-4 ${pulsing ? "text-[#cbb96b]" : "text-muted-foreground"}`} />
          {total > 0 && (
            <span
              className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                pulsing ? "bg-[#cbb96b] text-black" : "bg-muted text-foreground"
              }`}
            >
              {newCount > 0 ? newCount : total}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[460px] max-w-[92vw] max-h-[540px] overflow-y-auto p-0">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between sticky top-0 bg-popover z-10">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#cbb96b]">Non-UK Proposal Visitors</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFullOpen(true); setOpen(false); }}
              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-[#cbb96b]/50 text-[#cbb96b] hover:bg-[#cbb96b]/10"
            >
              <Maximize2 className="h-2.5 w-2.5" /> Full detail
            </button>
            <span className="text-[11px] text-muted-foreground">{total} total</span>
          </div>
        </div>
        {sessions.length === 0 ? (
          <div className="p-4 text-xs text-muted-foreground text-center">No non-UK visitors yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {sessions.map((s) => (
              <li key={s.key} className="px-3 py-2 text-xs space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-1.5 min-w-0">
                    <MapPin className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${s.isNew ? "text-[#cbb96b]" : "text-muted-foreground"}`} />
                    <div className="min-w-0">
                      <div className={`font-medium truncate ${s.isNew ? "text-[#cbb96b]" : "text-foreground"}`}>
                        {[s.city, s.region].filter(Boolean).join(", ") || s.country}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{s.country}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatWhen(s.latest.visited_at)}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground pl-5">
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{formatDuration(s.totalDuration)}</span>
                  <span className="inline-flex items-center gap-1"><ExternalLink className="h-3 w-3" />{s.visits.length} page{s.visits.length === 1 ? "" : "s"}</span>
                </div>
                <ul className="pl-5 space-y-0.5">
                  {s.visits.map((v) => (
                    <VisitDetail key={v.id} v={v} />
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
    {/* Wide inline dialog with every visitor expanded for easy scrolling */}
    <FullVisitorDetailDialog visits={sorted} open={fullOpen} onOpenChange={setFullOpen} title="Non-UK proposal visitors — full breakdown" />
    </>
  );
}
