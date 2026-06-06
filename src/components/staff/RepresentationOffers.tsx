import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronRight, Copy, ExternalLink, Loader2, Plus, Search, UserRoundCheck, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { PlayerOfferCustomiser } from "./PlayerOfferCustomiser";
import { FitScoreBadge } from "./recruitment/FitScoreBadge";
import { TemplatePickerInline } from "./recruitment/TemplatePickerInline";
import { CreateOfferButton } from "./recruitment/CreateOfferButton";
import { formatDistanceToNowStrict, parseISO } from "date-fns";

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
};

const slugFor = (name: string | null | undefined) =>
  (name || "").toLowerCase().trim().replace(/\s+/g, "-");

const GROUPS: { id: string; label: string; defaultOpen: boolean }[] = [
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
  }
  return "sent";
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

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("players")
      .select("id, name, position, club, nationality, image_url, email, representation_status, has_representation_offer, date_of_birth, fit_score, fit_score_breakdown")
      .or("has_representation_offer.eq.true,representation_status.eq.prospect")
      .order("name");
    if (error) {
      toast.error("Failed to load representation offers");
    } else {
      setPlayers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

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
    filtered.forEach(p => { (map[groupFor(p)] || (map[groupFor(p)] = [])).push(p); });
    return map;
  }, [filtered]);

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

  const renderCard = (player: OfferPlayer) => {
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
            placeholder="Search representation offers..."
            className="pl-9"
          />
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-1.5" /> Create offer
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading offers...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No representation offers found.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {GROUPS.map(g => {
            const items = grouped[g.id] || [];
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
                    {items.map(renderCard)}
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
          onOpenChange={(o) => !o && setCustomising(null)}
        />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Create representation offer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Adds a new prospect player record and copies the offer link to your clipboard. If the player is already in the database use the search box on the page instead.
            </p>
            <div>
              <Label className="text-xs">Player name *</Label>
              <Input value={newPlayer.name} onChange={e => setNewPlayer({ ...newPlayer, name: e.target.value })} />
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