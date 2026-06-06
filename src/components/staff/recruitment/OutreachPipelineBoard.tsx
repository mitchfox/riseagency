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
import { ChevronLeft, ChevronRight, Clock, MoreVertical, Search } from "lucide-react";
import { OutreachInteractionDrawer, type OutreachType } from "./OutreachInteractionDrawer";
import { toast } from "sonner";
import { FitScoreBadge } from "./FitScoreBadge";
import { CreateOfferButton } from "./CreateOfferButton";
import { TemplatePickerInline } from "./TemplatePickerInline";
import { StarToggle } from "./StarToggle";
import { normalisePosition } from "@/lib/positionNormalise";
import {
  DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable,
} from "@dnd-kit/core";

interface Row {
  id: string;
  player_name: string;
  position: string | null;
  current_club: string | null;
  age: number | null;
  nationality?: string | null;
  date_of_birth?: string | null;
  messaged: boolean | null;
  response_received: boolean | null;
  response_status: string;
  last_contact_at: string | null;
  next_followup_at: string | null;
  first_response_at: string | null;
  parent_approval?: boolean | null;
  fit_score?: number | null;
  fit_score_breakdown?: any;
  is_starred?: boolean | null;
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

const PAGE_SIZE = 50;

// Map a stage id to the response_status / messaged combo to apply when dropped there.
const stageToPatch = (stageId: string): any => {
  switch (stageId) {
    case "not_contacted":  return { response_status: "none",          messaged: false };
    case "awaiting_reply": return { response_status: "none",          messaged: true };
    case "replied":        return { response_status: "replied",       messaged: true, response_received: true };
    case "interested":     return { response_status: "interested",    messaged: true, response_received: true };
    case "decision_pending": return {}; // no direct status mapping; keep as-is
    case "signed":         return { response_status: "signed",        messaged: true, response_received: true };
    case "lost":           return { response_status: "lost",          messaged: true };
    default: return {};
  }
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
  const [stagePages, setStagePages] = useState<Record<string, number>>({});
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const table = type === "youth" ? "player_outreach_youth" : "player_outreach_pro";

  const load = async () => {
    setLoading(true);
    const baseCols = "id,player_name,position,current_club,age,nationality,date_of_birth,response_status,last_contact_at,next_followup_at,first_response_at,messaged,response_received,fit_score,fit_score_breakdown,is_starred,national_team,star_of_team,previous_serious_injury,agent_name,agent_status";
    const cols = type === "youth" ? `${baseCols},parent_approval` : baseCols;
    const { data, error } = await supabase
      .from(table)
      .select(cols)
      .order("updated_at", { ascending: false })
      .limit(500);
    if (error) toast.error("Failed to load pipeline", { description: error.message });
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [type]);
  useEffect(() => { setStagePages({}); }, [query, type]);

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
    // Not contacted shows starred-only — players we actually want to contact
    map.not_contacted = (map.not_contacted || []).filter(r => !!r.is_starred);
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

  const moveToStage = async (rowId: string, stageId: string) => {
    const patch = stageToPatch(stageId);
    if (Object.keys(patch).length === 0) return;
    // Optimistic
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, ...patch } : r));
    const { error } = await (supabase.from(table) as any).update(patch).eq("id", rowId);
    if (error) { toast.error("Move failed"); load(); }
  };

  const onDragEnd = (e: DragEndEvent) => {
    const targetStage = e.over?.id as string | undefined;
    const rowId = e.active.id as string | undefined;
    if (!targetStage || !rowId) return;
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    if (stageOf(row) === targetStage) return;
    moveToStage(rowId, targetStage);
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
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-3">
          {STAGES.map(stage => {
            const allItems = byStage[stage.id] || [];
            const page = stagePages[stage.id] || 0;
            const totalPages = Math.max(1, Math.ceil(allItems.length / PAGE_SIZE));
            const items = allItems.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
            const setPage = (next: number) =>
              setStagePages(prev => ({ ...prev, [stage.id]: Math.max(0, Math.min(totalPages - 1, next)) }));
            return (
              <StageDroppable key={stage.id} stageId={stage.id} className={`rounded-lg border border-border p-2 ${stage.tone} min-h-[180px] flex flex-col`}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="text-xs font-semibold uppercase tracking-wide">{stage.label}</div>
                  <Badge variant="outline" className="text-[10px]">{allItems.length}</Badge>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between gap-1 mb-2 px-1">
                    <Button size="icon" variant="ghost" className="h-6 w-6" disabled={page === 0} onClick={() => setPage(page - 1)}>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-[10px] text-muted-foreground">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, allItems.length)} of {allItems.length}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                <div className="space-y-2 flex-1">
                  {allItems.length === 0 && (
                    <div className="text-[11px] text-muted-foreground italic px-1">
                      {stage.id === "not_contacted" ? "Star players in the table to queue them here." : "None"}
                    </div>
                  )}
                  {items.map(r => (
                    <DraggableCard
                      key={r.id}
                      rowId={r.id}
                      onOpen={() => { setActiveRow(r); setDrawerOpen(true); }}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate flex items-center gap-1.5">
                            <StarToggle id={r.id} table={table as any} initial={!!r.is_starred} size={14}
                              onChange={next => setRows(prev => prev.map(x => x.id === r.id ? { ...x, is_starred: next } : x))}
                            />
                            <span className="truncate">{r.player_name}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {[normalisePosition(r.position) || null, r.age ? `${r.age}y` : null, r.current_club].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <FitScoreBadge
                            player={{
                              position: r.position,
                              age: r.age,
                              date_of_birth: r.date_of_birth,
                              nationality: r.nationality,
                              current_club: r.current_club,
                              messaged: r.messaged,
                              response_received: r.response_received,
                              response_status: r.response_status,
                              parent_approval: r.parent_approval,
                            }}
                            scope={type}
                            cachedScore={r.fit_score ?? null}
                            cachedBreakdown={r.fit_score_breakdown}
                          />
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
                      {/* Offer + template only on starred rows (i.e. players we actually want to contact) */}
                      {r.is_starred && (
                        <div className="mt-2 flex items-center gap-1 flex-wrap" onClick={e => e.stopPropagation()}>
                          <TemplatePickerInline
                            compact
                            playerName={r.player_name}
                            position={r.position}
                            club={r.current_club}
                            age={r.age}
                            scope={type}
                            preferredTargetId={(r.fit_score_breakdown as any)?.target_id ?? null}
                          />
                          <CreateOfferButton
                            source={{
                              name: r.player_name,
                              position: r.position,
                              nationality: r.nationality,
                              club: r.current_club,
                              date_of_birth: r.date_of_birth,
                              age: r.age,
                            }}
                            label="Offer link"
                          />
                        </div>
                      )}
                    </DraggableCard>
                  ))}
                </div>
              </StageDroppable>
            );
          })}
        </div>
        </DndContext>
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

// --- DnD wrappers ---

const StageDroppable = ({ stageId, className, children }: { stageId: string; className: string; children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id: stageId });
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? "ring-2 ring-primary/60" : ""}`}>
      {children}
    </div>
  );
};

const DraggableCard = ({ rowId, onOpen, children }: { rowId: string; onOpen: () => void; children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: rowId });
  const style: React.CSSProperties = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : {};
  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => { if (!isDragging) onOpen(); }}
      className={`p-2.5 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors ${isDragging ? "opacity-70 shadow-lg" : ""}`}
    >
      {children}
    </Card>
  );
};