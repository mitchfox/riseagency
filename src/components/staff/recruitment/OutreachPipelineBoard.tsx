import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { formatDistanceToNowStrict, parseISO, differenceInCalendarDays } from "date-fns";
import { ChevronLeft, ChevronRight, Clock, MoreVertical, Search, GripVertical, Star, Shield } from "lucide-react";
import { OutreachInteractionDrawer, type OutreachType } from "./OutreachInteractionDrawer";
import { toast } from "sonner";
import { FitScoreBadge } from "./FitScoreBadge";
import { TemplatePickerInline } from "./TemplatePickerInline";
import { StarToggle } from "./StarToggle";
import { normalisePosition } from "@/lib/positionNormalise";
import { InlinePlayerActionsPanel } from "./InlinePlayerActionsPanel";
import { Settings2 } from "lucide-react";
import { getCountryFlagUrl } from "@/lib/countryFlags";
import { computeFitScore } from "@/lib/fitScore";
import { useRecruitmentTargets, useScoringSettings } from "@/hooks/useRecruitmentScoring";
import { useClubMaps } from "@/hooks/useClubMaps";
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
  national_team?: boolean | null;
  star_of_team?: boolean | null;
  previous_serious_injury?: string | null;
  agent_name?: string | null;
  agent_status?: string | null;
}

const STAGES: { id: string; label: string; tone: string; accent: string; dot: string }[] = [
  { id: "not_contacted",   label: "Not contacted",      tone: "bg-muted/30",        accent: "from-muted-foreground/30 to-transparent", dot: "bg-muted-foreground/50" },
  { id: "awaiting_reply",  label: "Awaiting reply",     tone: "bg-blue-500/[0.04]", accent: "from-blue-400/40 to-transparent",        dot: "bg-blue-400" },
  { id: "replied",         label: "Replied — follow up", tone: "bg-primary/[0.06]",  accent: "from-primary/60 to-transparent",         dot: "bg-primary" },
  { id: "interested",      label: "In conversation",    tone: "bg-emerald-500/[0.05]", accent: "from-emerald-400/50 to-transparent",  dot: "bg-emerald-400" },
  { id: "decision_pending",label: "Decision pending",   tone: "bg-amber-500/[0.05]", accent: "from-amber-400/50 to-transparent",      dot: "bg-amber-400" },
  { id: "signed",          label: "Signed",             tone: "bg-emerald-600/[0.10]", accent: "from-emerald-500/70 to-transparent",  dot: "bg-emerald-500" },
  { id: "lost",            label: "Lost / cold",        tone: "bg-red-500/[0.04]",  accent: "from-red-400/40 to-transparent",         dot: "bg-red-400" },
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
  const [actionsRowId, setActionsRowId] = useState<string | null>(null);
  const [stagePages, setStagePages] = useState<Record<string, number>>({});
  const [playerMeta, setPlayerMeta] = useState<Record<string, { image_url: string | null; club_logo: string | null }>>({});
  const [clubLogos, setClubLogos] = useState<Record<string, string>>({});
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
    const loaded = (data as any[]) || [];
    setRows(loaded);
    setLoading(false);

    // Hydrate player photos + club logos from the players table where names match
    const names = Array.from(new Set(loaded.map(r => (r.player_name || "").trim()).filter(Boolean)));
    if (names.length > 0) {
      const { data: pData } = await supabase
        .from("players")
        .select("name,image_url,club_logo")
        .in("name", names);
      const map: Record<string, { image_url: string | null; club_logo: string | null }> = {};
      (pData || []).forEach((p: any) => {
        map[p.name.toLowerCase()] = { image_url: p.image_url, club_logo: p.club_logo };
      });
      setPlayerMeta(map);
    }

    // Hydrate club logos from the coaching database (club_map_positions) by club name.
    const clubs = Array.from(new Set(loaded.map(r => (r.current_club || "").trim()).filter(Boolean)));
    if (clubs.length > 0) {
      const { data: cData } = await (supabase as any)
        .from("club_map_positions")
        .select("club_name,image_url")
        .in("club_name", clubs);
      const cmap: Record<string, string> = {};
      (cData || []).forEach((c: any) => {
        if (c?.club_name && c?.image_url) cmap[c.club_name.toLowerCase()] = c.image_url;
      });
      setClubLogos(cmap);
    }
  };

  useEffect(() => { load(); }, [type]);
  useEffect(() => { setStagePages({}); }, [query, type]);

  const actionsRow = useMemo(
    () => (actionsRowId ? rows.find(r => r.id === actionsRowId) || null : null),
    [actionsRowId, rows]
  );

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
    // Sort every column by AI fit score (best to worst); null scores sink to the bottom.
    Object.keys(map).forEach(stageId => {
      map[stageId].sort((a, b) => {
        const av = typeof a.fit_score === "number" ? a.fit_score : -Infinity;
        const bv = typeof b.fit_score === "number" ? b.fit_score : -Infinity;
        return bv - av;
      });
    });
    return map;
  }, [filtered]);

  if (actionsRow) {
    return (
      <InlinePlayerActionsPanel
        row={actionsRow}
        type={type}
        onBack={() => { setActionsRowId(null); load(); }}
      />
    );
  }

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
    if (days < 0) return <Badge variant="outline" className="overdue-pulse border-primary/70 text-primary bg-primary/10 text-[10px] px-1.5 py-0">Overdue {Math.abs(days)}d</Badge>;
    if (days === 0) return <Badge variant="outline" className="border-primary/70 text-primary bg-primary/10 text-[10px] px-1.5 py-0">Due today</Badge>;
    if (days <= 2) return <Badge variant="outline" className="text-[10px] px-1.5 py-0">Due in {days}d</Badge>;
    return null;
  };

  const initialsOf = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    const first = parts[0][0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  };

  const fitBand = (score: number | null | undefined): string => {
    const s = typeof score === "number" ? score : 0;
    if (s >= 90) return "fit-strip-elite";
    if (s >= 70) return "fit-strip-high";
    if (s >= 50) return "fit-strip-mid";
    return "fit-strip-low";
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
              <StageDroppable
                key={stage.id}
                stageId={stage.id}
                className={`stage-column ${stage.tone}`}
                accent={stage.accent}
              >
                <div className="flex items-center justify-between mb-2 px-1 pt-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${stage.dot} shadow-[0_0_6px_currentColor]`} />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/85 truncate">{stage.label}</span>
                  </div>
                  <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-[10px] font-semibold bg-foreground/[0.06] border border-border/60 text-foreground/80">
                    {allItems.length}
                  </span>
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
                    <div className="rounded-md border border-dashed border-border/60 px-3 py-4 text-[11px] text-muted-foreground italic text-center">
                      {stage.id === "not_contacted" ? "Star players in the table to queue them here." : "Nothing here yet"}
                    </div>
                  )}
                  {items.map((r, idx) => (
                    <DraggableCard
                      key={r.id}
                      rowId={r.id}
                      delay={idx}
                      fitBandClass={fitBand(r.fit_score)}
                      onOpen={() => { setActiveRow(r); setDrawerOpen(true); }}
                    >
                      {(() => {
                        const meta = playerMeta[(r.player_name || "").toLowerCase()] || { image_url: null, club_logo: null };
                        const flag = r.nationality ? getCountryFlagUrl(r.nationality) : null;
                        const clubLogo = meta.club_logo
                          || (r.current_club ? clubLogos[r.current_club.toLowerCase()] : null)
                          || null;
                        return (
                      <>
                      <div className="flex items-start gap-2.5">
                        {meta.image_url ? (
                          <img src={meta.image_url} alt={r.player_name}
                            className="h-10 w-10 rounded-full object-cover object-top border border-primary/40 shrink-0" />
                        ) : (
                          <span className="pipeline-avatar !h-10 !w-10 !text-xs" aria-hidden>{initialsOf(r.player_name)}</span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <StarToggle id={r.id} table={table as any} initial={!!r.is_starred} size={14}
                              onChange={next => setRows(prev => prev.map(x => x.id === r.id ? { ...x, is_starred: next } : x))}
                            />
                            <span className="font-semibold text-sm truncate text-foreground">{r.player_name}</span>
                            {r.national_team && (
                              <Star className="h-3 w-3 text-primary fill-primary shrink-0" aria-label="National team" />
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-1 flex-wrap">
                            {normalisePosition(r.position) && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/25">
                                {normalisePosition(r.position)}
                              </span>
                            )}
                            {r.age && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-foreground/[0.06] text-foreground/75 border border-border/50">
                                {r.age}y
                              </span>
                            )}
                            {flag && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-foreground/[0.06] text-foreground/75 border border-border/50">
                                <img src={flag} alt={r.nationality || ""} className="h-2.5 w-3.5 object-cover rounded-[1px]" />
                                {r.nationality}
                              </span>
                            )}
                          </div>
                          {r.current_club && (
                            <div className="mt-1 flex items-center gap-1.5 min-w-0">
                              {clubLogo ? (
                                <img src={clubLogo} alt="" className="h-3.5 w-3.5 object-contain shrink-0" />
                              ) : (
                                <Shield className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                              )}
                              <span className="text-[11px] text-muted-foreground truncate">{r.current_club}</span>
                            </div>
                          )}
                          {r.agent_status === "top_agency" && r.agent_name && (
                            <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-amber-300/90">
                              <Shield className="h-3 w-3" /> {r.agent_name}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
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
                              national_team: r.national_team,
                              star_of_team: r.star_of_team,
                              previous_serious_injury: r.previous_serious_injury,
                              agent_name: r.agent_name,
                              agent_status: r.agent_status,
                            }}
                            scope={type}
                          />
                          <div className="flex items-center gap-0.5">
                          <GripVertical className="grip-dots h-3.5 w-3.5 text-muted-foreground" aria-hidden />
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
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap pl-[50px]">
                        {r.last_contact_at && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNowStrict(parseISO(r.last_contact_at), { addSuffix: true })}
                          </span>
                        )}
                        {overdueBadge(r)}
                      </div>
                      <div className="mt-2.5 space-y-1.5" onClick={e => e.stopPropagation()}>
                        {r.is_starred && (
                          <div className="pl-[50px]">
                            <TemplatePickerInline
                              compact
                              playerName={r.player_name}
                              position={r.position}
                              club={r.current_club}
                              age={r.age}
                              scope={type}
                              preferredTargetId={(r.fit_score_breakdown as any)?.target_id ?? null}
                            />
                          </div>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          className="w-full h-9 bg-primary/90 hover:bg-primary text-primary-foreground font-semibold tracking-wide shadow-[0_4px_14px_-6px_hsl(var(--primary)/0.55)]"
                          onClick={(e) => { e.stopPropagation(); setActionsRowId(r.id); }}
                        >
                          <Settings2 className="h-4 w-4 mr-1.5" /> Open actions
                        </Button>
                      </div>
                      </>
                        );
                      })()}
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

const StageDroppable = ({ stageId, className, accent, children }: { stageId: string; className: string; accent?: string; children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id: stageId });
  const style: React.CSSProperties = accent
    ? ({ ["--stage-accent" as any]: `linear-gradient(90deg, hsl(var(--primary) / 0.55), transparent)` } as any)
    : {};
  // Map our gradient class hint into the CSS variable so the header strip colour-codes per stage
  const accentToVar: Record<string, string> = {
    "from-muted-foreground/30 to-transparent": "hsl(var(--muted-foreground) / 0.4)",
    "from-blue-400/40 to-transparent":         "hsl(210 90% 65% / 0.55)",
    "from-primary/60 to-transparent":          "hsl(var(--primary) / 0.7)",
    "from-emerald-400/50 to-transparent":      "hsl(150 70% 55% / 0.6)",
    "from-amber-400/50 to-transparent":        "hsl(40 90% 60% / 0.6)",
    "from-emerald-500/70 to-transparent":      "hsl(150 75% 50% / 0.8)",
    "from-red-400/40 to-transparent":          "hsl(0 80% 65% / 0.55)",
  };
  const stageColor = accent ? accentToVar[accent] : undefined;
  const finalStyle: React.CSSProperties = stageColor
    ? ({ ["--stage-accent" as any]: `linear-gradient(90deg, ${stageColor}, transparent)` } as any)
    : style;
  return (
    <div ref={setNodeRef} style={finalStyle} className={`${className} ${isOver ? "is-over" : ""}`}>
      {children}
    </div>
  );
};

const DraggableCard = ({ rowId, onOpen, children, delay = 0, fitBandClass }: { rowId: string; onOpen: () => void; children: React.ReactNode; delay?: number; fitBandClass?: string }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: rowId });
  const style: React.CSSProperties = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50, animationDelay: "0ms" }
    : { animationDelay: `${Math.min(delay, 20) * 25}ms` };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => { if (!isDragging) onOpen(); }}
      className={`pipeline-card p-2.5 pr-3 cursor-grab active:cursor-grabbing ${isDragging ? "opacity-80 shadow-2xl scale-[1.02]" : ""}`}
    >
      {fitBandClass && <span className={`fit-strip ${fitBandClass}`} aria-hidden />}
      {children}
    </div>
  );
};