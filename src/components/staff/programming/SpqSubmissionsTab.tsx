import { useEffect, useMemo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { differenceInYears, parseISO } from "date-fns";
import { stenToRankOf100 } from "@/lib/spqScoring";

const ord = (n: number) => { const s = ["th","st","nd","rd"]; const v = n % 100; return n + (s[(v-20)%10] || s[v] || s[0]); };

type Submission = {
  id: string;
  submitter_name: string | null;
  submitter_email: string | null;
  age_band: string;
  gender_norm: string;
  visitor_ip: string | null;
  visitor_country: string | null;
  visitor_city: string | null;
  matched_player_id: string | null;
  scale_scores: any;
  factor_scores: any;
  created_at: string;
};

type Player = { id: string; name: string; position: string | null; date_of_birth: string | null };

const ageToBand = (age: number): string => {
  if (age <= 20) return "16-20";
  if (age <= 30) return "21-30";
  if (age <= 40) return "31-40";
  if (age <= 50) return "41-50";
  if (age <= 60) return "51-60";
  return "over 60";
};

export const SpqSubmissionsTab = () => {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: p }] = await Promise.all([
      (supabase as any).from("spq_test_submissions").select("*").order("created_at", { ascending: false }),
      supabase.from("players").select("id, name, position, date_of_birth"),
    ]);
    setSubs(s || []);
    setPlayers(p || []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const matchPlayer = (sub: Submission): Player | null => {
    if (sub.matched_player_id) return players.find(p => p.id === sub.matched_player_id) || null;
    if (!sub.submitter_name) return null;
    const lower = sub.submitter_name.trim().toLowerCase();
    const candidates = players.filter(p => p.name.toLowerCase() === lower);
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];
    // multiple — try age band match
    const withDob = candidates.find(p => {
      if (!p.date_of_birth) return false;
      try { return ageToBand(differenceInYears(new Date(), parseISO(p.date_of_birth))) === sub.age_band; }
      catch { return false; }
    });
    return withDob || candidates[0];
  };

  const linkPlayer = async (subId: string, playerId: string | null) => {
    const { error } = await (supabase as any).from("spq_test_submissions").update({ matched_player_id: playerId }).eq("id", subId);
    if (error) return toast.error(error.message);
    toast.success(playerId ? "Linked to player" : "Unlinked");
    void load();
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("spq_test_submissions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Submission deleted");
    void load();
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return subs;
    return subs.filter(s =>
      (s.submitter_name || '').toLowerCase().includes(q) ||
      (s.submitter_email || '').toLowerCase().includes(q) ||
      (s.visitor_country || '').toLowerCase().includes(q) ||
      (s.visitor_city || '').toLowerCase().includes(q)
    );
  }, [subs, search]);

  if (loading) return <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading submissions…</div>;

  return (
    <Card><CardContent className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <Input placeholder="Search by name, email, country…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        <span className="text-xs text-muted-foreground">{filtered.length} submission{filtered.length === 1 ? '' : 's'}</span>
      </div>
      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No SPQ test submissions yet. Share <span className="font-mono text-foreground">/spq</span> to start collecting.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2">Name</th>
                <th>Email</th>
                <th>Sex</th>
                <th>Age</th>
                <th>Location</th>
                <th>IP</th>
                <th>Match</th>
                <th>Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const match = matchPlayer(s);
                const isOpen = expanded === s.id;
                return (
                  <>
                    <tr key={s.id} className="border-t border-border">
                      <td className="py-2 font-medium">{s.submitter_name || '—'}</td>
                      <td className="text-xs">{s.submitter_email || '—'}</td>
                      <td className="capitalize">{s.gender_norm}</td>
                      <td>{s.age_band}</td>
                      <td className="text-xs">{[s.visitor_city, s.visitor_country].filter(Boolean).join(', ') || '—'}</td>
                      <td className="text-xs font-mono">{s.visitor_ip || '—'}</td>
                      <td className="text-xs">
                        {match ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="font-semibold">{match.name}</span>
                            <span className="text-muted-foreground">({match.position || '—'})</span>
                            {!s.matched_player_id && (
                              <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => linkPlayer(s.id, match.id)}>Link</Button>
                            )}
                          </span>
                        ) : <span className="text-muted-foreground">No match</span>}
                      </td>
                      <td className="text-xs">{new Date(s.created_at).toLocaleDateString('en-GB')}</td>
                      <td className="flex justify-end gap-1 py-1">
                        <Button size="sm" variant="outline" onClick={() => setExpanded(isOpen ? null : s.id)}>{isOpen ? 'Hide' : 'View'}</Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-3 w-3" /></Button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-t border-border bg-muted/30">
                        <td colSpan={9} className="p-3">
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {(s.scale_scores || []).map((sc: any) => (
                              <div key={sc.scale} className="rounded-md border border-border bg-card p-2 text-xs">
                                <div className="flex justify-between"><span className="font-semibold">{sc.scale}</span><span className="font-bold text-primary">{ord(stenToRankOf100(sc.sten ?? sc.stenRounded ?? 5.5, sc.z ?? 0))}</span></div>
                                <div className="text-[10px] text-muted-foreground">out of 100</div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </CardContent></Card>
  );
};