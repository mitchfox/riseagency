import { Fragment, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MessageCircle, Mail, Phone, Search, Pencil, UserPlus, ChevronRight, Users, Check, History, Send, Linkedin, Heart, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AddTeamDialog, type AddedTeam } from "./AddTeamDialog";
import { Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ClubRow {
  id: string;
  club_name: string;
  country: string | null;
  league: string | null;
  league_level?: string | null;
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
  linkedin_url?: string | null;
}

interface Entry {
  club_id: string;
  technical_director_name: string | null;
  chief_scout_name: string | null;
}

const MARKET_TABLE_KEY = "summer-26";
const PAGE_SIZE = 50;
const CLUB_FETCH_PAGE_SIZE = 1000;
const CONTACT_FETCH_PAGE_SIZE = 1000;
const CONTACT_SELECT = "id, name, club_name, position, email, phone, country, linkedin_url";
const BELGIUM_1ST_CLUBS = [
  "RSC Anderlecht",
  "Royal Antwerp FC",
  "SK Beveren",
  "Cercle Brugge",
  "Royal Charleroi SC",
  "Club Brugge KV",
  "KRC Genk",
  "KAA Gent",
  "KV Kortrijk",
  "RAAL La Louvière",
  "Lommel SK",
  "KV Mechelen",
  "Oud-Heverlee Leuven",
  "Sint-Truidense VV",
  "Standard Liège",
  "Union Saint-Gilloise",
  "KVC Westerlo",
  "Zulte Waregem",
];
const BELGIUM_2ND_CLUBS = [
  "Beerschot VA",
  "Club NXT",
  "FCV Dender EH",
  "Francs Borains",
  "Sporting Hasselt",
  "KAS Eupen",
  "Jong Genk",
  "Jong KAA Gent",
  "K Lierse SK",
  "KSC Lokeren",
  "Patro Eisden Maasmechelen",
  "RFC Liège",
  "RSCA Futures",
  "RFC Seraing",
  "Royal Excelsior Virton",
];

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
  const target = norm(clubName);
  if (!target) return false;
  const cn = norm(contact.club_name);
  if (cn && (cn === target || cn.includes(target) || target.includes(cn))) return true;
  if (country && contact.country && contact.country !== country) return false;
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

const matchContactByNameForClub = (
  contacts: ContactRow[],
  clubName: string,
  country: string | null,
  name: string | null | undefined,
): ContactRow | null => {
  const target = norm(name);
  if (!target) return null;
  return contacts.find((c) => norm(c.name) === target && contactMatchesClub(c, clubName, country)) ?? null;
};

const contactHasSavedDetails = (contact: ContactRow | null): boolean =>
  Boolean(contact?.email?.trim() || contact?.phone?.trim());

const upsertContactRow = (rows: ContactRow[], row: ContactRow): ContactRow[] => {
  const idx = rows.findIndex((c) => c.id === row.id);
  if (idx === -1) return [row, ...rows];
  const next = [...rows];
  next[idx] = row;
  return next;
};

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
      if (c.position && /\b(player|agent)\b/i.test(c.position)) return false;
      // Never surface placeholder rows whose "name" is just the club name —
      // these are shell records used to anchor the club, not real people.
      const nameNorm = norm(c.name);
      const clubNorm = norm(clubName);
      const isNameJustClub =
        nameNorm.length > 0 &&
        clubNorm.length > 0 &&
        (nameNorm === clubNorm || nameNorm.includes(clubNorm) || clubNorm.includes(nameNorm));
      if (isNameJustClub) return false;
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

function LinkedInButton({
  url,
  onSave,
  size = "sm",
}: {
  url: string | null | undefined;
  onSave: (next: string | null) => Promise<void> | void;
  size?: "sm" | "xs";
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(url ?? "");
  const [saving, setSaving] = useState(false);
  const has = !!(url && url.trim());
  useEffect(() => {
    if (open) setDraft(url ?? "");
  }, [open, url]);
  const cls = size === "xs" ? "h-6 w-6" : "h-8 w-8";
  const icon = size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5";
  const save = async (value: string | null) => {
    setSaving(true);
    try {
      await onSave(value);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={has ? "LinkedIn — click to open or edit" : "Add LinkedIn URL"}
          aria-label={has ? "LinkedIn" : "Add LinkedIn URL"}
          className={`inline-flex ${cls} shrink-0 items-center justify-center rounded-md border transition ${
            has
              ? "border-[#0a66c2]/60 bg-[#0a66c2]/10 text-[#0a66c2] hover:bg-[#0a66c2]/20"
              : "border-border text-muted-foreground/50 hover:text-white hover:border-risegold/60"
          }`}
        >
          <Linkedin className={icon} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] p-3 space-y-2">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          LinkedIn URL
        </div>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="https://www.linkedin.com/in/…"
          autoFocus
        />
        <div className="flex items-center justify-between gap-2">
          {has ? (
            <a
              href={url ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#0a66c2] hover:underline truncate"
            >
              Open current
            </a>
          ) : <span />}
          <div className="flex items-center gap-1.5">
            {has && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground"
                disabled={saving}
                onClick={() => save(null)}
              >
                Remove
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={saving}
              onClick={() => save(draft.trim() ? draft.trim() : null)}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const mondayOf = (d: Date): string => {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x.toISOString().slice(0, 10);
};

const exactClubKey = (name: string) => norm(name);

const fetchAllClubRows = async (): Promise<ClubRow[]> => {
  const all: ClubRow[] = [];
  for (let from = 0; ; from += CLUB_FETCH_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("club_map_positions")
      .select("id, club_name, country, league, league_level, image_url")
      .order("club_name")
      .range(from, from + CLUB_FETCH_PAGE_SIZE - 1);
    if (error) throw error;
    all.push(...(((data ?? []) as unknown) as ClubRow[]));
    if (!data || data.length < CLUB_FETCH_PAGE_SIZE) break;
  }
  return all;
};

const fetchAllContactRows = async (): Promise<ContactRow[]> => {
  const all: ContactRow[] = [];
  for (let from = 0; ; from += CONTACT_FETCH_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("club_network_contacts")
      .select(CONTACT_SELECT)
      .order("id")
      .range(from, from + CONTACT_FETCH_PAGE_SIZE - 1);
    if (error) throw error;
    all.push(...(((data ?? []) as unknown) as ContactRow[]));
    if (!data || data.length < CONTACT_FETCH_PAGE_SIZE) break;
  }
  return all;
};

type ContactEditState = {
  club: ClubRow;
  role: "td" | "cs" | "extra";
  existing: ContactRow | null;
  draft: { name: string; position: string; email: string; phone: string };
};

function MarketContactSlot({
  value,
  contact,
  placeholder,
  links,
  inputClassName,
  onConfirm,
  onEdit,
  onCreateOutreach,
  linkedinUrl,
  onSaveLinkedin,
  onAddToRelationships,
  inRelationships,
}: {
  value: string;
  contact: ContactRow | null;
  placeholder: string;
  links: ReactNode;
  inputClassName: string;
  onConfirm: (value: string | null) => Promise<boolean | void>;
  onEdit: () => void;
  onCreateOutreach?: () => void;
  linkedinUrl?: string | null;
  onSaveLinkedin?: (next: string | null) => Promise<void> | void;
  onAddToRelationships?: () => void;
  inRelationships?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const cleanDraft = draft.trim();
  const isDirty = cleanDraft !== value.trim();
  const hasSavedName = value.trim().length > 0;
  const hasSavedContactDetails = contactHasSavedDetails(contact);
  const showConfirm = isDirty;

  const confirm = async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    try {
      const saved = await onConfirm(cleanDraft || null);
      if (saved !== false) setDraft(cleanDraft);
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const Icon = showConfirm ? Check : hasSavedContactDetails ? Pencil : UserPlus;
  const buttonTitle = showConfirm
    ? "Confirm this person in Market Tables"
    : hasSavedContactDetails
      ? "Show or edit existing contact details"
      : hasSavedName
        ? "Add contact details for this person"
        : "Add contact details";

  return (
    <div className="flex items-center gap-1.5">
      <Input
        value={draft}
        placeholder={placeholder}
        className={inputClassName}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            confirm();
          }
        }}
      />
      {links}
      {value.trim() && onSaveLinkedin && (
        <LinkedInButton url={linkedinUrl ?? null} onSave={onSaveLinkedin} />
      )}
      {value.trim() && onAddToRelationships && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onAddToRelationships}
          title={inRelationships ? "Already in Relationships" : "Add to Relationships"}
          aria-label="Add to Relationships"
          disabled={inRelationships}
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition ${
            inRelationships
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 cursor-default"
              : "border-border text-muted-foreground hover:text-white hover:border-risegold/60"
          }`}
        >
          <Heart className="h-3.5 w-3.5" fill={inRelationships ? "currentColor" : "none"} />
        </button>
      )}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={showConfirm ? confirm : onEdit}
        title={buttonTitle}
        aria-label={buttonTitle}
        disabled={saving}
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition ${
          showConfirm
            ? "border-risegold bg-risegold/15 text-risegold hover:bg-risegold/25"
            : hasSavedName && !hasSavedContactDetails
              ? "border-risegold/70 text-risegold hover:bg-risegold/10"
              : "border-border text-muted-foreground hover:text-white hover:border-risegold/60"
        } ${saving ? "opacity-60" : ""}`}
      >
        <Icon className="h-3.5 w-3.5" />
      </button>
      {onCreateOutreach && hasSavedName && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onCreateOutreach}
          title="Create club outreach addressed to this contact"
          aria-label="Create club outreach addressed to this contact"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-risegold/70 text-risegold hover:bg-risegold/15 transition"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [addingToNetwork, setAddingToNetwork] = useState(false);
  const [page, setPage] = useState(1);
  const [addTeamOpen, setAddTeamOpen] = useState(false);
  // Outreach mode: filter to only clubs we have at least one contact for,
  // and surface a "Create outreach" shortcut next to each contact name.
  const [outreachMode, setOutreachMode] = useState(false);
  // "Missing contact" filter: when on, only show clubs we have no
  // identified contact for (no saved TD/CS name and no matching role
  // contact in the network). Helps staff focus on the gaps.
  const [missingContactMode, setMissingContactMode] = useState(false);
  // Logo upload (click a club crest to upload one). Writes to the
  // shared `club-logos` bucket and updates club_map_positions.image_url
  // so the same logo appears in the Coaching Database → Club Ratings tab.
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [logoUploadingClubId, setLogoUploadingClubId] = useState<string | null>(null);
  const [pendingLogoClub, setPendingLogoClub] = useState<ClubRow | null>(null);

  const triggerLogoUpload = (club: ClubRow) => {
    setPendingLogoClub(club);
    setTimeout(() => logoInputRef.current?.click(), 30);
  };

  const handleLogoFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const club = pendingLogoClub;
    if (logoInputRef.current) logoInputRef.current.value = "";
    setPendingLogoClub(null);
    if (!file || !club) return;
    setLogoUploadingClubId(club.id);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const slug = club.club_name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
      const path = `${slug}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("club-logos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("club-logos").getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase
        .from("club_map_positions")
        .update({ image_url: publicUrl })
        .eq("id", club.id);
      if (updateError) throw updateError;
      setClubs((prev) => prev.map((c) => (c.id === club.id ? { ...c, image_url: publicUrl } : c)));
      toast.success(`Logo uploaded for ${club.club_name}`);
    } catch (err: any) {
      console.error("Logo upload failed:", err);
      toast.error(err?.message ?? "Failed to upload logo");
    } finally {
      setLogoUploadingClubId(null);
    }
  };
  // Live activity log of additions / changes to the market table. Seeded with
  // the most recent saves and kept in sync via the realtime channel below so
  // every staff member sees teammates' edits as they happen.
  const [activity, setActivity] = useState<
    Array<{ id: string; club_id: string; td: string | null; cs: string | null; at: string; kind: "insert" | "update" }>
  >([]);
  const [activityOpen, setActivityOpen] = useState(false);
  // Clubs we already have an active outreach for — drives the green tick
  // next to the club name.
  const [outreachClubIds, setOutreachClubIds] = useState<Set<string>>(new Set());
  // Contact ids that already exist as a Relationship row — drives the
  // "Add to relationships" button state.
  const [relationshipContactIds, setRelationshipContactIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (clubId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(clubId) ? next.delete(clubId) : next.add(clubId);
      return next;
    });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Market Tables is driven by the saved Outreach Strategies. Each strategy
        // carries the country + league it represents and the explicit list of
        // club ids to include. We fetch those strategies, build a club_id ->
        // {country, league} map, then load the matching club rows from
        // club_map_positions so we get real names/logos.
        const { data: stratRows, error: stratErr } = await (supabase as any)
          .from("club_outreach_strategies")
          .select("name, filters");
        if (stratErr) throw stratErr;

        const { data: savedEntryRows, error: savedEntryErr } = await (supabase as any)
          .from("market_table_entries")
          .select("club_id, technical_director_name, chief_scout_name")
          .eq("market_table_key", MARKET_TABLE_KEY);
        if (savedEntryErr) throw savedEntryErr;

        // clubId -> labels from the strategy that references it. First strategy
        // wins so the same club doesn't end up duplicated under two leagues.
        const stratByClub = new Map<
          string,
          { country: string | null; league: string | null }
        >();
        (stratRows ?? []).forEach((s: any) => {
          const sCountry = ((s?.filters?.country ?? null) as string | null) || null;
          const sLevel =
            ((s?.filters?.league_level ?? s?.filters?.league ?? null) as string | null) || null;
          (s?.filters?.club_ids ?? []).forEach((id: string) => {
            if (!id) return;
            if (!stratByClub.has(id)) {
              stratByClub.set(id, { country: sCountry, league: sLevel });
            }
          });
        });

        // A saved market-table entry is also a permanent source of truth. This
        // stops previously added clubs or contacts disappearing just because a
        // strategy filter changes later.
        (savedEntryRows ?? []).forEach((r: any) => {
          if (!r?.club_id || stratByClub.has(r.club_id)) return;
          stratByClub.set(r.club_id, { country: null, league: null });
        });

        const clubIds = Array.from(stratByClub.keys());

        // Fetch the actual club rows in chunks (Supabase .in() caps at ~1000 ids).
        const clubRows: ClubRow[] = [];
        const CHUNK = 500;
        for (let i = 0; i < clubIds.length; i += CHUNK) {
          const slice = clubIds.slice(i, i + CHUNK);
          if (slice.length === 0) continue;
          const { data, error } = await supabase
            .from("club_map_positions")
            .select("id, club_name, country, league, league_level, image_url")
            .in("id", slice);
          if (error) throw error;
          clubRows.push(...(((data ?? []) as unknown) as ClubRow[]));
        }

        const allClubRows = await fetchAllClubRows();
        const existingClubIds = new Set(clubRows.map((c) => c.id));
        const exactBelgiumClubNames = new Map(
          allClubRows
            .filter((c) => c.country === "Belgium")
            .map((c) => [exactClubKey(c.club_name), c]),
        );
        const addExactBelgiumClubs = (names: string[], level: "1st" | "2nd") => {
          names.forEach((name) => {
            const c = exactBelgiumClubNames.get(exactClubKey(name));
            if (!c) return;
            // These Belgium lists were provided explicitly by the user, so they
            // override any broader saved strategy that may have the same club
            // without a league label.
            stratByClub.set(c.id, { country: "Belgium", league: level });
            if (!existingClubIds.has(c.id)) {
              clubRows.push(c);
              existingClubIds.add(c.id);
            }
          });
        };
        addExactBelgiumClubs(BELGIUM_1ST_CLUBS, "1st");
        addExactBelgiumClubs(BELGIUM_2ND_CLUBS, "2nd");

        // If any saved strategy has filters but no stored IDs, derive the rows
        // directly from the country + league labels rather than rendering zero.
        (stratRows ?? []).forEach((s: any) => {
          const sCountry = ((s?.filters?.country ?? null) as string | null) || null;
          const sLevel = ((s?.filters?.league_level ?? s?.filters?.league ?? null) as string | null) || null;
          if (!sCountry || !sLevel || (s?.filters?.club_ids ?? []).length > 0) return;
          allClubRows.forEach((c) => {
            const cLevel = c.league_level ?? c.league ?? null;
            if (c.country !== sCountry || cLevel !== sLevel || existingClubIds.has(c.id)) return;
            clubRows.push(c);
            existingClubIds.add(c.id);
            stratByClub.set(c.id, { country: sCountry, league: sLevel });
          });
        });

        const contactRows = await fetchAllContactRows();

        // Overlay the strategy's country + league onto the club record so the
        // filters always reflect the strategy the club was saved under, even
        // when the underlying club_map_positions row has different/older labels.
        const enriched: ClubRow[] = clubRows.map((c) => {
          const s = stratByClub.get(c.id);
          return {
            ...c,
            country: s?.country ?? c.country ?? null,
            league: s?.league ?? c.league ?? c.league_level ?? null,
          };
        });

        setClubs(
          enriched.sort((a, b) => {
            const c = (a.country ?? "").localeCompare(b.country ?? "");
            if (c !== 0) return c;
            const l = (a.league ?? "").localeCompare(b.league ?? "");
            if (l !== 0) return l;
            return a.club_name.localeCompare(b.club_name);
          }),
        );
        setContacts(contactRows);
        const map: Record<string, Entry> = {};
        (savedEntryRows ?? []).forEach((r: any) => {
          map[r.club_id] = {
            club_id: r.club_id,
            technical_director_name: r.technical_director_name,
            chief_scout_name: r.chief_scout_name,
          };
        });
        setEntries(map);
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to load market tables");
        setClubs([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Live-sync market_table_entries so multiple staff editing the table at the
  // same time see each other's saves immediately instead of overwriting them
  // with stale local state on their next save.
  useEffect(() => {
    const channel = supabase
      .channel("market-table-entries-sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "market_table_entries",
          filter: `market_table_key=eq.${MARKET_TABLE_KEY}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as any;
          if (!row?.club_id) return;
          setEntries((prev) => {
            if (payload.eventType === "DELETE") {
              const next = { ...prev };
              delete next[row.club_id];
              return next;
            }
            return {
              ...prev,
              [row.club_id]: {
                club_id: row.club_id,
                technical_director_name: row.technical_director_name ?? null,
                chief_scout_name: row.chief_scout_name ?? null,
              },
            };
          });
          if (payload.eventType !== "DELETE") {
            setActivity((prev) => {
              const next = [
                {
                  id: `${row.id ?? row.club_id}-${row.updated_at ?? Date.now()}`,
                  club_id: row.club_id,
                  td: row.technical_director_name ?? null,
                  cs: row.chief_scout_name ?? null,
                  at: (row.updated_at as string) ?? new Date().toISOString(),
                  kind: (payload.eventType === "INSERT" ? "insert" : "update") as
                    | "insert"
                    | "update",
                },
                ...prev.filter((e) => e.club_id !== row.club_id || e.at !== (row.updated_at ?? "")),
              ];
              return next.slice(0, 60);
            });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Seed the activity feed with the most recent saves so the popover is
  // useful straight away rather than only after a teammate makes an edit
  // while we're watching.
  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any)
        .from("market_table_entries")
        .select("id, club_id, technical_director_name, chief_scout_name, created_at, updated_at")
        .eq("market_table_key", MARKET_TABLE_KEY)
        .order("updated_at", { ascending: false })
        .limit(40);
      if (error || !data) return;
      setActivity(
        (data as any[]).map((r) => ({
          id: `${r.id}-${r.updated_at}`,
          club_id: r.club_id,
          td: r.technical_director_name ?? null,
          cs: r.chief_scout_name ?? null,
          at: r.updated_at ?? r.created_at,
          kind: r.created_at === r.updated_at ? "insert" : "update",
        })),
      );
    })();
  }, []);

  // Load every active club_outreach_link so we can tick clubs that already
  // have an outreach, and load every existing relationship contact id so we
  // can show "added" state on the per-contact Relationships button.
  useEffect(() => {
    (async () => {
      const [{ data: linkRows }, { data: relRows }] = await Promise.all([
        supabase
          .from("club_outreach_links")
          .select("club_id")
          .is("archived_at", null)
          .limit(10000),
        (supabase as any)
          .from("outreach_relationships")
          .select("contact_id")
          .eq("manually_added", true)
          .limit(10000),
      ]);
      const cs = new Set<string>();
      (linkRows ?? []).forEach((r: any) => { if (r.club_id) cs.add(r.club_id); });
      setOutreachClubIds(cs);
      const rs = new Set<string>();
      (relRows ?? []).forEach((r: any) => { if (r.contact_id) rs.add(r.contact_id); });
      setRelationshipContactIds(rs);
    })();
  }, []);

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
      if (outreachMode) {
        const e = entries[c.id];
        const hasNamed =
          !!(e?.technical_director_name && e.technical_director_name.trim()) ||
          !!(e?.chief_scout_name && e.chief_scout_name.trim());
        if (hasNamed) return true;
        const td = matchContactForClub(contacts, c.club_name, c.country, TD_RE);
        const cs = matchContactForClub(contacts, c.club_name, c.country, CS_RE);
        if (td || cs) return true;
        const extras = additionalContactsForClub(contacts, c.club_name, c.country, new Set());
        if (extras.length > 0) return true;
        return false;
      }
      if (missingContactMode) {
        const e = entries[c.id];
        const hasNamed =
          !!(e?.technical_director_name && e.technical_director_name.trim()) ||
          !!(e?.chief_scout_name && e.chief_scout_name.trim());
        if (hasNamed) return false;
        const td = matchContactForClub(contacts, c.club_name, c.country, TD_RE);
        const cs = matchContactForClub(contacts, c.club_name, c.country, CS_RE);
        if (td || cs) return false;
        const extras = additionalContactsForClub(contacts, c.club_name, c.country, new Set());
        if (extras.length > 0) return false;
        return true;
      }
      return true;
    });
  }, [clubs, country, league, search, outreachMode, missingContactMode, entries, contacts]);

  // Reset to first page whenever the active filter / search changes so the
  // user always sees the start of the new result set.
  useEffect(() => {
    setPage(1);
  }, [country, league, search, outreachMode, missingContactMode]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const paged = useMemo(() => filtered.slice(pageStart, pageEnd), [filtered, pageStart, pageEnd]);

  // Completion tally: how many clubs in the table now have at least one
  // identified contact (TD/CS name saved or a matching role contact in the
  // network). Drives the "X of Y clubs · Z%" pill at the top.
  const tally = useMemo(() => {
    const total = clubs.length;
    let withContact = 0;
    clubs.forEach((c) => {
      const e = entries[c.id];
      const hasName =
        !!(e?.technical_director_name && e.technical_director_name.trim()) ||
        !!(e?.chief_scout_name && e.chief_scout_name.trim());
      if (hasName) {
        withContact++;
        return;
      }
      const td = matchContactForClub(contacts, c.club_name, c.country, TD_RE);
      const cs = matchContactForClub(contacts, c.club_name, c.country, CS_RE);
      if (td || cs) withContact++;
    });
    const pct = total === 0 ? 0 : Math.round((withContact / total) * 100);
    return { total, withContact, pct };
  }, [clubs, entries, contacts]);
  const clubNameById = useMemo(() => {
    const map = new Map<string, string>();
    clubs.forEach((c) => map.set(c.id, c.club_name));
    return map;
  }, [clubs]);

  const getValues = (club: ClubRow) => {
    const entry = entries[club.id];
    const tdRoleContact = matchContactForClub(contacts, club.club_name, club.country, TD_RE);
    const csRoleContact = matchContactForClub(contacts, club.club_name, club.country, CS_RE);
    const tdName = entry?.technical_director_name ?? tdRoleContact?.name ?? "";
    const csName = entry?.chief_scout_name ?? csRoleContact?.name ?? "";
    const tdContact = tdName
      ? matchContactByNameForClub(contacts, club.club_name, club.country, tdName)
      : tdRoleContact;
    const csContact = csName
      ? matchContactByNameForClub(contacts, club.club_name, club.country, csName)
      : csRoleContact;
    return { tdContact, csContact, tdName, csName };
  };

  const ensureRelationshipShell = async (contactId: string) => {
    const { data: existing, error: existingErr } = await (supabase as any)
      .from("outreach_relationships")
      .select("id, manually_added")
      .eq("contact_id", contactId)
      .maybeSingle();
    if (existingErr) throw existingErr;
    if (existing?.id) {
      const { error } = await (supabase as any)
        .from("outreach_relationships")
        .update({ manually_added: true, is_archived: false })
        .eq("id", existing.id);
      if (error) throw error;
      return;
    }
    const { error } = await (supabase as any)
      .from("outreach_relationships")
      .insert({
        contact_id: contactId,
        rapport_level: "cold",
        nudge_week_start: mondayOf(new Date()),
        nudge_dates: [],
        manually_added: true,
      });
    if (error) throw error;
  };

  const ensureContactShell = async (club: ClubRow, name: string | null, position: string) => {
    const clean = (name ?? "").trim();
    if (!clean) return null;
    const { data: existing, error: existingErr } = await supabase
      .from("club_network_contacts")
      .select(CONTACT_SELECT)
      .eq("name", clean)
      .eq("club_name", club.club_name)
      .maybeSingle();
    if (existingErr) throw existingErr;
    const contact = existing ?? (await (async () => {
      const { data, error } = await supabase
        .from("club_network_contacts")
        .insert({
          name: clean,
          position,
          club_name: club.club_name,
          country: club.country,
        })
        .select(CONTACT_SELECT)
        .single();
      if (error) throw error;
      return data;
    })());
    setContacts((prev) => upsertContactRow(prev, contact as ContactRow));
    return contact as ContactRow;
  };

  const persist = async (clubId: string, patch: Partial<Entry>) => {
    const current = entries[clubId] ?? {
      club_id: clubId,
      technical_director_name: null,
      chief_scout_name: null,
    };
    const next: Entry = { ...current, ...patch, club_id: clubId };
    setEntries((prev) => ({ ...prev, [clubId]: next }));
    // Only send the columns that actually changed so concurrent edits from
    // other staff on the *other* column don't get clobbered by our stale copy.
    const payload: Record<string, unknown> = {
      market_table_key: MARKET_TABLE_KEY,
      club_id: clubId,
    };
    if ("technical_director_name" in patch) {
      payload.technical_director_name = patch.technical_director_name ?? null;
    }
    if ("chief_scout_name" in patch) {
      payload.chief_scout_name = patch.chief_scout_name ?? null;
    }
    const saveRequest = (supabase as any)
      .from("market_table_entries")
      .upsert(payload, { onConflict: "market_table_key,club_id" });
    let error: { message: string } | null = null;
    try {
      const result = await Promise.race([
        saveRequest,
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error("Save timed out. Please try again.")), 15000);
        }),
      ]);
      error = result.error ?? null;
    } catch (e: any) {
      error = { message: e?.message ?? "Save failed" };
    }
    if (error) {
      setEntries((prev) => ({ ...prev, [clubId]: current }));
      toast.error(error.message);
      return false;
    }
    // Reconcile in the background with whatever's actually in the DB after the
    // partial upsert. This keeps the click feeling instant while still picking
    // up a teammate's concurrent edit to the other column.
    void (async () => {
      const { data: saved } = await (supabase as any)
        .from("market_table_entries")
        .select("club_id, technical_director_name, chief_scout_name")
        .eq("market_table_key", MARKET_TABLE_KEY)
        .eq("club_id", clubId)
        .maybeSingle();
      if (!saved) return;
      setEntries((prev) => ({
        ...prev,
        [clubId]: {
          club_id: clubId,
          technical_director_name: saved.technical_director_name ?? null,
          chief_scout_name: saved.chief_scout_name ?? null,
        },
      }));
    })();
    toast.success("Saved", { duration: 1200 });
    return true;
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

  const persistAndShell = async (club: ClubRow, role: "td" | "cs", value: string | null) => {
    if (role === "td") {
      return persist(club.id, { technical_director_name: value });
    }
    return persist(club.id, { chief_scout_name: value });
  };

  // Fire a window event the Staff page + ClubOutreachManager listen for.
  // Switches to the Club Outreach tab and opens a fresh New Outreach panel
  // with the chosen club and contact name pre-filled.
  const createOutreach = (club: ClubRow, contactName: string | null) => {
    const needsLogoFirst = !club.image_url || !club.image_url.trim();
    const detail = {
      clubId: club.id,
      clubName: club.club_name,
      country: club.country,
      imageUrl: club.image_url,
      preparedFor: (contactName ?? "").trim() || undefined,
      forceCreateClub: needsLogoFirst,
    };
    // Stash so ClubOutreachManager can pick it up reliably on mount,
    // independent of the dispatched-event timing race.
    try { sessionStorage.setItem("staff:pending-club-outreach-new", JSON.stringify({ at: Date.now(), detail })); } catch { /* noop */ }
    window.dispatchEvent(
      new CustomEvent("staff:switch-section", { detail: { section: "cluboutreach" } }),
    );
    // Wait for the section to mount before asking the manager to open the panel.
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("staff:open-club-outreach-new", {
          detail,
        }),
      );
    }, 80);
  };

  // Save LinkedIn URL for any contact slot. If we already have a network
  // contact row, write to club_network_contacts.linkedin_url. If the slot
  // only holds a typed-in TD/CS name with no contact row yet, write to
  // club_map_positions.{technical_director_linkedin_url|chief_scout_linkedin_url}
  // so the URL still persists.
  const saveLinkedIn = async (
    club: ClubRow,
    role: "td" | "cs" | "extra",
    contact: ContactRow | null,
    url: string | null,
  ) => {
    try {
      if (contact) {
        const { error } = await supabase
          .from("club_network_contacts")
          .update({ linkedin_url: url })
          .eq("id", contact.id);
        if (error) throw error;
        setContacts((prev) => upsertContactRow(prev, { ...contact, linkedin_url: url }));
      } else if (role === "td" || role === "cs") {
        const column =
          role === "td"
            ? "technical_director_linkedin_url"
            : "chief_scout_linkedin_url";
        const { error } = await (supabase as any)
          .from("club_map_positions")
          .update({ [column]: url })
          .eq("id", club.id);
        if (error) throw error;
        // Reflect locally so the button colour updates immediately.
        setClubs((prev) =>
          prev.map((c) =>
            c.id === club.id ? ({ ...c, [column]: url } as ClubRow & Record<string, any>) : c,
          ),
        );
      }
      toast.success(url ? "LinkedIn saved" : "LinkedIn removed", { duration: 1200 });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save LinkedIn URL");
    }
  };

  // Manually add a single named contact to Relationships. Creates a
  // network contact shell if needed, then inserts an outreach_relationships
  // row (idempotent by contact_id thanks to the unique index).
  const addContactToRelationships = async (
    club: ClubRow,
    name: string | null,
    role: "td" | "cs" | "extra",
    existing: ContactRow | null,
  ) => {
    try {
      const clean = (existing?.name ?? name ?? "").trim();
      if (!clean) {
        toast.error("Add a name first");
        return;
      }
      const position =
        existing?.position ??
        (role === "td" ? "Technical Director" : role === "cs" ? "Chief Scout" : "");
      const contact = existing ?? (await ensureContactShell(club, clean, position));
      if (!contact) return;
      if (relationshipContactIds.has(contact.id)) {
        toast.info("Already in Relationships");
        return;
      }
      await ensureRelationshipShell(contact.id);
      setRelationshipContactIds((prev) => {
        const next = new Set(prev);
        next.add(contact.id);
        return next;
      });
      toast.success(`Added ${contact.name} to Relationships`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to add to Relationships");
    }
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
    try {
      const payload = {
        name: draft.name.trim(),
        position: draft.position.trim() || null,
        email: draft.email.trim() || null,
        phone: draft.phone.trim() || null,
        club_name: club.club_name,
        country: club.country,
      };
      const { data: saved, error } = existing
        ? await supabase.from("club_network_contacts").update(payload).eq("id", existing.id).select(CONTACT_SELECT).single()
        : await supabase.from("club_network_contacts").insert(payload).select(CONTACT_SELECT).single();
      if (error) {
        toast.error(error.message);
        return;
      }
      // For TD / Chief Scout slots, also persist the name into the market table entry so it sticks.
      if (role === "td") {
        const ok = await persist(club.id, { technical_director_name: payload.name });
        if (!ok) return;
      } else if (role === "cs") {
        const ok = await persist(club.id, { chief_scout_name: payload.name });
        if (!ok) return;
      }
      if (saved?.id) {
        setContacts((prev) => upsertContactRow(prev, saved as ContactRow));
      }
      // Defensive: re-pull any contacts attached to this club so the extras
      // list is guaranteed to reflect the new row immediately (handles weird
      // edge cases like the same contact id already being present with a
      // different normalised club_name).
      try {
        const { data: refreshed } = await supabase
          .from("club_network_contacts")
          .select(CONTACT_SELECT)
          .eq("club_name", club.club_name);
        if (Array.isArray(refreshed) && refreshed.length > 0) {
          setContacts((prev) => {
            let next = prev;
            (refreshed as ContactRow[]).forEach((r) => {
              next = upsertContactRow(next, r);
            });
            return next;
          });
        }
      } catch {
        /* non-fatal */
      }
      toast.success(existing ? "Contact updated" : "Contact added");
      setEditing(null);
      setExpanded((prev) => {
        const next = new Set(prev);
        next.add(club.id);
        return next;
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSavingContact(false);
    }
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
            {filtered.length === 0
              ? "0 clubs"
              : `Showing ${pageStart + 1}–${Math.min(pageEnd, filtered.length)} of ${filtered.length}`}
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-risegold/40 bg-risegold/10 px-2.5 py-1 text-[11px] font-medium text-risegold"
            title="Clubs with at least one identified contact"
          >
            <Check className="h-3 w-3" />
            {tally.withContact}/{tally.total} clubs · {tally.pct}%
          </span>
          <button
            type="button"
            onClick={() => setOutreachMode((v) => !v)}
            title="Show only clubs we have a contact for, with one-click outreach"
            className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11px] transition ${
              outreachMode
                ? "border-risegold bg-risegold/20 text-risegold"
                : "border-border bg-background/60 text-muted-foreground hover:text-white hover:border-risegold/60"
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            Outreach mode {outreachMode ? "· on" : ""}
          </button>
          <button
            type="button"
            onClick={() => setMissingContactMode((v) => !v)}
            title="Show only clubs we have no identified contact for"
            className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11px] transition ${
              missingContactMode
                ? "border-risegold bg-risegold/20 text-risegold"
                : "border-border bg-background/60 text-muted-foreground hover:text-white hover:border-risegold/60"
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            Missing contact {missingContactMode ? "· on" : ""}
          </button>
          <Popover open={activityOpen} onOpenChange={setActivityOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background/60 px-2 text-[11px] text-muted-foreground hover:text-white hover:border-risegold/60"
                title="Recent additions and edits"
              >
                <History className="h-3.5 w-3.5" />
                Activity
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[320px] p-0">
              <div className="border-b border-border px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                Live activity
              </div>
              <ScrollArea className="max-h-[320px]">
                {activity.length === 0 ? (
                  <div className="p-3 text-xs text-muted-foreground">No saves yet.</div>
                ) : (
                  <ul className="divide-y divide-border">
                    {activity.map((a) => {
                      const when = new Date(a.at);
                      const name = clubNameById.get(a.club_id) ?? "Unknown club";
                      const parts = [
                        a.td ? `TD: ${a.td}` : null,
                        a.cs ? `CS: ${a.cs}` : null,
                      ].filter(Boolean) as string[];
                      return (
                        <li key={a.id} className="px-3 py-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-white truncate">{name}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {when.toLocaleString(undefined, {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {a.kind === "insert" ? "Added" : "Updated"}
                            {parts.length > 0 ? ` · ${parts.join(" · ")}` : ""}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
          <span className="ml-auto text-[10px] text-muted-foreground hidden md:inline">
            Use the heart on a contact to add them to Relationships.
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
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="sm:w-auto h-9 gap-1.5"
            onClick={() => setAddTeamOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" /> Add team
          </Button>
        </div>
      </div>

      {/* Mobile: stacked cards. Desktop: full table. */}
      <div className="md:hidden space-y-2">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
            No clubs match this filter. Adjust the country / league above, or add the clubs to a saved Strategy first.
          </div>
        )}
        {paged.map((club) => {
          const { tdContact, csContact, tdName, csName } = getValues(club);
          const exclude = new Set<string>();
          if (tdContact) exclude.add(tdContact.id);
          if (csContact) exclude.add(csContact.id);
          const extras = additionalContactsForClub(contacts, club.club_name, club.country, exclude);
          const isOpen = expanded.has(club.id);
          return (
            <div key={`m-${club.id}`} className="rounded-xl border border-border bg-card p-3 space-y-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => triggerLogoUpload(club)}
                  title={club.image_url ? "Replace club logo" : "Upload club logo"}
                  className="relative h-8 w-8 rounded-sm bg-white/5 overflow-hidden hover:ring-2 hover:ring-[#C6A332] transition shrink-0"
                  disabled={logoUploadingClubId === club.id}
                >
                  {club.image_url ? (
                    <img src={club.image_url} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-muted-foreground">＋</span>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-white font-medium text-sm truncate">{club.club_name}</span>
                    {outreachClubIds.has(club.id) && (
                      <CheckCircle2
                        className="h-3.5 w-3.5 shrink-0 text-emerald-400"
                        aria-label="Club outreach already created"
                      />
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {club.country ?? "—"}{club.league ? ` · ${club.league}` : ""}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Technical Director</Label>
                <MarketContactSlot
                  value={tdName}
                  contact={tdContact}
                  placeholder="Add name"
                  inputClassName="h-9 text-sm flex-1"
                  links={renderContactLinks(tdContact)}
                  onConfirm={(v) => persistAndShell(club, "td", v)}
                  onEdit={() => openEdit(club, "td", tdContact)}
                  onCreateOutreach={outreachMode ? () => createOutreach(club, tdName || tdContact?.name || null) : undefined}
                  linkedinUrl={tdContact?.linkedin_url ?? (club as any).technical_director_linkedin_url ?? null}
                  onSaveLinkedin={(v) => saveLinkedIn(club, "td", tdContact, v)}
                  onAddToRelationships={() => addContactToRelationships(club, tdName, "td", tdContact)}
                  inRelationships={!!(tdContact && relationshipContactIds.has(tdContact.id))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Chief Scout</Label>
                <MarketContactSlot
                  value={csName}
                  contact={csContact}
                  placeholder="Add name"
                  inputClassName="h-9 text-sm flex-1"
                  links={renderContactLinks(csContact)}
                  onConfirm={(v) => persistAndShell(club, "cs", v)}
                  onEdit={() => openEdit(club, "cs", csContact)}
                  onCreateOutreach={outreachMode ? () => createOutreach(club, csName || csContact?.name || null) : undefined}
                  linkedinUrl={csContact?.linkedin_url ?? (club as any).chief_scout_linkedin_url ?? null}
                  onSaveLinkedin={(v) => saveLinkedIn(club, "cs", csContact, v)}
                  onAddToRelationships={() => addContactToRelationships(club, csName, "cs", csContact)}
                  inRelationships={!!(csContact && relationshipContactIds.has(csContact.id))}
                />
              </div>
              <div className="pt-1 border-t border-border/40">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(club.id)}
                    className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-white"
                  >
                    <Users className="h-3 w-3" />
                    {extras.length} additional contact{extras.length === 1 ? "" : "s"}
                    <ChevronRight className={`h-3 w-3 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openExtraEdit(club, null)}
                    className="inline-flex items-center gap-1 text-[11px] text-risegold hover:text-foreground"
                  >
                    <UserPlus className="h-3 w-3" /> Add
                  </button>
                </div>
                {isOpen && (
                  extras.length === 0 ? (
                    <p className="mt-2 text-[11px] text-muted-foreground">No additional contacts in the network for this club.</p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {extras.map((c) => (
                        <li key={c.id} className="flex items-center gap-2 text-xs flex-wrap">
                          <span className="text-white">{c.name}</span>
                          {c.position && <span className="text-muted-foreground">· {c.position}</span>}
                          {renderContactLinks(c)}
                          <LinkedInButton
                            url={c.linkedin_url ?? null}
                            onSave={(v) => saveLinkedIn(club, "extra", c, v)}
                            size="xs"
                          />
                          <button
                            type="button"
                            onClick={() => addContactToRelationships(club, c.name, "extra", c)}
                            title={relationshipContactIds.has(c.id) ? "Already in Relationships" : "Add to Relationships"}
                            disabled={relationshipContactIds.has(c.id)}
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-md border ${
                              relationshipContactIds.has(c.id)
                                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 cursor-default"
                                : "border-border text-muted-foreground hover:text-white"
                            }`}
                          >
                            <Heart className="h-3 w-3" fill={relationshipContactIds.has(c.id) ? "currentColor" : "none"} />
                          </button>
                          {outreachMode && (
                            <button
                              type="button"
                              onClick={() => createOutreach(club, c.name)}
                              title="Create club outreach addressed to this contact"
                              className="inline-flex items-center gap-1 rounded-md border border-risegold/70 px-1.5 py-0.5 text-[10px] text-risegold hover:bg-risegold/15"
                            >
                              <Send className="h-3 w-3" /> Outreach
                            </button>
                          )}
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
                  )
                )}
              </div>
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
                No clubs match this filter. Adjust the country / league above, or add the clubs to a saved Strategy first.
              </td></tr>
            )}
            {paged.map((club) => {
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
                      <button
                        type="button"
                        onClick={() => triggerLogoUpload(club)}
                        title={club.image_url ? "Replace club logo" : "Upload club logo"}
                        className="relative h-6 w-6 rounded-sm bg-white/5 overflow-hidden hover:ring-2 hover:ring-[#C6A332] transition shrink-0 flex items-center justify-center"
                        disabled={logoUploadingClubId === club.id}
                      >
                        {club.image_url ? (
                          <img src={club.image_url} alt="" className="h-full w-full object-contain" />
                        ) : (
                          <span className="text-[10px] text-muted-foreground leading-none">＋</span>
                        )}
                      </button>
                      <span className="text-white font-medium">{club.club_name}</span>
                      {outreachClubIds.has(club.id) && (
                        <CheckCircle2
                          className="h-3.5 w-3.5 shrink-0 text-emerald-400"
                          aria-label="Club outreach already created"
                        />
                      )}
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
                    <MarketContactSlot
                      value={tdName}
                      contact={tdContact}
                      placeholder="Add name"
                      inputClassName="h-8 text-sm min-w-[160px]"
                      links={renderContactLinks(tdContact)}
                      onConfirm={(v) => persistAndShell(club, "td", v)}
                      onEdit={() => openEdit(club, "td", tdContact)}
                      onCreateOutreach={outreachMode ? () => createOutreach(club, tdName || tdContact?.name || null) : undefined}
                      linkedinUrl={tdContact?.linkedin_url ?? (club as any).technical_director_linkedin_url ?? null}
                      onSaveLinkedin={(v) => saveLinkedIn(club, "td", tdContact, v)}
                      onAddToRelationships={() => addContactToRelationships(club, tdName, "td", tdContact)}
                      inRelationships={!!(tdContact && relationshipContactIds.has(tdContact.id))}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <MarketContactSlot
                      value={csName}
                      contact={csContact}
                      placeholder="Add name"
                      inputClassName="h-8 text-sm min-w-[160px]"
                      links={renderContactLinks(csContact)}
                      onConfirm={(v) => persistAndShell(club, "cs", v)}
                      onEdit={() => openEdit(club, "cs", csContact)}
                      onCreateOutreach={outreachMode ? () => createOutreach(club, csName || csContact?.name || null) : undefined}
                      linkedinUrl={csContact?.linkedin_url ?? (club as any).chief_scout_linkedin_url ?? null}
                      onSaveLinkedin={(v) => saveLinkedIn(club, "cs", csContact, v)}
                      onAddToRelationships={() => addContactToRelationships(club, csName, "cs", csContact)}
                      inRelationships={!!(csContact && relationshipContactIds.has(csContact.id))}
                    />
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
                            className="inline-flex items-center gap-1 text-[11px] text-risegold hover:text-foreground"
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
                                <LinkedInButton
                                  url={c.linkedin_url ?? null}
                                  onSave={(v) => saveLinkedIn(club, "extra", c, v)}
                                  size="xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => addContactToRelationships(club, c.name, "extra", c)}
                                  title={relationshipContactIds.has(c.id) ? "Already in Relationships" : "Add to Relationships"}
                                  disabled={relationshipContactIds.has(c.id)}
                                  className={`inline-flex h-6 w-6 items-center justify-center rounded-md border ${
                                    relationshipContactIds.has(c.id)
                                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 cursor-default"
                                      : "border-border text-muted-foreground hover:text-white"
                                  }`}
                                >
                                  <Heart className="h-3 w-3" fill={relationshipContactIds.has(c.id) ? "currentColor" : "none"} />
                                </button>
                                {outreachMode && (
                                  <button
                                    type="button"
                                    onClick={() => createOutreach(club, c.name)}
                                    title="Create club outreach addressed to this contact"
                                    className="inline-flex items-center gap-1 rounded-md border border-risegold/70 px-1.5 py-0.5 text-[10px] text-risegold hover:bg-risegold/15"
                                  >
                                    <Send className="h-3 w-3" /> Outreach
                                  </button>
                                )}
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

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 text-xs">
          <span className="text-muted-foreground">
            Page {safePage} of {totalPages} · {filtered.length} clubs
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              disabled={safePage <= 1}
              onClick={() => setPage(1)}
            >
              First
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              disabled={safePage >= totalPages}
              onClick={() => setPage(totalPages)}
            >
              Last
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {contactHasSavedDetails(editing?.existing ?? null) ? "Edit contact details" : "Add contact details"} — {editing?.club.club_name}
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
      <AddTeamDialog
        open={addTeamOpen}
        onOpenChange={setAddTeamOpen}
        defaultCountry={country !== "all" ? country : null}
        defaultLeague={league !== "all" ? league : null}
      />
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleLogoFileChosen}
      />
      <AddTeamDialog
        open={false}
        onOpenChange={() => {}}
        onCreated={async (team: AddedTeam) => {
          // Insert a market_table_entries row so the new club shows up on this
          // table immediately, then push the enriched row into local state.
          try {
            await (supabase as any)
              .from("market_table_entries")
              .upsert(
                {
                  market_table_key: MARKET_TABLE_KEY,
                  club_id: team.id,
                  technical_director_name: null,
                  chief_scout_name: null,
                },
                { onConflict: "market_table_key,club_id" },
              );
          } catch (_) { /* ignore — club still gets added to the local list */ }
          setClubs((prev) => [
            ...prev,
            {
              id: team.id,
              club_name: team.club_name,
              country: team.country,
              league: team.league ?? team.league_level ?? null,
              league_level: team.league_level,
              image_url: team.image_url,
            } as ClubRow,
          ].sort((a, b) => {
            const c = (a.country ?? "").localeCompare(b.country ?? "");
            if (c !== 0) return c;
            return a.club_name.localeCompare(b.club_name);
          }));
        }}
      />
    </div>
  );
}