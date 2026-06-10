import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Inbox, Building2 } from "lucide-react";
import { format } from "date-fns";

interface Props {
  playerId: string;
}

interface CommunicationRow {
  id: string;
  outreach_id: string;
  contacted_at: string | null;
  contact_name: string | null;
  contact_role: string | null;
  channel: string | null;
  summary: string | null;
  next_step: string | null;
  created_at: string;
  club_name?: string | null;
}

export const PlayerOutreachUpdates = ({ playerId }: Props) => {
  const [rows, setRows] = useState<CommunicationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // 1. New-style: link_players → communications → club via club_map_positions
      const { data: links } = await supabase
        .from("club_outreach_link_players" as any)
        .select("link_id")
        .eq("player_id", playerId);
      const linkIds = Array.from(new Set((links || []).map((l: any) => l.link_id).filter(Boolean)));

      let mapped: CommunicationRow[] = [];
      if (linkIds.length > 0) {
        const { data: comms } = await supabase
          .from("club_outreach_communications" as any)
          .select("*")
          .in("outreach_id", linkIds)
          .order("contacted_at", { ascending: false });

        const { data: linkRows } = await supabase
          .from("club_outreach_links" as any)
          .select("id, club_id")
          .in("id", linkIds);
        const clubIds = Array.from(new Set((linkRows || []).map((l: any) => l.club_id).filter(Boolean)));
        const clubNameById: Record<string, string> = {};
        if (clubIds.length > 0) {
          const { data: clubs } = await supabase
            .from("club_map_positions")
            .select("id, club_name")
            .in("id", clubIds);
          (clubs || []).forEach((c: any) => { clubNameById[c.id] = c.club_name; });
        }
        const clubByLink: Record<string, string> = {};
        (linkRows || []).forEach((l: any) => { clubByLink[l.id] = clubNameById[l.club_id] || ""; });

        mapped = (comms || []).map((c: any) => ({
          id: c.id,
          outreach_id: c.outreach_id,
          contacted_at: c.contacted_at,
          contact_name: c.contact_name,
          contact_role: c.contact_role,
          channel: c.channel,
          summary: c.summary,
          next_step: c.next_step,
          created_at: c.created_at,
          club_name: clubByLink[c.outreach_id] || null,
        }));
      }

      // 2. Legacy: club_outreach_updates joined via club_outreach.player_id
      const { data: legacyOutreach } = await supabase
        .from("club_outreach")
        .select("id, club_name")
        .eq("player_id", playerId);
      const legacyIds = (legacyOutreach || []).map((o: any) => o.id);
      const legacyClubByOutreach: Record<string, string> = {};
      (legacyOutreach || []).forEach((o: any) => { legacyClubByOutreach[o.id] = o.club_name; });
      if (legacyIds.length > 0) {
        const { data: legacyUpdates } = await supabase
          .from("club_outreach_updates")
          .select("*")
          .in("outreach_id", legacyIds)
          .order("created_at", { ascending: false });
        (legacyUpdates || []).forEach((u: any) => {
          mapped.push({
            id: u.id,
            outreach_id: u.outreach_id,
            contacted_at: u.created_at,
            contact_name: null,
            contact_role: null,
            channel: null,
            summary: u.update_text,
            next_step: null,
            created_at: u.created_at,
            club_name: legacyClubByOutreach[u.outreach_id] || null,
          });
        });
      }

      mapped.sort((a, b) => {
        const ad = new Date(a.contacted_at || a.created_at).getTime();
        const bd = new Date(b.contacted_at || b.created_at).getTime();
        return bd - ad;
      });

      setRows(mapped);
      setLoading(false);
    };
    load();
  }, [playerId]);

  if (loading) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Loading updates…</div>;
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Inbox className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No club updates yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <Card key={row.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {row.club_name || "Club"}
              {row.channel && <Badge variant="outline" className="ml-auto">{row.channel}</Badge>}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {row.contacted_at ? format(new Date(row.contacted_at), "d MMM yyyy") : format(new Date(row.created_at), "d MMM yyyy")}
              {row.contact_name ? ` · ${row.contact_name}` : ""}
              {row.contact_role ? ` (${row.contact_role})` : ""}
            </p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {row.summary && <p>{row.summary}</p>}
            {row.next_step && (
              <p className="text-muted-foreground"><span className="font-medium text-foreground">Next step:</span> {row.next_step}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
