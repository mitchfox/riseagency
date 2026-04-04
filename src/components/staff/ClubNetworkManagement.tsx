import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, X, Settings, Search, Upload, Sparkles, Phone, Globe, MapPin, Building2, User, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { openExternalUrl, openMailto } from '@/utils/openExternalUrl';
import { FaWhatsapp } from 'react-icons/fa';
import { Mail } from 'lucide-react';
import { getCountryFlagUrl } from '@/lib/countryFlags';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuickMessageSection } from './QuickMessageSection';
import MessagePathways from './MessagePathways';
import { LeagueRulesDialog } from './LeagueRulesDialog';
import { invokeEdgeFunction } from '@/lib/edgeFunctionHelper';

interface Contact {
  id: string;
  name: string;
  club_name: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  notes: string | null;
}

type SortField = 'name' | 'club_name' | 'country';
type SortDir = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';
type GroupBy = 'none' | 'country' | 'club' | 'role';

const ClubNetworkManagement = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showLeagueRules, setShowLeagueRules] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [groupBy, setGroupBy] = useState<GroupBy>('country');
  const [showCsvDialog, setShowCsvDialog] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvProcessing, setCsvProcessing] = useState(false);
  const [csvParsedContacts, setCsvParsedContacts] = useState<any[]>([]);
  const [aiTagging, setAiTagging] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    club_name: '',
    position: '',
    email: '',
    phone: '',
    country: '',
    city: '',
    latitude: '',
    longitude: '',
    image_url: '',
    notes: '',
  });

  useEffect(() => {
    fetchContacts();
    syncOutreachContacts();
  }, []);

  const syncOutreachContacts = async () => {
    const { data: outreachData, error: outreachError } = await supabase
      .from('club_outreach')
      .select('club_name, contact_name, contact_role')
      .in('status', ['meeting', 'responded', 'interested']);

    if (outreachError || !outreachData) return;

    const { data: existingContacts } = await supabase
      .from('club_network_contacts')
      .select('name, club_name');

    const existingSet = new Set(
      (existingContacts || []).map(c => `${c.name?.toLowerCase()}-${c.club_name?.toLowerCase()}`)
    );

    const newContacts = outreachData
      .filter(o => o.contact_name && !existingSet.has(`${o.contact_name.toLowerCase()}-${o.club_name.toLowerCase()}`))
      .map(o => ({
        name: o.contact_name!,
        club_name: o.club_name,
        position: o.contact_role || null,
      }));

    if (newContacts.length > 0) {
      const { error: insertError } = await supabase
        .from('club_network_contacts')
        .insert(newContacts);

      if (!insertError) {
        toast.success(`Added ${newContacts.length} contact(s) from outreach`);
        fetchContacts();
      }
    }
  };

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from('club_network_contacts')
      .select('*')
      .not('position', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch contacts');
      return;
    }

    const filteredContacts = (data || []).filter(contact =>
      contact.position !== null && contact.position !== ''
    );

    setContacts(filteredContacts);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const contactData = {
      name: formData.name,
      club_name: formData.club_name || null,
      position: formData.position || null,
      email: formData.email || null,
      phone: formData.phone || null,
      country: formData.country || null,
      city: formData.city || null,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      image_url: formData.image_url || null,
      notes: formData.notes || null,
    };

    if (editingContact) {
      const { error } = await supabase
        .from('club_network_contacts')
        .update(contactData)
        .eq('id', editingContact.id);

      if (error) {
        toast.error('Failed to update contact');
        return;
      }
      toast.success('Contact updated');
    } else {
      const { error } = await supabase
        .from('club_network_contacts')
        .insert(contactData);

      if (error) {
        toast.error('Failed to create contact');
        return;
      }
      toast.success('Contact created');
    }

    setShowDialog(false);
    setEditingContact(null);
    resetForm();
    fetchContacts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    const { error } = await supabase
      .from('club_network_contacts')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete contact');
      return;
    }
    toast.success('Contact deleted');
    fetchContacts();
  };

  const resetForm = () => {
    setFormData({ name: '', club_name: '', position: '', email: '', phone: '', country: '', city: '', latitude: '', longitude: '', image_url: '', notes: '' });
  };

  const openEditDialog = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      club_name: contact.club_name || '',
      position: contact.position || '',
      email: contact.email || '',
      phone: contact.phone || '',
      country: contact.country || '',
      city: contact.city || '',
      latitude: contact.latitude?.toString() || '',
      longitude: contact.longitude?.toString() || '',
      image_url: contact.image_url || '',
      notes: contact.notes || '',
    });
    setShowDialog(true);
  };

  const openAddDialog = () => {
    setEditingContact(null);
    resetForm();
    setShowDialog(true);
  };

  // CSV Import
  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvText(ev.target?.result as string || '');
      setShowCsvDialog(true);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCsvParse = async () => {
    if (!csvText.trim()) return;
    setCsvProcessing(true);
    try {
      const { data, error } = await invokeEdgeFunction('generate-ai-response', {
        body: {
          prompt: `Parse this CSV/contact data and return a JSON array of contacts. Each contact should have: name, club_name, position, email, phone, country, city. Fill in what you can infer. If there's no clear column for a field, leave it null. Be smart about inferring country from club names or email domains. Here's the data:\n\n${csvText.substring(0, 8000)}`
        }
      });

      if (error) throw error;

      const responseText = data?.response || '';
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setCsvParsedContacts(parsed);
        toast.success(`Parsed ${parsed.length} contacts`);
      } else {
        toast.error('Could not parse contacts from response');
      }
    } catch (err: any) {
      console.error('CSV parse error:', err);
      toast.error('Failed to parse CSV: ' + (err.message || 'Unknown error'));
    } finally {
      setCsvProcessing(false);
    }
  };

  const handleCsvImport = async () => {
    if (csvParsedContacts.length === 0) return;
    setCsvProcessing(true);
    try {
      const contactsToInsert = csvParsedContacts.map(c => ({
        name: c.name || 'Unknown',
        club_name: c.club_name || null,
        position: c.position || null,
        email: c.email || null,
        phone: c.phone || null,
        country: c.country || null,
        city: c.city || null,
      }));

      const { error } = await supabase
        .from('club_network_contacts')
        .insert(contactsToInsert);

      if (error) throw error;

      toast.success(`Imported ${contactsToInsert.length} contacts`);
      setShowCsvDialog(false);
      setCsvText('');
      setCsvParsedContacts([]);
      fetchContacts();
    } catch (err: any) {
      toast.error('Import failed: ' + (err.message || 'Unknown error'));
    } finally {
      setCsvProcessing(false);
    }
  };

  // AI Auto-Tag
  const handleAiAutoTag = async () => {
    const untagged = contacts.filter(c => !c.country || !c.position);
    if (untagged.length === 0) {
      toast.info('All contacts already have country and role tags');
      return;
    }

    setAiTagging(true);
    try {
      const contactSummary = untagged.slice(0, 50).map(c => ({
        id: c.id,
        name: c.name,
        club_name: c.club_name,
        position: c.position,
        country: c.country,
        city: c.city,
        email: c.email,
      }));

      const { data, error } = await invokeEdgeFunction('generate-ai-response', {
        body: {
          prompt: `For each of these contacts, infer the missing country and/or position/role based on their name, club name, city, and email. Return a JSON array with objects containing: id, country (if missing), position (if missing). Only include contacts where you can confidently infer something. Use standard country names. For position, use common football industry roles like: Scout, Director of Football, Head of Recruitment, Agent, Academy Director, First Team Coach, Head Coach, Sporting Director, etc.\n\nContacts:\n${JSON.stringify(contactSummary)}`
        }
      });

      if (error) throw error;

      const responseText = data?.response || '';
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const updates = JSON.parse(jsonMatch[0]);
        let updated = 0;
        for (const u of updates) {
          const updateData: any = {};
          if (u.country) updateData.country = u.country;
          if (u.position) updateData.position = u.position;
          if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase
              .from('club_network_contacts')
              .update(updateData)
              .eq('id', u.id);
            if (!updateError) updated++;
          }
        }
        toast.success(`AI tagged ${updated} contacts`);
        fetchContacts();
      }
    } catch (err: any) {
      toast.error('AI tagging failed: ' + (err.message || 'Unknown error'));
    } finally {
      setAiTagging(false);
    }
  };

  // Derived data
  const uniqueCountries = useMemo(() => {
    const countries = contacts.map(c => c.country).filter((c): c is string => !!c);
    return [...new Set(countries)].sort();
  }, [contacts]);

  const uniqueRoles = useMemo(() => {
    const roles = contacts.map(c => c.position).filter((r): r is string => !!r);
    return [...new Set(roles)].sort();
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    let result = contacts;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.club_name?.toLowerCase().includes(q) ||
        c.country?.toLowerCase().includes(q) ||
        c.position?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
      );
    }

    if (countryFilter !== 'all') {
      result = result.filter(c => c.country === countryFilter);
    }
    if (roleFilter !== 'all') {
      result = result.filter(c => c.position === roleFilter);
    }

    result.sort((a, b) => {
      const aVal = (a[sortField] || '').toLowerCase();
      const bVal = (b[sortField] || '').toLowerCase();
      const cmp = aVal.localeCompare(bVal);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [contacts, searchQuery, countryFilter, roleFilter, sortField, sortDir]);

  const groupedContacts = useMemo(() => {
    if (groupBy === 'none') return { 'All Contacts': filteredContacts };

    const groups: Record<string, Contact[]> = {};
    for (const c of filteredContacts) {
      let key = 'Uncategorised';
      if (groupBy === 'country' && c.country) key = c.country;
      else if (groupBy === 'club' && c.club_name) key = c.club_name;
      else if (groupBy === 'role' && c.position) key = c.position;

      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    }

    // Sort groups: named groups first alphabetically, Uncategorised last
    const sorted: Record<string, Contact[]> = {};
    const keys = Object.keys(groups).sort((a, b) => {
      if (a === 'Uncategorised') return 1;
      if (b === 'Uncategorised') return -1;
      return a.localeCompare(b);
    });
    for (const k of keys) sorted[k] = groups[k];
    return sorted;
  }, [filteredContacts, groupBy]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const ContactCard = ({ contact }: { contact: Contact }) => (
    <div
      className="group relative bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 cursor-pointer"
      onClick={() => openEditDialog(contact)}
    >
      {/* Quick actions - top right */}
      <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); handleDelete(contact.id); }}
          className="p-1 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
          title="Delete"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Header with avatar/initials */}
      <div className="flex items-start gap-3 mb-3">
        {contact.image_url ? (
          <img src={contact.image_url} alt={contact.name} className="w-11 h-11 rounded-full object-cover ring-2 ring-border shrink-0" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0 ring-2 ring-border">
            <span className="text-sm font-bold text-primary">
              {contact.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-sm truncate leading-tight">{contact.name}</h3>
          {contact.position && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{contact.position}</p>
          )}
        </div>
      </div>

      {/* Club */}
      {contact.club_name && (
        <div className="flex items-center gap-1.5 mb-2">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium truncate">{contact.club_name}</span>
        </div>
      )}

      {/* Location */}
      {contact.country && (
        <div className="flex items-center gap-1.5 mb-3">
          <img src={getCountryFlagUrl(contact.country)} alt={contact.country} className="w-4 h-3 object-cover rounded-sm shrink-0" />
          <span className="text-xs text-muted-foreground truncate">
            {contact.city ? `${contact.city}, ` : ''}{contact.country}
          </span>
        </div>
      )}

      {/* Quick action buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
        {contact.phone && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              openExternalUrl(`https://wa.me/${contact.phone!.replace(/[^0-9]/g, '')}`);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-colors text-xs font-medium"
            title={`WhatsApp: ${contact.phone}`}
          >
            <FaWhatsapp className="h-3.5 w-3.5" />
            <span>WhatsApp</span>
          </button>
        )}
        {contact.email && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              openMailto(contact.email!);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors text-xs font-medium"
            title={`Email: ${contact.email}`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Email</span>
          </button>
        )}
        {contact.phone && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              openExternalUrl(`tel:${contact.phone}`);
            }}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground transition-colors text-xs"
            title={`Call: ${contact.phone}`}
          >
            <Phone className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="contacts" className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-max sm:w-auto">
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="pathways">Pathways</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="contacts" className="mt-6">
          <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
              <div>
                <h2 className="text-xl font-semibold">Network Contacts</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{contacts.length} contacts across {uniqueCountries.length} countries</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLeagueRules(true)}
                  title="League Rules"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAiAutoTag}
                  disabled={aiTagging}
                  title="AI auto-tag contacts with missing country/role"
                >
                  {aiTagging ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                  AI Tag
                </Button>
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt,.xlsx"
                    onChange={handleCsvFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Import CSV
                  </Button>
                </div>
                <Button size="sm" onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Contact
                </Button>
              </div>
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, club, country, role, email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {uniqueCountries.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {uniqueRoles.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* View controls */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Group by:</span>
                {(['country', 'club', 'role', 'none'] as GroupBy[]).map(g => (
                  <Button
                    key={g}
                    variant={groupBy === g ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGroupBy(g)}
                    className="text-xs h-7 px-2.5"
                  >
                    {g === 'none' ? 'None' : g.charAt(0).toUpperCase() + g.slice(1)}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                {(['name', 'club_name', 'country'] as SortField[]).map(f => (
                  <Button
                    key={f}
                    variant={sortField === f ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleSort(f)}
                    className="text-xs h-7"
                  >
                    {f === 'club_name' ? 'Club' : f.charAt(0).toUpperCase() + f.slice(1)}
                    {sortField === f && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                  </Button>
                ))}
              </div>
            </div>

            <div className="text-xs text-muted-foreground mb-3">
              Showing {filteredContacts.length} of {contacts.length} contacts
            </div>

            {/* Grouped contact cards */}
            <div className="space-y-6">
              {Object.entries(groupedContacts).map(([groupName, groupContacts]) => (
                <div key={groupName}>
                  {groupBy !== 'none' && (
                    <button
                      onClick={() => toggleGroup(groupName)}
                      className="flex items-center gap-2 mb-3 w-full text-left group/header"
                    >
                      <div className="flex items-center gap-2">
                        {groupBy === 'country' && groupName !== 'Uncategorised' && (
                          <img src={getCountryFlagUrl(groupName)} alt={groupName} className="w-5 h-3.5 object-cover rounded-sm" />
                        )}
                        <h3 className="font-bebas text-lg uppercase tracking-wide">{groupName}</h3>
                        <Badge variant="secondary" className="text-xs">{groupContacts.length}</Badge>
                      </div>
                      {collapsedGroups.has(groupName) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div className="flex-1 h-px bg-border ml-2" />
                    </button>
                  )}

                  {!collapsedGroups.has(groupName) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {groupContacts.map(contact => (
                        <ContactCard key={contact.id} contact={contact} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {filteredContacts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No contacts found</p>
                <p className="text-sm mt-1">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <QuickMessageSection />
        </TabsContent>

        <TabsContent value="pathways" className="mt-6">
          <MessagePathways />
        </TabsContent>
      </Tabs>

      {/* League Rules Dialog */}
      <LeagueRulesDialog open={showLeagueRules} onOpenChange={setShowLeagueRules} />

      {/* CSV Import Dialog */}
      <Dialog open={showCsvDialog} onOpenChange={setShowCsvDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Contact Import
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Paste or edit your contact data</Label>
              <p className="text-xs text-muted-foreground mb-2">CSV, tab-separated, or any structured text. AI will parse and extract contacts automatically.</p>
              <Textarea
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                rows={8}
                placeholder="Name, Club, Role, Email, Phone, Country&#10;John Smith, Arsenal FC, Scout, john@arsenal.com, +44123456789, England"
                className="font-mono text-xs"
              />
            </div>

            {csvParsedContacts.length === 0 ? (
              <Button onClick={handleCsvParse} disabled={csvProcessing || !csvText.trim()} className="w-full">
                {csvProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Parse with AI
              </Button>
            ) : (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">{csvParsedContacts.length} contacts ready to import</h4>
                <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
                  {csvParsedContacts.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{c.name}</span>
                        {c.club_name && <span className="text-muted-foreground">· {c.club_name}</span>}
                        {c.position && <Badge variant="outline" className="text-[10px] h-4">{c.position}</Badge>}
                      </div>
                      {c.country && <span className="text-muted-foreground">{c.country}</span>}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setCsvParsedContacts([])} className="flex-1">
                    Re-parse
                  </Button>
                  <Button onClick={handleCsvImport} disabled={csvProcessing} className="flex-1">
                    {csvProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Import All
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Contact Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-4 md:p-6">
          <DialogHeader>
            <DialogTitle>
              {editingContact ? 'Edit Contact' : 'Add Contact'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="club_name">Club Name</Label>
                <Input id="club_name" value={formData.club_name} onChange={(e) => setFormData({ ...formData, club_name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="position">Role / Position</Label>
                <Input id="position" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="image_url">Image URL</Label>
                <Input id="image_url" value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setShowDialog(false); setEditingContact(null); resetForm(); }}>
                Cancel
              </Button>
              <Button type="submit">
                {editingContact ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClubNetworkManagement;
