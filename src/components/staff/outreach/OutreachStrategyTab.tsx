import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChevronRight, ChevronDown, Search, Wand2, Save } from "lucide-react";

interface PlayerLite { id: string; name: string; image_url: string | null; position: string | null; representation_status: string | null; }
interface ClubLite { id: string; club_name: string; country: string | null; league: string | null; league_level: string | null; image_url: string | null; }
interface StrategyRow {
  id: string;
  name: string;
  player_ids: string[];
  filters: any;
  defaults: any;
  created_at: string;
}

interface Props {
  players: PlayerLite[];
  onDraftsCreated: () => void;
}

const makeShortId = () => {
  const c = "abcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += c[Math.floor(Math.random() * c.length)];
  return out;
};

export default function OutreachStrategyTab({ players, onDraftsCreated }: Props) {
  const [clubs, setClubs] = useState<ClubLite[]>([]);
  const [strategies, setStrategies] = useState<StrategyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [filterCountry, setFilterCountry] = useState("");
  const [filterLeague, setFilterLeague] = useState("");
  const [filterLeagueLevel, setFilterLeagueLevel] = useState("");
  const [filterClubName, setFilterClubName] = useState("");
  const [positionNotes, setPositionNotes] = useState("");
  const [defaultFit, setDefaultFit] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showInNumbers, setShowInNumbers] = useState(false);
  const [showSeasonStats, setShowSeasonStats] = useState(false);
  const [showStrengths, setShowStrengths] = useState(false);

  const [pickerQuery, setPickerQuery] = useState("");
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);
  const [expandedLeague, setExpandedLeague] = useState<string | null>(null);
  const [selectedClubIds, setSelectedClubIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: clubRows }, { data: stratRows }] = await Promise.all([
        supabase.from("club_map_positions").select("id, club_name, country, league, league_level, image_url").order("club_name"),
        (supabase as any).from("club_outreach_strategies").select("*").order("created_at", { ascending: false }),
      ]);
      setClubs((clubRows ?? []) as ClubLite[]);
      setStrategies((stratRows ?? []) as StrategyRow[]);
      setLoading(false);
    })();
  }, []);

  const filteredClubs = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return clubs.filter((c) => {
      if (filterCountry && (c.country ?? "").toLowerCase() !== filterCountry.toLowerCase()) return false;
      if (filterLeague && (c.league ?? "").toLowerCase() !== filterLeague.toLowerCase()) return false;
      if (filterLeagueLevel && (c.league_level ?? "").toLowerCase() !== filterLeagueLevel.toLowerCase()) return false;
      if (filterClubName && !c.club_name.toLowerCase().includes(filterClubName.toLowerCase())) return false;
      if (q && !c.club_name.toLowerCase().includes(q) && !(c.country ?? "").toLowerCase().includes(q) && !(c.league ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [clubs, pickerQuery, filterCountry, filterLeague, filterLeagueLevel, filterClubName]);

  const tree = useMemo(() => {
    const byCountry = new Map<string, Map<string, ClubLite[]>>();
    for (const c of filteredClubs) {
      const country = c.country?.trim() || "Unknown country";
      const league = c.league?.trim() || "Unknown league";
      if (!byCountry.has(country)) byCountry.set(country, new Map());
      const leagues = byCountry.get(country)!;
      if (!leagues.has(league)) leagues.set(league, []);
      leagues.get(league)!.push(c);
    }
    return Array.from(byCountry.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([country, leagues]) => ({
        country,
        leagues: Array.from(leagues.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([league, list]) => ({ league, clubs: list })),
      }));
  }, [filteredClubs]);

  const togglePlayer = (id: string) =>
    setSelectedPlayerIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  const toggleClub = (id: string) =>
    setSelectedClubIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const selectAllInLeague = (clubIds: string[]) => {
    setSelectedClubIds((prev) => {
      const n = new Set(prev);
      const allIn = clubIds.every((id) => n.has(id));
      if (allIn) clubIds.forEach((id) => n.delete(id));
      else clubIds.forEach((id) => n.add(id));
      return n;
    });
  };

  const saveStrategy = async (): Promise<string | null> => {
    if (!name.trim()) {
      toast.error("Strategy name required");
      return null;
    }
    const { data: u } = await supabase.auth.getUser();
    const payload = {
      name: name.trim(),
      player_ids: selectedPlayerIds,
      filters: {
        country: filterCountry || null,
        league: filterLeague || null,
        league_level: filterLeagueLevel || null,
        club_name: filterClubName || null,
        position_notes: positionNotes || null,
      },
      defaults: {
        fit_recommendation: defaultFit || null,
        show_form: showForm,
        show_in_numbers: showInNumbers,
        show_season_stats: showSeasonStats,
        show_strengths: showStrengths,
      },
      created_by: u.user?.id ?? null,
    };
    const { data, error } = await (supabase as any)
      .from("club_outreach_strategies")
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      toast.error(error.message);
      return null;
    }
    setStrategies((prev) => [data as StrategyRow, ...prev]);
    toast.success("Strategy saved");
    return data.id as string;
  };

  const loadStrategy = (s: StrategyRow) => {
    setName(s.name);
    setSelectedPlayerIds(s.player_ids ?? []);
    setFilterCountry(s.filters?.country ?? "");
    setFilterLeague(s.filters?.league ?? "");
    setFilterLeagueLevel(s.filters?.league_level ?? "");
    setFilterClubName(s.filters?.club_name ?? "");
    setPositionNotes(s.filters?.position_notes ?? "");
    setDefaultFit(s.defaults?.fit_recommendation ?? "");
    setShowForm(!!s.defaults?.show_form);
    setShowInNumbers(!!s.defaults?.show_in_numbers);
    setShowSeasonStats(!!s.defaults?.show_season_stats);
    setShowStrengths(!!s.defaults?.show_strengths);
    toast.success(`Loaded strategy: ${s.name}`);
  };

  const generateDrafts = async () => {
    if (selectedPlayerIds.length === 0) return toast.error("Select at least one player");
    if (selectedClubIds.size === 0) return toast.error("Select at least one club");
    setCreating(true);
    try {
      // Save (or reuse) the strategy so the drafts can be traced back.
      let strategyId: string | null = null;
      if (name.trim()) strategyId = await saveStrategy();

      const { data: u } = await supabase.auth.getUser();
      const clubById = new Map(clubs.map((c) => [c.id, c]));
      let created = 0;
      let failed = 0;

      for (const clubId of selectedClubIds) {
        const club = clubById.get(clubId);
        if (!club) continue;
        let inserted = false;
        let linkId: string | null = null;
        for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
          const short = makeShortId();
          const { data, error } = await supabase
            .from("club_outreach_links")
            .insert({
              short_id: short,
              target_type: "club",
              club_id: clubId,
              player_id: selectedPlayerIds[0] ?? null,
              fit_recommendation: defaultFit || null,
              show_form: showForm,
              show_in_numbers: showInNumbers,
              show_season_stats: showSeasonStats,
              show_strengths: showStrengths,
              status: "draft",
              language: "en",
              created_by: u.user?.id ?? null,
              is_pending_strategy_draft: true,
              strategy_id: strategyId,
            } as any)
            .select("id")
            .single();
          if (!error && data) {
            linkId = data.id as string;
            inserted = true;
            break;
          }
          if ((error as any)?.code !== "23505") {
            console.error("draft insert failed", error);
            break;
          }
        }
        if (!inserted || !linkId) {
          failed += 1;
          continue;
        }
        const rows = selectedPlayerIds.map((pid, i) => ({
          link_id: linkId!,
          player_id: pid,
          position_slot: null,
          fit_recommendation: defaultFit || null,
          sort_order: i,
        }));
        if (rows.length) {
          const { error: lpErr } = await supabase.from("club_outreach_link_players").insert(rows);
          if (lpErr) console.error("link players insert failed", lpErr);
        }
        created += 1;
      }
      toast.success(`${created} draft${created === 1 ? "" : "s"} created${failed ? ` · ${failed} failed` : ""}`);
      setSelectedClubIds(new Set());
      onDraftsCreated();
    } finally {
      setCreating(false);
    }
  };

  const visiblePlayers = useMemo(() => {
    const q = playerSearch.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) => p.name.toLowerCase().includes(q));
  }, [players, playerSearch]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading strategy data…</div>;

  return (
    <div className="space-y-6">
      {/* Saved strategies row */}
      {strategies.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-2 text-white">Saved strategies</h3>
          <div className="flex flex-wrap gap-2">
            {strategies.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => loadStrategy(s)}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#cbb96b]/40 bg-[#cbb96b]/10 px-3 py-1 text-xs font-medium text-[#cbb96b] hover:bg-[#cbb96b]/20"
              >
                {s.name}
                <span className="text-[10px] text-muted-foreground">{(s.player_ids?.length ?? 0)}p</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left: strategy form */}
        <div className="space-y-4 rounded-xl border border-border bg-card p-3 sm:p-5">
          <h3 className="text-base font-semibold text-white">Outreach Strategy</h3>

          <div>
            <Label className="text-xs">Strategy name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Czech 2nd league CFs" />
          </div>

          <div>
            <Label className="text-xs">Players to feature</Label>
            <div className="mt-1 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                placeholder="Search player"
                className="pl-8 h-8 text-xs"
              />
            </div>
            <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-border bg-background/40 p-2 space-y-1">
              {visiblePlayers.map((p) => {
                const checked = selectedPlayerIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 text-xs px-1.5 py-1 rounded hover:bg-muted/40 cursor-pointer"
                  >
                    <Checkbox checked={checked} onCheckedChange={() => togglePlayer(p.id)} />
                    <span className="truncate">{p.name}</span>
                    {p.position && <span className="text-[10px] text-muted-foreground">{p.position}</span>}
                  </label>
                );
              })}
              {visiblePlayers.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-3">No players match.</p>
              )}
            </div>
            {selectedPlayerIds.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">{selectedPlayerIds.length} player(s) selected</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Country</Label>
              <Input value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)} placeholder="e.g. Germany" />
            </div>
            <div>
              <Label className="text-xs">League</Label>
              <Input value={filterLeague} onChange={(e) => setFilterLeague(e.target.value)} placeholder="e.g. 3. Liga" />
            </div>
            <div>
              <Label className="text-xs">League level</Label>
              <Input value={filterLeagueLevel} onChange={(e) => setFilterLeagueLevel(e.target.value)} placeholder="e.g. Tier 3" />
            </div>
            <div>
              <Label className="text-xs">Club name contains</Label>
              <Input value={filterClubName} onChange={(e) => setFilterClubName(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="text-xs">Position / fit notes</Label>
            <Textarea
              value={positionNotes}
              onChange={(e) => setPositionNotes(e.target.value)}
              placeholder="Notes about the kind of fit you're going after. Used as guidance, not pasted into outreach."
              rows={2}
            />
          </div>

          <div className="pt-2 border-t border-border/60 space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Auto-fill defaults for every draft</Label>
            <Textarea
              value={defaultFit}
              onChange={(e) => setDefaultFit(e.target.value)}
              placeholder="Default fit & recommendation copy."
              rows={3}
            />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2">
                <Checkbox checked={showForm} onCheckedChange={(v) => setShowForm(!!v)} /> Show form
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={showInNumbers} onCheckedChange={(v) => setShowInNumbers(!!v)} /> Show in numbers
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={showSeasonStats} onCheckedChange={(v) => setShowSeasonStats(!!v)} /> Show season stats
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={showStrengths} onCheckedChange={(v) => setShowStrengths(!!v)} /> Show strengths
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={saveStrategy} className="w-full sm:w-auto">
              <Save className="h-4 w-4 mr-1.5" /> Save strategy
            </Button>
          </div>
        </div>

        {/* Right: club picker */}
        <div className="space-y-3 rounded-xl border border-border bg-card p-3 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-white">Bulk club picker</h3>
            <Badge variant="secondary">{selectedClubIds.size} selected</Badge>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              placeholder="Search clubs"
              className="pl-8 h-9"
            />
          </div>

          <div className="max-h-[20rem] sm:max-h-[28rem] overflow-y-auto border border-border rounded-md bg-background/40">
            {tree.length === 0 && (
              <p className="text-xs text-muted-foreground p-4">No clubs match. Add a league on clubs in the network to organise them better.</p>
            )}
            {tree.map(({ country, leagues }) => {
              const open = expandedCountry === country;
              const total = leagues.reduce((s, l) => s + l.clubs.length, 0);
              return (
                <div key={country} className="border-b border-border/60 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setExpandedCountry(open ? null : country)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-white hover:bg-muted/40"
                  >
                    <span className="flex items-center gap-2">
                      {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      {country}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{total} clubs</span>
                  </button>
                  {open && (
                    <div className="bg-muted/10">
                      {leagues.map(({ league, clubs: list }) => {
                        const leagueKey = `${country}::${league}`;
                        const lopen = expandedLeague === leagueKey;
                        const ids = list.map((c) => c.id);
                        const allChecked = ids.every((id) => selectedClubIds.has(id));
                        return (
                          <div key={leagueKey} className="border-t border-border/40 first:border-t-0">
                            <div className="flex items-center gap-2 px-4 py-1.5">
                              <button
                                type="button"
                                onClick={() => setExpandedLeague(lopen ? null : leagueKey)}
                                className="flex items-center gap-1.5 flex-1 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
                              >
                                {lopen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                {league}
                                <span className="text-[10px] text-muted-foreground">({list.length})</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => selectAllInLeague(ids)}
                                className="text-[10px] uppercase tracking-wider text-[#cbb96b] hover:underline"
                              >
                                {allChecked ? "Clear" : "Select all"}
                              </button>
                            </div>
                            {lopen && (
                              <div className="px-5 pb-2 space-y-1">
                                {list.map((c) => (
                                  <label
                                    key={c.id}
                                    className="flex items-center gap-2 text-xs py-1 rounded hover:bg-muted/40 cursor-pointer"
                                  >
                                    <Checkbox
                                      checked={selectedClubIds.has(c.id)}
                                      onCheckedChange={() => toggleClub(c.id)}
                                    />
                                    {c.image_url ? (
                                      <img src={c.image_url} alt={c.club_name} className="h-4 w-4 object-contain" />
                                    ) : (
                                      <span className="h-4 w-4 inline-block rounded-sm bg-muted" />
                                    )}
                                    <span className="truncate">{c.club_name}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Button
            onClick={generateDrafts}
            disabled={creating || selectedClubIds.size === 0 || selectedPlayerIds.length === 0}
            className="w-full bg-[#cbb96b] text-black hover:bg-[#cbb96b]/90"
          >
            <Wand2 className="h-4 w-4 mr-2" />
            {creating
              ? "Creating drafts…"
              : `Confirm — create ${selectedClubIds.size} draft${selectedClubIds.size === 1 ? "" : "s"}`}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Drafts appear under the Outreach tab in the Drafts column with a brown shade and a question mark — approve with the green tick or reject with the red cross.
          </p>
        </div>
      </div>
    </div>
  );
}