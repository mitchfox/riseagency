import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, UserPlus, Image as ImageIcon, X, Check, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PLAYER_POSITIONS, normalisePosition } from '@/lib/playerPositions';

type Mode = 'manual' | 'ai' | 'review';

interface ParsedPlayer {
  name: string;
  position: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  age: number | null;
  club: string | null;
  league: string | null;
  instagram_handle: string | null;
  notes: string | null;
  national_team?: boolean | null;
  agency?: string | null;
  _matched_source?: 'transfermarkt';
  _needs_review?: boolean;
  transfermarkt_id?: string;
  _accepted?: boolean;
  _saved?: boolean;
  _error?: string;
}

const blobToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => {
    const s = String(r.result || '');
    resolve(s.includes(',') ? s.split(',')[1] : s);
  };
  r.onerror = reject;
  r.readAsDataURL(file);
});

export const PlayerAddMode = ({ onExit, initialMode = 'ai' }: { onExit: () => void; initialMode?: Exclude<Mode, 'review'> }) => {
  const [mode, setMode] = useState<Mode>(initialMode);

  // Manual
  const [manual, setManual] = useState({ name: '', position: '', nationality: '', date_of_birth: '', club: '', instagram_handle: '' });
  const [savingManual, setSavingManual] = useState(false);

  // AI
  const [aiText, setAiText] = useState('');
  const [aiImages, setAiImages] = useState<{ file: File; preview: string }[]>([]);
  const [aiInstruction, setAiInstruction] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedPlayer[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveManual = async () => {
    if (!manual.name.trim()) { toast.error('Name is required'); return; }
    setSavingManual(true);
    const { error } = await supabase.from('players').insert({
      name: manual.name.trim(),
      position: normalisePosition(manual.position) || manual.position.trim() || 'CM',
      nationality: manual.nationality.trim() || 'Unknown',
      date_of_birth: manual.date_of_birth || null,
      club: manual.club.trim() || null,
      instagram_handle: manual.instagram_handle.trim() || null,
        category: 'Other',
        representation_status: 'Other',
    });
    setSavingManual(false);
    if (error) { toast.error(error.message); return; }
    window.dispatchEvent(new CustomEvent('player-database-refresh'));
    toast.success('Player added');
    setManual({ name: '', position: '', nationality: '', date_of_birth: '', club: '', instagram_handle: '' });
    onExit();
  };

  const onImageInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 10);
    const next = await Promise.all(files.map(async (file) => ({ file, preview: URL.createObjectURL(file) })));
    setAiImages((prev) => [...prev, ...next].slice(0, 10));
    if (fileRef.current) fileRef.current.value = '';
  };

  const runParse = async () => {
    if (!aiText.trim() && aiImages.length === 0) { toast.error('Paste text or upload screenshots first'); return; }
    setParsing(true);
    try {
      const images = await Promise.all(aiImages.map(async (i) => ({ base64: await blobToBase64(i.file), mimeType: i.file.type })));
      const { data, error } = await supabase.functions.invoke('parse-players-bulk', {
        body: { text: aiText.trim() || undefined, images, instruction: aiInstruction.trim() || undefined },
      });
      if (error) throw error;
      const players: ParsedPlayer[] = (data?.players || []).map((p: any) => ({
        ...p,
        _accepted: p?._needs_review !== true,
      }));
      if (players.length === 0) { toast.error('No players detected'); return; }
      setParsed(players);
      setMode('review');
    } catch (e: any) {
      toast.error(e?.message || 'Parse failed');
    } finally {
      setParsing(false);
    }
  };

  const update = (i: number, patch: Partial<ParsedPlayer>) => setParsed((arr) => arr.map((p, idx) => idx === i ? { ...p, ...patch } : p));
  const setAllAccepted = (v: boolean) => setParsed((arr) => arr.map((p) => ({ ...p, _accepted: v })));

  const saveAccepted = async () => {
    const toSave = parsed.map((p, i) => ({ ...p, _i: i })).filter((p) => p._accepted && !p._saved && p.name?.trim());
    if (toSave.length === 0) { toast.error('Nothing to save'); return; }
    setBulkSaving(true);
    let ok = 0;
    for (const p of toSave) {
      const normalisedAgency = (p.agency || '').trim();
      const isRise = /rise\s*football/i.test(normalisedAgency);
      const { error } = await supabase.from('players').insert({
        name: p.name.trim(),
        position: normalisePosition(p.position) || (p.position || 'CM').trim(),
        nationality: (p.nationality || 'Unknown').trim(),
        date_of_birth: p.date_of_birth || null,
        age: p.age || null,
        club: p.club || null,
        league: p.league || null,
        instagram_handle: p.instagram_handle || null,
        bio: p.notes || null,
        national_team: p.national_team === true ? true : null,
        agent_name: isRise ? 'RISE Football Agency' : (normalisedAgency || null),
        category: 'Other',
        representation_status: isRise ? 'represented' : 'Other',
      });
      if (error) {
        update(p._i, { _error: error.message });
      } else {
        update(p._i, { _saved: true, _error: undefined });
        ok++;
      }
    }
    setBulkSaving(false);
    if (ok > 0) window.dispatchEvent(new CustomEvent('player-database-refresh'));
    toast.success(`Added ${ok} player${ok === 1 ? '' : 's'}`);
    if (ok === toSave.length) onExit();
  };

  return (
    <div className="space-y-4 rounded-xl border border-[hsl(var(--rise-gold)/0.35)] bg-card/35 p-3 md:p-4 shadow-[0_0_24px_hsl(var(--rise-gold)/0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-black uppercase tracking-wider text-[hsl(var(--rise-gold))]">Add players</div>
          <div className="text-xs text-muted-foreground">Paste text or screenshots, then review before anything is saved.</div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button type="button" size="sm" variant={mode === 'ai' || mode === 'review' ? 'default' : 'outline'} onClick={() => setMode('ai')} className="h-8 gap-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5" /> AI
          </Button>
          <Button type="button" size="sm" variant={mode === 'manual' ? 'default' : 'outline'} onClick={() => setMode('manual')} className="h-8 gap-1.5 text-xs">
            <UserPlus className="h-3.5 w-3.5" /> Manual
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onExit} className="h-8 text-xs">Close</Button>
        </div>
      </div>

      {mode === 'manual' && (
        <div className="max-w-2xl space-y-3 rounded-xl border border-border/50 bg-card/40 p-5">
          <Field label="Name *"><Input value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} placeholder="Full name" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Position">
              <Select value={manual.position} onValueChange={(value) => setManual({ ...manual, position: value })}>
                <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                <SelectContent>
                  {PLAYER_POSITIONS.map((code) => (<SelectItem key={code} value={code}>{code}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Nationality"><Input value={manual.nationality} onChange={(e) => setManual({ ...manual, nationality: e.target.value })} placeholder="England" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of birth"><Input type="date" value={manual.date_of_birth} onChange={(e) => setManual({ ...manual, date_of_birth: e.target.value })} /></Field>
            <Field label="Club"><Input value={manual.club} onChange={(e) => setManual({ ...manual, club: e.target.value })} placeholder="Club name" /></Field>
          </div>
          <Field label="Instagram handle"><Input value={manual.instagram_handle} onChange={(e) => setManual({ ...manual, instagram_handle: e.target.value })} placeholder="handle (no @)" /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onExit}>Cancel</Button>
            <Button onClick={saveManual} disabled={savingManual} className="gap-2">{savingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Add player</Button>
          </div>
        </div>
      )}

      {mode === 'ai' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/50 bg-card/40 p-5 space-y-3">
            <Field label="Paste text (lists, scout notes, table copy)">
              <Textarea rows={8} value={aiText} onChange={(e) => setAiText(e.target.value)} placeholder="e.g. 1. John Smith — CB — Arsenal — 2008-04-12 — England…" />
            </Field>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Screenshots ({aiImages.length}/10)</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {aiImages.map((img, i) => (
                  <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-border/60">
                    <img src={img.preview} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setAiImages((p) => p.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5"><X className="h-3 w-3 text-white" /></button>
                  </div>
                ))}
                {aiImages.length < 10 && (
                  <button onClick={() => fileRef.current?.click()} className="w-24 h-24 rounded-lg border-2 border-dashed border-border/60 hover:border-[hsl(var(--rise-gold))] flex flex-col items-center justify-center text-muted-foreground hover:text-[hsl(var(--rise-gold))] transition-colors">
                    <ImageIcon className="h-5 w-5" /><span className="text-[10px] mt-1">Add</span>
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onImageInput} />
            </div>
            <Field label="Optional extra instruction"><Input value={aiInstruction} onChange={(e) => setAiInstruction(e.target.value)} placeholder="e.g. these are all U17 Czech league players from Sigma Olomouc" /></Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onExit}>Cancel</Button>
            <Button onClick={runParse} disabled={parsing} className="gap-2">
              {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Parse players
            </Button>
          </div>
        </div>
      )}

      {mode === 'review' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm">
              <span className="font-semibold">{parsed.filter((p) => p._accepted && !p._saved).length}</span> of {parsed.length} ready to add
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setAllAccepted(true)} className="gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />Accept all</Button>
              <Button size="sm" variant="outline" onClick={() => setAllAccepted(false)} className="gap-1.5"><XCircle className="h-3.5 w-3.5" />Reject all</Button>
              <Button size="sm" variant="ghost" onClick={() => { setMode('ai'); setParsed([]); }}>Re-parse</Button>
              <Button size="sm" onClick={saveAccepted} disabled={bulkSaving} className="gap-1.5">
                {bulkSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Add accepted
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {parsed.map((p, i) => (
              <div key={i} className={`rounded-xl border p-3 transition-all ${p._saved ? 'border-emerald-500/40 bg-emerald-500/5 opacity-60' : p._accepted ? 'border-[hsl(var(--rise-gold)/0.5)] bg-card/40' : 'border-border/40 bg-card/20 opacity-50'}`}>
                <div className="flex items-start gap-2">
                  <button onClick={() => update(i, { _accepted: !p._accepted })} disabled={p._saved} className={`mt-1 h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 ${p._accepted ? 'bg-[hsl(var(--rise-gold))] border-[hsl(var(--rise-gold))]' : 'border-border'}`}>
                    {p._accepted && <Check className="h-3 w-3 text-black" />}
                  </button>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-1">
                    {p._matched_source === 'transfermarkt' && (
                      <div className="col-span-2 md:col-span-4 -mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> Matched on Transfermarkt{p.transfermarkt_id ? ` · #${p.transfermarkt_id}` : ''}
                      </div>
                    )}
                    {p._needs_review && (
                      <div className="col-span-2 md:col-span-4 -mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-amber-400">
                        <XCircle className="h-3 w-3" /> Not matched on Transfermarkt — verify before saving
                      </div>
                    )}
                    <MiniField label="Name"><Input value={p.name || ''} onChange={(e) => update(i, { name: e.target.value })} className="h-8 text-sm" /></MiniField>
                    <MiniField label="Position">
                      <Select value={p.position || ''} onValueChange={(value) => update(i, { position: value })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {PLAYER_POSITIONS.map((code) => (<SelectItem key={code} value={code}>{code}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </MiniField>
                    <MiniField label="Nationality"><Input value={p.nationality || ''} onChange={(e) => update(i, { nationality: e.target.value })} className="h-8 text-sm" /></MiniField>
                    <MiniField label="DOB"><Input type="date" value={p.date_of_birth || ''} onChange={(e) => update(i, { date_of_birth: e.target.value })} className="h-8 text-sm" /></MiniField>
                    <MiniField label="Club"><Input value={p.club || ''} onChange={(e) => update(i, { club: e.target.value })} className="h-8 text-sm" /></MiniField>
                    <MiniField label="League"><Input value={p.league || ''} onChange={(e) => update(i, { league: e.target.value })} className="h-8 text-sm" /></MiniField>
                    <MiniField label="Instagram"><Input value={p.instagram_handle || ''} onChange={(e) => update(i, { instagram_handle: e.target.value })} className="h-8 text-sm" /></MiniField>
                    <MiniField label="National team">
                      <Select value={p.national_team === true ? 'yes' : p.national_team === false ? 'no' : ''} onValueChange={(value) => update(i, { national_team: value === 'yes' ? true : value === 'no' ? false : null })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </MiniField>
                    <MiniField label="Agency"><Input value={p.agency || ''} onChange={(e) => update(i, { agency: e.target.value })} placeholder="Only if stated" className="h-8 text-sm" /></MiniField>
                    <MiniField label="Notes"><Input value={p.notes || ''} onChange={(e) => update(i, { notes: e.target.value })} className="h-8 text-sm" /></MiniField>
                  </div>
                </div>
                {p._error && <div className="text-xs text-red-400 mt-1.5 ml-7">{p._error}</div>}
                {p._saved && <div className="text-xs text-emerald-400 mt-1.5 ml-7">Added</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
    {children}
  </div>
);

const MiniField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-0.5">
    <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
    {children}
  </div>
);

export default PlayerAddMode;