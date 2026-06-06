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
      const { data: links } = await supabase
        .from("club_outreach_link_players" as any)
        .select("link_id")
        .eq("player_id", playerId);

      const linkIds = Array.from(new Set((links || []).map((l: any) => l.link_id)));
      if (linkIds.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data: comms } = await supabase
        .from("club_outreach_communications" as any)
        .select("*, club_outreach_links(club_name)")
        .in("outreach_id", linkIds)
        .order("contacted_at", { ascending: false });

      const mapped: CommunicationRow[] = (comms || []).map((c: any) => ({
        ...c,
        club_name: c.club_outreach_links?.club_name ?? null,
      }));
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
