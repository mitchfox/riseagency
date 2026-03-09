import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink, Loader2, Trash2, Star, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface ShortlistPlayer {
  id: string;
  player_name: string;
  position: string | null;
  age: number | null;
  nationality: string | null;
  club: string | null;
  market_value: string | null;
  agent_status: string | null;
  transfermarkt_url: string | null;
  shortlisted_by: string | null;
  contacted: boolean;
  contacted_by: string | null;
  contacted_at: string | null;
  added_to_outreach: boolean;
  notes: string | null;
  created_at: string;
}

export const TransfermarktShortlist = () => {
  const [players, setPlayers] = useState<ShortlistPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchShortlist();
  }, []);

  const fetchShortlist = async () => {
    const { data, error } = await supabase
      .from("transfermarkt_shortlist")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setPlayers((data as ShortlistPlayer[]) || []);
    setLoading(false);
  };

  const handleContactedToggle = async (player: ShortlistPlayer) => {
    if (player.contacted) return; // Already contacted, don't untoggle

    setProcessingIds(prev => new Set(prev).add(player.id));

    try {
      // 1. Mark as contacted
      const { error: updateError } = await supabase
        .from("transfermarkt_shortlist")
        .update({
          contacted: true,
          contacted_at: new Date().toISOString(),
        })
        .eq("id", player.id);

      if (updateError) throw updateError;

      // 2. Add to outreach table
      const age = player.age;
      const isYouth = age != null && age < 18;
      const tableName = isYouth ? "player_outreach_youth" : "player_outreach_pro";

      const { error: insertError } = await supabase.from(tableName).insert({
        player_name: player.player_name,
        position: player.position || null,
        nationality: player.nationality || null,
        current_club: player.club || null,
        age: player.age || null,
        messaged: true,
        notes: `Source: Transfermarkt Shortlist\nAgent: ${player.agent_status === "no_agent" ? "No Agent" : "Family Agent"}\nMarket Value: ${player.market_value || "N/A"}\nProfile: ${player.transfermarkt_url || ""}`,
      });

      if (insertError) throw insertError;

      // 3. Mark as added to outreach
      await supabase
        .from("transfermarkt_shortlist")
        .update({ added_to_outreach: true })
        .eq("id", player.id);

      setPlayers(prev =>
        prev.map(p =>
          p.id === player.id
            ? { ...p, contacted: true, contacted_at: new Date().toISOString(), added_to_outreach: true }
            : p
        )
      );

      toast.success(`${player.player_name} marked as contacted and added to ${isYouth ? "Youth" : "Pro"} outreach`);
    } catch (error: any) {
      toast.error(error.message || "Failed to process player");
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(player.id);
        return next;
      });
    }
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from("transfermarkt_shortlist").delete().eq("id", id);
    if (error) {
      toast.error("Failed to remove player");
      return;
    }
    setPlayers(prev => prev.filter(p => p.id !== id));
    toast.success("Removed from shortlist");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const pending = players.filter(p => !p.contacted);
  const contacted = players.filter(p => p.contacted);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Star className="h-5 w-5" />
          Shortlisted Players
          {pending.length > 0 && (
            <Badge variant="secondary" className="ml-2">{pending.length} pending</Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Tick the checkbox to mark a player as contacted. This automatically adds them to the relevant outreach list.
        </p>
      </CardHeader>
      <CardContent>
        {players.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No players shortlisted yet. Use the Transfermarkt Scraper to shortlist players.
          </p>
        ) : isMobile ? (
          <div className="space-y-2">
            {players.map(player => (
              <div
                key={player.id}
                className={`p-3 rounded-md border ${player.contacted ? "bg-muted/30 opacity-70" : "bg-card"} flex items-start gap-3`}
              >
                <div className="pt-0.5">
                  {processingIds.has(player.id) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Checkbox
                      checked={player.contacted}
                      disabled={player.contacted}
                      onCheckedChange={() => handleContactedToggle(player)}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`font-medium text-sm ${player.contacted ? "line-through text-muted-foreground" : ""}`}>
                    {player.player_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {player.position} · {player.age} · {player.club}
                  </p>
                  {player.market_value && (
                    <p className="text-xs text-primary font-medium">{player.market_value}</p>
                  )}
                  {player.contacted && (
                    <Badge variant="outline" className="mt-1 text-[10px] bg-green-500/10 text-green-500 border-green-500/30">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Contacted & added to outreach
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {player.transfermarkt_url && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                      <a href={player.transfermarkt_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive/60 hover:text-destructive"
                    onClick={() => handleRemove(player.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Done</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Club</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]">Link</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map(player => (
                  <TableRow key={player.id} className={player.contacted ? "opacity-60" : ""}>
                    <TableCell>
                      {processingIds.has(player.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Checkbox
                          checked={player.contacted}
                          disabled={player.contacted}
                          onCheckedChange={() => handleContactedToggle(player)}
                        />
                      )}
                    </TableCell>
                    <TableCell className={`font-medium ${player.contacted ? "line-through" : ""}`}>
                      {player.player_name}
                    </TableCell>
                    <TableCell className="text-sm">{player.position || "-"}</TableCell>
                    <TableCell>{player.age || "-"}</TableCell>
                    <TableCell className="text-sm">{player.club || "-"}</TableCell>
                    <TableCell className="text-sm font-medium text-primary">{player.market_value || "-"}</TableCell>
                    <TableCell>
                      {player.contacted ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Contacted
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {player.transfermarkt_url && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <a href={player.transfermarkt_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive/60 hover:text-destructive"
                        onClick={() => handleRemove(player.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
