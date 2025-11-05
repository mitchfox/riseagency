import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, X, MapPin, List } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  const [view, setView] = useState<'map' | 'list'>('map');
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
  }, []);

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from('club_network_contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch contacts');
      return;
    }

    setContacts(data || []);
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
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            variant={view === 'map' ? 'default' : 'outline'}
            onClick={() => setView('map')}
            size="sm"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Map View
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'outline'}
            onClick={() => setView('list')}
            size="sm"
          >
            <List className="h-4 w-4 mr-2" />
            List View
          </Button>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {view === 'map' ? (
        <div className="relative w-full h-[600px] bg-secondary/10 rounded-lg border overflow-hidden">
          <svg viewBox="0 0 1000 500" className="w-full h-full">
            {/* Ocean background */}
            <rect width="1000" height="500" fill="hsl(var(--muted) / 0.3)" />
            
            {/* Grid lines */}
            <g stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3">
              {/* Latitude lines */}
              {[0, 100, 200, 300, 400, 500].map(y => (
                <line key={`lat-${y}`} x1="0" y1={y} x2="1000" y2={y} />
              ))}
              {/* Longitude lines */}
              {[0, 200, 400, 600, 800, 1000].map(x => (
                <line key={`lon-${x}`} x1={x} y1="0" x2={x} y2="500" />
              ))}
            </g>
            
            {/* Simplified continents */}
            <g fill="hsl(var(--secondary))" stroke="hsl(var(--border))" strokeWidth="1">
              {/* North America */}
              <path d="M 150,80 L 200,70 L 250,90 L 280,100 L 290,150 L 270,200 L 250,220 L 200,210 L 180,190 L 160,150 Z" />
              <path d="M 200,210 L 220,240 L 210,280 L 190,290 L 170,270 L 180,230 Z" />
              
              {/* South America */}
              <path d="M 250,290 L 270,310 L 280,350 L 290,390 L 280,420 L 260,430 L 240,420 L 230,380 L 240,340 L 245,310 Z" />
              
              {/* Europe */}
              <path d="M 480,80 L 520,75 L 550,90 L 560,110 L 540,130 L 510,135 L 490,120 L 475,100 Z" />
              
              {/* Africa */}
              <path d="M 480,150 L 520,145 L 560,160 L 580,200 L 590,250 L 580,300 L 560,340 L 530,360 L 500,350 L 480,320 L 470,280 L 475,240 L 480,200 Z" />
              
              {/* Asia */}
              <path d="M 560,70 L 650,60 L 750,80 L 820,100 L 860,120 L 880,150 L 870,180 L 840,200 L 800,210 L 750,200 L 700,180 L 650,160 L 600,140 L 570,110 Z" />
              <path d="M 650,160 L 700,180 L 720,220 L 710,260 L 690,280 L 650,270 L 620,250 L 610,210 L 620,180 Z" />
              
              {/* Australia */}
              <path d="M 800,320 L 850,310 L 900,330 L 920,360 L 910,390 L 880,400 L 840,390 L 810,370 L 795,345 Z" />
            </g>
            
            {/* Contact pins */}
            {contacts.map((contact) => {
              if (!contact.latitude || !contact.longitude) return null;
              const x = ((contact.longitude + 180) / 360) * 1000;
              const y = ((90 - contact.latitude) / 180) * 500;
              return (
                <g key={contact.id}>
                  <circle
                    cx={x}
                    cy={y}
                    r="8"
                    fill="hsl(var(--primary))"
                    stroke="hsl(var(--background))"
                    strokeWidth="2"
                    className="cursor-pointer hover:opacity-80 transition-all"
                    onClick={() => openEditDialog(contact)}
                  />
                  <text
                    x={x}
                    y={y - 15}
                    textAnchor="middle"
                    fill="hsl(var(--foreground))"
                    fontSize="12"
                    fontWeight="bold"
                    className="pointer-events-none"
                  >
                    {contact.club_name || contact.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      ) : (
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
                    {contact.club_name && (
                      <p className="text-sm text-muted-foreground">{contact.club_name}</p>
                    )}
                    {contact.position && (
                      <p className="text-sm text-muted-foreground">{contact.position}</p>
                    )}
                    <div className="mt-2 space-y-1 text-sm">
                      {contact.email && <p>Email: {contact.email}</p>}
                      {contact.phone && <p>Phone: {contact.phone}</p>}
                      {contact.city && contact.country && (
                        <p>Location: {contact.city}, {contact.country}</p>
                      )}
                    </div>
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
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
