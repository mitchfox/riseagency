import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollReveal } from '@/components/ScrollReveal';
import { toast } from 'sonner';
import { Plus, MessageSquare, Mail, Phone, Users, Loader2, X, Clock } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { format } from 'date-fns';

interface Interaction {
  id: string;
  contact_id: string;
  interaction_type: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  whatsapp: <FaWhatsapp className="h-3.5 w-3.5 text-emerald-400" />,
  email: <Mail className="h-3.5 w-3.5 text-primary" />,
  call: <Phone className="h-3.5 w-3.5 text-amber-400" />,
  meeting: <Users className="h-3.5 w-3.5 text-accent" />,
  note: <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />,
};

const typeLabels: Record<string, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  call: 'Call',
  meeting: 'Meeting',
  note: 'Note',
};

const softPanelStyle = {
  background: 'linear-gradient(145deg, hsl(var(--card) / 0.84), hsl(var(--muted) / 0.3))',
  boxShadow: '0 20px 54px -34px hsl(var(--foreground) / 0.38), inset 0 1px 0 hsl(var(--background) / 0.18)',
};

export const NetworkActivityTimeline: React.FC<{ contactId: string; contactName: string }> = ({ contactId, contactName }) => {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState('note');
  const [newNotes, setNewNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('contact_interactions')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(50);
    setInteractions((data as Interaction[]) || []);
    setLoading(false);
  }, [contactId]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleAdd = async () => {
    if (!newNotes.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('contact_interactions').insert({
      contact_id: contactId,
      interaction_type: newType,
      notes: newNotes.trim(),
    });
    if (error) {
      toast.error('Failed to log interaction');
    } else {
      toast.success('Interaction logged');
      setNewNotes('');
      setShowAdd(false);
      // Also update last_contacted_at
      await supabase.from('club_network_contacts').update({ last_contacted_at: new Date().toISOString() }).eq('id', contactId);
      fetch();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <h4 className="font-bebas text-sm tracking-[0.24em] text-primary uppercase">Activity Timeline</h4>
        </div>
        <Button size="sm" variant="outline" className="rounded-xl h-8" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-border/50 bg-background/30 p-3 space-y-2">
          <div className="flex gap-2">
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger className="w-32 h-8 text-xs rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(typeLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="rounded-lg h-8" onClick={handleAdd} disabled={saving || !newNotes.trim()}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Log'}
            </Button>
          </div>
          <Textarea
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            placeholder="What happened?"
            rows={2}
            className="text-xs"
          />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : interactions.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">No interactions logged yet.</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {interactions.map((interaction) => (
            <div key={interaction.id} className="flex gap-2.5 text-xs">
              <div className="mt-0.5 shrink-0">{typeIcons[interaction.interaction_type] || typeIcons.note}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-border/50">{typeLabels[interaction.interaction_type] || interaction.interaction_type}</Badge>
                  <span className="text-muted-foreground">{format(new Date(interaction.created_at), 'd MMM yyyy HH:mm')}</span>
                </div>
                {interaction.notes && <p className="mt-0.5 text-foreground/80 leading-relaxed">{interaction.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
