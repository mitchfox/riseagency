import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronRight, Copy, ExternalLink, Loader2, Plus, Search, UserRoundCheck, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PlayerOfferCustomiser } from "./PlayerOfferCustomiser";
import { FitScoreBadge } from "./recruitment/FitScoreBadge";
import { TemplatePickerInline } from "./recruitment/TemplatePickerInline";
import { CreateOfferButton } from "./recruitment/CreateOfferButton";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import ProposalVisitorsBell, { type ProposalVisit } from "./outreach/ProposalVisitorsBell";
import ViewedVisitorsExpansion from "./outreach/ViewedVisitorsExpansion";
import { isRealNonUkVisit } from "@/lib/visitorFilters";
import { SearchWithSuggestions } from "./SearchWithSuggestions";

type OfferPlayer = {
  id: string;
  name: string;
  position: string | null;
  club: string | null;
  nationality: string | null;
  image_url: string | null;
  email: string | null;
  representation_status: string | null;
  has_representation_offer: boolean | null;
  date_of_birth?: string | null;
  fit_score?: number | null;
  fit_score_breakdown?: any;
  last_contact_at?: string | null;
  offer_status?: string | null;
  created_at?: string | null;
};

const slugFor = (name: string | null | undefined) =>
  (name || "").toLowerCase().trim().replace(/\s+/g, "-");

// Mirror ClubOutreachManager.openProposalLink — on Lovable preview hosts
// keep navigation same-origin so the Rise With Us page renders inside the
// editor iframe instead of escaping out.
const isLovablePreviewHost = () => {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost"
    || h.endsWith(".lovable.app")
    || h.endsWith(".lovableproject.com")
    || h.endsWith(".lovable.dev");
};

const GROUPS: { id: string; label: string; defaultOpen: boolean }[] = [
  { id: "drafts", label: "Drafts — not sent yet", defaultOpen: true },
  { id: "needs_followup", label: "Needs follow-up", defaultOpen: true },
  { id: "sent", label: "Offer sent — awaiting reply", defaultOpen: true },
  { id: "in_conversation", label: "In conversation", defaultOpen: true },
  { id: "signed", label: "Signed", defaultOpen: false },
  { id: "declined", label: "Declined / paused", defaultOpen: false },
];

const groupFor = (p: OfferPlayer): string => {
  const status = (p.offer_status || p.representation_status || "").toLowerCase();
  if (status.includes("sign")) return "signed";
  if (status.includes("declin") || status.includes("paus") || status.includes("lost")) return "declined";
  if (status.includes("convers") || status.includes("interest")) return "in_conversation";
  // Needs follow-up = last contact older than 7 days
  if (p.last_contact_at) {
    const days = (Date.now() - new Date(p.last_contact_at).getTime()) / 86400000;
    if (days >= 7) return "needs_followup";
    return "sent";
  }
  // No evidence of having sent yet → keep as draft.
  if ((p.offer_status || "").toLowerCase().includes("sent")) return "sent";
  return "drafts";
};

export const RepresentationOffers = () => {
  const [players, setPlayers] = useState<OfferPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [customising, setCustomising] = useState<OfferPlayer | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(GROUPS.map(g => [g.id, g.defaultOpen]))
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [newPlayer, setNewPlayer] = useState({ name: "", position: "", nationality: "", club: "", date_of_birth: "" });
  const [visits, setVisits] = useState<ProposalVisit[]>([]);
  const [allPlayers, setAllPlayers] = useState<{ id: string; name: string; position: string | null; club: string | null; nationality: string | null; date_of_birth: string | null; source: 'players' | 'youth' | 'pro' | 'scout' }[]>([]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("players")
      .select("id, name, position, club, nationality, image_url, email, representation_status, has_representation_offer, date_of_birth, fit_score, fit_score_breakdown, created_at")
      .or("has_representation_offer.eq.true,representation_status.eq.prospect")
      .order("name");
    if (error) {
      toast.error("Failed to load representation offers");
    } else {
      let rows = (data || []) as OfferPlayer[];
      const missingImageIds = rows.filter((p) => !p.image_url).map((p) => p.id);
      if (missingImageIds.length > 0) {
        const { data: galleryImages } = await (supabase as any)
          .from("marketing_gallery")
          .select("player_id, file_url, created_at")
          .in("player_id", missingImageIds)
          .eq("file_type", "image")
          .order("created_at", { ascending: true });
        const firstByPlayer = new Map<string, string>();
        (galleryImages || []).forEach((img: any) => {
          if (img.player_id && img.file_url && !firstByPlayer.has(img.player_id)) {
            firstByPlayer.set(img.player_id, img.file_url);
          }
        });
        if (firstByPlayer.size > 0) {
          rows = rows.map((p) => ({ ...p, image_url: p.image_url || firstByPlayer.get(p.id) || null }));
          await Promise.all(
            Array.from(firstByPlayer.entries()).map(([id, image_url]) =>
              (supabase as any)
                .from("players")
                .update({ image_url })
                .eq("id", id)
                .is("image_url", null),
            ),
          );
        }
      }
      setPlayers(rows);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Load all players from every database the Player Database aggregates so the
  // create-offer dialog can autocomplete from anyone we already track — not
  // just the `players` table. Sergej Savic etc. live in the outreach tables.
  useEffect(() => {
    (async () => {
      const [{ data: corePlayers }, { data: youth }, { data: pro }, { data: scouts }] = await Promise.all([
        (supabase as any).from("players").select("id, name, position, club, nationality, date_of_birth"),
        (supabase as any).from("player_outreach_youth").select("id, player_name, position, current_club, nationality, date_of_birth"),
        (supabase as any).from("player_outreach_pro").select("id, player_name, position, current_club, nationality, date_of_birth"),
        (supabase as any).from("scouting_reports").select("id, player_name, position, current_club, nationality, date_of_birth"),
      ]);
      const combined: any[] = [];
      const seen = new Set<string>();
      const push = (row: any) => {
        const key = (row.name || "").trim().toLowerCase();
        if (!key || seen.has(key)) return;
        seen.add(key);
        combined.push(row);
      };
      (corePlayers || []).forEach((p: any) => push({ id: p.id, name: p.name, position: p.position, club: p.club, nationality: p.nationality, date_of_birth: p.date_of_birth, source: 'players' }));
      (youth || []).forEach((p: any) => push({ id: p.id, name: p.player_name, position: p.position, club: p.current_club, nationality: p.nationality, date_of_birth: p.date_of_birth, source: 'youth' }));
      (pro || []).forEach((p: any) => push({ id: p.id, name: p.player_name, position: p.position, club: p.current_club, nationality: p.nationality, date_of_birth: p.date_of_birth, source: 'pro' }));
      (scouts || []).forEach((p: any) => push({ id: p.id, name: p.player_name, position: p.position, club: p.current_club, nationality: p.nationality, date_of_birth: p.date_of_birth, source: 'scout' }));
      combined.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setAllPlayers(combined);
    })();
  }, []);

  // Pull non-UK visits to /risewithus/* offer pages and refresh every minute.
  useEffect(() => {
    let cancelled = false;
    const loadVisits = async () => {
      const { data } = await (supabase as any)
        .from("site_visits")
        .select("id, visitor_id, page_path, duration, location, user_agent, referrer, visited_at")
        .like("page_path", "/risewithus/%")
        .order("visited_at", { ascending: false })
        .limit(500);
      if (cancelled) return;
      const real = ((data ?? []) as any[]).filter(isRealNonUkVisit);
      setVisits(real as ProposalVisit[]);
    };
    loadVisits();
    const id = setInterval(loadVisits, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // slug → visits map (skip the /risewithus/ index and template placeholders)
  const visitsBySlug = useMemo(() => {
    const map = new Map<string, ProposalVisit[]>();
    visits.forEach((v) => {
      const m = v.page_path.match(/^\/risewithus\/([^/]+)/);
      if (!m) return;
      const slug = m[1];
      if (!slug || slug.startsWith(":")) return;
      const arr = map.get(slug) ?? [];
      arr.push(v);
      map.set(slug, arr);
    });
    return map;
  }, [visits]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) =>
      [p.name, p.position, p.club, p.nationality].some((v) =>
        (v || "").toLowerCase().includes(q),
      ),
    );
  }, [players, query]);

  const grouped = useMemo(() => {
    const map: Record<string, OfferPlayer[]> = Object.fromEntries(GROUPS.map(g => [g.id, [] as OfferPlayer[]]));
    const viewedIds = new Set<string>();
    filtered.forEach(p => {
      if ((visitsBySlug.get(slugFor(p.name)) ?? []).length > 0) viewedIds.add(p.id);
    });
    filtered.forEach(p => {
      if (viewedIds.has(p.id)) return; // Shown in the Viewed section instead.
      (map[groupFor(p)] || (map[groupFor(p)] = [])).push(p);
    });
    return map;
  }, [filtered, visitsBySlug]);

  // Offers (across all groups in the current filter) that have at least
  // one non-UK visit. Sorted by most recent visit first.
  const viewedRows = useMemo(() => {
    const withVisits = filtered
      .map((p) => ({ player: p, vs: visitsBySlug.get(slugFor(p.name)) ?? [] }))
      .filter((x) => x.vs.length > 0);
    withVisits.sort((a, b) => {
      const ta = Math.max(...a.vs.map((v) => new Date(v.visited_at).getTime()));
      const tb = Math.max(...b.vs.map((v) => new Date(v.visited_at).getTime()));
      return tb - ta;
    });
    return withVisits;
  }, [filtered, visitsBySlug]);

  // Bell scoped to the offers that are currently on screen.
  const scopedVisits = useMemo(() => {
    const slugs = new Set(filtered.map((p) => slugFor(p.name)));
    return visits.filter((v) => {
      const m = v.page_path.match(/^\/risewithus\/([^/]+)/);
      return m ? slugs.has(m[1]) : false;
    });
  }, [filtered, visits]);

  // Auto-expand groups when there's an active search and they contain hits.
  useEffect(() => {
    if (!query.trim()) return;
    setOpenGroups(prev => {
      const next = { ...prev };
      GROUPS.forEach(g => { if (grouped[g.id]?.length) next[g.id] = true; });
      return next;
    });
  }, [query, grouped]);

  const openOffer = (e: React.MouseEvent, player: OfferPlayer) => {
    e.preventDefault();
    e.stopPropagation();
    const slug = slugFor(player.name);
    if (!slug) {
      toast.error("Player has no name to build offer link");
      return;
    }
    if (isLovablePreviewHost()) {
      window.location.assign(`/risewithus/${slug}`);
      return;
    }
    window.open(`${window.location.origin}/risewithus/${slug}`, "_blank", "noopener,noreferrer");
  };
  const copyOffer = async (e: React.MouseEvent, player: OfferPlayer) => {
    e.preventDefault();
    e.stopPropagation();
    const slug = slugFor(player.name);
    if (!slug) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/risewithus/${slug}`);
      toast.success("Offer page link copied");
    } catch {
      toast.error("Clipboard unavailable");
    }
  };

  const createOffer = async () => {
    if (!newPlayer.name.trim()) {
      toast.error("Name required");
      return;
    }
    // If the name matches an existing player, mark them as having an offer
    // instead of creating a duplicate row.
    const existing = allPlayers.find(
      p => p.source === 'players' && (p.name || "").trim().toLowerCase() === newPlayer.name.trim().toLowerCase(),
    );
    if (existing) {
      const { error } = await (supabase as any)
        .from("players")
        .update({
          has_representation_offer: true,
          position: newPlayer.position.trim() || existing.position || "Other",
          nationality: newPlayer.nationality.trim() || existing.nationality || "Unknown",
          club: newPlayer.club.trim() || existing.club || null,
          date_of_birth: newPlayer.date_of_birth || existing.date_of_birth || null,
        })
        .eq("id", existing.id);
      if (error) {
        toast.error("Could not update player", { description: error.message });
        return;
      }
    } else {
    const payload: any = {
      name: newPlayer.name.trim(),
      position: newPlayer.position.trim() || "Other",
      nationality: newPlayer.nationality.trim() || "Unknown",
      club: newPlayer.club.trim() || null,
      date_of_birth: newPlayer.date_of_birth || null,
      representation_status: "prospect",
      has_representation_offer: true,
    };
    const { error } = await (supabase as any).from("players").insert(payload);
    if (error) {
      toast.error("Could not create player", { description: error.message });
      return;
    }
    }
    const slug = slugFor(newPlayer.name);
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/risewithus/${slug}`);
      toast.success("Player added — offer link copied");
    } catch {
      toast.success("Player added");
    }
    setCreateOpen(false);
    setNewPlayer({ name: "", position: "", nationality: "", club: "", date_of_birth: "" });
    load();
  };

  const deleteDraft = async (player: OfferPlayer) => {
    if (!window.confirm(`Remove ${player.name} from drafts? This clears the representation offer flag — the player record stays.`)) return;
    const { error } = await (supabase as any)
      .from("players")
      .update({ has_representation_offer: false })
      .eq("id", player.id);
    if (error) {
      toast.error("Could not remove draft", { description: error.message });
      return;
    }
    setPlayers(prev => prev.filter(p => p.id !== player.id));
    toast.success("Draft removed");
  };

  const renderCard = (player: OfferPlayer, opts?: { showDelete?: boolean }) => {
    const slug = slugFor(player.name);
    return (
      <Card key={player.id} className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-base">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border bg-muted shrink-0">
              {player.image_url ? <img src={player.image_url} alt={player.name} className="h-full w-full object-cover object-top" /> : <UserRoundCheck className="h-5 w-5 text-muted-foreground" />}
            </div>
            <span className="min-w-0 flex-1 truncate">{player.name}</span>
            <FitScoreBadge
              player={player as any}
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 text-xs">
            {player.position && <Badge variant="outline">{player.position}</Badge>}
            {player.club && <Badge variant="secondary" className="max-w-[180px] truncate">{player.club}</Badge>}
            {player.last_contact_at && (
              <Badge variant="outline" className="text-[10px]">
                Last contact {formatDistanceToNowStrict(parseISO(player.last_contact_at), { addSuffix: true })}
              </Badge>
            )}
          </div>
          <TemplatePickerInline
            playerName={player.name}
            position={player.position}
            club={player.club}
            offerSlug={slug}
            preferredTargetId={(player.fit_score_breakdown as any)?.target_id ?? null}
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" className="flex-1" onClick={(e) => openOffer(e, player)}>
              <ExternalLink className="mr-2 h-4 w-4" />View
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={(e) => copyOffer(e, player)}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCustomising(player); }}>
              <Settings2 className="h-4 w-4" />
            </Button>
            {opts?.showDelete && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteDraft(player); }}
                title="Remove from drafts"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
            placeholder="Search player outreach..."
            className="pl-9"
          />
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-1.5" /> Create offer
        </Button>
        <ProposalVisitorsBell visits={scopedVisits} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading offers...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No player outreach found.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {viewedRows.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-white text-base font-semibold tracking-tight">Viewed</h3>
                <span className="text-xs text-muted-foreground">{viewedRows.length}</span>
                <div className="flex-1 h-px bg-gradient-to-r from-[#cbb96b]/70 via-[#cbb96b]/30 to-transparent" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {viewedRows.map(({ player, vs }) => {
                  const latest = vs.reduce((a, b) => (new Date(a.visited_at) > new Date(b.visited_at) ? a : b));
                  const loc = (latest.location ?? {}) as any;
                  const where = [loc.city, loc.country].filter(Boolean).join(", ") || "Unknown location";
                  return (
                    <div key={player.id} className="relative">
                      <ViewedVisitorsExpansion visits={vs}>
                        <button
                          type="button"
                          className="absolute -top-2 left-3 z-10 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#cbb96b] text-black text-[10px] font-semibold shadow cursor-help hover:bg-[#d9c87a] transition-colors"
                        >
                          <span>{vs.length} view{vs.length === 1 ? "" : "s"}</span>
                          <span className="opacity-70">·</span>
                          <span className="truncate max-w-[160px]">{where}</span>
                        </button>
                      </ViewedVisitorsExpansion>
                      {renderCard(player)}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
          {GROUPS.map(g => {
            let items = grouped[g.id] || [];
            if (g.id === "drafts") {
              items = [...items].sort((a, b) => {
                const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
                const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
                return tb - ta;
              });
            }
            if (items.length === 0) return null;
            const isOpen = openGroups[g.id];
            return (
              <Collapsible key={g.id} open={isOpen} onOpenChange={(o) => setOpenGroups(s => ({ ...s, [g.id]: o }))}>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-card/40 px-3 py-2 hover:bg-card/70 transition-colors">
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="text-sm font-semibold">{g.label}</span>
                    <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map(p => renderCard(p, { showDelete: g.id === "drafts" }))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}

      {customising && (
        <PlayerOfferCustomiser
          playerId={customising.id}
          playerName={customising.name}
          open={!!customising}
          onOpenChange={(o) => {
            if (!o) {
              setCustomising(null);
              load();
            }
          }}
        />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Create representation offer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Start typing a name — if we already have the player in the database, pick them to autofill their details. Otherwise carry on typing a new name to create a fresh prospect record.
            </p>
            <div>
              <Label className="text-xs">Player name *</Label>
              <SearchWithSuggestions
                value={newPlayer.name}
                onCommit={(v) => setNewPlayer(p => ({ ...p, name: v }))}
                placeholder="Type a player's name..."
                sources={allPlayers.map(p => ({
                  label: p.name,
                  sublabel: [p.position, p.club, p.nationality].filter(Boolean).join(" • ") || null,
                  payload: p,
                }))}
                onSuggestionSelect={(s) => {
                  const p = s.payload as typeof allPlayers[number];
                  setNewPlayer({
                    name: p.name || "",
                    position: p.position || "",
                    nationality: p.nationality || "",
                    club: p.club || "",
                    date_of_birth: p.date_of_birth || "",
                  });
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Position</Label>
                <Input value={newPlayer.position} onChange={e => setNewPlayer({ ...newPlayer, position: e.target.value })} placeholder="CB, CF, RW..." />
              </div>
              <div>
                <Label className="text-xs">Nationality</Label>
                <Input value={newPlayer.nationality} onChange={e => setNewPlayer({ ...newPlayer, nationality: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Club</Label>
                <Input value={newPlayer.club} onChange={e => setNewPlayer({ ...newPlayer, club: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Date of birth</Label>
                <Input type="date" value={newPlayer.date_of_birth} onChange={e => setNewPlayer({ ...newPlayer, date_of_birth: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createOffer}>Create + copy link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};