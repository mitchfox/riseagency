import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Users } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Row = {
  id: string;
  name: string;
  email: string | null;
  image_url: string | null;
  login_count: number;
  last_login_at: string | null;
};

export const PlayerPortalQuickOpenDialog = ({ open, onOpenChange }: Props) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      const { data, error } = await (supabase as any).rpc("list_players_by_portal_logins");
      if (!error) setRows((data as Row[]) || []);
      setLoading(false);
    })();
  }, [open]);

  const filtered = rows.filter((r) =>
    !filter || r.name?.toLowerCase().includes(filter.toLowerCase()),
  );

  const openPortal = (email: string | null) => {
    if (!email) return;
    const url = `/dashboard?email=${encodeURIComponent(email)}`;
    window.open(url, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Open a Player Portal
          </DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Search players..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="mb-3"
        />
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Loading...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => openPortal(p.email)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50 hover:bg-card hover:border-[hsl(43,49%,61%)]/60 text-left transition"
                >
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {p.login_count} {p.login_count === 1 ? "login" : "logins"}
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-8">No players match.</div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlayerPortalQuickOpenDialog;