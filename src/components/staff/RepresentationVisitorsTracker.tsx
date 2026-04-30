import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, ChevronDown, ChevronRight, RefreshCw, MapPin } from "lucide-react";
import { format } from "date-fns";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface DetailsRow {
  visitor_id: string | null;
  position: string | null;
  dob: string | null;
  age_group: string | null;
  language: string | null;
  country_code: string | null;
  updated_at: string;
}

interface VisitRow {
  id: string;
  visitor_id: string;
  page_path: string;
  location: any;
  created_at: string;
}

interface MergedRow {
  id: string;
  visitor_id: string;
  visited_at: string;
  city: string | null;
  country: string | null;
  country_code: string | null;
  ip: string | null;
  position: string | null;
  dob: string | null;
  age_group: string | null;
  language: string | null;
  details_updated_at: string | null;
}

const calcAge = (iso: string | null): string => {
  if (!iso) return "—";
  const dob = new Date(iso);
  if (isNaN(dob.getTime())) return "—";
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return String(age);
};

const flagFor = (cc: string | null) => {
  if (!cc) return null;
  return `/flags/${cc.toLowerCase()}.svg`;
};

export const RepresentationVisitorsTracker = () => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<MergedRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    try {
      // 1. All page visits to the representation flow (any language route).
      const { data: visits } = await supabase
        .from("site_visits")
        .select("id, visitor_id, page_path, location, created_at")
        .or(
          [
            "page_path.ilike.%/representation%",
            "page_path.ilike.%/representacion%",
            "page_path.ilike.%/representacao%",
            "page_path.ilike.%/vertretung%",
            "page_path.ilike.%/rappresentanza%",
            "page_path.ilike.%/reprezentacja%",
            "page_path.ilike.%/zastoupeni%",
            "page_path.ilike.%/predstavitelstvo%",
            "page_path.ilike.%/temsil%",
            "page_path.ilike.%/request-representation%",
          ].join(",")
        )
        .order("created_at", { ascending: false })
        .limit(500);

      // 2. All recorded representation details (DOB / position / age / language).
      const { data: details } = await supabase
        .from("representation_visitors")
        .select("visitor_id, position, dob, age_group, language, country_code, updated_at")
        .order("updated_at", { ascending: false })
        .limit(1000);

      const detailsByVisitor = new Map<string, DetailsRow>();
      (details || []).forEach((d: any) => {
        if (!d.visitor_id) return;
        // Keep the most recent (already ordered desc).
        if (!detailsByVisitor.has(d.visitor_id)) detailsByVisitor.set(d.visitor_id, d);
      });

      // 3. Keep one row per visitor (their most recent representation visit).
      const seen = new Set<string>();
      const merged: MergedRow[] = [];
      (visits || []).forEach((v: VisitRow) => {
        if (!v.visitor_id || seen.has(v.visitor_id)) return;
        seen.add(v.visitor_id);
        const det = detailsByVisitor.get(v.visitor_id) || null;
        const loc = v.location || {};
        merged.push({
          id: v.id,
          visitor_id: v.visitor_id,
          visited_at: v.created_at,
          city: loc.city ?? null,
          country: loc.country ?? null,
          country_code: det?.country_code ?? null,
          ip: loc.ip ?? null,
          position: det?.position ?? null,
          dob: det?.dob ?? null,
          age_group: det?.age_group ?? null,
          language: det?.language ?? null,
          details_updated_at: det?.updated_at ?? null,
        });
      });

      setRows(merged);
    } catch (err) {
      console.warn("[rep-visitors] fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && rows.length === 0) fetchRows();
  }, [open]);

  // Show every representation-page visitor — even before they enter
  // anything — so staff can at least see their location immediately.
  const allRows = rows;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-border bg-card/40">
      <CollapsibleTrigger asChild>
        <button
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-card/70 transition-colors rounded-lg"
        >
          <div className="flex items-center gap-2">
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Activity className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">Visitor Tracking</span>
            <span className="text-xs text-muted-foreground">
              Date of birth, position and IP country of every visitor on the representation flow
            </span>
          </div>
          <Badge variant="outline" className="text-xs">{rows.length}</Badge>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4 pt-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">
              Logged the moment a visitor selects a position or confirms their date of birth, before they submit the full request.
            </p>
            <Button size="sm" variant="ghost" onClick={fetchRows} disabled={loading} className="gap-2">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {loading && rows.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">Loading visitors…</p>
          ) : allRows.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">
              No visitor entries yet
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">When</TableHead>
                    <TableHead className="text-xs">Location</TableHead>
                    <TableHead className="text-xs">Position</TableHead>
                    <TableHead className="text-xs">Date of Birth</TableHead>
                    <TableHead className="text-xs">Age</TableHead>
                    <TableHead className="text-xs">Lang</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allRows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(r.visited_at), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.city || r.country || r.country_code ? (
                          <span className="inline-flex items-center gap-1.5">
                            {r.country_code && (
                              <img
                                src={flagFor(r.country_code) || ""}
                                alt={r.country_code}
                                className="w-4 h-3 object-cover rounded-sm"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                              />
                            )}
                            <span>
                              {[r.city, r.country].filter(Boolean).join(", ") || r.country_code}
                            </span>
                            {r.ip && (
                              <span className="font-mono text-[10px] text-muted-foreground">{r.ip}</span>
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <MapPin className="w-3 h-3" />—
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-medium">{r.position || "—"}</TableCell>
                      <TableCell className="text-xs">{r.dob ? format(new Date(r.dob), "d MMM yyyy") : "—"}</TableCell>
                      <TableCell className="text-xs">{calcAge(r.dob)}</TableCell>
                      <TableCell className="text-xs uppercase">{r.language || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};