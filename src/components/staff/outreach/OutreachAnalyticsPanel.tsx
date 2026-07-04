import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Search, X, Download } from "lucide-react";

export type AnalyticsResponseStatus =
  | "none"
  | "awaiting_view"
  | "viewed_no_reply"
  | "follow_up_sent"
  | "replied"
  | "interested"
  | "negotiating"
  | "offer_made"
  | "meeting"
  | "signed"
  | "declined"
  | "not_interested";

const RESPONSE_LABELS: Record<AnalyticsResponseStatus, string> = {
  none: "Not set",
  awaiting_view: "Awaiting view",
  viewed_no_reply: "Viewed - no reply",
  follow_up_sent: "Follow-up sent",
  replied: "Replied",
  interested: "Interested",
  negotiating: "Negotiating",
  offer_made: "Offer made",
  meeting: "Meeting booked",
  signed: "Signed",
  declined: "Declined",
  not_interested: "Not interested",
};

const RESPONSE_ORDER: AnalyticsResponseStatus[] = [
  "none",
  "awaiting_view",
  "viewed_no_reply",
  "follow_up_sent",
  "replied",
  "interested",
  "negotiating",
  "offer_made",
  "meeting",
  "signed",
  "declined",
  "not_interested",
];

export type AnalyticsRow = {
  id: string;
  label: string;
  sub?: string | null;
  status: string; // draft/ready/sent/etc
  createdAt?: string | null;
  viewCount: number;
  lastViewedAt?: string | null;
  responseStatus: AnalyticsResponseStatus;
  responseNotes?: string | null;
  responseAt?: string | null;
  aiScore?: number | null;
};

type Props = {
  title: string;
  rows: AnalyticsRow[];
  onClose: () => void;
  onUpdateResponse: (
    id: string,
    status: AnalyticsResponseStatus,
    notes: string | null,
  ) => Promise<void> | void;
};

const pct = (num: number, den: number) =>
  den === 0 ? "—" : `${Math.round((num / den) * 100)}%`;

// Colour ramp matching FitScoreBadge so band pips read the same visually.
const scoreColour = (total: number) => {
  const stops: Array<[number, [number, number, number]]> = [
    [0, [0, 85, 50]],
    [25, [20, 90, 52]],
    [50, [50, 90, 52]],
    [75, [130, 70, 42]],
    [85, [85, 65, 45]],
    [100, [45, 62, 42]],
  ];
  let h = 0, s = 0, l = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (total >= t0 && total <= t1) {
      const f = (total - t0) / (t1 - t0 || 1);
      h = c0[0] + (c1[0] - c0[0]) * f;
      s = c0[1] + (c1[1] - c0[1]) * f;
      l = c0[2] + (c1[2] - c0[2]) * f;
      break;
    }
  }
  return `hsl(${h.toFixed(0)}, ${s.toFixed(0)}%, ${l.toFixed(0)}%)`;
};

type BandKey = "90-100" | "80-89" | "70-79" | "60-69" | "50-59" | "40-49" | "30-39" | "20-29" | "10-19" | "0-9" | "none";

const BAND_ORDER: BandKey[] = ["90-100", "80-89", "70-79", "60-69", "50-59", "40-49", "30-39", "20-29", "10-19", "0-9", "none"];

const bandFor = (score: number | null | undefined): BandKey => {
  if (score == null || Number.isNaN(score)) return "none";
  const s = Math.max(0, Math.min(100, Math.round(score)));
  if (s >= 90) return "90-100";
  if (s >= 80) return "80-89";
  if (s >= 70) return "70-79";
  if (s >= 60) return "60-69";
  if (s >= 50) return "50-59";
  if (s >= 40) return "40-49";
  if (s >= 30) return "30-39";
  if (s >= 20) return "20-29";
  if (s >= 10) return "10-19";
  return "0-9";
};

const BAND_LABEL: Record<BandKey, string> = {
  "90-100": "90-100",
  "80-89": "80-89",
  "70-79": "70-79",
  "60-69": "60-69",
  "50-59": "50-59",
  "40-49": "40-49",
  "30-39": "30-39",
  "20-29": "20-29",
  "10-19": "10-19",
  "0-9": "0-9",
  none: "No score",
};

const BAND_MID: Record<BandKey, number> = {
  "90-100": 95, "80-89": 85, "70-79": 75, "60-69": 65, "50-59": 55,
  "40-49": 45, "30-39": 35, "20-29": 25, "10-19": 15, "0-9": 5, none: 0,
};

const REPLIED_SET_CONST = new Set<AnalyticsResponseStatus>([
  "replied", "interested", "negotiating", "offer_made",
  "meeting", "signed", "declined", "not_interested",
]);
const INTERESTED_SET_CONST = new Set<AnalyticsResponseStatus>([
  "interested", "negotiating", "offer_made", "meeting", "signed",
]);

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

export default function OutreachAnalyticsPanel({
  title,
  rows,
  onClose,
  onUpdateResponse,
}: Props) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "sent" | "viewed" | AnalyticsResponseStatus>("all");
  const [bandFilter, setBandFilter] = useState<"all" | BandKey>("all");

  const hasScores = useMemo(() => rows.some((r) => typeof r.aiScore === "number"), [rows]);

  const sentRows = useMemo(
    () => rows.filter((r) => ["sent", "signed", "declined"].includes((r.status || "").toLowerCase()) || r.viewCount > 0 || r.responseStatus !== "none"),
    [rows],
  );

  const isSent = (r: AnalyticsRow) =>
    ["sent", "signed", "declined"].includes((r.status || "").toLowerCase()) || r.viewCount > 0 || r.responseStatus !== "none";

  const bandStats = useMemo(() => {
    const buckets: Record<BandKey, AnalyticsRow[]> = {
      "90-100": [], "80-89": [], "70-79": [], "60-69": [], "50-59": [],
      "40-49": [], "30-39": [], "20-29": [], "10-19": [], "0-9": [], none: [],
    };
    rows.forEach((r) => buckets[bandFor(r.aiScore)].push(r));
    return BAND_ORDER.map((band) => {
      const items = buckets[band];
      const created = items.length;
      const sent = items.filter(isSent);
      const sentCount = sent.length;
      const viewed = sent.filter((r) => r.viewCount > 0).length;
      const replied = sent.filter((r) => REPLIED_SET_CONST.has(r.responseStatus)).length;
      const interested = sent.filter((r) => INTERESTED_SET_CONST.has(r.responseStatus)).length;
      const signed = sent.filter((r) => r.responseStatus === "signed").length;
      return { band, created, sent: sentCount, viewed, replied, interested, signed };
    }).filter((b) => b.created > 0);
  }, [rows]);

  const totals = useMemo(() => {
    const totalCreated = rows.length;
    const totalSent = sentRows.length;
    const viewed = sentRows.filter((r) => r.viewCount > 0).length;
    const REPLIED_SET = new Set<AnalyticsResponseStatus>([
      "replied", "interested", "negotiating", "offer_made",
      "meeting", "signed", "declined", "not_interested",
    ]);
    const replied = sentRows.filter((r) => REPLIED_SET.has(r.responseStatus)).length;
    const awaitingView = sentRows.filter((r) => r.viewCount === 0 && !REPLIED_SET.has(r.responseStatus)).length;
    const viewedNoReply = sentRows.filter((r) => r.viewCount > 0 && !REPLIED_SET.has(r.responseStatus)).length;
    const interested = sentRows.filter((r) =>
      ["interested", "negotiating", "offer_made", "meeting", "signed"].includes(r.responseStatus),
    ).length;
    const meetings = sentRows.filter((r) =>
      ["meeting", "signed"].includes(r.responseStatus),
    ).length;
    const signed = sentRows.filter((r) => r.responseStatus === "signed").length;
    const totalViews = sentRows.reduce((sum, r) => sum + r.viewCount, 0);
    return { totalCreated, totalSent, viewed, awaitingView, viewedNoReply, replied, interested, meetings, signed, totalViews };
  }, [rows, sentRows]);

  const visible = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (filter === "sent" && !sentRows.includes(r)) return false;
      if (filter === "viewed" && r.viewCount === 0) return false;
      if (RESPONSE_ORDER.includes(filter as AnalyticsResponseStatus) && r.responseStatus !== filter) return false;
      if (bandFilter !== "all" && bandFor(r.aiScore) !== bandFilter) return false;
      if (!ql) return true;
      return (
        r.label.toLowerCase().includes(ql) ||
        (r.sub || "").toLowerCase().includes(ql)
      );
    });
    // Most recent first - falls back to lastViewedAt when createdAt missing.
    return filtered.slice().sort((a, b) => {
      const ad = new Date(a.createdAt || a.lastViewedAt || 0).getTime();
      const bd = new Date(b.createdAt || b.lastViewedAt || 0).getTime();
      return bd - ad;
    });
  }, [rows, sentRows, q, filter, bandFilter]);

  const exportCsv = () => {
    const head = [
      "Name",
      "Sub",
      "Status",
      "Created",
      "Views",
      "Last viewed",
      "Response",
      "Response at",
      "Notes",
      "AI score",
    ];
    const lines = [head.join(",")].concat(
      rows.map((r) =>
        [
          r.label,
          r.sub ?? "",
          r.status,
          r.createdAt ?? "",
          String(r.viewCount),
          r.lastViewedAt ?? "",
          RESPONSE_LABELS[r.responseStatus],
          r.responseAt ?? "",
          (r.responseNotes ?? "").replace(/\n/g, " "),
          r.aiScore == null ? "" : String(Math.round(r.aiScore)),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      ),
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}-analytics.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tiles: { label: string; value: string; sub?: string }[] = [
    { label: "Created", value: String(totals.totalCreated) },
    { label: "Sent", value: String(totals.totalSent), sub: pct(totals.totalSent, totals.totalCreated) + " of created" },
    { label: "Viewed", value: String(totals.viewed), sub: pct(totals.viewed, totals.totalSent) + " of sent" },
    { label: "Awaiting view", value: String(totals.awaitingView) },
    { label: "Viewed, no reply", value: String(totals.viewedNoReply) },
    { label: "Replied", value: String(totals.replied), sub: pct(totals.replied, totals.viewed) + " of viewed" },
    { label: "Interested", value: String(totals.interested), sub: pct(totals.interested, totals.replied) + " of replied" },
    { label: "Meetings", value: String(totals.meetings) },
    { label: "Signed", value: String(totals.signed) },
    { label: "Total views", value: String(totals.totalViews) },
  ];

  return (
    <div className="rounded-xl border-2 border-[#cbb96b]/70 bg-black/60 p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-white text-base font-semibold tracking-tight">{title}</h2>
          <p className="text-[11px] text-muted-foreground">
            Auto-tracked views combined with manually logged responses, interest and outcomes — investor-ready conversion data.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.label}</div>
            <div className="text-xl font-semibold text-[#cbb96b]">{t.value}</div>
            {t.sub && <div className="text-[10px] text-muted-foreground mt-0.5">{t.sub}</div>}
          </div>
        ))}
      </div>

      {hasScores && bandStats.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-3 py-2 bg-muted/30 border-b border-border flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-wider text-[#cbb96b] font-semibold">AI score bands</div>
            <div className="text-[10px] text-muted-foreground">Conversion by fit score</div>
          </div>
          <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
            <div className="col-span-2">Band</div>
            <div className="col-span-1 text-right">Created</div>
            <div className="col-span-1 text-right">Sent</div>
            <div className="col-span-1 text-right">Viewed</div>
            <div className="col-span-1 text-right">Replied</div>
            <div className="col-span-1 text-right">Interest</div>
            <div className="col-span-1 text-right">Signed</div>
            <div className="col-span-1 text-right">View %</div>
            <div className="col-span-1 text-right">Reply %</div>
            <div className="col-span-1 text-right">Int %</div>
            <div className="col-span-1 text-right">Sign %</div>
          </div>
          <div className="divide-y divide-border">
            {bandStats.map((b) => (
              <div key={b.band} className="grid grid-cols-12 gap-2 px-3 py-1.5 text-[11px] items-center">
                <div className="col-span-2 flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: scoreColour(BAND_MID[b.band]) }}
                  />
                  <span className="text-white font-medium">{BAND_LABEL[b.band]}</span>
                </div>
                <div className="col-span-1 text-right text-muted-foreground">{b.created}</div>
                <div className="col-span-1 text-right text-muted-foreground">{b.sent}</div>
                <div className="col-span-1 text-right text-muted-foreground">{b.viewed}</div>
                <div className="col-span-1 text-right text-muted-foreground">{b.replied}</div>
                <div className="col-span-1 text-right text-muted-foreground">{b.interested}</div>
                <div className="col-span-1 text-right text-muted-foreground">{b.signed}</div>
                <div className="col-span-1 text-right text-[#cbb96b]">{pct(b.viewed, b.sent)}</div>
                <div className="col-span-1 text-right text-[#cbb96b]">{pct(b.replied, b.viewed)}</div>
                <div className="col-span-1 text-right text-[#cbb96b]">{pct(b.interested, b.replied)}</div>
                <div className="col-span-1 text-right text-[#cbb96b]">{pct(b.signed, b.sent)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name…"
            className="pl-9 h-9"
          />
        </div>
        {(["all", "sent", "viewed", ...RESPONSE_ORDER] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f as any)}
            className={`px-2.5 py-1 rounded-md text-[11px] uppercase tracking-wider transition border ${
              filter === f
                ? "bg-[#cbb96b] text-black border-[#cbb96b] font-semibold"
                : "text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {f === "all" ? "All" : f === "sent" ? "Sent" : f === "viewed" ? "Viewed" : RESPONSE_LABELS[f as AnalyticsResponseStatus]}
          </button>
        ))}
      </div>

      {hasScores && bandStats.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Band</span>
          {(["all", ...bandStats.map((b) => b.band)] as const).map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBandFilter(b as any)}
              className={`px-2.5 py-1 rounded-md text-[11px] uppercase tracking-wider transition border ${
                bandFilter === b
                  ? "bg-[#cbb96b] text-black border-[#cbb96b] font-semibold"
                  : "text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {b === "all" ? "All bands" : BAND_LABEL[b as BandKey]}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30 border-b border-border">
          <div className="col-span-4">Recipient</div>
          <div className="col-span-1 text-center">Status</div>
          <div className="col-span-1 text-center">Views</div>
          <div className="col-span-3">Response</div>
          <div className="col-span-3">Notes</div>
        </div>
        <div className="max-h-[420px] overflow-auto divide-y divide-border">
          {visible.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">No outreach matches the current filter.</div>
          ) : (
            visible.map((r) => (
              <RowEditor key={r.id} row={r} onUpdate={onUpdateResponse} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function RowEditor({
  row,
  onUpdate,
}: {
  row: AnalyticsRow;
  onUpdate: (id: string, status: AnalyticsResponseStatus, notes: string | null) => Promise<void> | void;
}) {
  const [notes, setNotes] = useState(row.responseNotes ?? "");
  const [saving, setSaving] = useState(false);

  const save = async (nextStatus: AnalyticsResponseStatus, nextNotes: string | null) => {
    setSaving(true);
    try {
      await onUpdate(row.id, nextStatus, nextNotes);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-2 px-3 py-2 items-start text-xs">
      <div className="col-span-4">
        <div className="text-white font-medium leading-tight">{row.label}</div>
        {row.sub && <div className="text-[10px] text-muted-foreground mt-0.5">{row.sub}</div>}
        <div className="text-[10px] text-muted-foreground mt-0.5">Created {fmtDate(row.createdAt)}</div>
      </div>
      <div className="col-span-1 text-center text-[11px] capitalize text-muted-foreground">{row.status || "—"}</div>
      <div className="col-span-1 text-center">
        <div className="text-[#cbb96b] font-semibold">{row.viewCount}</div>
        <div className="text-[10px] text-muted-foreground">{row.lastViewedAt ? fmtDate(row.lastViewedAt) : "—"}</div>
      </div>
      <div className="col-span-3">
        <select
          disabled={saving}
          value={row.responseStatus}
          onChange={(e) => save(e.target.value as AnalyticsResponseStatus, notes.trim() ? notes.trim() : null)}
          className="w-full h-8 rounded-md bg-background border border-border px-2 text-xs"
        >
          {RESPONSE_ORDER.map((s) => (
            <option key={s} value={s}>{RESPONSE_LABELS[s]}</option>
          ))}
        </select>
        {row.responseAt && (
          <div className="text-[10px] text-muted-foreground mt-1">Updated {fmtDate(row.responseAt)}</div>
        )}
      </div>
      <div className="col-span-3">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            const trimmed = notes.trim();
            if ((row.responseNotes ?? "") !== trimmed) {
              save(row.responseStatus, trimmed || null);
            }
          }}
          placeholder="What did they say? Next step…"
          rows={2}
          className="text-xs min-h-[44px]"
        />
      </div>
    </div>
  );
}