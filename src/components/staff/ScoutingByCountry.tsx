import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Telescope, Plus, ExternalLink, Pencil, Trash2, Search, ChevronDown, Database, Video, ArrowLeft, Link2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getCountryFlagUrl } from "@/lib/countryFlags";
import ScoutingPlayersPanel from "./ScoutingPlayersPanel";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// European countries we cover in Network / Coaching Database
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

const blankDraft = (country: string): Partial<LinkRow> => ({
  country,
  age_group: "U19",
  label: "",
  url: "",
  notes: "",
  sort_order: 0,
});

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
  const Icon = kind === "video" ? Video : kind === "data" ? Database : Link2;
  const tone =
    kind === "video"
      ? "border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-200"
      : kind === "data"
      ? "border-[hsl(var(--rise-gold)/0.5)] bg-[hsl(var(--rise-gold)/0.1)] hover:bg-[hsl(var(--rise-gold)/0.18)] text-[hsl(var(--rise-gold))]"
      : "border-border/60 bg-muted/40 hover:bg-muted/70 text-foreground";
  return (
    <div className={`group/pill inline-flex items-center rounded-full border ${tone} pl-2.5 pr-1 py-0.5 text-xs transition-colors max-w-full`}>
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 min-w-0"
        title={link.notes || link.url}
      >
        <Icon className="h-3 w-3 shrink-0" />
        <span className="truncate max-w-[220px]">{link.label}</span>
        <ExternalLink className="h-2.5 w-2.5 opacity-60 shrink-0" />
      </a>
      <button
        onClick={() => onEdit(link)}
        className="ml-1 opacity-0 group-hover/pill:opacity-100 transition-opacity p-1 rounded hover:bg-background/50"
      >
        <Pencil className="h-3 w-3" />
      </button>
      <button
        onClick={() => onRemove(link.id)}
        className="opacity-0 group-hover/pill:opacity-100 transition-opacity p-1 rounded hover:bg-background/50"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
};

export const ScoutingByCountry = () => {
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<LinkRow> | null>(null);
  const [openCountry, setOpenCountry] = useState<string | null>(null);
  const [openAges, setOpenAges] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<"resources" | "players">("resources");

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

  const classifyLink = (l: LinkRow): "data" | "video" | "other" => {
    const blob = `${l.label} ${l.notes ?? ""}`.toLowerCase();
    if (/\b(video|tv|fotbaltv|tvcom|veo|stream|highlight|záznam|zaznam)\b/.test(blob)) return "video";
    if (/\b(data|stats|statistik|table|tabulka|standings|fixtures|results|profile|player|subjekt)\b/.test(blob)) return "data";
    return "other";
  };

  const groupCountryLinks = (countryLinks: LinkRow[]) => {
    // Bucket by age_group, then within each age bucket split into "leagues" using
    // sort_order as a soft grouping plus the label root before "(".
    const byAge = new Map<string, LinkRow[]>();
    for (const l of countryLinks) {
      if (!byAge.has(l.age_group)) byAge.set(l.age_group, []);
      byAge.get(l.age_group)!.push(l);
    }
    const ordered = [...AGE_GROUPS, ...Array.from(byAge.keys()).filter((k) => !AGE_GROUPS.includes(k as any))]
      .filter((age, i, arr) => arr.indexOf(age) === i && byAge.has(age));
    return ordered.map((age) => {
      const items = byAge.get(age)!;
      // group by league root (label before the first "(" or " — ")
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

      <p className="text-sm text-muted-foreground">
        Click a country to open its scouting dossier. Age groups collapse inwards; each league offers Data and Video shortcuts.
      </p>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {filteredCountries.map((country) => {
            const countryLinks = grouped.get(country) || [];
            const flag = getCountryFlagUrl(country);
            const has = countryLinks.length > 0;
            return (
              <button
                key={country}
                onClick={() => { setOpenCountry(country); setOpenAges({}); }}
                className={`group relative overflow-hidden rounded-xl border ${
                  has ? "border-[hsl(var(--rise-gold)/0.4)]" : "border-border/60"
                } bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-sm p-3 text-left transition-all hover:border-[hsl(var(--rise-gold))] hover:shadow-[0_0_24px_-6px_hsl(var(--rise-gold)/0.5)]`}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-[hsl(var(--rise-gold)/0.08)] to-transparent pointer-events-none" />
                <div className="flex items-center gap-2.5 relative">
                  <img src={flag} alt="" className="w-7 h-5 object-cover rounded-sm ring-1 ring-border/50" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{country}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {countryLinks.length} link{countryLinks.length === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Country dossier modal */}
      <Dialog open={!!openCountry} onOpenChange={(o) => !o && setOpenCountry(null)}>
        <DialogContent className="max-w-5xl w-[95vw] p-0 overflow-hidden border-[hsl(var(--rise-gold)/0.3)] bg-gradient-to-br from-background via-background to-[hsl(var(--rise-gold)/0.04)]">
          {openCountry && (() => {
            const countryLinks = grouped.get(openCountry) || [];
            const ageGroups = groupCountryLinks(countryLinks);
            const flag = getCountryFlagUrl(openCountry);
            return (
              <div className="flex flex-col max-h-[85vh]">
                {/* Glossy header */}
                <div className="relative px-6 py-5 border-b border-border/60 bg-gradient-to-r from-[hsl(var(--rise-gold)/0.12)] via-transparent to-[hsl(var(--rise-gold)/0.06)]">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--rise-gold))] to-transparent opacity-60" />
                  <div className="flex items-center gap-4">
                    <img src={flag} alt="" className="w-12 h-8 object-cover rounded ring-2 ring-[hsl(var(--rise-gold)/0.4)] shadow-lg" />
                    <div className="flex-1 min-w-0">
                      <DialogTitle className="text-xl font-bold tracking-tight">{openCountry}</DialogTitle>
                      <div className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5">
                        Scouting dossier · {countryLinks.length} resource{countryLinks.length === 1 ? "" : "s"}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[hsl(var(--rise-gold)/0.5)] hover:bg-[hsl(var(--rise-gold)/0.1)]"
                      onClick={() => setEditing(blankDraft(openCountry))}
                    >
                      <Plus className="h-4 w-4 mr-1.5" /> Add link
                    </Button>
                  </div>
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto px-4 sm:px-6 py-5 space-y-2">
                  <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mb-3">
                    <TabsList className="grid grid-cols-2 w-full max-w-sm">
                      <TabsTrigger value="resources">Resources</TabsTrigger>
                      <TabsTrigger value="players">Player stats</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {tab === "players" ? (
                    <ScoutingPlayersPanel country={openCountry} />
                  ) : countryLinks.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic text-center py-12">
                      No links yet. Add your first one to start building {openCountry}'s scouting toolkit.
                    </p>
                  ) : (
                    ageGroups.map(({ age, leagues, total }) => {
                      const isOpen = !!openAges[age];
                      return (
                        <div
                          key={age}
                          className="rounded-xl border border-border/60 bg-gradient-to-b from-card/80 to-card/40 overflow-hidden"
                        >
                          <button
                            onClick={() => setOpenAges((s) => ({ ...s, [age]: !s[age] }))}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[hsl(var(--rise-gold)/0.05)] transition-colors"
                          >
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[hsl(var(--rise-gold)/0.25)] to-[hsl(var(--rise-gold)/0.05)] border border-[hsl(var(--rise-gold)/0.3)] flex items-center justify-center text-[10px] font-bold tracking-wider text-[hsl(var(--rise-gold))]">
                              {age}
                            </div>
                            <div className="flex-1 text-left">
                              <div className="text-sm font-semibold">{age === "General" ? "General resources" : `${age} football`}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {leagues.length} league{leagues.length === 1 ? "" : "s"} · {total} link{total === 1 ? "" : "s"}
                              </div>
                            </div>
                            <ChevronDown
                              className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                            />
                          </button>

                          {isOpen && (
                            <div className="px-3 pb-3 space-y-2 border-t border-border/40 pt-3">
                              {leagues.map((league) => {
                                const dataLinks = league.links.filter((l) => classifyLink(l) === "data");
                                const videoLinks = league.links.filter((l) => classifyLink(l) === "video");
                                const otherLinks = league.links.filter((l) => classifyLink(l) === "other");
                                return (
                                  <div
                                    key={league.name}
                                    className="rounded-lg border border-border/50 bg-background/60 p-3"
                                  >
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                      <div className="font-medium text-sm truncate">{league.name}</div>
                                      <div className="text-[10px] text-muted-foreground shrink-0 uppercase tracking-wider">
                                        {league.links.length} link{league.links.length === 1 ? "" : "s"}
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap gap-1.5">
                                      {dataLinks.map((l) => (
                                        <LinkPill key={l.id} link={l} kind="data" onEdit={setEditing} onRemove={removeLink} />
                                      ))}
                                      {videoLinks.map((l) => (
                                        <LinkPill key={l.id} link={l} kind="video" onEdit={setEditing} onRemove={removeLink} />
                                      ))}
                                      {otherLinks.map((l) => (
                                        <LinkPill key={l.id} link={l} kind="other" onEdit={setEditing} onRemove={removeLink} />
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl z-[110]">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? "Edit link" : "Add link"} — {editing?.country}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Age group</label>
                  <Select
                    value={editing.age_group || "General"}
                    onValueChange={(v) => setEditing({ ...editing, age_group: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AGE_GROUPS.map((a) => (<SelectItem key={a} value={a}>{a}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Sort order</label>
                  <Input
                    type="number"
                    value={editing.sort_order ?? 0}
                    onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Label</label>
                <Input
                  value={editing.label || ""}
                  onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                  placeholder="e.g. 1.Celostátní liga dorostu U19 (FotbalTV)"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">URL</label>
                <Input
                  value={editing.url || ""}
                  onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Notes</label>
                <Textarea
                  value={editing.notes || ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  rows={4}
                  placeholder="Coverage notes, what's available, login required, etc."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveDraft}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScoutingByCountry;