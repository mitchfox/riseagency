import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MessageCircle, Mail, Phone, Search, Pencil, UserPlus, ChevronRight, Users } from "lucide-react";
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

const TD_RE = /(technical director|director of football|sporting director|sports director|football director|managing director professional football)/i;
const CS_RE = /(chief scout|head of recruitment|head scout|scout director)/i;

const GENERIC_CLUB_WORDS = new Set([
  "club", "football", "futbol", "futebol", "calcio", "fotbal", "spor", "sport", "sports",
  "soccer", "team", "united", "county", "sporting", "royal", "real", "fotboll",
  "the", "and",
]);

const norm = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

const clubTokens = (clubName: string): string[] =>
  clubName
    .split(/\s+/)
    .map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter((w) => w.length >= 4 && !GENERIC_CLUB_WORDS.has(w));

const contactMatchesClub = (
  contact: ContactRow,
  clubName: string,
  country: string | null,
): boolean => {
  if (country && contact.country && contact.country !== country) return false;
  const target = norm(clubName);
  if (!target) return false;
  const cn = norm(contact.club_name);
  if (cn && (cn === target || cn.includes(target) || target.includes(cn))) return true;
  // Fallback: tokenised search inside the contact name (many rows embed the club).
  const tokens = clubTokens(clubName);
  if (tokens.length === 0) return false;
  const haystack = (contact.name ?? "").toLowerCase();
  return tokens.some((t) => haystack.includes(t));
};

const matchContactForClub = (
  contacts: ContactRow[],
  clubName: string,
  country: string | null,
  re: RegExp,
): ContactRow | null =>
  contacts.find(
    (c) => c.position && re.test(c.position) && contactMatchesClub(c, clubName, country),
  ) ?? null;

const additionalContactsForClub = (
  contacts: ContactRow[],
  clubName: string,
  country: string | null,
  excludeIds: Set<string>,
): ContactRow[] =>
  contacts
    .filter((c) => {
      if (excludeIds.has(c.id)) return false;
      if (!contactMatchesClub(c, clubName, country)) return false;
      if (c.position && TD_RE.test(c.position)) return false;
      if (c.position && CS_RE.test(c.position)) return false;
      if (c.position && /\b(player|agent)\b/i.test(c.position)) return false;
      return true;
    })
    .sort((a, b) => {
      const order = (p: string | null) => {
        const s = (p ?? "").toLowerCase();
        if (/president|chair/.test(s)) return 1;
        if (/ceo|managing director/.test(s)) return 2;
        if (/director|teamchef|\bchef\b/.test(s)) return 3;
        if (/scout|recruit/.test(s)) return 4;
        if (/coach|trainer|manager/.test(s)) return 5;
        return 9;
      };
      const d = order(a.position) - order(b.position);
      if (d !== 0) return d;
      return (a.name ?? "").localeCompare(b.name ?? "");
    });

const waLink = (phone: string) => `https://wa.me/${phone.replace(/[^0-9]/g, "")}`;

type ContactEditState = {
  club: ClubRow;
  role: "td" | "cs" | "extra";
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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [addingToNetwork, setAddingToNetwork] = useState(false);

  const toggleExpanded = (clubId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(clubId) ? next.delete(clubId) : next.add(clubId);
      return next;
    });

  useEffect(() => {
    (async () => {
      setLoading(true);
      // 1) Collect every club_id referenced by current strategies, and remember
      //    each strategy's country + league_level so we can label the club with
      //    the strategy's league even when club_map_positions has no league row.
      const { data: stratRows } = await (supabase as any)
        .from("club_outreach_strategies")
        .select("filters, defaults");
      const ids = new Set<string>();
      // clubId -> { country, league_level } from the strategy that references it.
      const stratByClub = new Map<string, { country: string | null; level: string | null }>();
      (stratRows ?? []).forEach((s: any) => {
        const sCountry = (s?.filters?.country ?? null) as string | null;
        const sLevel = (s?.filters?.league_level ?? null) as string | null;
        (s?.filters?.club_ids ?? []).forEach((id: string) => {
          if (!id) return;
          ids.add(id);
          if (!stratByClub.has(id)) {
            stratByClub.set(id, { country: sCountry, level: sLevel });
          }
        });
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

      // Overlay the strategy's country + league_level so every league referenced
      // by a strategy is represented in the filters and table, even when the
      // club_map_positions row is missing the league field.
      const enriched: ClubRow[] = ((clubRows ?? []) as ClubRow[]).map((c) => {
        const s = stratByClub.get(c.id);
        if (!s) return c;
        return {
          ...c,
          country: c.country ?? s.country,
          league: c.league ?? s.level,
        };
      });

      setClubs(enriched.sort((a, b) => {
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
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Saved", { duration: 1200 });
    }
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

  const openExtraEdit = (club: ClubRow, existing: ContactRow | null) => {
    setEditing({
      club,
      role: "extra",
      existing,
      draft: {
        name: existing?.name ?? "",
        position: existing?.position ?? "",
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
    // For TD / Chief Scout slots, also persist the name into the market table entry so it sticks.
    if (role === "td") {
      await persist(club.id, { technical_director_name: payload.name });
    } else if (role === "cs") {
      await persist(club.id, { chief_scout_name: payload.name });
    }
    toast.success(existing ? "Contact updated" : "Contact added");
    setSavingContact(false);
    setEditing(null);
    setReloadKey((k) => k + 1);
  };

  const addAllContactsToNetwork = async () => {
    setAddingToNetwork(true);
    try {
      const ids = new Set<string>();
      filtered.forEach((club) => {
        const { tdContact, csContact } = getValues(club);
        const exclude = new Set<string>();
        if (tdContact) exclude.add(tdContact.id);
        if (csContact) exclude.add(csContact.id);
        const extras = additionalContactsForClub(contacts, club.club_name, club.country, exclude);
        [tdContact, csContact, ...extras].forEach((c) => {
          if (c && ((c.email && c.email.trim()) || (c.phone && c.phone.trim()))) {
            ids.add(c.id);
          }
        });
      });
      if (ids.size === 0) {
        toast.info("No contacts with email or phone to add");
        return;
      }
      const { data: existing, error: exErr } = await (supabase as any)
        .from("outreach_relationships")
        .select("contact_id")
        .in("contact_id", Array.from(ids));
      if (exErr) throw exErr;
      const have = new Set<string>((existing ?? []).map((r: any) => r.contact_id));
      const toInsert = Array.from(ids).filter((id) => !have.has(id));
      if (toInsert.length === 0) {
        toast.success("All contacts are already in Network");
        return;
      }
      const { error: insErr } = await (supabase as any)
        .from("outreach_relationships")
        .insert(toInsert.map((contact_id) => ({ contact_id, rapport_level: "cold" })));
      if (insErr) throw insErr;
      toast.success(`Added ${toInsert.length} contact${toInsert.length === 1 ? "" : "s"} to Network`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to add contacts to Network");
    } finally {
      setAddingToNetwork(false);
    }
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
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={addingToNetwork || filtered.length === 0}
            onClick={addAllContactsToNetwork}
            className="ml-auto h-8 text-xs gap-1.5"
          >
            <Users className="h-3.5 w-3.5" />
            {addingToNetwork ? "Adding…" : "Add all contacts to Network"}
          </Button>
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

      {/* Mobile: stacked cards. Desktop: full table. */}
      <div className="md:hidden space-y-2">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
            No clubs match. Strategies need clubs added before they show here.
          </div>
        )}
        {filtered.map((club) => {
          const { tdContact, csContact, tdName, csName } = getValues(club);
          const exclude = new Set<string>();
          if (tdContact) exclude.add(tdContact.id);
          if (csContact) exclude.add(csContact.id);
          const extras = additionalContactsForClub(contacts, club.club_name, club.country, exclude);
          const isOpen = expanded.has(club.id);
          return (
            <div key={`m-${club.id}`} className="rounded-xl border border-border bg-card p-3 space-y-3">
              <div className="flex items-center gap-2">
                {club.image_url ? (
                  <img src={club.image_url} alt="" className="h-8 w-8 object-contain rounded-sm bg-white/5" />
                ) : (
                  <div className="h-8 w-8 rounded-sm bg-muted" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium text-sm truncate">{club.club_name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {club.country ?? "—"}{club.league ? ` · ${club.league}` : ""}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Technical Director</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    defaultValue={tdName}
                    placeholder="Add name"
                    className="h-9 text-sm flex-1"
                    onBlur={(e) => {
                      const v = e.target.value.trim() || null;
                      const existing = entries[club.id]?.technical_director_name ?? null;
                      const auto = tdContact?.name ?? null;
                      if (v === existing) return;
                      if (!existing && v === auto) return;
                      persist(club.id, { technical_director_name: v });
                    }}
                  />
                  {renderContactLinks(tdContact)}
                  <button
                    type="button"
                    onClick={() => openEdit(club, "td", tdContact)}
                    title={tdContact ? "Edit contact" : "Add contact"}
                    className="text-muted-foreground hover:text-white p-1.5"
                  >
                    {tdContact ? <Pencil className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Chief Scout</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    defaultValue={csName}
                    placeholder="Add name"
                    className="h-9 text-sm flex-1"
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
                    className="text-muted-foreground hover:text-white p-1.5"
                  >
                    {csContact ? <Pencil className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {extras.length > 0 && (
                <div className="pt-1 border-t border-border/40">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(club.id)}
                    className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-white"
                  >
                    <Users className="h-3 w-3" />
                    {extras.length} more contact{extras.length === 1 ? "" : "s"}
                    <ChevronRight className={`h-3 w-3 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  </button>
                  {isOpen && (
                    <ul className="mt-2 space-y-1.5">
                      {extras.map((c) => (
                        <li key={c.id} className="flex items-center gap-2 text-xs flex-wrap">
                          <span className="text-white">{c.name}</span>
                          {c.position && <span className="text-muted-foreground">· {c.position}</span>}
                          {renderContactLinks(c)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="hidden md:block rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/30">
            <tr>
              <th className="w-6 px-1 py-2" />
              <th className="text-left px-3 py-2 font-medium">Club</th>
              <th className="text-left px-3 py-2 font-medium">Country / League</th>
              <th className="text-left px-3 py-2 font-medium">Technical Director</th>
              <th className="text-left px-3 py-2 font-medium">Chief Scout</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground text-xs">
                No clubs match. Strategies need clubs added before they show here.
              </td></tr>
            )}
            {filtered.map((club) => {
              const { tdContact, csContact, tdName, csName } = getValues(club);
              const exclude = new Set<string>();
              if (tdContact) exclude.add(tdContact.id);
              if (csContact) exclude.add(csContact.id);
              const extras = additionalContactsForClub(contacts, club.club_name, club.country, exclude);
              const isOpen = expanded.has(club.id);
              return (
                <Fragment key={club.id}>
                <tr className="border-t border-border/40 hover:bg-muted/20">
                  <td className="px-1 py-2 align-top">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(club.id)}
                      title={isOpen ? "Hide additional contacts" : `Additional contacts${extras.length ? ` (${extras.length})` : ""}`}
                      className="text-muted-foreground hover:text-white p-1"
                    >
                      <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 min-w-[180px]">
                      {club.image_url ? (
                        <img src={club.image_url} alt="" className="h-6 w-6 object-contain rounded-sm bg-white/5" />
                      ) : (
                        <div className="h-6 w-6 rounded-sm bg-muted" />
                      )}
                      <span className="text-white font-medium">{club.club_name}</span>
                      {extras.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(club.id)}
                          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-white border border-border/60 rounded-full px-1.5 py-0.5"
                          title="Additional contacts"
                        >
                          <Users className="h-3 w-3" />
                          {extras.length}
                        </button>
                      )}
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
                {isOpen && (
                  <tr className="border-t border-border/40 bg-muted/10">
                    <td />
                    <td colSpan={4} className="px-3 py-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            Additional contacts
                          </div>
                          <button
                            type="button"
                            onClick={() => openExtraEdit(club, null)}
                            className="inline-flex items-center gap-1 text-[11px] text-[#cbb96b] hover:text-white"
                          >
                            <UserPlus className="h-3.5 w-3.5" /> Add additional contact
                          </button>
                        </div>
                        {extras.length === 0 ? (
                          <div className="text-xs text-muted-foreground">No additional contacts in the network for this club.</div>
                        ) : (
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
                            {extras.map((c) => (
                              <li key={c.id} className="flex items-center gap-2 text-xs">
                                <span className="text-white">{c.name}</span>
                                {c.position && (
                                  <span className="text-muted-foreground">· {c.position}</span>
                                )}
                                {renderContactLinks(c)}
                                <button
                                  type="button"
                                  onClick={() => openExtraEdit(club, c)}
                                  title="Edit contact"
                                  className="ml-auto text-muted-foreground hover:text-white"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
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