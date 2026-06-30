import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Telescope,
  Plus,
  ExternalLink,
  Pencil,
  Trash2,
  Search,
  ChevronDown,
  Database,
  Video,
  Link2,
  BarChart3,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getCountryFlagUrl } from "@/lib/countryFlags";
import { formatDistanceToNow } from "date-fns";

const EUROPEAN_COUNTRIES = [
  "Albania","Andorra","Armenia","Austria","Azerbaijan","Belarus","Belgium",
  "Bosnia and Herzegovina","Bulgaria","Croatia","Cyprus","Czech Republic",
  "Denmark","England","Estonia","Faroe Islands","Finland","France","Georgia",
  "Germany","Gibraltar","Greece","Hungary","Iceland","Ireland","Israel","Italy",
  "Kazakhstan","Kosovo","Latvia","Liechtenstein","Lithuania","Luxembourg",
  "Malta","Moldova","Monaco","Montenegro","Netherlands","North Macedonia",
  "Northern Ireland","Norway","Poland","Portugal","Romania","Russia",
  "San Marino","Scotland","Serbia","Slovakia","Slovenia","Spain","Sweden",
  "Switzerland","Turkey","Ukraine","Wales",
];

const AGE_GROUPS = ["U15", "U17", "U19", "U21", "Senior", "General"] as const;

type LinkRow = {
  id: string;
  country: string;
  age_group: string;
  label: string;
  url: string;
  notes: string | null;
  sort_order: number;
};

type Competition = {
  id: string;
  country: string;
  name: string;
  age_group: string;
  stats_url: string;
  season: string | null;
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
  scouting_players: {
    id: string;
    player_name: string;
    player_url: string | null;
    position: string | null;
    last_checked_at: string | null;
  } | null;
};

const blankDraft = (country: string, age?: string): Partial<LinkRow> => ({
  country,
  age_group: age || "U19",
  label: "",
  url: "",
  notes: "",
  sort_order: 0,
});

const classifyLink = (l: LinkRow): "data" | "video" | "other" => {
  const blob = `${l.label} ${l.notes ?? ""} ${l.url}`.toLowerCase();
  if (/\b(video|tv|fotbaltv|tvcom|veo|stream|highlight|youtube|záznam|zaznam)\b/.test(blob)) return "video";
  if (/\b(stats|statistik|table|tabulka|standings|fixtures|results|profile|player|subjekt|souteze|liga|cup|federation)\b/.test(blob)) return "data";
  return "other";
};

const isFotbalStatsUrl = (url: string) =>
  /fotbal\.cz\/.*(souteze|turnaje|stats|subjekt)/i.test(url);

const LinkPill = ({
  link,
  kind,
  onEdit,
  onRemove,
}: {
  link: LinkRow;
  kind: "data" | "video" | "other";
  onEdit: (l: LinkRow) => void;
  onRemove: (id: string) => void;
}) => {
  const tone =
    kind === "video"
      ? "bg-blue-500/10 text-blue-300 border-blue-500/30 hover:bg-blue-500/20"
      : kind === "data"
      ? "bg-[hsl(var(--rise-gold)/0.10)] text-[hsl(var(--rise-gold))] border-[hsl(var(--rise-gold)/0.30)] hover:bg-[hsl(var(--rise-gold)/0.20)]"
      : "bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-white/5";
  return (
    <div className={`group/pill inline-flex items-center rounded-full border ${tone} pl-2.5 pr-1 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors max-w-full`}>
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 min-w-0"
        title={link.notes || link.url}
      >
        <span className="truncate max-w-[140px] sm:max-w-[220px]">{link.label}</span>
        <ExternalLink className="h-2.5 w-2.5 opacity-60 shrink-0" />
      </a>
      <button
        onClick={() => onEdit(link)}
        className="ml-1 opacity-0 group-hover/pill:opacity-100 transition-opacity p-1 rounded hover:bg-background/50"
        aria-label="Edit"
      >
        <Pencil className="h-3 w-3" />
      </button>
      <button
        onClick={() => onRemove(link.id)}
        className="opacity-0 group-hover/pill:opacity-100 transition-opacity p-1 rounded hover:bg-background/50"
        aria-label="Delete"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
};

const LeagueStats = ({
  country,
  ageGroup,
  leagueName,
  dataLink,
  onClose,
}: {
  country: string;
  ageGroup: string;
  leagueName: string;
  dataLink: LinkRow;
  onClose: () => void;
}) => {
  const [comp, setComp] = useState<Competition | null>(null);
  const [rows, setRows] = useState<PlayerStatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [indexing, setIndexing] = useState(false);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  const ensureComp = useCallback(async () => {
    // Find existing competition matching this stats_url, else create.
    const { data: existing } = await supabase
      .from("scouting_competitions")
      .select("*")
      .eq("stats_url", dataLink.url)
      .maybeSingle();
    if (existing) return existing as Competition;
    const { data: ins, error } = await supabase
      .from("scouting_competitions")
      .insert({
        country,
        name: leagueName,
        age_group: ageGroup,
        stats_url: dataLink.url,
        season: "2025/26",
        source: "fotbal.cz",
      })
      .select("*")
      .single();
    if (error) throw error;
    return ins as Competition;
  }, [country, ageGroup, leagueName, dataLink.url]);

  const loadRows = useCallback(async (compId: string) => {
    const { data } = await supabase
      .from("scouting_player_stats")
      .select("id,player_id,team_name,appearances,minutes,goals,clean_sheets,scouting_players(id,player_name,player_url,position,last_checked_at)")
      .eq("competition_id", compId)
      .order("goals", { ascending: false, nullsFirst: false })
      .limit(200);
    setRows((data as any) || []);
  }, []);

  const indexNow = useCallback(async (compId: string, force: boolean) => {
    setIndexing(true);
    const { data, error } = await supabase.functions.invoke("scouting-index-competition", {
      body: { competition_id: compId, force },
    });
    setIndexing(false);
    if (error) {
      toast({ title: "Index failed", description: error.message, variant: "destructive" });
      return;
    }
    if ((data as any)?.players) toast({ title: `Indexed ${(data as any).players} players` });
    await loadRows(compId);
    const { data: fresh } = await supabase.from("scouting_competitions").select("*").eq("id", compId).maybeSingle();
    if (fresh) setComp(fresh as Competition);
  }, [loadRows]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const c = await ensureComp();
        if (cancelled) return;
        setComp(c);
        await loadRows(c.id);
        const stale = !c.last_indexed_at || (Date.now() - new Date(c.last_indexed_at).getTime()) > 12 * 60 * 60 * 1000;
        if (stale) indexNow(c.id, false);
      } catch (e: any) {
        toast({ title: "Could not load stats", description: e.message, variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ensureComp, loadRows, indexNow]);

  const refreshPlayer = async (playerId: string) => {
    if (!comp) return;
    setRefreshing(playerId);
    const { error } = await supabase.functions.invoke("scouting-refresh-player", { body: { player_id: playerId, force: true } });
    setRefreshing(null);
    if (error) { toast({ title: "Refresh failed", description: error.message, variant: "destructive" }); return; }
    await loadRows(comp.id);
  };

  return (
    <div className="mt-2 rounded-lg border border-[hsl(var(--rise-gold)/0.35)] bg-gradient-to-b from-[hsl(var(--rise-gold)/0.04)] to-transparent p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
          <BarChart3 className="h-3.5 w-3.5 text-[hsl(var(--rise-gold))] shrink-0" />
          <span className="truncate">
            Player stats · {comp?.last_indexed_at ? `Indexed ${formatDistanceToNow(new Date(comp.last_indexed_at))} ago` : indexing ? "Indexing…" : "Not yet indexed"}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {comp && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => indexNow(comp.id, true)} disabled={indexing}>
              {indexing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />} Refresh
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose} aria-label="Close stats">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {loading && !rows.length ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground italic text-center py-4">
          {indexing ? "Indexing players from source…" : "No players parsed yet. Try refresh."}
        </p>
      ) : (
        <div className="max-h-[360px] overflow-auto rounded border border-border/40">
          <table className="w-full text-[11px]">
            <thead className="bg-muted/40 sticky top-0">
              <tr className="text-left">
                <th className="px-2 py-1.5 font-medium">Player</th>
                <th className="px-2 py-1.5 font-medium">Team</th>
                <th className="px-1.5 py-1.5 font-medium text-right">Apps</th>
                <th className="px-1.5 py-1.5 font-medium text-right">Min</th>
                <th className="px-1.5 py-1.5 font-medium text-right">G</th>
                <th className="px-1.5 py-1.5 font-medium text-right">CS</th>
                <th className="px-1.5 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border/30 hover:bg-[hsl(var(--rise-gold)/0.04)]">
                  <td className="px-2 py-1 max-w-[180px]">
                    {r.scouting_players?.player_url ? (
                      <a href={r.scouting_players.player_url} target="_blank" rel="noopener noreferrer" className="hover:text-[hsl(var(--rise-gold))] truncate inline-block max-w-full align-bottom">
                        {r.scouting_players.player_name}
                      </a>
                    ) : (
                      <span className="truncate inline-block max-w-full align-bottom">{r.scouting_players?.player_name}</span>
                    )}
                    {r.scouting_players?.position && <span className="ml-1.5 text-[9px] text-muted-foreground uppercase">{r.scouting_players.position}</span>}
                  </td>
                  <td className="px-2 py-1 text-muted-foreground truncate max-w-[120px]">{r.team_name || "—"}</td>
                  <td className="px-1.5 py-1 text-right">{r.appearances ?? "—"}</td>
                  <td className="px-1.5 py-1 text-right">{r.minutes ?? "—"}</td>
                  <td className="px-1.5 py-1 text-right">{r.goals ?? "—"}</td>
                  <td className="px-1.5 py-1 text-right">{r.clean_sheets ?? "—"}</td>
                  <td className="px-1.5 py-1 text-right">
                    <button
                      onClick={() => refreshPlayer(r.player_id)}
                      className="p-1 rounded hover:bg-muted"
                      title={r.scouting_players?.last_checked_at ? `Checked ${formatDistanceToNow(new Date(r.scouting_players.last_checked_at))} ago` : "Never refreshed"}
                    >
                      {refreshing === r.player_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const InlineLinkEditor = ({
  draft,
  onChange,
  onSave,
  onCancel,
}: {
  draft: Partial<LinkRow>;
  onChange: (d: Partial<LinkRow>) => void;
  onSave: () => void;
  onCancel: () => void;
}) => (
  <div className="rounded-lg border border-[hsl(var(--rise-gold)/0.35)] bg-card/70 p-3 space-y-2">
    <div className="grid grid-cols-2 gap-2">
      <Select value={draft.age_group || "General"} onValueChange={(v) => onChange({ ...draft, age_group: v })}>
        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>{AGE_GROUPS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
      </Select>
      <Input
        className="h-9 text-xs"
        type="number"
        placeholder="Sort"
        value={draft.sort_order ?? 0}
        onChange={(e) => onChange({ ...draft, sort_order: Number(e.target.value) || 0 })}
      />
    </div>
    <Input
      className="h-9 text-xs"
      placeholder="Label e.g. 1.Celostátní liga dorostu U19 — Stats"
      value={draft.label || ""}
      onChange={(e) => onChange({ ...draft, label: e.target.value })}
    />
    <Input
      className="h-9 text-xs"
      placeholder="https://..."
      value={draft.url || ""}
      onChange={(e) => onChange({ ...draft, url: e.target.value })}
    />
    <Textarea
      className="text-xs"
      placeholder="Notes (optional)"
      rows={2}
      value={draft.notes || ""}
      onChange={(e) => onChange({ ...draft, notes: e.target.value })}
    />
    <div className="flex justify-end gap-2">
      <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      <Button size="sm" onClick={onSave}>Save</Button>
    </div>
  </div>
);

export const ScoutingByCountry = () => {
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<LinkRow> | null>(null);
  const [openCountry, setOpenCountry] = useState<string | null>(null);
  const [selectedAge, setSelectedAge] = useState<Record<string, string>>({});
  // Map of leagueKey -> the data link to render stats for
  const [statsOpen, setStatsOpen] = useState<Record<string, LinkRow | null>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("scouting_country_links")
      .select("*")
      .order("country", { ascending: true })
      .order("age_group", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) {
      toast({ title: "Failed to load links", description: error.message, variant: "destructive" });
    } else {
      setLinks((data as LinkRow[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, LinkRow[]>();
    for (const c of EUROPEAN_COUNTRIES) map.set(c, []);
    for (const l of links) {
      if (!map.has(l.country)) map.set(l.country, []);
      map.get(l.country)!.push(l);
    }
    return map;
  }, [links]);

  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = Array.from(grouped.keys()).sort();
    if (!q) return all;
    return all.filter((c) => c.toLowerCase().includes(q));
  }, [grouped, search]);

  const groupCountryLinks = (countryLinks: LinkRow[]) => {
    const byAge = new Map<string, LinkRow[]>();
    for (const l of countryLinks) {
      if (!byAge.has(l.age_group)) byAge.set(l.age_group, []);
      byAge.get(l.age_group)!.push(l);
    }
    const ordered = [...AGE_GROUPS, ...Array.from(byAge.keys()).filter((k) => !AGE_GROUPS.includes(k as any))]
      .filter((age, i, arr) => arr.indexOf(age) === i && byAge.has(age));
    return ordered.map((age) => {
      const items = byAge.get(age)!;
      const leagues = new Map<string, LinkRow[]>();
      for (const l of items) {
        const root = l.label.split(/\(|—|-\s/)[0].trim() || l.label;
        if (!leagues.has(root)) leagues.set(root, []);
        leagues.get(root)!.push(l);
      }
      return {
        age,
        leagues: Array.from(leagues.entries()).map(([name, ls]) => ({ name, links: ls })),
        total: items.length,
      };
    });
  };

  const saveDraft = async () => {
    if (!editing) return;
    const payload = {
      country: editing.country!,
      age_group: editing.age_group || "General",
      label: (editing.label || "").trim(),
      url: (editing.url || "").trim(),
      notes: editing.notes?.trim() || null,
      sort_order: editing.sort_order ?? 0,
    };
    if (!payload.label || !payload.url) {
      toast({ title: "Label and URL required", variant: "destructive" });
      return;
    }
    let error;
    if (editing.id) {
      ({ error } = await supabase.from("scouting_country_links").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("scouting_country_links").insert(payload));
    }
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    setEditing(null);
    load();
  };

  const removeLink = async (id: string) => {
    if (!confirm("Delete this link?")) return;
    const { error } = await supabase.from("scouting_country_links").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const toggleStats = (key: string, link: LinkRow | null) => {
    setStatsOpen((s) => ({ ...s, [key]: s[key] ? null : link }));
  };

  const renderDossier = (country: string) => {
    const countryLinks = grouped.get(country) || [];
    const ageGroups = groupCountryLinks(countryLinks);
    return (
      <div className="relative px-3 sm:px-5 py-4 space-y-3 border-t border-[hsl(var(--rise-gold)/0.25)] bg-gradient-to-b from-[hsl(var(--rise-gold)/0.04)] to-transparent">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {countryLinks.length} resource{countryLinks.length === 1 ? "" : "s"}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] border-[hsl(var(--rise-gold)/0.5)] hover:bg-[hsl(var(--rise-gold)/0.1)]"
              onClick={() => setEditing(blankDraft(country))}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add link
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setOpenCountry(null)}>
              <X className="h-3.5 w-3.5 mr-1" /> Close
            </Button>
          </div>
        </div>

        {editing && editing.country === country && !editing.id && (
          <InlineLinkEditor
            draft={editing}
            onChange={setEditing}
            onSave={saveDraft}
            onCancel={() => setEditing(null)}
          />
        )}

        {countryLinks.length === 0 ? (
          <p className="text-xs text-muted-foreground italic text-center py-6">
            No links yet for {country}. Use Add link above.
          </p>
        ) : (
          <>
            {/* Age group selector — glossy 4-col tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {ageGroups.map(({ age, total, leagues }) => {
                const active = (selectedAge[country] ?? ageGroups[0]?.age) === age;
                return (
                  <button
                    key={age}
                    onClick={() => setSelectedAge((s) => ({ ...s, [country]: age }))}
                    className="relative group"
                  >
                    {active && (
                      <div className="absolute -inset-1 bg-[hsl(var(--rise-gold))] opacity-30 group-hover:opacity-50 rounded-xl blur-md transition" />
                    )}
                    <div className={`relative flex items-center justify-center py-4 sm:py-5 rounded-lg shadow-inner transition-colors ${
                      active
                        ? "bg-gradient-to-b from-zinc-900 to-black border border-[hsl(var(--rise-gold))]"
                        : "bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700"
                    }`}>
                      <span className={`font-black tracking-tight ${active ? "text-[hsl(var(--rise-gold))] text-2xl sm:text-3xl drop-shadow-[0_0_8px_hsl(var(--rise-gold)/0.6)]" : "text-zinc-300 text-xl sm:text-2xl"}`}>{age}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* League rows for selected age */}
            <div className="space-y-3">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-1">Active Competitions</div>
              {(() => {
                const activeAge = selectedAge[country] ?? ageGroups[0]?.age;
                const ageBlock = ageGroups.find((a) => a.age === activeAge) ?? ageGroups[0];
                if (!ageBlock) return null;
                return ageBlock.leagues.map((league) => {
                      const dataLinks = league.links.filter((l) => classifyLink(l) === "data");
                      const videoLinks = league.links.filter((l) => classifyLink(l) === "video");
                      const otherLinks = league.links.filter((l) => classifyLink(l) === "other");
                      const statsCandidate = dataLinks.find((l) => isFotbalStatsUrl(l.url));
                      const leagueKey = `${country}:${ageBlock.age}:${league.name}`;
                      const statsLink = statsOpen[leagueKey];
                      return (
                        <div key={league.name} className="group relative rounded-xl bg-gradient-to-br from-zinc-900/60 to-zinc-900/20 border border-zinc-800/60 hover:border-[hsl(var(--rise-gold)/0.4)] hover:shadow-[0_0_24px_-8px_hsl(var(--rise-gold)/0.5)] transition-all p-3 sm:p-4">
                          {/* League title bar */}
                          <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-zinc-800/70">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img src={getCountryFlagUrl(country)} alt="" className="w-6 h-4 object-cover rounded-sm ring-1 ring-[hsl(var(--rise-gold)/0.4)] shrink-0" />
                              <div className="min-w-0">
                                <h4 className="text-base sm:text-lg font-bold text-white tracking-tight truncate drop-shadow-[0_0_8px_hsl(var(--rise-gold)/0.25)]">{league.name}</h4>
                                <span className="text-[10px] text-[hsl(var(--rise-gold))] uppercase tracking-[0.18em] font-semibold">
                                  {ageBlock.age === "General" ? "General" : ageBlock.age}
                                </span>
                              </div>
                            </div>
                            {statsCandidate && (
                              <button
                                onClick={() => toggleStats(leagueKey, statsCandidate)}
                                className={`shrink-0 px-3 sm:px-4 py-2 text-[11px] font-bold uppercase tracking-widest rounded-md transition-all ${
                                  statsLink
                                    ? "bg-[hsl(var(--rise-gold))] text-black hover:bg-[hsl(var(--rise-gold)/0.85)] shadow-[0_0_16px_-2px_hsl(var(--rise-gold)/0.6)]"
                                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-[hsl(var(--rise-gold)/0.3)]"
                                }`}
                              >
                                <BarChart3 className="h-3 w-3 inline mr-1 -mt-0.5" /> {statsLink ? "Hide" : "Stats"}
                              </button>
                            )}
                          </div>

                          {/* Separated rows for Data / Video / Other */}
                          <div className="space-y-2">
                            {dataLinks.length > 0 && (
                              <div className="flex items-start gap-2.5">
                                <span className="shrink-0 w-14 sm:w-16 mt-1 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] text-[hsl(var(--rise-gold))] drop-shadow-[0_0_6px_hsl(var(--rise-gold)/0.5)]">
                                  <Database className="h-3 w-3 inline mr-1 -mt-0.5" />Data
                                </span>
                                <div className="flex-1 flex flex-wrap gap-1.5 min-w-0">
                                  {dataLinks.map((l) => (
                                    <LinkPill key={l.id} link={l} kind="data" onEdit={setEditing} onRemove={removeLink} />
                                  ))}
                                </div>
                              </div>
                            )}
                            {videoLinks.length > 0 && (
                              <div className="flex items-start gap-2.5 pt-2 border-t border-zinc-800/40">
                                <span className="shrink-0 w-14 sm:w-16 mt-1 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] text-blue-300 drop-shadow-[0_0_6px_rgb(96_165_250/0.5)]">
                                  <Video className="h-3 w-3 inline mr-1 -mt-0.5" />Video
                                </span>
                                <div className="flex-1 flex flex-wrap gap-1.5 min-w-0">
                                  {videoLinks.map((l) => (
                                    <LinkPill key={l.id} link={l} kind="video" onEdit={setEditing} onRemove={removeLink} />
                                  ))}
                                </div>
                              </div>
                            )}
                            {otherLinks.length > 0 && (
                              <div className="flex items-start gap-2.5 pt-2 border-t border-zinc-800/40">
                                <span className="shrink-0 w-14 sm:w-16 mt-1 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
                                  <Link2 className="h-3 w-3 inline mr-1 -mt-0.5" />Other
                                </span>
                                <div className="flex-1 flex flex-wrap gap-1.5 min-w-0">
                                  {otherLinks.map((l) => (
                                    <LinkPill key={l.id} link={l} kind="other" onEdit={setEditing} onRemove={removeLink} />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {editing && editing.id && league.links.some((l) => l.id === editing.id) && (
                            <div className="mt-2">
                              <InlineLinkEditor
                                draft={editing}
                                onChange={setEditing}
                                onSave={saveDraft}
                                onCancel={() => setEditing(null)}
                              />
                            </div>
                          )}

                          {statsLink && (
                            <LeagueStats
                              country={country}
                              ageGroup={ageBlock.age}
                              leagueName={league.name}
                              dataLink={statsLink}
                              onClose={() => toggleStats(leagueKey, null)}
                            />
                          )}
                        </div>
                      );
                });
              })()}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
          <Telescope className="h-5 w-5 sm:h-6 sm:w-6 text-[hsl(var(--rise-gold))]" />
          Scouting
        </h2>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search country"
            className="pl-8"
          />
        </div>
      </div>

      <p className="text-xs sm:text-sm text-muted-foreground">
        Click a country to expand its scouting dossier. Each league shows Data, Video and other links — press <span className="text-[hsl(var(--rise-gold))] font-medium">Stats</span> to pull live player stats from the source.
      </p>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-2">
          <div className={openCountry ? "" : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2"}>
            {(openCountry ? filteredCountries.filter((c) => c === openCountry) : filteredCountries).map((country) => {
              const countryLinks = grouped.get(country) || [];
              const flag = getCountryFlagUrl(country);
              const has = countryLinks.length > 0;
              const isOpen = openCountry === country;
              return (
                <button
                  key={country}
                  onClick={() => setOpenCountry(isOpen ? null : country)}
                  className={`group relative overflow-hidden rounded-xl border ${isOpen ? "w-full" : ""} ${
                    isOpen
                      ? "border-[hsl(var(--rise-gold))] shadow-[0_0_40px_-8px_hsl(var(--rise-gold)/0.6)]"
                      : has
                      ? "border-[hsl(var(--rise-gold)/0.4)]"
                      : "border-border/60"
                  } bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-sm ${isOpen ? "p-4" : "p-2.5"} text-left transition-all hover:border-[hsl(var(--rise-gold))] hover:shadow-[0_0_24px_-6px_hsl(var(--rise-gold)/0.5)]`}
                >
                  {isOpen && (
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--rise-gold))] to-transparent opacity-70" />
                  )}
                  <div className="flex items-center gap-2 relative min-w-0">
                    <img src={flag} alt="" className={`${isOpen ? "w-10 h-7" : "w-6 h-4"} object-cover rounded-sm ring-1 ring-[hsl(var(--rise-gold)/0.4)] shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <div className={`${isOpen ? "text-base sm:text-lg" : "text-[12px] sm:text-sm"} font-semibold truncate`}>{country}</div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {isOpen ? "Scouting dossier · " : ""}{countryLinks.length} resource{countryLinks.length === 1 ? "" : "s"}
                      </div>
                    </div>
                    <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </div>
                </button>
              );
            })}
          </div>

          {openCountry && (
            <div className="rounded-xl border border-[hsl(var(--rise-gold)/0.3)] bg-gradient-to-br from-background/80 to-background/40 overflow-hidden">
              {renderDossier(openCountry)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScoutingByCountry;