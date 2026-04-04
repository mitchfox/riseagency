import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, X, Search, Upload, Sparkles, Globe, MapPin, Building2, User, ChevronDown, ChevronRight, Loader2, Download, Wand2, SortAsc, Share2, ArrowUpDown, ArrowLeft, Filter, FileText, CheckSquare, Square } from 'lucide-react';
import { openExternalUrl, openMailto } from '@/utils/openExternalUrl';
import { FaWhatsapp } from 'react-icons/fa';
import { Mail } from 'lucide-react';
import { getCountryFlagUrl } from '@/lib/countryFlags';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuickMessageSection } from './QuickMessageSection';
import MessagePathways from './MessagePathways';
import { invokeEdgeFunction } from '@/lib/edgeFunctionHelper';
import { normalizeClubName } from '@/lib/clubNameUtils';
import { ScrollReveal, ScrollRevealContainer, ScrollRevealItem } from '@/components/ScrollReveal';
import { motion, AnimatePresence } from 'framer-motion';

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

interface ClubRating {
  club_name: string;
  first_team_rating: string;
  academy_rating: string;
}

interface ClubLogo {
  club_name: string;
  image_url: string | null;
}

interface CountryProfile {
  id: string;
  country_name: string;
  playing_style: string | null;
  common_formations: string | null;
  key_characteristics: string | null;
  league_structure: string | null;
  notes: string | null;
}

interface ClubProfile {
  id: string;
  club_name: string;
  description: string | null;
  playing_style: string | null;
}

interface RoleProfile {
  id: string;
  role_name: string;
  description: string | null;
  typical_responsibilities: string | null;
}

type SortField = 'name' | 'club_name' | 'country';
type SortDir = 'asc' | 'desc';
type GroupBy = 'none' | 'country' | 'club' | 'role';

const ClubNetworkManagement = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [clubRatings, setClubRatings] = useState<ClubRating[]>([]);
  const [clubLogos, setClubLogos] = useState<ClubLogo[]>([]);
  const [countryProfiles, setCountryProfiles] = useState<CountryProfile[]>([]);
  const [clubProfiles, setClubProfiles] = useState<ClubProfile[]>([]);
  const [roleProfiles, setRoleProfiles] = useState<RoleProfile[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [groupBy, setGroupBy] = useState<GroupBy>('country');
  const [showCsvDialog, setShowCsvDialog] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvProcessing, setCsvProcessing] = useState(false);
  const [csvParsedContacts, setCsvParsedContacts] = useState<any[]>([]);
  const [csvSelectedIndices, setCsvSelectedIndices] = useState<Set<number>>(new Set());
  const [aiTagging, setAiTagging] = useState(false);
  const [aiOrganising, setAiOrganising] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState<{ type: 'country' | 'club' | 'role'; name: string } | null>(null);
  const [profileEditData, setProfileEditData] = useState<any>({});
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '', club_name: '', position: '', email: '', phone: '',
    country: '', city: '', latitude: '', longitude: '', image_url: '', notes: '',
  });

  useEffect(() => {
    fetchContacts();
    fetchClubRatings();
    fetchClubLogos();
    fetchProfiles();
    syncOutreachContacts();
  }, []);

  const fetchClubRatings = async () => {
    const { data } = await supabase.from('club_ratings').select('club_name, first_team_rating, academy_rating');
    if (data) setClubRatings(data);
  };

  const fetchClubLogos = async () => {
    const { data } = await supabase.from('club_map_positions').select('club_name, image_url').not('image_url', 'is', null);
    if (data) setClubLogos(data);
  };

  const fetchProfiles = async () => {
    const [countryRes, clubRes, roleRes] = await Promise.all([
      supabase.from('network_country_profiles').select('*'),
      supabase.from('network_club_profiles').select('id, club_name, description, playing_style'),
      supabase.from('network_role_profiles').select('id, role_name, description, typical_responsibilities'),
    ]);
    if (countryRes.data) setCountryProfiles(countryRes.data as CountryProfile[]);
    if (clubRes.data) setClubProfiles(clubRes.data);
    if (roleRes.data) setRoleProfiles(roleRes.data);
  };

  const getClubRating = useCallback((clubName: string | null): string | null => {
    if (!clubName || clubRatings.length === 0) return null;
    const norm = normalizeClubName(clubName);
    for (const r of clubRatings) {
      const normR = normalizeClubName(r.club_name);
      if (normR === norm || normR.includes(norm) || norm.includes(normR)) return r.first_team_rating;
    }
    return null;
  }, [clubRatings]);

  const getClubLogo = useCallback((clubName: string | null): string | null => {
    if (!clubName || clubLogos.length === 0) return null;
    const norm = normalizeClubName(clubName);
    for (const l of clubLogos) {
      if (!l.image_url) continue;
      const normL = normalizeClubName(l.club_name);
      if (normL === norm || (normL.length > 3 && norm.length > 3 && (normL.includes(norm) || norm.includes(normL)))) return l.image_url;
    }
    return null;
  }, [clubLogos]);

  const syncOutreachContacts = async () => {
    const { data: outreachData, error: outreachError } = await supabase
      .from('club_outreach')
      .select('club_name, contact_name, contact_role')
      .in('status', ['meeting', 'responded', 'interested']);
    if (outreachError || !outreachData) return;
    const { data: existingContacts } = await supabase.from('club_network_contacts').select('name, club_name');
    const existingSet = new Set((existingContacts || []).map(c => `${c.name?.toLowerCase()}-${c.club_name?.toLowerCase()}`));
    const newContacts = outreachData
      .filter(o => o.contact_name && !existingSet.has(`${o.contact_name.toLowerCase()}-${o.club_name.toLowerCase()}`))
      .map(o => ({ name: o.contact_name!, club_name: o.club_name, position: o.contact_role || null }));
    if (newContacts.length > 0) {
      const { error: insertError } = await supabase.from('club_network_contacts').insert(newContacts);
      if (!insertError) { toast.success(`Added ${newContacts.length} contact(s) from outreach`); fetchContacts(); }
    }
  };

  const fetchContacts = async () => {
    const { data, error } = await supabase.from('club_network_contacts').select('*').not('position', 'is', null).order('created_at', { ascending: false });
    if (error) { toast.error('Failed to fetch contacts'); return; }
    setContacts((data || []).filter(contact => contact.position !== null && contact.position !== ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const contactData = {
      name: formData.name.trim(), club_name: formData.club_name.trim() || null,
      position: formData.position.trim() || null, email: formData.email.trim() || null,
      phone: formData.phone.trim() || null, country: formData.country.trim() || null,
      city: formData.city.trim() || null,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      image_url: formData.image_url.trim() || null, notes: formData.notes.trim() || null,
    };
    if (editingContact) {
      const { error } = await supabase.from('club_network_contacts').update(contactData).eq('id', editingContact.id);
      if (error) { toast.error('Failed to update contact'); return; }
      toast.success('Contact updated');
    } else {
      const { error } = await supabase.from('club_network_contacts').insert(contactData);
      if (error) { toast.error('Failed to create contact'); return; }
      toast.success('Contact created');
    }
    setShowDialog(false); setEditingContact(null); resetForm(); fetchContacts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    const { error } = await supabase.from('club_network_contacts').delete().eq('id', id);
    if (error) { toast.error('Failed to delete contact'); return; }
    toast.success('Contact deleted'); fetchContacts();
  };

  const resetForm = () => {
    setFormData({ name: '', club_name: '', position: '', email: '', phone: '', country: '', city: '', latitude: '', longitude: '', image_url: '', notes: '' });
  };

  const openEditDialog = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name, club_name: contact.club_name || '', position: contact.position || '',
      email: contact.email || '', phone: contact.phone || '', country: contact.country || '',
      city: contact.city || '', latitude: contact.latitude?.toString() || '',
      longitude: contact.longitude?.toString() || '', image_url: contact.image_url || '', notes: contact.notes || '',
    });
    setShowDialog(true);
  };

  const openAddDialog = () => { setEditingContact(null); resetForm(); setShowDialog(true); };

  // CSV Import
  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setCsvText(ev.target?.result as string || ''); setShowCsvDialog(true); };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCsvParse = async () => {
    if (!csvText.trim()) return;
    setCsvProcessing(true);
    try {
      const { data, error } = await invokeEdgeFunction('generate-ai-response', {
        body: { prompt: `Parse this CSV/contact data and return a JSON array of contacts. Each contact should have: name, club_name, position, email, phone, country, city. Fill in what you can infer. Important: for country, use the country where the person WORKS (based on their club location), not their nationality.\n\n${csvText.substring(0, 8000)}` }
      });
      if (error) throw error;
      const responseText = data?.response || '';
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setCsvParsedContacts(parsed);
        setCsvSelectedIndices(new Set(parsed.map((_: any, i: number) => i)));
        toast.success(`Parsed ${parsed.length} contacts`);
      } else toast.error('Could not parse contacts from response');
    } catch (err: any) { toast.error('Failed to parse CSV: ' + (err.message || 'Unknown error')); }
    finally { setCsvProcessing(false); }
  };

  const handleCsvImport = async () => {
    const selected = csvParsedContacts.filter((_, i) => csvSelectedIndices.has(i));
    if (selected.length === 0) { toast.info('No contacts selected'); return; }
    setCsvProcessing(true);
    try {
      const contactsToInsert = selected.map(c => ({
        name: c.name || 'Unknown', club_name: c.club_name || null, position: c.position || null,
        email: c.email || null, phone: c.phone || null, country: c.country || null, city: c.city || null,
      }));
      const { error } = await supabase.from('club_network_contacts').insert(contactsToInsert);
      if (error) throw error;
      toast.success(`Imported ${contactsToInsert.length} contacts`);
      setShowCsvDialog(false); setCsvText(''); setCsvParsedContacts([]); setCsvSelectedIndices(new Set()); fetchContacts();
    } catch (err: any) { toast.error('Import failed: ' + (err.message || 'Unknown error')); }
    finally { setCsvProcessing(false); }
  };

  const toggleCsvContact = (index: number) => {
    setCsvSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const toggleAllCsvContacts = () => {
    if (csvSelectedIndices.size === csvParsedContacts.length) {
      setCsvSelectedIndices(new Set());
    } else {
      setCsvSelectedIndices(new Set(csvParsedContacts.map((_, i) => i)));
    }
  };

  // AI Auto-Tag
  const handleAiAutoTag = async () => {
    const untagged = contacts.filter(c => !c.country || !c.position);
    if (untagged.length === 0) { toast.info('All contacts already have country and role tags'); return; }
    setAiTagging(true);
    try {
      const contactSummary = untagged.slice(0, 50).map(c => ({ id: c.id, name: c.name, club_name: c.club_name, position: c.position, country: c.country, city: c.city, email: c.email }));
      const { data, error } = await invokeEdgeFunction('generate-ai-response', {
        body: { prompt: `For each of these contacts, infer the missing country and/or position/role. IMPORTANT: country should be where they WORK (club location), NOT nationality. Return a JSON array with objects: id, country (if missing), position (if missing).\n\n${JSON.stringify(contactSummary)}` }
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
            const { error: updateError } = await supabase.from('club_network_contacts').update(updateData).eq('id', u.id);
            if (!updateError) updated++;
          }
        }
        toast.success(`AI tagged ${updated} contacts`);
        fetchContacts();
      }
    } catch (err: any) { toast.error('AI tagging failed'); }
    finally { setAiTagging(false); }
  };

  // AI Organise
  const handleAiOrganise = async () => {
    setAiOrganising(true);
    try {
      const contactSummary = contacts.slice(0, 60).map(c => ({ id: c.id, name: c.name, club_name: c.club_name, position: c.position, country: c.country, city: c.city, email: c.email, phone: c.phone, notes: c.notes }));
      const { data, error } = await invokeEdgeFunction('generate-ai-response', {
        body: { prompt: `Review these contacts for misplaced info (club in name, role in name etc). Return JSON array: id + only fields needing correction. Country = where they WORK.\n\n${JSON.stringify(contactSummary)}` }
      });
      if (error) throw error;
      const responseText = data?.response || '';
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const updates = JSON.parse(jsonMatch[0]);
        let updated = 0;
        for (const u of updates) {
          const updateData: any = {};
          if (u.name) updateData.name = u.name;
          if (u.club_name) updateData.club_name = u.club_name;
          if (u.position) updateData.position = u.position;
          if (u.country) updateData.country = u.country;
          if (u.city) updateData.city = u.city;
          if (Object.keys(updateData).length > 0) {
            const { error: ue } = await supabase.from('club_network_contacts').update(updateData).eq('id', u.id);
            if (!ue) updated++;
          }
        }
        toast.success(`AI organised ${updated} contacts`);
        fetchContacts();
      } else toast.info('No changes needed');
    } catch (err: any) { toast.error('AI organise failed'); }
    finally { setAiOrganising(false); }
  };

  // CSV Export
  const handleCsvExport = (exportContacts: Contact[]) => {
    const headers = ['Name', 'Club', 'Role', 'Email', 'Phone', 'Country', 'City', 'Notes'];
    const rows = exportContacts.map(c => [c.name, c.club_name || '', c.position || '', c.email || '', c.phone || '', c.country || '', c.city || '', (c.notes || '').replace(/"/g, '""')]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `network-contacts-${new Date().toISOString().split('T')[0]}.csv`;
    link.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${exportContacts.length} contacts`);
  };

  const handleShareContact = (contact: Contact) => {
    const shareUrl = `${window.location.origin}/contact/${contact.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied to clipboard');
  };

  // Profile save
  const handleSaveProfile = async () => {
    if (!showProfileDialog) return;
    const { type, name } = showProfileDialog;
    try {
      if (type === 'country') {
        const { error } = await supabase.from('network_country_profiles').upsert({
          country_name: name, playing_style: profileEditData.playing_style || null,
          common_formations: profileEditData.common_formations || null,
          key_characteristics: profileEditData.key_characteristics || null,
          league_structure: profileEditData.league_structure || null, notes: profileEditData.notes || null,
        }, { onConflict: 'country_name' });
        if (error) throw error;
      } else if (type === 'club') {
        const { error } = await supabase.from('network_club_profiles').upsert({
          club_name: name, description: profileEditData.description || null,
          playing_style: profileEditData.playing_style || null,
          league: profileEditData.league || null, tier: profileEditData.tier || null, notes: profileEditData.notes || null,
        }, { onConflict: 'club_name' });
        if (error) throw error;
      } else if (type === 'role') {
        const { error } = await supabase.from('network_role_profiles').upsert({
          role_name: name, description: profileEditData.description || null,
          typical_responsibilities: profileEditData.typical_responsibilities || null,
          seniority_level: profileEditData.seniority_level || null, notes: profileEditData.notes || null,
        }, { onConflict: 'role_name' });
        if (error) throw error;
      }
      toast.success('Profile saved'); fetchProfiles(); setShowProfileDialog(null);
    } catch (err: any) { toast.error('Failed to save: ' + (err.message || 'Unknown error')); }
  };

  const openProfileEditor = (type: 'country' | 'club' | 'role', name: string) => {
    let existing: any = {};
    if (type === 'country') { const f = countryProfiles.find(p => p.country_name === name); if (f) existing = { ...f }; }
    else if (type === 'club') { const f = clubProfiles.find(p => p.club_name === name); if (f) existing = { ...f }; }
    else { const f = roleProfiles.find(p => p.role_name === name); if (f) existing = { ...f }; }
    setProfileEditData(existing);
    setShowProfileDialog({ type, name });
  };

  // Derived data
  const uniqueCountries = useMemo(() => {
    const countries = contacts.map(c => c.country?.trim()).filter((c): c is string => !!c);
    return [...new Set(countries)].sort();
  }, [contacts]);

  const uniqueRoles = useMemo(() => {
    const roles = contacts.map(c => c.position).filter((r): r is string => !!r);
    return [...new Set(roles)].sort();
  }, [contacts]);

  // Country data for the landing view
  const countryData = useMemo(() => {
    const map = new Map<string, { contacts: Contact[]; profile: CountryProfile | null }>();
    for (const c of contacts) {
      const country = c.country?.trim();
      if (!country) continue;
      if (!map.has(country)) {
        map.set(country, { contacts: [], profile: countryProfiles.find(p => p.country_name === country) || null });
      }
      map.get(country)!.contacts.push(c);
    }
    // Add uncategorised
    const uncategorised = contacts.filter(c => !c.country?.trim());
    if (uncategorised.length > 0) {
      map.set('Uncategorised', { contacts: uncategorised, profile: null });
    }
    return [...map.entries()].sort((a, b) => {
      if (a[0] === 'Uncategorised') return 1;
      if (b[0] === 'Uncategorised') return -1;
      return b[1].contacts.length - a[1].contacts.length;
    });
  }, [contacts, countryProfiles]);

  // Contacts for selected country
  const countryContacts = useMemo(() => {
    if (!selectedCountry) return [];
    let result = contacts.filter(c => {
      if (selectedCountry === 'Uncategorised') return !c.country?.trim();
      return c.country?.trim() === selectedCountry;
    });
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) || c.club_name?.toLowerCase().includes(q) ||
        c.position?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
      );
    }
    if (roleFilter !== 'all') result = result.filter(c => c.position === roleFilter);
    result.sort((a, b) => {
      const aVal = (a[sortField] || '').toLowerCase();
      const bVal = (b[sortField] || '').toLowerCase();
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    return result;
  }, [selectedCountry, contacts, searchQuery, roleFilter, sortField, sortDir]);

  const countryRoles = useMemo(() => {
    const roles = countryContacts.map(c => c.position).filter((r): r is string => !!r);
    return [...new Set(roles)].sort();
  }, [countryContacts]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const getCountryProfile = (countryName: string) => countryProfiles.find(p => p.country_name === countryName);
  const getClubProfile = (clubName: string) => clubProfiles.find(p => p.club_name === clubName);

  // FA / Association logo - use flag for now
  const getNationalAssociationBadge = (country: string) => getCountryFlagUrl(country);

  // Contact Card
  const ContactCard = ({ contact }: { contact: Contact }) => {
    const rating = getClubRating(contact.club_name);
    const logo = getClubLogo(contact.club_name);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="group relative rounded-2xl p-5 hover:border-primary/40 transition-all duration-300 cursor-pointer border border-white/[0.08] overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--card) / 0.7), hsl(var(--card) / 0.4))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
        }}
        onClick={() => openEditDialog(contact)}
      >
        {/* Glass shine */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent pointer-events-none rounded-2xl" />

        {logo && (
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-primary/60 via-accent/40 to-primary/60" />
        )}

        <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button onClick={(e) => { e.stopPropagation(); handleShareContact(contact); }}
            className="p-1.5 rounded-lg hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors" title="Share">
            <Share2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleDelete(contact.id); }}
            className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="relative z-[1]">
          <div className="flex items-start gap-3.5 mb-3">
            {contact.image_url ? (
              <img src={contact.image_url} alt={contact.name} className="w-14 h-14 rounded-full object-cover ring-2 ring-white/10 shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 ring-2 ring-white/10"
                style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--primary) / 0.1))' }}>
                <span className="text-lg font-bold text-primary">
                  {contact.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-lg leading-tight text-foreground">{contact.name}</h3>
              {contact.position && <p className="text-sm text-muted-foreground mt-0.5">{contact.position}</p>}
            </div>
          </div>

          {contact.club_name && (
            <div className="flex items-center gap-2 mb-2.5">
              {logo ? <img src={logo} alt="" className="w-5 h-5 object-contain shrink-0" /> : <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />}
              <span className="text-sm font-medium truncate">{contact.club_name}</span>
              {rating ? (
                <Badge variant="outline" className="text-xs h-5 px-1.5 ml-auto shrink-0 border-primary/40 text-primary font-bold">R{rating}</Badge>
              ) : (
                <Badge variant="outline" className="text-xs h-5 px-1.5 ml-auto shrink-0 opacity-30">?</Badge>
              )}
            </div>
          )}

          {contact.city && (
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground truncate">{contact.city}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
            {contact.phone && (
              <button onClick={(e) => { e.stopPropagation(); openExternalUrl(`https://wa.me/${contact.phone!.replace(/[^0-9]/g, '')}`); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors text-xs font-medium">
                <FaWhatsapp className="h-4 w-4" /><span>WhatsApp</span>
              </button>
            )}
            {contact.email && (
              <button onClick={(e) => { e.stopPropagation(); openMailto(contact.email!); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-colors text-xs font-medium">
                <Mail className="h-4 w-4" /><span>Email</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  // ============ COUNTRY LANDING VIEW ============
  const CountryLandingView = () => {
    const filteredCountries = useMemo(() => {
      if (!searchQuery) return countryData;
      const q = searchQuery.toLowerCase();
      return countryData.filter(([name, data]) =>
        name.toLowerCase().includes(q) ||
        data.contacts.some(c => c.name.toLowerCase().includes(q) || c.club_name?.toLowerCase().includes(q))
      );
    }, [searchQuery, countryData]);

    return (
      <div>
        <ScrollReveal>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
            <div>
              <h2 className="text-2xl font-bebas uppercase tracking-wide">Network by Country</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{contacts.length} contacts across {uniqueCountries.length} countries</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={aiTagging || aiOrganising}>
                    {(aiTagging || aiOrganising) ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                    AI Tools
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={handleAiAutoTag} disabled={aiTagging}><Wand2 className="h-4 w-4 mr-2" />Auto-Tag (Country/Role)</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleAiOrganise} disabled={aiOrganising}><SortAsc className="h-4 w-4 mr-2" />Organise Fields</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm"><ArrowUpDown className="h-4 w-4 mr-1" />Import / Export</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => { setCsvText(''); setCsvParsedContacts([]); setCsvSelectedIndices(new Set()); setShowCsvDialog(true); }}><Upload className="h-4 w-4 mr-2" />Import CSV (Paste)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}><Upload className="h-4 w-4 mr-2" />Import CSV (File)</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleCsvExport(contacts)}><Download className="h-4 w-4 mr-2" />Export All ({contacts.length})</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <input ref={fileInputRef} type="file" accept=".csv,.txt,.xlsx" onChange={handleCsvFileUpload} className="hidden" />
              <Button size="sm" onClick={openAddDialog}><Plus className="h-4 w-4 mr-1" />Add</Button>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search countries, contacts, clubs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
        </ScrollReveal>

        <ScrollRevealContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" staggerDelay={0.05}>
          {filteredCountries.map(([countryName, data]) => {
            const profile = data.profile;
            return (
              <ScrollRevealItem key={countryName}>
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setSelectedCountry(countryName); setSearchQuery(''); setRoleFilter('all'); }}
                  className="w-full text-left rounded-2xl p-5 border border-white/[0.08] transition-all duration-300 group overflow-hidden relative"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--card) / 0.6), hsl(var(--card) / 0.3))',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
                  }}
                >
                  {/* Glass shine overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-transparent pointer-events-none rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative z-[1]">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="relative">
                        <img
                          src={getCountryFlagUrl(countryName)}
                          alt={countryName}
                          className="w-12 h-8 object-cover rounded-md shadow-md ring-1 ring-white/10"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bebas text-xl uppercase tracking-wide truncate group-hover:text-primary transition-colors">{countryName}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">{data.contacts.length} contact{data.contacts.length !== 1 ? 's' : ''}</Badge>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                    </div>

                    {/* Profile summary */}
                    {profile && (
                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        {profile.playing_style && (
                          <div className="flex gap-2">
                            <span className="font-medium text-foreground/60 shrink-0">Style:</span>
                            <span className="line-clamp-1">{profile.playing_style}</span>
                          </div>
                        )}
                        {profile.common_formations && (
                          <div className="flex gap-2">
                            <span className="font-medium text-foreground/60 shrink-0">Schemes:</span>
                            <span className="line-clamp-1">{profile.common_formations}</span>
                          </div>
                        )}
                        {profile.key_characteristics && (
                          <div className="flex gap-2">
                            <span className="font-medium text-foreground/60 shrink-0">Traits:</span>
                            <span className="line-clamp-1">{profile.key_characteristics}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Top clubs preview */}
                    <div className="flex items-center gap-1 mt-3 pt-3 border-t border-white/[0.06]">
                      {data.contacts.slice(0, 5).map((c, i) => {
                        const cLogo = getClubLogo(c.club_name);
                        if (!cLogo) return null;
                        return <img key={i} src={cLogo} alt="" className="w-5 h-5 object-contain opacity-60" />;
                      }).filter(Boolean)}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {[...new Set(data.contacts.map(c => c.club_name).filter(Boolean))].length} clubs
                      </span>
                    </div>
                  </div>
                </motion.button>
              </ScrollRevealItem>
            );
          })}
        </ScrollRevealContainer>

        {filteredCountries.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No countries found</p>
          </div>
        )}
      </div>
    );
  };

  // ============ COUNTRY DETAIL VIEW ============
  const CountryDetailView = () => {
    const profile = selectedCountry ? getCountryProfile(selectedCountry) : null;

    // Group contacts by club within this country
    const clubGroups = useMemo(() => {
      const groups = new Map<string, Contact[]>();
      for (const c of countryContacts) {
        const key = c.club_name?.trim() || 'Independent';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(c);
      }
      return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
    }, [countryContacts]);

    return (
      <div>
        {/* Back button and header */}
        <ScrollReveal>
          <button
            onClick={() => setSelectedCountry(null)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4 group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm">All Countries</span>
          </button>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div
            className="rounded-2xl p-6 mb-6 border border-white/[0.08] overflow-hidden relative"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--card) / 0.6), hsl(var(--card) / 0.3))',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent pointer-events-none" />
            <div className="relative z-[1]">
              <div className="flex items-center gap-4 mb-4">
                <img src={getCountryFlagUrl(selectedCountry!)} alt="" className="w-16 h-11 object-cover rounded-lg shadow-lg ring-1 ring-white/10" />
                <div className="flex-1">
                  <h2 className="font-bebas text-3xl uppercase tracking-wide">{selectedCountry}</h2>
                  <p className="text-sm text-muted-foreground">{countryContacts.length} contacts · {clubGroups.length} organisations</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openProfileEditor('country', selectedCountry!)}>
                    <FileText className="h-4 w-4 mr-1" />Edit Profile
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleCsvExport(countryContacts)}>
                    <Download className="h-4 w-4 mr-1" />Export
                  </Button>
                  <Button size="sm" onClick={() => { resetForm(); setFormData(prev => ({ ...prev, country: selectedCountry! })); setShowDialog(true); }}>
                    <Plus className="h-4 w-4 mr-1" />Add Contact
                  </Button>
                </div>
              </div>

              {/* Country profile sections */}
              {profile && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {profile.playing_style && (
                    <div className="rounded-xl p-3 border border-white/[0.06]" style={{ background: 'hsl(var(--muted) / 0.3)' }}>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-primary mb-1.5">Style</h4>
                      <p className="text-sm text-foreground/80 leading-relaxed">{profile.playing_style}</p>
                    </div>
                  )}
                  {profile.common_formations && (
                    <div className="rounded-xl p-3 border border-white/[0.06]" style={{ background: 'hsl(var(--muted) / 0.3)' }}>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-primary mb-1.5">Schemes</h4>
                      <p className="text-sm text-foreground/80 leading-relaxed">{profile.common_formations}</p>
                    </div>
                  )}
                  {profile.key_characteristics && (
                    <div className="rounded-xl p-3 border border-white/[0.06]" style={{ background: 'hsl(var(--muted) / 0.3)' }}>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-primary mb-1.5">Traits</h4>
                      <p className="text-sm text-foreground/80 leading-relaxed">{profile.key_characteristics}</p>
                    </div>
                  )}
                  {profile.league_structure && (
                    <div className="rounded-xl p-3 border border-white/[0.06]" style={{ background: 'hsl(var(--muted) / 0.3)' }}>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-primary mb-1.5">League Rules</h4>
                      <p className="text-sm text-foreground/80 leading-relaxed">{profile.league_structure}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </ScrollReveal>

        {/* Search and filters */}
        <ScrollReveal delay={0.15}>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search contacts..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Roles" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {countryRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              {(['name', 'club_name'] as SortField[]).map(f => (
                <Button key={f} variant={sortField === f ? 'default' : 'ghost'} size="sm" onClick={() => handleSort(f)} className="text-xs h-9">
                  {f === 'club_name' ? 'Club' : 'Name'}{sortField === f && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                </Button>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Contacts grouped by club */}
        <div className="space-y-6">
          {clubGroups.map(([clubName, clubContacts], groupIdx) => {
            const clubProfile = getClubProfile(clubName);
            const clubLogo = getClubLogo(clubName);
            const clubRating = getClubRating(clubName);

            return (
              <ScrollReveal key={clubName} delay={0.05 * groupIdx}>
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    {clubLogo && <img src={clubLogo} alt="" className="w-6 h-6 object-contain" />}
                    <h3 className="font-bebas text-lg uppercase tracking-wide">{clubName}</h3>
                    {clubRating && (
                      <Badge variant="outline" className="text-xs border-primary/40 text-primary font-bold">R{clubRating}</Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">{clubContacts.length}</Badge>
                    {clubName !== 'Independent' && (
                      <button onClick={() => openProfileEditor('club', clubName)}
                        className="p-1 rounded hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
                        <FileText className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <div className="flex-1 h-px bg-border/40 ml-2" />
                  </div>
                  {clubProfile?.description && (
                    <p className="text-xs text-muted-foreground mb-3 pl-9">{clubProfile.description}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {clubContacts.map(contact => (
                      <ContactCard key={contact.id} contact={contact} />
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        {countryContacts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No contacts found</p>
          </div>
        )}
      </div>
    );
  };

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
          <AnimatePresence mode="wait">
            {selectedCountry ? (
              <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                <CountryDetailView />
              </motion.div>
            ) : (
              <motion.div key="landing" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}>
                <CountryLandingView />
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="templates" className="mt-6"><QuickMessageSection /></TabsContent>
        <TabsContent value="pathways" className="mt-6"><MessagePathways /></TabsContent>
      </Tabs>

      {/* CSV Import Dialog with selection */}
      <Dialog open={showCsvDialog} onOpenChange={setShowCsvDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />AI Contact Import
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {csvParsedContacts.length === 0 ? (
              <>
                <div>
                  <Label>Paste or edit your contact data</Label>
                  <p className="text-xs text-muted-foreground mb-2">CSV, tab-separated, or any structured text. AI will parse and extract contacts automatically.</p>
                  <Textarea value={csvText} onChange={e => setCsvText(e.target.value)} rows={8} placeholder="Name, Club, Role, Email, Phone, Country&#10;John Smith, Arsenal FC, Scout, john@arsenal.com, +44123456789, England" className="font-mono text-xs" />
                </div>
                <Button onClick={handleCsvParse} disabled={csvProcessing || !csvText.trim()} className="w-full">
                  {csvProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}Parse with AI
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">{csvParsedContacts.length} contacts parsed</h4>
                  <div className="flex items-center gap-3">
                    <button onClick={toggleAllCsvContacts} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
                      {csvSelectedIndices.size === csvParsedContacts.length ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                      {csvSelectedIndices.size === csvParsedContacts.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <span className="text-xs text-muted-foreground">{csvSelectedIndices.size} selected</span>
                  </div>
                </div>
                <div className="max-h-[400px] overflow-y-auto space-y-1 border rounded-lg p-2">
                  {csvParsedContacts.map((c, i) => (
                    <div
                      key={i}
                      onClick={() => toggleCsvContact(i)}
                      className={`flex items-center gap-3 text-xs py-2.5 px-3 rounded-lg cursor-pointer transition-colors ${
                        csvSelectedIndices.has(i) ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50 border border-transparent'
                      }`}
                    >
                      <Checkbox checked={csvSelectedIndices.has(i)} onCheckedChange={() => toggleCsvContact(i)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{c.name}</span>
                          {c.position && <Badge variant="outline" className="text-[10px] h-4">{c.position}</Badge>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-muted-foreground">
                          {c.club_name && <span>{c.club_name}</span>}
                          {c.club_name && c.country && <span>·</span>}
                          {c.country && <span>{c.country}</span>}
                        </div>
                      </div>
                      {c.email && <span className="text-muted-foreground truncate max-w-[150px]">{c.email}</span>}
                      {c.phone && <span className="text-muted-foreground">{c.phone}</span>}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setCsvParsedContacts([]); setCsvSelectedIndices(new Set()); }} className="flex-1">Re-parse</Button>
                  <Button onClick={handleCsvImport} disabled={csvProcessing || csvSelectedIndices.size === 0} className="flex-1">
                    {csvProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Import {csvSelectedIndices.size} Contact{csvSelectedIndices.size !== 1 ? 's' : ''}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Editor Dialog */}
      <Dialog open={!!showProfileDialog} onOpenChange={(open) => !open && setShowProfileDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {showProfileDialog?.type === 'country' && `Country Profile: ${showProfileDialog.name}`}
              {showProfileDialog?.type === 'club' && `Club Profile: ${showProfileDialog.name}`}
              {showProfileDialog?.type === 'role' && `Role Profile: ${showProfileDialog.name}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {showProfileDialog?.type === 'country' && (
              <>
                <div><Label>Playing Style</Label><Textarea value={profileEditData.playing_style || ''} onChange={e => setProfileEditData({ ...profileEditData, playing_style: e.target.value })} rows={3} placeholder="e.g. Possession-based, technical..." /></div>
                <div><Label>Common Schemes</Label><Input value={profileEditData.common_formations || ''} onChange={e => setProfileEditData({ ...profileEditData, common_formations: e.target.value })} placeholder="e.g. 4-3-3, 4-2-3-1" /></div>
                <div><Label>Key Traits</Label><Textarea value={profileEditData.key_characteristics || ''} onChange={e => setProfileEditData({ ...profileEditData, key_characteristics: e.target.value })} rows={3} placeholder="What defines football in this country..." /></div>
                <div><Label>League Rules</Label><Textarea value={profileEditData.league_structure || ''} onChange={e => setProfileEditData({ ...profileEditData, league_structure: e.target.value })} rows={3} placeholder="Division structure, promotion/relegation, foreign player rules..." /></div>
                <div><Label>Notes</Label><Textarea value={profileEditData.notes || ''} onChange={e => setProfileEditData({ ...profileEditData, notes: e.target.value })} rows={2} /></div>
              </>
            )}
            {showProfileDialog?.type === 'club' && (
              <>
                <div><Label>Description</Label><Textarea value={profileEditData.description || ''} onChange={e => setProfileEditData({ ...profileEditData, description: e.target.value })} rows={3} /></div>
                <div><Label>Playing Style</Label><Textarea value={profileEditData.playing_style || ''} onChange={e => setProfileEditData({ ...profileEditData, playing_style: e.target.value })} rows={2} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>League</Label><Input value={profileEditData.league || ''} onChange={e => setProfileEditData({ ...profileEditData, league: e.target.value })} /></div>
                  <div><Label>Tier</Label><Input value={profileEditData.tier || ''} onChange={e => setProfileEditData({ ...profileEditData, tier: e.target.value })} /></div>
                </div>
                <div><Label>Notes</Label><Textarea value={profileEditData.notes || ''} onChange={e => setProfileEditData({ ...profileEditData, notes: e.target.value })} rows={2} /></div>
              </>
            )}
            {showProfileDialog?.type === 'role' && (
              <>
                <div><Label>Description</Label><Textarea value={profileEditData.description || ''} onChange={e => setProfileEditData({ ...profileEditData, description: e.target.value })} rows={3} /></div>
                <div><Label>Typical Responsibilities</Label><Textarea value={profileEditData.typical_responsibilities || ''} onChange={e => setProfileEditData({ ...profileEditData, typical_responsibilities: e.target.value })} rows={3} /></div>
                <div><Label>Seniority Level</Label><Input value={profileEditData.seniority_level || ''} onChange={e => setProfileEditData({ ...profileEditData, seniority_level: e.target.value })} /></div>
                <div><Label>Notes</Label><Textarea value={profileEditData.notes || ''} onChange={e => setProfileEditData({ ...profileEditData, notes: e.target.value })} rows={2} /></div>
              </>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowProfileDialog(null)}>Cancel</Button>
              <Button onClick={handleSaveProfile}>Save Profile</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Contact Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-4 md:p-6">
          <DialogHeader>
            <DialogTitle>{editingContact ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label htmlFor="name">Name *</Label><Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
              <div><Label htmlFor="club_name">Club Name</Label><Input id="club_name" value={formData.club_name} onChange={(e) => setFormData({ ...formData, club_name: e.target.value })} /></div>
              <div><Label htmlFor="position">Role / Position</Label><Input id="position" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} /></div>
              <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
              <div><Label htmlFor="phone">Phone</Label><Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
              <div><Label htmlFor="country">Country</Label><Input id="country" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} /></div>
              <div><Label htmlFor="city">City</Label><Input id="city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} /></div>
              <div><Label htmlFor="image_url">Image URL</Label><Input id="image_url" value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} /></div>
            </div>
            <div><Label htmlFor="notes">Notes</Label><Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setShowDialog(false); setEditingContact(null); resetForm(); }}>Cancel</Button>
              <Button type="submit">{editingContact ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClubNetworkManagement;
