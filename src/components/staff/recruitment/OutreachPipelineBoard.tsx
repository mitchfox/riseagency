import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { formatDistanceToNowStrict, parseISO, differenceInCalendarDays } from "date-fns";
import { ChevronRight, Clock, MoreVertical, Search } from "lucide-react";
import { OutreachInteractionDrawer, type OutreachType } from "./OutreachInteractionDrawer";
import { toast } from "sonner";

interface Row {
  id: string;
  player_name: string;
  position: string | null;
  current_club: string | null;
  age: number | null;
  response_status: string;
  last_contact_at: string | null;
  next_followup_at: string | null;
  first_response_at: string | null;
  messaged: boolean | null;
  response_received: boolean | null;
}

const STAGES: { id: string; label: string; tone: string }[] = [
  { id: "not_contacted", label: "Not contacted", tone: "bg-muted/40" },
  { id: "awaiting_reply", label: "Awaiting reply", tone: "bg-blue-500/5" },
  { id: "replied", label: "Replied — follow up", tone: "bg-primary/10 border-primary/30" },
  { id: "interested", label: "In conversation", tone: "bg-emerald-500/5" },
  { id: "decision_pending", label: "Decision pending", tone: "bg-amber-500/5" },
  { id: "signed", label: "Signed", tone: "bg-emerald-600/10" },
  { id: "lost", label: "Lost / cold", tone: "bg-red-500/5" },
];

const stageOf = (r: Row): string => {
  if (r.response_status === "signed") return "signed";
  if (r.response_status === "not_interested" || r.response_status === "lost") return "lost";
  if (r.response_status === "interested") return "interested";
  if (r.response_status === "replied") return "replied";
  if (r.messaged) return "awaiting_reply";
  return "not_contacted";
};

const NEXT_STATUS_OPTIONS = [
  { value: "none", label: "Not contacted" },
  { value: "replied", label: "Replied" },
  { value: "interested", label: "Interested" },
  { value: "not_interested", label: "Not interested" },
  { value: "signed", label: "Signed" },
  { value: "lost", label: "Lost" },
];

export const OutreachPipelineBoard = ({ type }: { type: OutreachType }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<Row | null>(null);

  const table = type === "youth" ? "player_outreach_youth" : "player_outreach_pro";

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(table)
      .select("id,player_name,position,current_club,age,response_status,last_contact_at,next_followup_at,first_response_at,messaged,response_received")
      .order("updated_at", { ascending: false })
      .limit(500);
    if (error) toast.error("Failed to load pipeline");
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [type]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.player_name?.toLowerCase().includes(q) ||
      r.current_club?.toLowerCase().includes(q) ||
      r.position?.toLowerCase().includes(q)
    );
  }, [rows, query]);

  const byStage = useMemo(() => {
    const map: Record<string, Row[]> = {};
    STAGES.forEach(s => { map[s.id] = []; });
    filtered.forEach(r => {
      const s = stageOf(r);
      (map[s] || (map[s] = [])).push(r);
    });
    // Sort the "replied" column so overdue/oldest follow-ups appear first
    map.replied.sort((a, b) => {
      const ad = a.next_followup_at || a.first_response_at || a.last_contact_at || "";
      const bd = b.next_followup_at || b.first_response_at || b.last_contact_at || "";
      return ad.localeCompare(bd);
    });
    return map;
  }, [filtered]);

  const updateStatus = async (row: Row, status: string) => {
    const patch: any = { response_status: status };
    if (status === "replied" || status === "interested" || status === "signed") {
      patch.response_received = true;
      if (!row.first_response_at) patch.first_response_at = new Date().toISOString();
    }
    const { error } = await (supabase.from(table) as any).update(patch).eq("id", row.id);
    if (error) { toast.error("Update failed"); return; }
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, response_status: status, response_received: patch.response_received ?? r.response_received, first_response_at: patch.first_response_at ?? r.first_response_at } : r));
  };

  const overdueBadge = (r: Row) => {
    if (!r.next_followup_at) return null;
    const days = differenceInCalendarDays(parseISO(r.next_followup_at), new Date());
    if (days < 0) return <Badge variant="outline" className="border-primary/60 text-primary text-[10px] px-1 py-0">Overdue {Math.abs(days)}d</Badge>;
    if (days === 0) return <Badge variant="outline" className="border-primary/60 text-primary text-[10px] px-1 py-0">Due today</Badge>;
    if (days <= 2) return <Badge variant="outline" className="text-[10px] px-1 py-0">Due in {days}d</Badge>;
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search pipeline…" className="pl-9" />
        </div>
        <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading pipeline…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-3">
          {STAGES.map(stage => {
            const items = byStage[stage.id] || [];
            return (
              <div key={stage.id} className={`rounded-lg border border-border p-2 ${stage.tone} min-h-[180px] flex flex-col`}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="text-xs font-semibold uppercase tracking-wide">{stage.label}</div>
                  <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
                </div>
                <div className="space-y-2 flex-1">
                  {items.length === 0 && <div className="text-[11px] text-muted-foreground italic px-1">None</div>}
                  {items.map(r => (
                    <Card key={r.id} className="p-2.5 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setActiveRow(r); setDrawerOpen(true); }}>
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{r.player_name}</div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {[r.position, r.age ? `${r.age}y` : null, r.current_club].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover">
                            {NEXT_STATUS_OPTIONS.map(opt => (
                              <DropdownMenuItem key={opt.value} onClick={() => updateStatus(r, opt.value)}>
                                <ChevronRight className="h-3.5 w-3.5 mr-2" /> {opt.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {r.last_contact_at && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNowStrict(parseISO(r.last_contact_at), { addSuffix: true })}
                          </span>
                        )}
                        {overdueBadge(r)}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <OutreachInteractionDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        outreachId={activeRow?.id ?? null}
        outreachType={type}
        playerName={activeRow?.player_name}
        onChanged={load}
      />
    </div>
  );
};