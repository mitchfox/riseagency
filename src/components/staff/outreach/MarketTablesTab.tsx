import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MessageCircle, Mail, Phone, Search, Pencil, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ClubRow {
  id: string;
  club_name: string;
  country: string | null;
  league: string | null;
  image_url: string | null;
}

interface ContactRow {
  id: string;
  name: string;
  club_name: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
}

interface Entry {
  club_id: string;
  technical_director_name: string | null;
  chief_scout_name: string | null;
}

const MARKET_TABLE_KEY = "summer-26";

const TD_RE = /(technical director|director of football|sporting director|football director|managing director professional football)/i;
const CS_RE = /(chief scout|head of recruitment|head scout|scout director)/i;

const norm = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

const matchContactForClub = (
  contacts: ContactRow[],
  clubName: string,
  country: string | null,
  re: RegExp,
): ContactRow | null => {
  const target = norm(clubName);
  if (!target) return null;
  return (
    contacts.find((c) => {
      if (!c.position || !re.test(c.position)) return false;
      const cn = norm(c.club_name);
      if (!cn) return false;
      if (cn === target) return true;
      // looser containment match (e.g. "FC Porto" vs "Porto")
      return cn.includes(target) || target.includes(cn);
    }) ?? null
  );
};

const waLink = (phone: string) => `https://wa.me/${phone.replace(/[^0-9]/g, "")}`;

type ContactEditState = {
  club: ClubRow;
  role: "td" | "cs";
  existing: ContactRow | null;
  draft: { name: string; position: string; email: string; phone: string };
};

export default function MarketTablesTab() {
  const [clubs, setClubs] = useState<ClubRow[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState<string>("all");
  const [league, setLeague] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ContactEditState | null>(null);
  const [savingContact, setSavingContact] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // 1) Collect every club_id referenced by current strategies.
      const { data: stratRows } = await (supabase as any)
        .from("club_outreach_strategies")
        .select("filters, defaults");
      const ids = new Set<string>();
      (stratRows ?? []).forEach((s: any) => {
        (s?.filters?.club_ids ?? []).forEach((id: string) => id && ids.add(id));
        (s?.defaults?.extra_clubs ?? []).forEach((ec: any) => {
          if (ec?.id) ids.add(ec.id);
        });
      });

      if (ids.size === 0) {
        setClubs([]);
        setLoading(false);
        return;
      }

      const [{ data: clubRows }, { data: contactRows }, { data: entryRows }] = await Promise.all([
        supabase
          .from("club_map_positions")
          .select("id, club_name, country, league, image_url")
          .in("id", Array.from(ids)),
        supabase
          .from("club_network_contacts")
          .select("id, name, club_name, position, email, phone, country"),
        (supabase as any)
          .from("market_table_entries")
          .select("club_id, technical_director_name, chief_scout_name")
          .eq("market_table_key", MARKET_TABLE_KEY),
      ]);

      setClubs(((clubRows ?? []) as ClubRow[]).sort((a, b) => {
        const c = (a.country ?? "").localeCompare(b.country ?? "");
        if (c !== 0) return c;
        const l = (a.league ?? "").localeCompare(b.league ?? "");
        if (l !== 0) return l;
        return a.club_name.localeCompare(b.club_name);
      }));
      setContacts((contactRows ?? []) as ContactRow[]);
      const map: Record<string, Entry> = {};
      (entryRows ?? []).forEach((r: any) => {
        map[r.club_id] = {
          club_id: r.club_id,
          technical_director_name: r.technical_director_name,
          chief_scout_name: r.chief_scout_name,
        };
      });
      setEntries(map);
      setLoading(false);
    })();
  }, [reloadKey]);

  const countries = useMemo(() => {
    const set = new Set<string>();
    clubs.forEach((c) => c.country && set.add(c.country));
    return Array.from(set).sort();
  }, [clubs]);

  const leagues = useMemo(() => {
    const set = new Set<string>();
    clubs
      .filter((c) => country === "all" || c.country === country)
      .forEach((c) => c.league && set.add(c.league));
    return Array.from(set).sort();
  }, [clubs, country]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clubs.filter((c) => {
      if (country !== "all" && c.country !== country) return false;
      if (league !== "all" && c.league !== league) return false;
      if (q && !c.club_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [clubs, country, league, search]);

  const getValues = (club: ClubRow) => {
    const entry = entries[club.id];
    const tdContact = matchContactForClub(contacts, club.club_name, club.country, TD_RE);
    const csContact = matchContactForClub(contacts, club.club_name, club.country, CS_RE);
    const tdName = entry?.technical_director_name ?? tdContact?.name ?? "";
    const csName = entry?.chief_scout_name ?? csContact?.name ?? "";
    return { tdContact, csContact, tdName, csName };
  };

  const persist = async (clubId: string, patch: Partial<Entry>) => {
    const current = entries[clubId] ?? {
      club_id: clubId,
      technical_director_name: null,
      chief_scout_name: null,
    };
    const next: Entry = { ...current, ...patch, club_id: clubId };
    setEntries((prev) => ({ ...prev, [clubId]: next }));
    const { error } = await (supabase as any)
      .from("market_table_entries")
      .upsert(
        {
          market_table_key: MARKET_TABLE_KEY,
          club_id: clubId,
          technical_director_name: next.technical_director_name,
          chief_scout_name: next.chief_scout_name,
        },
        { onConflict: "market_table_key,club_id" },
      );
    if (error) toast.error(error.message);
  };

  const renderContactLinks = (c: ContactRow | null) => {
    if (!c) return null;
    return (
      <span className="inline-flex items-center gap-1.5 ml-2">
        {c.phone && (
          <a
            href={waLink(c.phone)}
            target="_blank"
            rel="noreferrer"
            title={`WhatsApp ${c.name}`}
            className="text-emerald-400 hover:text-emerald-300"
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </a>
        )}
        {c.phone && (
          <a href={`tel:${c.phone}`} title={`Call ${c.name}`} className="text-muted-foreground hover:text-foreground">
            <Phone className="h-3.5 w-3.5" />
          </a>
        )}
        {c.email && (
          <a href={`mailto:${c.email}`} title={`Email ${c.name}`} className="text-muted-foreground hover:text-foreground">
            <Mail className="h-3.5 w-3.5" />
          </a>
        )}
      </span>
    );
  };

  const openEdit = (club: ClubRow, role: "td" | "cs", existing: ContactRow | null) => {
    const defaultPos = role === "td" ? "Technical Director" : "Chief Scout";
    setEditing({
      club,
      role,
      existing,
      draft: {
        name: existing?.name ?? (role === "td" ? entries[club.id]?.technical_director_name ?? "" : entries[club.id]?.chief_scout_name ?? ""),
        position: existing?.position ?? defaultPos,
        email: existing?.email ?? "",
        phone: existing?.phone ?? "",
      },
    });
  };

  const saveContact = async () => {
    if (!editing) return;
    const { club, role, existing, draft } = editing;
    if (!draft.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSavingContact(true);
    const payload = {
      name: draft.name.trim(),
      position: draft.position.trim() || null,
      email: draft.email.trim() || null,
      phone: draft.phone.trim() || null,
      club_name: club.club_name,
      country: club.country,
    };
    const { error } = existing
      ? await supabase.from("club_network_contacts").update(payload).eq("id", existing.id)
      : await supabase.from("club_network_contacts").insert(payload);
    if (error) {
      toast.error(error.message);
      setSavingContact(false);
      return;
    }
    // Also persist the name into the market table entry so it sticks.
    await persist(club.id, role === "td"
      ? { technical_director_name: payload.name }
      : { chief_scout_name: payload.name });
    toast.success(existing ? "Contact updated" : "Contact added");
    setSavingContact(false);
    setEditing(null);
    setReloadKey((k) => k + 1);
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading market table…</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-white mr-2">Summer '26</h3>
          <span className="text-[11px] text-muted-foreground">
            {filtered.length} club{filtered.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clubs"
              className="pl-8"
            />
          </div>
          <Select value={country} onValueChange={(v) => { setCountry(v); setLeague("all"); }}>
            <SelectTrigger className="sm:w-[180px]"><SelectValue placeholder="All countries" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries</SelectItem>
              {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={league} onValueChange={setLeague}>
            <SelectTrigger className="sm:w-[200px]"><SelectValue placeholder="All leagues" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All leagues</SelectItem>
              {leagues.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/30">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Club</th>
              <th className="text-left px-3 py-2 font-medium">Country / League</th>
              <th className="text-left px-3 py-2 font-medium">Technical Director</th>
              <th className="text-left px-3 py-2 font-medium">Chief Scout</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground text-xs">
                No clubs match. Strategies need clubs added before they show here.
              </td></tr>
            )}
            {filtered.map((club) => {
              const { tdContact, csContact, tdName, csName } = getValues(club);
              return (
                <tr key={club.id} className="border-t border-border/40 hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 min-w-[180px]">
                      {club.image_url ? (
                        <img src={club.image_url} alt="" className="h-6 w-6 object-contain rounded-sm bg-white/5" />
                      ) : (
                        <div className="h-6 w-6 rounded-sm bg-muted" />
                      )}
                      <span className="text-white font-medium">{club.club_name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">
                    <div>{club.country ?? "—"}</div>
                    <div className="opacity-80">{club.league ?? ""}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Input
                        defaultValue={tdName}
                        placeholder="Add name"
                        className="h-8 text-sm min-w-[160px]"
                        onBlur={(e) => {
                          const v = e.target.value.trim() || null;
                          const existing = entries[club.id]?.technical_director_name ?? null;
                          const auto = tdContact?.name ?? null;
                          if (v === existing) return;
                          // If field still equals auto value and nothing was saved, skip writing.
                          if (!existing && v === auto) return;
                          persist(club.id, { technical_director_name: v });
                        }}
                      />
                      {renderContactLinks(tdContact)}
                      <button
                        type="button"
                        onClick={() => openEdit(club, "td", tdContact)}
                        title={tdContact ? "Edit contact" : "Add contact"}
                        className="ml-1 text-muted-foreground hover:text-white"
                      >
                        {tdContact ? <Pencil className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Input
                        defaultValue={csName}
                        placeholder="Add name"
                        className="h-8 text-sm min-w-[160px]"
                        onBlur={(e) => {
                          const v = e.target.value.trim() || null;
                          const existing = entries[club.id]?.chief_scout_name ?? null;
                          const auto = csContact?.name ?? null;
                          if (v === existing) return;
                          if (!existing && v === auto) return;
                          persist(club.id, { chief_scout_name: v });
                        }}
                      />
                      {renderContactLinks(csContact)}
                      <button
                        type="button"
                        onClick={() => openEdit(club, "cs", csContact)}
                        title={csContact ? "Edit contact" : "Add contact"}
                        className="ml-1 text-muted-foreground hover:text-white"
                      >
                        {csContact ? <Pencil className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing?.existing ? "Edit contact" : "Add contact"} — {editing?.club.club_name}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Name</Label>
                <Input
                  value={editing.draft.name}
                  onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, name: e.target.value } })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Position</Label>
                <Input
                  value={editing.draft.position}
                  onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, position: e.target.value } })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={editing.draft.email}
                  onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, email: e.target.value } })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone (WhatsApp)</Label>
                <Input
                  value={editing.draft.phone}
                  onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, phone: e.target.value } })}
                  placeholder="+44 7..."
                />
              </div>
              <div className="sm:col-span-2 text-[11px] text-muted-foreground">
                Saved to Network as {editing.club.club_name} ({editing.club.country ?? "—"}).
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={savingContact}>Cancel</Button>
            <Button onClick={saveContact} disabled={savingContact}>
              {savingContact ? "Saving…" : "Save contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}