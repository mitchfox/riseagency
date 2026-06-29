import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Search, X, Download } from "lucide-react";

export type AnalyticsResponseStatus =
  | "none"
  | "replied"
  | "interested"
  | "meeting"
  | "signed"
  | "not_interested";

const RESPONSE_LABELS: Record<AnalyticsResponseStatus, string> = {
  none: "No reply",
  replied: "Replied",
  interested: "Interested",
  meeting: "Meeting booked",
  signed: "Signed",
  not_interested: "Not interested",
};

const RESPONSE_ORDER: AnalyticsResponseStatus[] = [
  "none",
  "replied",
  "interested",
  "meeting",
  "signed",
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

  const sentRows = useMemo(
    () => rows.filter((r) => ["sent", "signed", "declined"].includes((r.status || "").toLowerCase()) || r.viewCount > 0 || r.responseStatus !== "none"),
    [rows],
  );

  const totals = useMemo(() => {
    const totalCreated = rows.length;
    const totalSent = sentRows.length;
    const viewed = sentRows.filter((r) => r.viewCount > 0).length;
    const replied = sentRows.filter((r) => r.responseStatus !== "none").length;
    const interested = sentRows.filter((r) =>
      ["interested", "meeting", "signed"].includes(r.responseStatus),
    ).length;
    const meetings = sentRows.filter((r) =>
      ["meeting", "signed"].includes(r.responseStatus),
    ).length;
    const signed = sentRows.filter((r) => r.responseStatus === "signed").length;
    const totalViews = sentRows.reduce((sum, r) => sum + r.viewCount, 0);
    return { totalCreated, totalSent, viewed, replied, interested, meetings, signed, totalViews };
  }, [rows, sentRows]);

  const visible = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "sent" && !sentRows.includes(r)) return false;
      if (filter === "viewed" && r.viewCount === 0) return false;
      if (RESPONSE_ORDER.includes(filter as AnalyticsResponseStatus) && r.responseStatus !== filter) return false;
      if (!ql) return true;
      return (
        r.label.toLowerCase().includes(ql) ||
        (r.sub || "").toLowerCase().includes(ql)
      );
    });
  }, [rows, sentRows, q, filter]);

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

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.label}</div>
            <div className="text-xl font-semibold text-[#cbb96b]">{t.value}</div>
            {t.sub && <div className="text-[10px] text-muted-foreground mt-0.5">{t.sub}</div>}
          </div>
        ))}
      </div>

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