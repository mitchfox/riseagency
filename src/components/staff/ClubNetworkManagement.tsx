import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, X, Mail } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuickMessageSection } from './QuickMessageSection';

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

const ClubNetworkManagement = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
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
    // Fetch club outreach entries with meeting, responded, or interested status
    const { data: outreachData, error: outreachError } = await supabase
      .from('club_outreach')
      .select('club_name, contact_name, contact_role')
      .in('status', ['meeting', 'responded', 'interested']);

    if (outreachError || !outreachData) return;

    // Fetch existing contacts to avoid duplicates
    const { data: existingContacts } = await supabase
      .from('club_network_contacts')
      .select('name, club_name');

    const existingSet = new Set(
      (existingContacts || []).map(c => `${c.name?.toLowerCase()}-${c.club_name?.toLowerCase()}`)
    );

    // Filter out entries without contact_name or already existing
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
      .not('position', 'is', null) // Only fetch entries that have a position (actual contacts, not clubs)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch contacts');
      return;
    }

    // Additional filter: exclude entries where name looks like a club name (no position set means it's a club)
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

  return (
    <div className="space-y-6">
      <Tabs defaultValue="contacts" className="w-full">
        <TabsList>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="mt-6">

      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Club Network Contacts</h2>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>

      <div className="space-y-4">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex gap-4">
                  {contact.image_url && (
                    <img
                      src={contact.image_url}
                      alt={contact.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-lg">{contact.name}</h3>
                    {contact.position && (
                      <p className="text-sm text-muted-foreground">{contact.position}</p>
                    )}
                    <div className="mt-2 flex items-center gap-3">
                      {contact.phone && (
                        <a
                          href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground/60 hover:text-green-500 transition-colors"
                          title={`WhatsApp: ${contact.phone}`}
                        >
                          <FaWhatsapp className="h-5 w-5" />
                        </a>
                      )}
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-muted-foreground/60 hover:text-primary transition-colors"
                          title={`Email: ${contact.email}`}
                        >
                          <Mail className="h-5 w-5" />
                        </a>
                      )}
                    </div>
                    {contact.city && contact.country && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {contact.city}, {contact.country}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
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
      </Tabs>

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
