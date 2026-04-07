import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, MessageSquare, Mail, Phone, Users, Search, Loader2, Clock, Trash2, Calendar } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { format } from "date-fns";

interface HistoryEntry {
  id: string;
  contact_id: string;
  staff_user_id: string;
  interaction_date: string;
  interaction_type: string;
  key_notes: string | null;
  follow_up_date: string | null;
  created_at: string;
  contact?: { name: string; club_name: string | null; position: string | null; image_url: string | null };
  staff?: { full_name: string | null; email: string };
}

const typeIcons: Record<string, React.ReactNode> = {
  whatsapp: <FaWhatsapp className="h-4 w-4 text-emerald-400" />,
  email: <Mail className="h-4 w-4 text-primary" />,
  call: <Phone className="h-4 w-4 text-amber-400" />,
  meeting: <Users className="h-4 w-4 text-accent" />,
  note: <MessageSquare className="h-4 w-4 text-muted-foreground" />,
};

const typeLabels: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  call: "Call",
  meeting: "Meeting",
  note: "Note",
};

export const InteractionHistory = () => {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStaff, setFilterStaff] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [selectedContact, setSelectedContact] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [interactionType, setInteractionType] = useState("note");
  const [keyNotes, setKeyNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: historyData }, { data: contactsData }, { data: profilesData }] = await Promise.all([
      supabase.from('interaction_history').select('*').order('interaction_date', { ascending: false }).limit(200),
      supabase.from('club_network_contacts').select('id, name, club_name, position, image_url').order('name'),
      supabase.from('profiles').select('id, email, full_name'),
    ]);

    const contactMap = new Map((contactsData || []).map(c => [c.id, c]));
    const profileMap = new Map((profilesData || []).map(p => [p.id, p]));

    const enriched = (historyData || []).map(h => ({
      ...h,
      contact: contactMap.get(h.contact_id),
      staff: profileMap.get(h.staff_user_id),
    }));

    setEntries(enriched as HistoryEntry[]);
    setContacts(contactsData || []);
    setStaffMembers(profilesData || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    if (!selectedContact || !keyNotes.trim()) return;
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('interaction_history').insert({
      contact_id: selectedContact,
      staff_user_id: userData?.user?.id || '',
      interaction_type: interactionType,
      key_notes: keyNotes.trim(),
      follow_up_date: followUpDate || null,
    });
    if (error) toast.error("Failed to log interaction");
    else {
      toast.success("Interaction logged");
      setAddOpen(false);
      setSelectedContact(""); setKeyNotes(""); setFollowUpDate(""); setInteractionType("note"); setContactSearch("");
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('interaction_history').delete().eq('id', id);
    if (error) toast.error("Failed to delete");
    else { setEntries(prev => prev.filter(e => e.id !== id)); }
  };

  const filtered = entries.filter(e => {
    if (search && !e.contact?.name?.toLowerCase().includes(search.toLowerCase()) && !e.key_notes?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== "all" && e.interaction_type !== filterType) return false;
    if (filterStaff !== "all" && e.staff_user_id !== filterStaff) return false;
    return true;
  });

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    (c.club_name || '').toLowerCase().includes(contactSearch.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Interaction History</h3>
          <Badge variant="outline" className="text-xs">{entries.length}</Badge>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Log Interaction
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts or notes..." className="pl-8 h-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(typeLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStaff} onValueChange={setFilterStaff}>
          <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Staff</SelectItem>
            {staffMembers.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.full_name || m.email.split('@')[0]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Timeline */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No interactions found.</p>
        ) : filtered.map(entry => (
          <div key={entry.id} className="group flex gap-3 p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-colors">
            <div className="mt-0.5 shrink-0">
              {typeIcons[entry.interaction_type] || typeIcons.note}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold">{entry.contact?.name || 'Unknown'}</span>
                {entry.contact?.club_name && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5">{entry.contact.club_name}</Badge>
                )}
                <Badge variant="outline" className="text-[10px] h-4 px-1.5">{typeLabels[entry.interaction_type] || entry.interaction_type}</Badge>
              </div>
              {entry.key_notes && (
                <p className="text-xs text-foreground/80 mt-1 leading-relaxed">{entry.key_notes}</p>
              )}
              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                <span>{format(new Date(entry.interaction_date), 'd MMM yyyy HH:mm')}</span>
                <span>by {entry.staff?.full_name || entry.staff?.email?.split('@')[0] || 'Unknown'}</span>
                {entry.follow_up_date && (
                  <span className="flex items-center gap-1 text-[hsl(var(--gold))]">
                    <Calendar className="h-3 w-3" />
                    Follow up: {format(new Date(entry.follow_up_date), 'd MMM yyyy')}
                  </span>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => handleDelete(entry.id)}>
              <Trash2 className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Log Interaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Contact *</Label>
              <Input value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Search contacts..." className="mb-2" />
              <div className="max-h-32 overflow-y-auto border rounded-md divide-y">
                {filteredContacts.slice(0, 20).map(c => (
                  <div
                    key={c.id}
                    className={`flex items-center gap-2 p-2 text-sm cursor-pointer hover:bg-accent/50 ${selectedContact === c.id ? 'bg-accent' : ''}`}
                    onClick={() => setSelectedContact(c.id)}
                  >
                    <span className="font-medium">{c.name}</span>
                    {c.club_name && <span className="text-xs text-muted-foreground">{c.club_name}</span>}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={interactionType} onValueChange={setInteractionType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Key Notes *</Label>
              <Textarea value={keyNotes} onChange={e => setKeyNotes(e.target.value)} placeholder="Summary of the conversation..." rows={3} />
            </div>
            <div>
              <Label>Follow-up Date</Label>
              <Input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={saving || !selectedContact || !keyNotes.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Log
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
