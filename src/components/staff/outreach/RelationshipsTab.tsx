import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Bell, Archive, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

type Rapport = "cold" | "warming" | "friendly" | "trusted" | "champion";

const RAPPORT_LEVELS: { v: Rapport; label: string; cls: string }[] = [
  { v: "cold", label: "Cold", cls: "bg-slate-700 text-slate-200" },
  { v: "warming", label: "Warming", cls: "bg-amber-700/40 text-amber-200" },
  { v: "friendly", label: "Friendly", cls: "bg-emerald-700/40 text-emerald-200" },
  { v: "trusted", label: "Trusted", cls: "bg-sky-700/40 text-sky-200" },
  { v: "champion", label: "Champion", cls: "bg-[#C6A332]/30 text-[#C6A332]" },
];

type Contact = {
  id: string;
  name: string;
  club_name: string | null;
  position: string | null;
  country: string | null;
  image_url: string | null;
};

type Relationship = {
  id: string;
  contact_id: string;
  rapport_level: Rapport;
  nudge_week_start: string | null;
  nudge_dates: string[];
  last_outreach_at: string | null;
  is_archived: boolean;
  contact?: Contact;
  notes?: Note[];
};

type Note = {
  id: string;
  relationship_id: string;
  body: string;
  author_name: string | null;
  created_at: string;
};

function mondayOf(d: Date): string {
  const x = new Date(d);
  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  x.setDate(x.getDate() + diff);
  return x.toISOString().slice(0, 10);
}

function generateWeeklyNudges(): string[] {
  const monday = new Date(mondayOf(new Date()));
  const count = 3 + Math.floor(Math.random() * 3); // 3..5
  const pool = [0, 1, 2, 3, 4, 5, 6];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picked = pool.slice(0, count).sort((a, b) => a - b);
  return picked.map((offset) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  });
}

function daysSince(iso: string | null): string {
  if (!iso) return "Never";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export default function RelationshipsTab() {
  const [rows, setRows] = useState<Relationship[]>([]);
  const [search, setSearch] = useState("");
  const [rapportFilter, setRapportFilter] = useState<"all" | Rapport>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const todayISO = new Date().toISOString().slice(0, 10);

  const load = async () => {
    const { data: rels, error } = await supabase
      .from("outreach_relationships" as any)
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    const list = (rels ?? []) as any as Relationship[];
    const contactIds = list.map((r) => r.contact_id);
    const [{ data: cData }, { data: nData }] = await Promise.all([
      contactIds.length
        ? supabase.from("club_network_contacts").select("id,name,club_name,position,country,image_url").in("id", contactIds)
        : Promise.resolve({ data: [] as any[] }),
      list.length
        ? supabase.from("outreach_relationship_notes" as any).select("*").in("relationship_id", list.map((r) => r.id)).order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const cMap = new Map((cData ?? []).map((c: any) => [c.id, c]));
    const nByRel = new Map<string, Note[]>();
    ((nData ?? []) as any as Note[]).forEach((n) => {
      const arr = nByRel.get(n.relationship_id) ?? [];
      arr.push(n);
      nByRel.set(n.relationship_id, arr);
    });

    // Lazy regenerate weekly nudges
    const monday = mondayOf(new Date());
    const needsRegen = list.filter((r) => !r.is_archived && r.nudge_week_start !== monday);
    if (needsRegen.length) {
      await Promise.all(needsRegen.map(async (r) => {
        const dates = generateWeeklyNudges();
        r.nudge_dates = dates;
        r.nudge_week_start = monday;
        await supabase.from("outreach_relationships" as any).update({ nudge_dates: dates, nudge_week_start: monday }).eq("id", r.id);
      }));
    }

    setRows(list.map((r) => ({
      ...r,
      contact: cMap.get(r.contact_id) as Contact | undefined,
      notes: nByRel.get(r.id) ?? [],
    })));
  };

  useEffect(() => { load(); }, []);

  const loadContacts = async () => {
    const { data } = await supabase
      .from("club_network_contacts")
      .select("id,name,club_name,position,country,image_url")
      .order("name");
    setContacts((data ?? []) as any);
  };

  const openAdd = async () => { await loadContacts(); setAddOpen(true); };

  const addRelationship = async (contactId: string) => {
    const monday = mondayOf(new Date());
    const { error } = await supabase.from("outreach_relationships" as any).insert({
      contact_id: contactId,
      rapport_level: "cold",
      nudge_week_start: monday,
      nudge_dates: generateWeeklyNudges(),
    });
    if (error) { toast.error(error.message); return; }
    setAddOpen(false);
    toast.success("Relationship added");
    load();
  };

  const setRapport = async (id: string, value: Rapport) => {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, rapport_level: value } : r));
    const { error } = await supabase.from("outreach_relationships" as any).update({ rapport_level: value }).eq("id", id);
    if (error) toast.error(error.message);
  };

  const toggleArchive = async (id: string, archived: boolean) => {
    const { error } = await supabase.from("outreach_relationships" as any).update({ is_archived: archived }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const addNote = async (rel: Relationship, body: string) => {
    if (!body.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    let authorName: string | null = null;
    if (user) {
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      authorName = prof?.full_name ?? user.email ?? null;
    }
    const { error } = await supabase.from("outreach_relationship_notes" as any).insert({
      relationship_id: rel.id,
      body: body.trim(),
      author_id: user?.id ?? null,
      author_name: authorName,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Note added");
    load();
  };

  const filtered = useMemo(() => rows.filter((r) => {
    if (!showArchived && r.is_archived) return false;
    if (showArchived && !r.is_archived) return false;
    if (rapportFilter !== "all" && r.rapport_level !== rapportFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${r.contact?.name ?? ""} ${r.contact?.club_name ?? ""} ${r.contact?.position ?? ""} ${r.contact?.country ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [rows, showArchived, rapportFilter, search]);

  const thisWeekNudges = useMemo(() => {
    return filtered.filter((r) => (r.nudge_dates ?? []).some((d) => d >= todayISO));
  }, [filtered, todayISO]);

  const dueToday = thisWeekNudges.filter((r) => (r.nudge_dates ?? []).includes(todayISO));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
        <Input
          placeholder="Search name, club, role, country"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-xs"
        />
        <div className="flex gap-2 flex-wrap">
          <Select value={rapportFilter} onValueChange={(v) => setRapportFilter(v as any)}>
            <SelectTrigger className="flex-1 sm:w-40 min-w-[140px]"><SelectValue placeholder="Rapport" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All rapport</SelectItem>
              {RAPPORT_LEVELS.map((l) => <SelectItem key={l.v} value={l.v}>{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? "Active" : "Archived"}
          </Button>
        </div>
        <Button
          onClick={openAdd}
          className="bg-[#C6A332] text-black hover:bg-[#C6A332]/90 w-full sm:w-auto sm:ml-auto"
        >
          <Plus className="w-4 h-4 mr-1" /> Add relationship
        </Button>
      </div>

      {dueToday.length > 0 && (
        <div className="rounded-lg border-2 border-[#C6A332]/60 bg-[#C6A332]/10 p-3">
          <div className="flex items-center gap-2 text-sm text-[#C6A332] font-semibold mb-2">
            <Bell className="w-4 h-4" /> Nudges due today ({dueToday.length})
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {dueToday.map((r) => (
              <span key={r.id} className="px-2 py-1 rounded bg-background/60 border border-border">
                {r.contact?.name} <span className="text-muted-foreground">— {r.contact?.club_name ?? "—"}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((r) => (
          <RelationshipCard
            key={r.id}
            rel={r}
            isDue={(r.nudge_dates ?? []).includes(todayISO)}
            onRapport={(v) => setRapport(r.id, v)}
            onAddNote={(b) => addNote(r, b)}
            onArchive={() => toggleArchive(r.id, !r.is_archived)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center text-sm text-muted-foreground py-12 border border-dashed border-border rounded-lg">
            No relationships yet. Add a contact from your network to start tracking rapport.
            Each active contact gets a random 3–5 weekly reach-out triggers.
          </div>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Add relationship</DialogTitle></DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto divide-y divide-border">
            {contacts.map((c) => {
              const taken = rows.some((r) => r.contact_id === c.id);
              return (
                <button
                  key={c.id}
                  disabled={taken}
                  onClick={() => addRelationship(c.id)}
                  className="w-full text-left flex items-center gap-3 p-2 hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {c.image_url ? <img src={c.image_url} alt="" className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-muted" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {[c.position, c.club_name, c.country].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  {taken && <span className="text-xs text-muted-foreground">Already tracked</span>}
                </button>
              );
            })}
            {contacts.length === 0 && <div className="p-4 text-sm text-muted-foreground">No contacts in your network yet.</div>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RelationshipCard({ rel, isDue, onRapport, onAddNote, onArchive }: {
  rel: Relationship;
  isDue: boolean;
  onRapport: (v: Rapport) => void;
  onAddNote: (body: string) => void;
  onArchive: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState(false);
  const rapport = RAPPORT_LEVELS.find((l) => l.v === rel.rapport_level)!;
  const notes = rel.notes ?? [];

  return (
    <div className={`rounded-lg border bg-card p-3 space-y-3 ${isDue ? "border-2 border-[#C6A332] shadow-[0_0_18px_rgba(198,163,50,0.25)]" : "border-border"}`}>
      <div className="flex items-start gap-3">
        {rel.contact?.image_url
          ? <img src={rel.contact.image_url} alt="" className="w-12 h-12 rounded-full object-cover" />
          : <div className="w-12 h-12 rounded-full bg-muted" />}
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{rel.contact?.name ?? "Unknown"}</div>
          <div className="text-xs text-muted-foreground truncate">
            {[rel.contact?.position, rel.contact?.club_name].filter(Boolean).join(" · ")}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">{rel.contact?.country ?? ""}</div>
        </div>
        <Button variant="ghost" size="icon" onClick={onArchive} title={rel.is_archived ? "Restore" : "Archive"}>
          <Archive className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={rel.rapport_level} onValueChange={(v) => onRapport(v as Rapport)}>
          <SelectTrigger className={`h-7 text-xs w-32 ${rapport.cls} border-0`}><SelectValue /></SelectTrigger>
          <SelectContent>
            {RAPPORT_LEVELS.map((l) => <SelectItem key={l.v} value={l.v}>{l.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">Last: {daysSince(rel.last_outreach_at)}</span>
        {isDue && <span className="text-xs px-2 py-0.5 rounded bg-[#C6A332] text-black font-semibold">Nudge today</span>}
      </div>

      <div className="space-y-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a note about your last conversation..."
          rows={2}
          className="text-sm"
        />
        <div className="flex justify-end">
          <Button size="sm" disabled={!draft.trim()} onClick={() => { onAddNote(draft); setDraft(""); }}>
            Save note
          </Button>
        </div>
      </div>

      {notes.length > 0 && (
        <div>
          <button onClick={() => setExpanded((v) => !v)} className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground">
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {notes.length} note{notes.length === 1 ? "" : "s"}
          </button>
          {expanded && (
            <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
              {notes.map((n) => (
                <div key={n.id} className="text-xs bg-muted/40 rounded p-2">
                  <div className="text-muted-foreground mb-1">
                    {n.author_name ?? "Staff"} · {new Date(n.created_at).toLocaleString("en-GB")}
                  </div>
                  <div className="whitespace-pre-wrap">{n.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}