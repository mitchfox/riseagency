import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, Plus, ChevronDown, Users, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const AGE_GROUPS = ["U15", "U17", "U19", "U21", "Senior"] as const;

type Competition = {
  id: string;
  country: string;
  name: string;
  age_group: string;
  level: string | null;
  season: string | null;
  stats_url: string;
  source: string;
  season_active: boolean;
  last_indexed_at: string | null;
};

type PlayerStatRow = {
  id: string;
  player_id: string;
  team_name: string | null;
  appearances: number | null;
  minutes: number | null;
  goals: number | null;
  clean_sheets: number | null;
  season: string | null;
  last_checked_at: string;
  scouting_players: {
    id: string;
    player_name: string;
    player_url: string | null;
    position: string | null;
    last_checked_at: string | null;
  } | null;
};

export const ScoutingPlayersPanel = ({ country }: { country: string }) => {
  const [comps, setComps] = useState<Competition[]>([]);
  const [openComp, setOpenComp] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, PlayerStatRow[]>>({});
  const [loadingComp, setLoadingComp] = useState<string | null>(null);
  const [refreshingPlayer, setRefreshingPlayer] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", age_group: "U19", level: "", season: "2025/26", stats_url: "" });

  const load = async () => {
    const { data } = await supabase
      .from("scouting_competitions")
      .select("*")
      .eq("country", country)
      .order("age_group")
      .order("name");
    setComps((data as Competition[]) || []);
  };

  useEffect(() => { load(); }, [country]);

  const loadStats = async (compId: string) => {
    const { data } = await supabase
      .from("scouting_player_stats")
      .select("id,player_id,team_name,appearances,minutes,goals,clean_sheets,season,last_checked_at,scouting_players(id,player_name,player_url,position,last_checked_at)")
      .eq("competition_id", compId)
      .order("goals", { ascending: false, nullsFirst: false })
      .limit(200);
    setStats((s) => ({ ...s, [compId]: (data as any) || [] }));
  };

  const openCompetition = async (comp: Competition) => {
    setOpenComp(openComp === comp.id ? null : comp.id);
    if (openComp !== comp.id) {
      await loadStats(comp.id);
      const stale = !comp.last_indexed_at || (Date.now() - new Date(comp.last_indexed_at).getTime()) > 12 * 60 * 60 * 1000;
      if (stale) indexCompetition(comp.id, false);
    }
  };

  const indexCompetition = async (compId: string, force: boolean) => {
    setLoadingComp(compId);
    const { data, error } = await supabase.functions.invoke("scouting-index-competition", { body: { competition_id: compId, force } });
    setLoadingComp(null);
    if (error) { toast({ title: "Index failed", description: error.message, variant: "destructive" }); return; }
    if ((data as any)?.players) toast({ title: `Indexed ${(data as any).players} players` });
    await loadStats(compId);
    load();
  };

  const refreshPlayer = async (playerId: string, compId: string) => {
    setRefreshingPlayer(playerId);
    const { error } = await supabase.functions.invoke("scouting-refresh-player", { body: { player_id: playerId, force: true } });
    setRefreshingPlayer(null);
    if (error) { toast({ title: "Refresh failed", description: error.message, variant: "destructive" }); return; }
    await loadStats(compId);
  };

  const addCompetition = async () => {
    if (!draft.name || !draft.stats_url) { toast({ title: "Name and URL required", variant: "destructive" }); return; }
    const { error } = await supabase.from("scouting_competitions").insert({ ...draft, country });
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    setAdding(false);
    setDraft({ name: "", age_group: "U19", level: "", season: "2025/26", stats_url: "" });
    load();
  };

  const removeCompetition = async (id: string) => {
    if (!confirm("Delete competition and all its player stats?")) return;
    await supabase.from("scouting_competitions").delete().eq("id", id);
    load();
  };

  const byAge = AGE_GROUPS.map((a) => ({ age: a, items: comps.filter((c) => c.age_group === a) })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Users className="h-4 w-4 text-[hsl(var(--rise-gold))]" /> Player stats by competition
        </div>
        <Button size="sm" variant="outline" className="border-[hsl(var(--rise-gold)/0.5)]" onClick={() => setAdding((v) => !v)}>
          <Plus className="h-4 w-4 mr-1.5" /> Add competition
        </Button>
      </div>

      {adding && (
        <div className="rounded-lg border border-[hsl(var(--rise-gold)/0.3)] bg-card/60 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Competition name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <Select value={draft.age_group} onValueChange={(v) => setDraft({ ...draft, age_group: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{AGE_GROUPS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Level e.g. 1st tier" value={draft.level} onChange={(e) => setDraft({ ...draft, level: e.target.value })} />
            <Input placeholder="Season 2025/26" value={draft.season} onChange={(e) => setDraft({ ...draft, season: e.target.value })} />
          </div>
          <Input placeholder="Stats URL (Fotbal.cz competition stats page)" value={draft.stats_url} onChange={(e) => setDraft({ ...draft, stats_url: e.target.value })} />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button size="sm" onClick={addCompetition}>Save</Button>
          </div>
        </div>
      )}

      {byAge.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground italic py-4 text-center">No competitions tracked yet. Add one to start indexing players.</p>
      )}

      {byAge.map(({ age, items }) => (
        <div key={age} className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-widest text-[hsl(var(--rise-gold))] font-bold">{age}</div>
          {items.map((comp) => {
            const isOpen = openComp === comp.id;
            const rows = stats[comp.id] || [];
            return (
              <div key={comp.id} className="rounded-lg border border-border/50 bg-background/60 overflow-hidden">
                <button onClick={() => openCompetition(comp)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[hsl(var(--rise-gold)/0.05)]">
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium truncate">{comp.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {comp.season || "—"} · {comp.last_indexed_at ? `Indexed ${formatDistanceToNow(new Date(comp.last_indexed_at))} ago` : "Not indexed"}
                    </div>
                  </div>
                  {loadingComp === comp.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-[hsl(var(--rise-gold))]" />}
                  <button onClick={(e) => { e.stopPropagation(); indexCompetition(comp.id, true); }} className="p-1 rounded hover:bg-muted" title="Re-index">
                    <RefreshCw className="h-3 w-3" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); removeCompetition(comp.id); }} className="p-1 rounded hover:bg-muted text-muted-foreground">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </button>
                {isOpen && (
                  <div className="border-t border-border/40">
                    {rows.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic text-center py-4">No players yet — indexing in background.</p>
                    ) : (
                      <div className="max-h-[400px] overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/40 sticky top-0">
                            <tr className="text-left">
                              <th className="px-3 py-1.5 font-medium">Player</th>
                              <th className="px-2 py-1.5 font-medium">Team</th>
                              <th className="px-2 py-1.5 font-medium text-right">Apps</th>
                              <th className="px-2 py-1.5 font-medium text-right">Min</th>
                              <th className="px-2 py-1.5 font-medium text-right">G</th>
                              <th className="px-2 py-1.5 font-medium text-right">CS</th>
                              <th className="px-2 py-1.5"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r) => (
                              <tr key={r.id} className="border-t border-border/30 hover:bg-[hsl(var(--rise-gold)/0.04)]">
                                <td className="px-3 py-1.5">
                                  {r.scouting_players?.player_url ? (
                                    <a href={r.scouting_players.player_url} target="_blank" rel="noopener noreferrer" className="hover:text-[hsl(var(--rise-gold))]">
                                      {r.scouting_players.player_name}
                                    </a>
                                  ) : r.scouting_players?.player_name}
                                  {r.scouting_players?.position && <span className="ml-1.5 text-[9px] text-muted-foreground uppercase">{r.scouting_players.position}</span>}
                                </td>
                                <td className="px-2 py-1.5 text-muted-foreground truncate max-w-[120px]">{r.team_name || "—"}</td>
                                <td className="px-2 py-1.5 text-right">{r.appearances ?? "—"}</td>
                                <td className="px-2 py-1.5 text-right">{r.minutes ?? "—"}</td>
                                <td className="px-2 py-1.5 text-right">{r.goals ?? "—"}</td>
                                <td className="px-2 py-1.5 text-right">{r.clean_sheets ?? "—"}</td>
                                <td className="px-2 py-1.5 text-right">
                                  <button
                                    onClick={() => refreshPlayer(r.player_id, comp.id)}
                                    className="p-1 rounded hover:bg-muted"
                                    title={r.scouting_players?.last_checked_at ? `Checked ${formatDistanceToNow(new Date(r.scouting_players.last_checked_at))} ago` : "Never refreshed"}
                                  >
                                    {refreshingPlayer === r.player_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default ScoutingPlayersPanel;