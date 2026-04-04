import React, { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollReveal } from '@/components/ScrollReveal';
import { toast } from 'sonner';
import { Loader2, Merge, X, AlertTriangle } from 'lucide-react';
import { normalizeClubName } from '@/lib/clubNameUtils';

interface Contact {
  id: string;
  name: string;
  club_name: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  image_url: string | null;
  notes: string | null;
}

interface DuplicateGroup {
  key: string;
  reason: string;
  contacts: Contact[];
}

const softPanelStyle = {
  background: 'linear-gradient(145deg, hsl(var(--card) / 0.84), hsl(var(--muted) / 0.3))',
  boxShadow: '0 20px 54px -34px hsl(var(--foreground) / 0.38), inset 0 1px 0 hsl(var(--background) / 0.18)',
};

const normalisePhone = (v: string | null) => (v || '').replace(/\D+/g, '');

export const NetworkDuplicateDetector: React.FC<{ contacts: Contact[]; onRefresh: () => void }> = ({ contacts, onRefresh }) => {
  const [merging, setMerging] = useState<string | null>(null);
  const [mergingAll, setMergingAll] = useState(false);
  const duplicates = useMemo<DuplicateGroup[]>(() => {
    const groups: DuplicateGroup[] = [];
    const seen = new Set<string>();

    // Email matches
    const byEmail = new Map<string, Contact[]>();
    contacts.forEach((c) => {
      if (!c.email) return;
      const key = c.email.toLowerCase().trim();
      const list = byEmail.get(key) || [];
      list.push(c);
      byEmail.set(key, list);
    });
    byEmail.forEach((list, email) => {
      if (list.length < 2) return;
      const ids = list.map(c => c.id).sort().join(',');
      if (seen.has(ids)) return;
      seen.add(ids);
      groups.push({ key: ids, reason: `Same email: ${email}`, contacts: list });
    });

    // Phone matches
    const byPhone = new Map<string, Contact[]>();
    contacts.forEach((c) => {
      const phone = normalisePhone(c.phone);
      if (phone.length < 7) return;
      const list = byPhone.get(phone) || [];
      list.push(c);
      byPhone.set(phone, list);
    });
    byPhone.forEach((list, phone) => {
      if (list.length < 2) return;
      const ids = list.map(c => c.id).sort().join(',');
      if (seen.has(ids)) return;
      seen.add(ids);
      groups.push({ key: ids, reason: `Same phone: ${phone}`, contacts: list });
    });

    // Name + Club fuzzy match
    const byNameClub = new Map<string, Contact[]>();
    contacts.forEach((c) => {
      const nameKey = normalizeClubName(c.name);
      const clubKey = normalizeClubName(c.club_name || '');
      if (!nameKey) return;
      const key = `${nameKey}::${clubKey}`;
      const list = byNameClub.get(key) || [];
      list.push(c);
      byNameClub.set(key, list);
    });
    byNameClub.forEach((list) => {
      if (list.length < 2) return;
      const ids = list.map(c => c.id).sort().join(',');
      if (seen.has(ids)) return;
      seen.add(ids);
      groups.push({ key: ids, reason: `Similar name & club`, contacts: list });
    });

    return groups;
  }, [contacts]);

  const handleMerge = async (group: DuplicateGroup) => {
    if (group.contacts.length < 2) return;
    setMerging(group.key);

    try {
      // Keep the first contact, merge data from others into it
      const primary = { ...group.contacts[0] };
      const others = group.contacts.slice(1);

      others.forEach((c) => {
        if (!primary.email && c.email) primary.email = c.email;
        if (!primary.phone && c.phone) primary.phone = c.phone;
        if (!primary.club_name && c.club_name) primary.club_name = c.club_name;
        if (!primary.position && c.position) primary.position = c.position;
        if (!primary.country && c.country) primary.country = c.country;
        if (!primary.city && c.city) primary.city = c.city;
        if (!primary.image_url && c.image_url) primary.image_url = c.image_url;
        if (c.notes && !primary.notes?.includes(c.notes)) {
          primary.notes = [primary.notes, c.notes].filter(Boolean).join('\n');
        }
      });

      const { error: updateError } = await supabase
        .from('club_network_contacts')
        .update({
          email: primary.email,
          phone: primary.phone,
          club_name: primary.club_name,
          position: primary.position,
          country: primary.country,
          city: primary.city,
          image_url: primary.image_url,
          notes: primary.notes,
        })
        .eq('id', primary.id);

      if (updateError) throw updateError;

      // Delete the other contacts
      const deleteIds = others.map(c => c.id);
      const { error: deleteError } = await supabase
        .from('club_network_contacts')
        .delete()
        .in('id', deleteIds);

      if (deleteError) throw deleteError;

      toast.success(`Merged ${group.contacts.length} contacts into ${primary.name}`);
      onRefresh();
    } catch (err: any) {
      toast.error(`Merge failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setMerging(null);
    }
  };

  if (duplicates.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-[1.5rem] border border-border/50 p-6 text-center backdrop-blur-2xl" style={softPanelStyle}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_36%)] opacity-80" />
        <div className="relative z-[1]">
          <p className="text-sm text-muted-foreground">No duplicate contacts detected. Your network is clean.</p>
        </div>
      </div>
    );
  }



  const handleMergeAll = async () => {
    if (!confirm(`Merge all ${duplicates.length} duplicate groups? This cannot be undone.`)) return;
    setMergingAll(true);
    let merged = 0;
    for (const group of duplicates) {
      try {
        const primary = { ...group.contacts[0] };
        const others = group.contacts.slice(1);
        others.forEach((c) => {
          if (!primary.email && c.email) primary.email = c.email;
          if (!primary.phone && c.phone) primary.phone = c.phone;
          if (!primary.club_name && c.club_name) primary.club_name = c.club_name;
          if (!primary.position && c.position) primary.position = c.position;
          if (!primary.country && c.country) primary.country = c.country;
          if (!primary.city && c.city) primary.city = c.city;
          if (!primary.image_url && c.image_url) primary.image_url = c.image_url;
          if (c.notes && !primary.notes?.includes(c.notes)) {
            primary.notes = [primary.notes, c.notes].filter(Boolean).join('\n');
          }
        });
        await supabase.from('club_network_contacts').update({
          email: primary.email, phone: primary.phone, club_name: primary.club_name,
          position: primary.position, country: primary.country, city: primary.city,
          image_url: primary.image_url, notes: primary.notes,
        }).eq('id', primary.id);
        await supabase.from('club_network_contacts').delete().in('id', others.map(c => c.id));
        merged++;
      } catch { /* skip failed */ }
    }
    toast.success(`Merged ${merged} duplicate groups`);
    setMergingAll(false);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <ScrollReveal>
        <div className="relative overflow-hidden rounded-[2rem] border border-border/50 p-5 backdrop-blur-2xl" style={softPanelStyle}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_38%)] opacity-85" />
          <div className="relative z-[1] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <ScrollReveal>
                  <h3 className="font-bebas text-xl tracking-[0.26em] text-foreground uppercase">Duplicate Detection</h3>
                </ScrollReveal>
                <p className="text-sm text-muted-foreground">{duplicates.length} potential duplicate group{duplicates.length === 1 ? '' : 's'} found.</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="rounded-xl border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
              disabled={mergingAll}
              onClick={handleMergeAll}
            >
              {mergingAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Merge className="h-4 w-4 mr-2" />}
              Merge All
            </Button>
          </div>
        </div>
      </ScrollReveal>

      <div className="space-y-3">
        {duplicates.slice(0, 20).map((group) => (
          <div key={group.key} className="relative overflow-hidden rounded-[1.35rem] border border-border/50 p-4 backdrop-blur-2xl" style={softPanelStyle}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--accent)/0.08),transparent_36%)] opacity-80" />
            <div className="relative z-[1]">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-xs">{group.reason}</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  disabled={merging === group.key}
                  onClick={() => handleMerge(group)}
                >
                  {merging === group.key ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Merge className="h-3.5 w-3.5 mr-1.5" />}
                  Merge
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {group.contacts.map((c) => (
                  <div key={c.id} className="rounded-xl border border-border/50 bg-background/30 px-3 py-2 text-sm">
                    <p className="font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{[c.club_name, c.position, c.country].filter(Boolean).join(' · ') || 'No details'}</p>
                    {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                    {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
        {duplicates.length > 20 && (
          <p className="text-sm text-muted-foreground text-center">Showing 20 of {duplicates.length} groups. Merge these first to reveal more.</p>
        )}
      </div>
    </div>
  );
};
