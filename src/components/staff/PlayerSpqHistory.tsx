import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Brain, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SpqRow {
  id: string;
  player_name: string;
  share_slug: string;
  age_band: string | null;
  gender_norm: string;
  created_at: string;
}

interface Props {
  playerId: string;
  /** Inline (compact) or block (with header). Default block. */
  variant?: 'block' | 'inline';
}

export const PlayerSpqHistory = ({ playerId, variant = 'block' }: Props) => {
  const [rows, setRows] = useState<SpqRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from('psychology_spq_reports')
        .select('id, player_name, share_slug, age_band, gender_norm, created_at')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });
      if (!cancelled) {
        setRows((data as SpqRow[]) || []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [playerId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading SPQ history…
      </div>
    );
  }

  const body = (
    rows.length === 0 ? (
      <p className="text-sm text-muted-foreground">No saved SPQs for this player yet.</p>
    ) : (
      <ul className="space-y-1.5">
        {rows.map(r => (
          <li key={r.id} className="flex items-center justify-between gap-2 rounded border border-border bg-card p-2 text-sm">
            <div>
              <div className="font-medium">{new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              <div className="text-xs text-muted-foreground capitalize">{r.gender_norm} norm · {r.age_band || '—'}</div>
            </div>
            <Button asChild size="sm" variant="outline" className="gap-1">
              <a href={`/spq-report/${r.share_slug}`} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3 w-3" /> Open
              </a>
            </Button>
          </li>
        ))}
      </ul>
    )
  );

  if (variant === 'inline') return body;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wider">Psychology · SPQ history</h3>
      </div>
      {body}
    </div>
  );
};
