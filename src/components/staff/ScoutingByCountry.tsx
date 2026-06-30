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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Telescope, Plus, ExternalLink, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getCountryFlagUrl } from "@/lib/countryFlags";

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

export const ScoutingByCountry = () => {
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<LinkRow> | null>(null);

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
        Save the links you use to get to video and data for each country's youth and senior leagues. Click a country to view or add links.
      </p>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <Accordion type="multiple" className="w-full">
          {filteredCountries.map((country) => {
            const countryLinks = grouped.get(country) || [];
            const byAge = new Map<string, LinkRow[]>();
            for (const l of countryLinks) {
              if (!byAge.has(l.age_group)) byAge.set(l.age_group, []);
              byAge.get(l.age_group)!.push(l);
            }
            const flag = getCountryFlagUrl(country);
            return (
              <AccordionItem key={country} value={country} className="border-border">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 w-full">
                    <img src={flag} alt="" className="w-6 h-4 object-cover rounded-sm" />
                    <span className="font-medium">{country}</span>
                    <span className="text-xs text-muted-foreground ml-auto mr-2">
                      {countryLinks.length} link{countryLinks.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(blankDraft(country))}
                      >
                        <Plus className="h-4 w-4 mr-1.5" /> Add link
                      </Button>
                    </div>

                    {countryLinks.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        No links yet. Add your first one to start building this country's scouting toolkit.
                      </p>
                    ) : (
                      [...AGE_GROUPS, ...Array.from(byAge.keys()).filter(k => !AGE_GROUPS.includes(k as any))]
                        .filter((age, i, arr) => arr.indexOf(age) === i && byAge.has(age))
                        .map((age) => (
                          <div key={age} className="space-y-2">
                            <h4 className="text-sm font-semibold text-[hsl(var(--rise-gold))] uppercase tracking-wide">
                              {age}
                            </h4>
                            <div className="grid gap-2">
                              {byAge.get(age)!.map((l) => (
                                <Card key={l.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-2">
                                  <div className="flex-1 min-w-0">
                                    <a
                                      href={l.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm font-medium text-foreground hover:text-[hsl(var(--rise-gold))] inline-flex items-center gap-1.5"
                                    >
                                      {l.label}
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                    {l.notes && (
                                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{l.notes}</p>
                                    )}
                                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{l.url}</p>
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    <Button size="icon" variant="ghost" onClick={() => setEditing(l)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => removeLink(l.id)}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
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