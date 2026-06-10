import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Inbox, Building2 } from "lucide-react";
import { format } from "date-fns";
import { fetchClubContactRows, fetchCommunicationsFor, type CommunicationEntry, type ClubContactRow } from "@/lib/transferHubData";

interface Props {
  playerId: string;
}

type Row = CommunicationEntry & { club_name: string };

export const PlayerOutreachUpdates = ({ playerId }: Props) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const contactRows: ClubContactRow[] = await fetchClubContactRows(playerId);
      const aggregated: Row[] = [];
      for (const r of contactRows) {
        const comms = await fetchCommunicationsFor(r.outreach_id, r.source);
        comms.forEach((c) => aggregated.push({ ...c, club_name: r.club_name }));
      }
      aggregated.sort((a, b) => new Date(b.contacted_at).getTime() - new Date(a.contacted_at).getTime());
      setRows(aggregated);
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
              {format(new Date(row.contacted_at), "d MMM yyyy")}
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
