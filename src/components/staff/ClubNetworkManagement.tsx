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
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icon
const createCustomIcon = (contact: Contact) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background: hsl(var(--primary));
        border: 3px solid white;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        font-weight: bold;
        color: white;
        font-size: 14px;
      ">
        ${contact.club_name ? contact.club_name.substring(0, 2).toUpperCase() : '📍'}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const ClubNetworkManagement = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [view, setView] = useState<'map' | 'list'>('map');
  const [showDialog, setShowDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [mapReady, setMapReady] = useState(false);
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

  useEffect(() => {
    // Delay map rendering to ensure proper context initialization
    const timer = setTimeout(() => {
      setMapReady(true);
    }, 100);
    
    return () => {
      clearTimeout(timer);
      setMapReady(false);
    };
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
        <div className="relative w-full h-[600px] rounded-lg border overflow-hidden">
          {mapReady ? (
            <MapContainer
              key="club-network-map"
              center={[20, 0]}
              zoom={2}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {contacts
                .filter((contact) => contact.latitude && contact.longitude)
                .map((contact) => (
                  <Marker
                    key={contact.id}
                    position={[contact.latitude!, contact.longitude!]}
                    icon={createCustomIcon(contact)}
                    eventHandlers={{
                      click: () => openEditDialog(contact),
                    }}
                  >
                    <Popup>
                      <div className="min-w-[200px]">
                        <h3 className="font-bold text-base mb-2">
                          {contact.club_name || contact.name}
                        </h3>
                        <div className="space-y-1 text-sm">
                          {contact.name && <p><strong>Contact:</strong> {contact.name}</p>}
                          {contact.position && <p><strong>Position:</strong> {contact.position}</p>}
                          {contact.email && (
                            <p><strong>Email:</strong> <a href={`mailto:${contact.email}`} className="text-primary hover:underline">{contact.email}</a></p>
                          )}
                          {contact.phone && <p><strong>Phone:</strong> {contact.phone}</p>}
                          {contact.city && contact.country && (
                            <p><strong>Location:</strong> {contact.city}, {contact.country}</p>
                          )}
                          {contact.notes && (
                            <p className="mt-2 text-muted-foreground">{contact.notes}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className="w-full mt-3"
                          onClick={() => openEditDialog(contact)}
                        >
                          Edit Contact
                        </Button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
            </MapContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading map...</p>
            </div>
          )}
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
