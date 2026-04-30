import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, ChevronDown, ChevronRight, RefreshCw, MapPin } from "lucide-react";
import { format } from "date-fns";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface VisitorRow {
  id: string;
  visitor_id: string | null;
  position: string | null;
  dob: string | null;
  age_group: string | null;
  country_code: string | null;
  language: string | null;
  user_agent: string | null;
  referrer: string | null;
  created_at: string;
  updated_at: string;
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
  const [rows, setRows] = useState<VisitorRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("representation_visitors")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(500);
    if (!error && data) setRows(data as VisitorRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (open && rows.length === 0) fetchRows();
  }, [open]);

  const withEntries = rows.filter((r) => r.position || r.dob || r.country_code);

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
          ) : withEntries.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">
              No visitor entries yet
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">When</TableHead>
                    <TableHead className="text-xs">Country</TableHead>
                    <TableHead className="text-xs">Position</TableHead>
                    <TableHead className="text-xs">Date of Birth</TableHead>
                    <TableHead className="text-xs">Age</TableHead>
                    <TableHead className="text-xs">Lang</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withEntries.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(r.updated_at), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.country_code ? (
                          <span className="inline-flex items-center gap-1.5">
                            <img
                              src={flagFor(r.country_code) || ""}
                              alt={r.country_code}
                              className="w-4 h-3 object-cover rounded-sm"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                            />
                            <span className="font-mono">{r.country_code}</span>
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