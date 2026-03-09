import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, X, Settings, Search } from 'lucide-react';
import { openExternalUrl, openMailto } from '@/utils/openExternalUrl';
import { FaWhatsapp } from 'react-icons/fa';
import { Mail } from 'lucide-react';
import { getCountryFlagUrl } from '@/lib/countryFlags';
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

const ClubNetworkManagement = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showLeagueRules, setShowLeagueRules] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
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
        toast.success(`Added ${newContacts.length} contact(s) from Club Outreach`);
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
    setFormData({
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

  // Derived data
  const uniqueCountries = useMemo(() => {
    const countries = contacts
      .map(c => c.country)
      .filter((c): c is string => !!c);
    return [...new Set(countries)].sort();
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    let result = contacts;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.club_name?.toLowerCase().includes(q) ||
        c.country?.toLowerCase().includes(q) ||
        c.position?.toLowerCase().includes(q)
      );
    }

    if (countryFilter !== 'all') {
      result = result.filter(c => c.country === countryFilter);
    }

    result.sort((a, b) => {
      const aVal = (a[sortField] || '').toLowerCase();
      const bVal = (b[sortField] || '').toLowerCase();
      const cmp = aVal.localeCompare(bVal);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [contacts, searchQuery, countryFilter, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="contacts" className="w-full">
        <TabsList>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="pathways">Message Pathways</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="mt-6">
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <h2 className="text-lg sm:text-xl font-semibold">Club Network Contacts</h2>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setShowLeagueRules(true)}
                  title="League Rules"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button onClick={openAddDialog} className="flex-1 sm:flex-none">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </div>
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, club, country..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {uniqueCountries.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-1">
                {(['name', 'club_name', 'country'] as SortField[]).map(f => (
                  <Button
                    key={f}
                    variant={sortField === f ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSort(f)}
                    className="text-xs"
                  >
                    {f === 'club_name' ? 'Club' : f.charAt(0).toUpperCase() + f.slice(1)}
                    {sortField === f && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                  </Button>
                ))}
              </div>
            </div>

            <div className="text-xs text-muted-foreground mb-2">
              {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}
            </div>

            <div className="space-y-4">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="p-3 sm:p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                    <div className="flex gap-3 sm:gap-4 w-full sm:w-auto">
                      {contact.image_url && (
                        <img
                          src={contact.image_url}
                          alt={contact.name}
                          className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-base sm:text-lg truncate">{contact.name}</h3>
                        {contact.position && (
                          <p className="text-xs sm:text-sm text-muted-foreground">{contact.position}</p>
                        )}
                        {contact.club_name && (
                          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-medium truncate">{contact.club_name}</p>
                        )}
                        <div className="mt-1.5 sm:mt-2 flex items-center gap-3">
                          {contact.phone && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openExternalUrl(`https://wa.me/${contact.phone!.replace(/[^0-9]/g, '')}`);
                              }}
                              className="text-muted-foreground/60 hover:text-emerald-500 transition-colors"
                              title={`WhatsApp: ${contact.phone}`}
                            >
                              <FaWhatsapp className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                          )}
                          {contact.email && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openMailto(contact.email!);
                              }}
                              className="text-muted-foreground/60 hover:text-primary transition-colors"
                              title={`Email: ${contact.email}`}
                            >
                              <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                          )}
                        </div>
                        {contact.country && (
                          <div className="mt-1 flex items-center gap-1.5">
                            <img
                              src={getCountryFlagUrl(contact.country)}
                              alt={contact.country}
                              className="w-4 h-3 object-cover rounded-sm"
                            />
                            <span className="text-xs text-muted-foreground">
                              {contact.city ? `${contact.city}, ` : ''}{contact.country}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0 self-end sm:self-start">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(contact)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(contact.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {contact.notes && (
                    <p className="mt-3 text-sm text-muted-foreground border-t pt-3">
                      {contact.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
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
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="club_name">Club Name</Label>
                <Input
                  id="club_name"
                  value={formData.club_name}
                  onChange={(e) => setFormData({ ...formData, club_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="image_url">Image URL</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="-90 to 90"
                />
              </div>
              <div>
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="-180 to 180"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  setEditingContact(null);
                  resetForm();
                }}
              >
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
