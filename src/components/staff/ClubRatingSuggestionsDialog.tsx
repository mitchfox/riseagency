import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Check, X, Sparkles, Loader2, RefreshCw } from 'lucide-react';

type Suggestion = {
  id: string;
  club_name: string;
  country: string | null;
  current_first: string | null;
  current_academy: string | null;
  suggested_first: string | null;
  suggested_academy: string | null;
  reasoning: string | null;
  confidence: string | null;
  status: string;
};

const R_OPTIONS = ['R1', 'R2', 'R3', 'R4', 'R5'];

const confidenceColor = (c: string | null) => {
  switch ((c || '').toLowerCase()) {
    case 'high': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'medium': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    case 'low': return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    default: return 'bg-muted text-muted-foreground';
  }
};

export const ClubRatingSuggestionsDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [rows, setRows] = useState<Suggestion[]>([]);
  const [edits, setEdits] = useState<Record<string, { first?: string | null; academy?: string | null }>>({});
  const [filter, setFilter] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('club_rating_suggestions')
      .select('*')
      .eq('status', 'pending')
      .order('club_name');
    if (error) toast.error(error.message);
    setRows((data || []) as Suggestion[]);
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open]);

  const generate = async () => {
    setGenerating(true);
    const tid = toast.loading('Generating AI suggestions (this can take a minute)…');
    try {
      const { data, error } = await supabase.functions.invoke('suggest-club-ratings', {
        body: { maxClubs: 200, batchSize: 25 },
      });
      if (error) throw error;
      toast.success(`${data?.inserted ?? 0} new suggestions ready (${data?.processed ?? 0} clubs analysed)`, { id: tid });
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Failed', { id: tid });
    } finally {
      setGenerating(false);
    }
  };

  const applyOne = async (row: Suggestion) => {
    const first = edits[row.id]?.first ?? row.suggested_first;
    const academy = edits[row.id]?.academy ?? row.suggested_academy;

    // upsert into club_ratings
    const { data: existing } = await supabase
      .from('club_ratings')
      .select('id, first_team_rating, academy_rating')
      .ilike('club_name', row.club_name)
      .maybeSingle();

    if (existing) {
      const patch: any = {};
      if (first && !existing.first_team_rating) patch.first_team_rating = first;
      if (academy && !existing.academy_rating) patch.academy_rating = academy;
      if (first) patch.first_team_rating = first;
      if (academy) patch.academy_rating = academy;
      if (Object.keys(patch).length) {
        const { error } = await supabase.from('club_ratings').update(patch).eq('id', existing.id);
        if (error) { toast.error(error.message); return; }
      }
    } else {
      const { error } = await supabase.from('club_ratings').insert({
        club_name: row.club_name,
        country: row.country,
        first_team_rating: first,
        academy_rating: academy,
      });
      if (error) { toast.error(error.message); return; }
    }

    await supabase.from('club_rating_suggestions').update({ status: 'approved' }).eq('id', row.id);
    setRows((r) => r.filter((x) => x.id !== row.id));
    try { sessionStorage.removeItem('rise.clubMaps.v1'); } catch {}
  };

  const rejectOne = async (row: Suggestion) => {
    await supabase.from('club_rating_suggestions').update({ status: 'rejected' }).eq('id', row.id);
    setRows((r) => r.filter((x) => x.id !== row.id));
  };

  const approveAllHighConfidence = async () => {
    const highRows = rows.filter((r) => (r.confidence || '').toLowerCase() === 'high');
    if (!highRows.length) { toast.info('No high-confidence suggestions to approve'); return; }
    if (!confirm(`Approve all ${highRows.length} high-confidence suggestions?`)) return;
    const tid = toast.loading(`Approving ${highRows.length}…`);
    for (const row of highRows) await applyOne(row);
    toast.success('Done', { id: tid });
  };

  const rejectAll = async () => {
    if (!rows.length) return;
    if (!confirm(`Reject all ${rows.length} pending suggestions?`)) return;
    await supabase.from('club_rating_suggestions').update({ status: 'rejected' }).in('id', rows.map(r => r.id));
    setRows([]);
  };

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.club_name.toLowerCase().includes(q) || (r.country || '').toLowerCase().includes(q),
    );
  }, [rows, filter]);

  const setEdit = (id: string, key: 'first' | 'academy', val: string) =>
    setEdits((e) => ({ ...e, [id]: { ...e[id], [key]: val } }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[hsl(var(--rise-gold))]" />
            Club rating suggestions
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 border-b border-border/50 pb-3">
          <Button size="sm" onClick={generate} disabled={generating} className="gap-1.5 bg-[hsl(var(--rise-gold))] text-background hover:bg-[hsl(var(--rise-gold)/0.88)]">
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {generating ? 'Generating…' : 'Generate AI suggestions'}
          </Button>
          <Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Reload
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Input placeholder="Filter club or country…" value={filter} onChange={(e) => setFilter(e.target.value)} className="h-8 w-56 text-xs" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">{filtered.length} pending</span>
          </div>
          <div className="basis-full flex gap-2">
            <Button size="sm" variant="outline" onClick={approveAllHighConfidence} disabled={!rows.length} className="gap-1.5 border-emerald-500/40 text-emerald-300">
              <Check className="h-3.5 w-3.5" /> Approve all high-confidence
            </Button>
            <Button size="sm" variant="outline" onClick={rejectAll} disabled={!rows.length} className="gap-1.5 border-rose-500/40 text-rose-300">
              <X className="h-3.5 w-3.5" /> Reject all
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto -mx-6 px-6">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No pending suggestions. Click <strong>Generate AI suggestions</strong> to grade unrated clubs.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background z-10 border-b border-border/50">
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-2">Club</th>
                  <th className="py-2 pr-2">Country</th>
                  <th className="py-2 pr-2">Current</th>
                  <th className="py-2 pr-2">Suggested first</th>
                  <th className="py-2 pr-2">Suggested academy</th>
                  <th className="py-2 pr-2">Reasoning</th>
                  <th className="py-2 pr-2">Conf</th>
                  <th className="py-2 pr-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const first = edits[row.id]?.first ?? row.suggested_first ?? '';
                  const academy = edits[row.id]?.academy ?? row.suggested_academy ?? '';
                  return (
                    <tr key={row.id} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="py-2 pr-2 font-semibold text-foreground">{row.club_name}</td>
                      <td className="py-2 pr-2 text-muted-foreground">{row.country || '—'}</td>
                      <td className="py-2 pr-2 text-muted-foreground">
                        <div>F: {row.current_first || '—'}</div>
                        <div>A: {row.current_academy || '—'}</div>
                      </td>
                      <td className="py-2 pr-2">
                        <select value={first} onChange={(e) => setEdit(row.id, 'first', e.target.value)} className="h-7 rounded border border-border bg-background px-1.5 text-xs">
                          <option value="">—</option>
                          {R_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td className="py-2 pr-2">
                        <select value={academy} onChange={(e) => setEdit(row.id, 'academy', e.target.value)} className="h-7 rounded border border-border bg-background px-1.5 text-xs">
                          <option value="">—</option>
                          {R_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td className="py-2 pr-2 max-w-[280px] text-muted-foreground">{row.reasoning}</td>
                      <td className="py-2 pr-2">
                        <Badge variant="outline" className={`text-[10px] ${confidenceColor(row.confidence)}`}>{row.confidence || '—'}</Badge>
                      </td>
                      <td className="py-2 pr-2">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" className="h-7 px-2 border-emerald-500/40 text-emerald-300" onClick={() => applyOne(row)}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2 border-rose-500/40 text-rose-300" onClick={() => rejectOne(row)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};