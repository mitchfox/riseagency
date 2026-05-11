import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Copy, ExternalLink, Loader2, Search, UserRoundCheck, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { PlayerOfferCustomiser } from "./PlayerOfferCustomiser";

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
};

const slugFor = (name: string) => name.toLowerCase().trim().replace(/\s+/g, "-");

export const RepresentationOffers = () => {
  const [players, setPlayers] = useState<OfferPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [customising, setCustomising] = useState<OfferPlayer | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("players")
        .select("id, name, position, club, nationality, image_url, email, representation_status, has_representation_offer")
        .or("has_representation_offer.eq.true,representation_status.eq.prospect")
        .order("name");
      if (error) {
        toast.error("Failed to load representation offers");
      } else {
        setPlayers(data || []);
      }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) => [p.name, p.position, p.club, p.nationality].some((v) => v?.toLowerCase().includes(q)));
  }, [players, query]);

  const openOffer = (player: OfferPlayer) => window.open(`${window.location.origin}/risewithus/${slugFor(player.name)}`, "_blank");
  const copyOffer = async (player: OfferPlayer) => {
    await navigator.clipboard.writeText(`${window.location.origin}/risewithus/${slugFor(player.name)}`);
    toast.success("Offer page link copied");
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search representation offers..." className="pl-9" />
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading offers...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No representation offers found.</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((player) => (
            <Card key={player.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-base">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border bg-muted">
                    {player.image_url ? <img src={player.image_url} alt={player.name} className="h-full w-full object-cover object-top" /> : <UserRoundCheck className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <span className="min-w-0 flex-1 truncate">{player.name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2 text-xs">
                  {player.position && <Badge variant="outline">{player.position}</Badge>}
                  {player.club && <Badge variant="secondary">{player.club}</Badge>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => openOffer(player)}><ExternalLink className="mr-2 h-4 w-4" />View</Button>
                  <Button size="sm" variant="outline" onClick={() => copyOffer(player)}><Copy className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => setCustomising(player)}><Settings2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
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
    </div>
  );
};