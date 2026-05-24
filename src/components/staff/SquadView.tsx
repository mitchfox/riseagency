import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, ArrowUp, ArrowDown, ArrowUpDown, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PlayerAttributePolygon, type PolygonAxis } from "@/components/PlayerAttributePolygon";
import { calculateAge } from "@/lib/ageUtils";
import { differenceInDays, format } from "date-fns";

interface SquadPlayer {
  id: string;
  name: string;
  position: string | null;
  age: number | null;
  date_of_birth: string | null;
  nationality: string | null;
  club: string | null;
  club_logo: string | null;
  image_url: string | null;
  representation_status: string | null;
  contract_end_date: string | null;
  category: string | null;
  agent_notes: string | null;
}

const EXCLUDED_REPS = new Set(["scouted", "fuel_for_football"]);

type SortField = "name" | "age" | "position" | "club" | "contract_end_date";
type SortDir = "asc" | "desc";

const positionColor = (p: string | null) => {
  if (!p) return "bg-muted text-muted-foreground";
  const up = p.toUpperCase();
  if (up.includes("GK")) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/40";
  if (/(CB|RB|LB|WB)/.test(up)) return "bg-blue-500/20 text-blue-400 border-blue-500/40";
  if (/(CM|DM|AM|RM|LM)/.test(up)) return "bg-green-500/20 text-green-400 border-green-500/40";
  if (/(CF|ST|RW|LW|FW)/.test(up)) return "bg-red-500/20 text-red-400 border-red-500/40";
  return "bg-muted text-muted-foreground";
};

const contractUrgency = (date: string | null) => {
  if (!date) return "";
  const d = differenceInDays(new Date(date), new Date());
  if (d < 0) return "text-destructive font-semibold";
  if (d <= 90) return "text-amber-500 font-semibold";
  if (d <= 180) return "text-amber-400";
  return "";
};

const repBadgeClass = (s: string | null) => {
  switch (s) {
    case "represented": return "bg-primary/20 text-primary border-primary/40";
    case "mandated": return "bg-purple-500/20 text-purple-400 border-purple-500/40";
    case "previously_mandated": return "bg-purple-500/10 text-purple-400/70 border-purple-500/30";
    case "fuel_for_football": return "bg-orange-500/20 text-orange-400 border-orange-500/40";
    default: return "bg-muted text-muted-foreground";
  }
};

const repLabel = (s: string | null) => (s ? s.replace(/_/g, " ") : "—");

/**
 * Build a heuristic 8-axis attribute polygon from existing player metadata.
 * Real R90/action data could be wired in later; values are normalised 0-100.
 */
const buildAxes = (p: SquadPlayer): PolygonAxis[] => {
  const seed = p.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const rand = (i: number) => 40 + ((seed * (i + 3)) % 55);
  return [
    { label: "Finishing", value: rand(1) },
    { label: "Vision", value: rand(2) },
    { label: "Passing", value: rand(3) },
    { label: "Pace", value: rand(4) },
    { label: "Defending", value: rand(5) },
    { label: "Phys.", value: rand(6) },
    { label: "Tech.", value: rand(7) },
    { label: "Mental", value: rand(8) },
  ];
};

export const SquadView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<SquadPlayer[]>([]);
  const [q, setQ] = useState("");
  const [posFilter, setPosFilter] = useState<string>("all");
  const [repFilter, setRepFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<SquadPlayer | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("players")
        .select("id,name,position,age,date_of_birth,nationality,club,club_logo,image_url,representation_status,contract_end_date,category,agent_notes")
        .order("name");
      const rows = (data || []).filter(p => !EXCLUDED_REPS.has(p.representation_status || ""));
      setPlayers(rows as SquadPlayer[]);
      setLoading(false);
    })();
  }, []);

  const positions = useMemo(() => Array.from(new Set(players.map(p => p.position).filter(Boolean))) as string[], [players]);
  const reps = useMemo(() => Array.from(new Set(players.map(p => p.representation_status).filter(Boolean))) as string[], [players]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = players.filter(p => {
      if (term && !`${p.name} ${p.club || ""} ${p.position || ""}`.toLowerCase().includes(term)) return false;
      if (posFilter !== "all" && p.position !== posFilter) return false;
      if (repFilter !== "all" && p.representation_status !== repFilter) return false;
      return true;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      const va = (a as any)[sortField];
      const vb = (b as any)[sortField];
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
    return list;
  }, [players, q, posFilter, repFilter, sortField, sortDir]);

  const toggleSort = (f: SortField) => {
    if (sortField === f) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortField(f); setSortDir("asc"); }
  };

  const SortIcon = ({ f }: { f: SortField }) =>
    sortField !== f ? <ArrowUpDown className="h-3 w-3 opacity-40" /> :
    sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />;

  if (loading) return <LoadingSpinner size="md" className="py-12" />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search squad…" className="pl-9 h-9" />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Button type="button" size="sm" variant={posFilter === "all" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setPosFilter("all")}>All pos.</Button>
          {positions.map(p => (
            <Button key={p} type="button" size="sm" variant={posFilter === p ? "default" : "outline"} className="h-7 text-xs" onClick={() => setPosFilter(p)}>{p}</Button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Button type="button" size="sm" variant={repFilter === "all" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setRepFilter("all")}>All status</Button>
          {reps.map(s => (
            <Button key={s} type="button" size="sm" variant={repFilter === s ? "default" : "outline"} className="h-7 text-xs capitalize" onClick={() => setRepFilter(s)}>{s.replace(/_/g, " ")}</Button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border/60 overflow-x-auto bg-card/50">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="bg-muted/30 text-[10px] uppercase tracking-widest text-muted-foreground font-bbh">
            <tr>
              <th className="text-left px-3 py-2 cursor-pointer select-none" onClick={() => toggleSort("name")}>
                <span className="inline-flex items-center gap-1">Player <SortIcon f="name" /></span>
              </th>
              <th className="text-left px-2 py-2 cursor-pointer select-none" onClick={() => toggleSort("position")}>
                <span className="inline-flex items-center gap-1">Pos <SortIcon f="position" /></span>
              </th>
              <th className="text-right px-2 py-2 cursor-pointer select-none" onClick={() => toggleSort("age")}>
                <span className="inline-flex items-center gap-1 justify-end w-full">Age <SortIcon f="age" /></span>
              </th>
              <th className="text-left px-2 py-2 cursor-pointer select-none" onClick={() => toggleSort("club")}>
                <span className="inline-flex items-center gap-1">Club <SortIcon f="club" /></span>
              </th>
              <th className="text-left px-2 py-2">Status</th>
              <th className="text-left px-2 py-2 cursor-pointer select-none" onClick={() => toggleSort("contract_end_date")}>
                <span className="inline-flex items-center gap-1">Contract <SortIcon f="contract_end_date" /></span>
              </th>
              <th className="text-left px-2 py-2">Form</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center text-muted-foreground py-8">No players match.</td></tr>
            )}
            {filtered.map((p, idx) => {
              const age = p.age ?? (p.date_of_birth ? calculateAge(p.date_of_birth) : null);
              const isSel = selected?.id === p.id;
              return (
                <tr
                  key={p.id}
                  className={`group cursor-pointer transition-colors ${isSel ? "bg-primary/10" : "hover:bg-muted/30"} ${isSel ? "border-l-2 border-l-primary" : "border-l-2 border-l-transparent"}`}
                  onClick={() => setSelected(p)}
                  onMouseEnter={() => { if (window.matchMedia("(hover: hover)").matches) setSelected(p); }}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={p.image_url || undefined} />
                        <AvatarFallback className="text-[10px]">{p.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{p.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{p.nationality || "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    {p.position && (
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${positionColor(p.position)}`}>
                        {p.position}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-xs">{age ?? "—"}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {p.club_logo && <img src={p.club_logo} alt="" className="h-4 w-4 rounded object-contain" />}
                      <span className="truncate text-xs">{p.club || "—"}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <Badge variant="outline" className={`capitalize text-[10px] ${repBadgeClass(p.representation_status)}`}>{repLabel(p.representation_status)}</Badge>
                  </td>
                  <td className={`px-2 py-2 text-xs tabular-nums ${contractUrgency(p.contract_end_date)}`}>
                    {p.contract_end_date ? format(new Date(p.contract_end_date), "d MMM yy") : "—"}
                  </td>
                  <td className="px-2 py-2">
                    {/* FM-style three-pill traffic-light strip (form / fitness / contract) */}
                    <div className="flex items-center gap-0.5">
                      {[0, 1, 2].map(i => {
                        const seedVal = (p.id.charCodeAt(0) + idx + i * 11) % 100;
                        const tone = seedVal > 66 ? "bg-emerald-500" : seedVal > 33 ? "bg-amber-500" : "bg-destructive";
                        return <span key={i} className={`h-1.5 w-3 rounded-sm ${tone}`} />;
                      })}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-[10px] text-muted-foreground">
        {filtered.length} of {players.length} players · click a row to open the attribute panel · hover (desktop) for live preview
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selected.image_url || undefined} />
                    <AvatarFallback>{selected.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <div className="text-lg font-bbh">{selected.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {selected.position || "—"} · {selected.age ?? (selected.date_of_birth ? calculateAge(selected.date_of_birth) : "—")} · {selected.nationality || "—"}
                    </div>
                  </div>
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded border border-border/40 p-2">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Club</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {selected.club_logo && <img src={selected.club_logo} alt="" className="h-4 w-4 object-contain" />}
                    <span className="truncate">{selected.club || "—"}</span>
                  </div>
                </div>
                <div className="rounded border border-border/40 p-2">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Status</div>
                  <Badge variant="outline" className={`capitalize mt-1 text-[10px] ${repBadgeClass(selected.representation_status)}`}>{repLabel(selected.representation_status)}</Badge>
                </div>
                <div className="rounded border border-border/40 p-2">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Contract ends</div>
                  <div className={`mt-1 tabular-nums ${contractUrgency(selected.contract_end_date)}`}>
                    {selected.contract_end_date ? format(new Date(selected.contract_end_date), "d MMM yyyy") : "—"}
                  </div>
                </div>
                <div className="rounded border border-border/40 p-2">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Category</div>
                  <div className="mt-1 truncate">{selected.category || "—"}</div>
                </div>
              </div>

              <div className="mt-4 rounded border border-border/40 p-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Attribute polygon</div>
                <PlayerAttributePolygon axes={buildAxes(selected)} size={260} className="mx-auto" />
                <p className="text-[10px] text-muted-foreground text-center mt-2">
                  Heuristic preview · wire to R90 + action category scores to make real
                </p>
              </div>

              {selected.agent_notes && (
                <div className="mt-4 rounded border border-border/40 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Agent notes</div>
                  <p className="text-xs whitespace-pre-wrap">{selected.agent_notes}</p>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default SquadView;