import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, X, Settings, Search, Upload, Sparkles, Phone, Globe, MapPin, Building2, User, ChevronDown, ChevronUp, Loader2, MoreHorizontal, Download, Wand2, UserSearch, FileText, Filter, SortAsc } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuickMessageSection } from './QuickMessageSection';
import MessagePathways from './MessagePathways';
import { LeagueRulesDialog } from './LeagueRulesDialog';
import { invokeEdgeFunction } from '@/lib/edgeFunctionHelper';
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

interface CountryProfile {
  id: string;
  country_name: string;
  playing_style: string | null;
  common_formations: string | null;
  key_characteristics: string | null;
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
  const [countryProfiles, setCountryProfiles] = useState<CountryProfile[]>([]);
  const [clubProfiles, setClubProfiles] = useState<ClubProfile[]>([]);
  const [roleProfiles, setRoleProfiles] = useState<RoleProfile[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showLeagueRules, setShowLeagueRules] = useState(false);
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
  const [aiTagging, setAiTagging] = useState(false);
  const [aiOrganising, setAiOrganising] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState<{ type: 'country' | 'club' | 'role'; name: string } | null>(null);
  const [profileEditData, setProfileEditData] = useState<any>({});
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
    fetchClubRatings();
    fetchProfiles();
    syncOutreachContacts();
  }, []);

  const fetchClubRatings = async () => {
    const { data } = await supabase.from('club_ratings').select('club_name, first_team_rating, academy_rating');
    if (data) setClubRatings(data);
  };

  const fetchProfiles = async () => {
    const [countryRes, clubRes, roleRes] = await Promise.all([
      supabase.from('network_country_profiles').select('id, country_name, playing_style, common_formations, key_characteristics'),
      supabase.from('network_club_profiles').select('id, club_name, description, playing_style'),
      supabase.from('network_role_profiles').select('id, role_name, description, typical_responsibilities'),
    ]);
    if (countryRes.data) setCountryProfiles(countryRes.data);
    if (clubRes.data) setClubProfiles(clubRes.data);
    if (roleRes.data) setRoleProfiles(roleRes.data);
  };

  const getClubRating = useCallback((clubName: string | null): string | null => {
    if (!clubName || clubRatings.length === 0) return null;
    const norm = normalizeClubName(clubName);
    for (const r of clubRatings) {
      const normR = normalizeClubName(r.club_name);
      if (normR === norm || normR.includes(norm) || norm.includes(normR)) {
        return r.first_team_rating;
      }
    }
    return null;
  }, [clubRatings]);

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
      name: formData.name.trim(),
      club_name: formData.club_name.trim() || null,
      position: formData.position.trim() || null,
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      country: formData.country.trim() || null,
      city: formData.city.trim() || null,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      image_url: formData.image_url.trim() || null,
      notes: formData.notes.trim() || null,
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
          prompt: `Parse this CSV/contact data and return a JSON array of contacts. Each contact should have: name, club_name, position, email, phone, country, city. Fill in what you can infer. Important: for country, use the country where the person WORKS (based on their club location), not their nationality. If a club is well-known, infer the country from the club. Here's the data:\n\n${csvText.substring(0, 8000)}`
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
          prompt: `For each of these contacts, infer the missing country and/or position/role based on their name, club name, city, and email. IMPORTANT: For country, use the country where they WORK (based on their club's location), NOT their nationality. For example, if someone works at FC Rosengard, their country should be Sweden (where the club is based), not their nationality. Return a JSON array with objects containing: id, country (if missing), position (if missing). Only include contacts where you can confidently infer something. Use standard country names.\n\nContacts:\n${JSON.stringify(contactSummary)}`
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

  // AI Organise - sort misplaced info into correct fields
  const handleAiOrganise = async () => {
    setAiOrganising(true);
    try {
      const contactSummary = contacts.slice(0, 60).map(c => ({
        id: c.id,
        name: c.name,
        club_name: c.club_name,
        position: c.position,
        country: c.country,
        city: c.city,
        email: c.email,
        phone: c.phone,
        notes: c.notes,
      }));

      const { data, error } = await invokeEdgeFunction('generate-ai-response', {
        body: {
          prompt: `Review these contacts and identify any where information is in the wrong field. Common issues: club name included in the person's name field, role/position included in the name, country in the city field, etc. For each contact that needs fixing, return a JSON array with objects containing: id, and ONLY the fields that need correction (name, club_name, position, country, city). Do not include fields that are already correct. Be conservative - only suggest changes you are confident about. IMPORTANT: country should reflect where they WORK (club location), not nationality.\n\nContacts:\n${JSON.stringify(contactSummary)}`
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
          if (u.name) updateData.name = u.name;
          if (u.club_name) updateData.club_name = u.club_name;
          if (u.position) updateData.position = u.position;
          if (u.country) updateData.country = u.country;
          if (u.city) updateData.city = u.city;
          if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase
              .from('club_network_contacts')
              .update(updateData)
              .eq('id', u.id);
            if (!updateError) updated++;
          }
        }
        toast.success(`AI organised ${updated} contacts`);
        fetchContacts();
      } else {
        toast.info('No changes needed - contacts look well organised');
      }
    } catch (err: any) {
      toast.error('AI organise failed: ' + (err.message || 'Unknown error'));
    } finally {
      setAiOrganising(false);
    }
  };

  // CSV Export
  const handleCsvExport = (exportContacts: Contact[]) => {
    const headers = ['Name', 'Club', 'Role', 'Email', 'Phone', 'Country', 'City', 'Notes'];
    const rows = exportContacts.map(c => [
      c.name,
      c.club_name || '',
      c.position || '',
      c.email || '',
      c.phone || '',
      c.country || '',
      c.city || '',
      (c.notes || '').replace(/"/g, '""'),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(v => `"${v}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `network-contacts-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${exportContacts.length} contacts`);
  };

  // Profile save
  const handleSaveProfile = async () => {
    if (!showProfileDialog) return;
    const { type, name } = showProfileDialog;

    try {
      if (type === 'country') {
        const { error } = await supabase.from('network_country_profiles').upsert({
          country_name: name,
          playing_style: profileEditData.playing_style || null,
          common_formations: profileEditData.common_formations || null,
          key_characteristics: profileEditData.key_characteristics || null,
          league_structure: profileEditData.league_structure || null,
          notes: profileEditData.notes || null,
        }, { onConflict: 'country_name' });
        if (error) throw error;
      } else if (type === 'club') {
        const { error } = await supabase.from('network_club_profiles').upsert({
          club_name: name,
          description: profileEditData.description || null,
          playing_style: profileEditData.playing_style || null,
          league: profileEditData.league || null,
          tier: profileEditData.tier || null,
          notes: profileEditData.notes || null,
        }, { onConflict: 'club_name' });
        if (error) throw error;
      } else if (type === 'role') {
        const { error } = await supabase.from('network_role_profiles').upsert({
          role_name: name,
          description: profileEditData.description || null,
          typical_responsibilities: profileEditData.typical_responsibilities || null,
          seniority_level: profileEditData.seniority_level || null,
          notes: profileEditData.notes || null,
        }, { onConflict: 'role_name' });
        if (error) throw error;
      }
      toast.success('Profile saved');
      fetchProfiles();
      setShowProfileDialog(null);
    } catch (err: any) {
      toast.error('Failed to save: ' + (err.message || 'Unknown error'));
    }
  };

  const openProfileEditor = (type: 'country' | 'club' | 'role', name: string) => {
    let existing: any = {};
    if (type === 'country') {
      const found = countryProfiles.find(p => p.country_name === name);
      if (found) existing = { ...found };
    } else if (type === 'club') {
      const found = clubProfiles.find(p => p.club_name === name);
      if (found) existing = { ...found };
    } else {
      const found = roleProfiles.find(p => p.role_name === name);
      if (found) existing = { ...found };
    }
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
      result = result.filter(c => c.country?.trim() === countryFilter);
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

  // Group contacts - trim country to avoid duplicates
  const groupedContacts = useMemo(() => {
    if (groupBy === 'none') return { 'All Contacts': filteredContacts };

    const groups: Record<string, Contact[]> = {};
    for (const c of filteredContacts) {
      let key = 'Uncategorised';
      if (groupBy === 'country' && c.country?.trim()) key = c.country.trim();
      else if (groupBy === 'club' && c.club_name?.trim()) key = c.club_name.trim();
      else if (groupBy === 'role' && c.position?.trim()) key = c.position.trim();

      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    }

    const sorted: Record<string, Contact[]> = {};
    const keys = Object.keys(groups).sort((a, b) => {
      if (a === 'Uncategorised') return 1;
      if (b === 'Uncategorised') return -1;
      return a.localeCompare(b);
    });
    for (const k of keys) sorted[k] = groups[k];
    return sorted;
  }, [filteredContacts, groupBy]);

  // Group contacts by rating tier for dividers
  const getGroupsByRating = useMemo(() => {
    if (groupBy !== 'club') return null;
    const tiers: Record<string, string[]> = {};
    for (const groupName of Object.keys(groupedContacts)) {
      if (groupName === 'Uncategorised') continue;
      const rating = getClubRating(groupName) || '?';
      if (!tiers[rating]) tiers[rating] = [];
      tiers[rating].push(groupName);
    }
    return tiers;
  }, [groupedContacts, groupBy, getClubRating]);

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

  const getCountryProfile = (countryName: string) => countryProfiles.find(p => p.country_name === countryName);
  const getClubProfile = (clubName: string) => clubProfiles.find(p => p.club_name === clubName);
  const getRoleProfile = (roleName: string) => roleProfiles.find(p => p.role_name === roleName);

  const ContactCard = ({ contact }: { contact: Contact }) => {
    const rating = getClubRating(contact.club_name);

    return (
      <div
        className="group relative backdrop-blur-md bg-card/80 border border-border/60 rounded-xl p-4 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 cursor-pointer"
        onClick={() => openEditDialog(contact)}
      >
        {/* Quick actions */}
        <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(contact.id); }}
            className="p-1 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
            title="Delete"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Header */}
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

        {/* Club with rating */}
        {contact.club_name && (
          <div className="flex items-center gap-1.5 mb-2">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs font-medium truncate">{contact.club_name}</span>
            {rating ? (
              <Badge variant="outline" className="text-[10px] h-4 px-1 ml-auto shrink-0 border-primary/30 text-primary font-bold">
                R{rating}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] h-4 px-1 ml-auto shrink-0 opacity-40">
                ?
              </Badge>
            )}
          </div>
        )}

        {/* Location */}
        {contact.country?.trim() && (
          <div className="flex items-center gap-1.5 mb-3">
            <img src={getCountryFlagUrl(contact.country.trim())} alt={contact.country.trim()} className="w-4 h-3 object-cover rounded-sm shrink-0" />
            <span className="text-xs text-muted-foreground truncate">
              {contact.city ? `${contact.city}, ` : ''}{contact.country.trim()}
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
  };

  const GroupHeader = ({ groupName, groupContacts }: { groupName: string; groupContacts: Contact[] }) => {
    const profile = groupBy === 'country' ? getCountryProfile(groupName) :
      groupBy === 'club' ? getClubProfile(groupName) :
        groupBy === 'role' ? getRoleProfile(groupName) : null;

    const rating = groupBy === 'club' ? getClubRating(groupName) : null;

    return (
      <button
        onClick={() => toggleGroup(groupName)}
        className="flex items-center gap-2 mb-3 w-full text-left group/header"
      >
        <div className="flex items-center gap-2 min-w-0">
          {groupBy === 'country' && groupName !== 'Uncategorised' && (
            <img src={getCountryFlagUrl(groupName)} alt={groupName} className="w-5 h-3.5 object-cover rounded-sm shrink-0" />
          )}
          <h3 className="font-bebas text-lg uppercase tracking-wide truncate">{groupName}</h3>
          {groupBy === 'club' && rating && (
            <Badge variant="outline" className="text-xs border-primary/30 text-primary font-bold shrink-0">R{rating}</Badge>
          )}
          {groupBy === 'club' && !rating && groupName !== 'Uncategorised' && (
            <Badge variant="outline" className="text-xs opacity-40 shrink-0">?</Badge>
          )}
          <Badge variant="secondary" className="text-xs shrink-0">{groupContacts.length}</Badge>
        </div>
        {collapsedGroups.has(groupName) ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            openProfileEditor(groupBy as 'country' | 'club' | 'role', groupName);
          }}
          className="p-1 rounded hover:bg-muted text-muted-foreground opacity-0 group-hover/header:opacity-100 transition-opacity shrink-0"
          title="Edit profile"
        >
          <FileText className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1 h-px bg-border ml-2" />
      </button>
    );
  };

  const GroupProfileSummary = ({ groupName }: { groupName: string }) => {
    if (groupBy === 'country') {
      const p = getCountryProfile(groupName);
      if (!p?.playing_style && !p?.key_characteristics) return null;
      return (
        <div className="mb-3 px-3 py-2 rounded-lg bg-muted/30 border border-border/40 text-xs text-muted-foreground">
          {p.playing_style && <span>{p.playing_style}</span>}
          {p.playing_style && p.key_characteristics && <span> · </span>}
          {p.key_characteristics && <span>{p.key_characteristics}</span>}
        </div>
      );
    }
    if (groupBy === 'club') {
      const p = getClubProfile(groupName);
      if (!p?.description && !p?.playing_style) return null;
      return (
        <div className="mb-3 px-3 py-2 rounded-lg bg-muted/30 border border-border/40 text-xs text-muted-foreground">
          {p.description && <span>{p.description}</span>}
          {p.description && p.playing_style && <span> · </span>}
          {p.playing_style && <span>{p.playing_style}</span>}
        </div>
      );
    }
    if (groupBy === 'role') {
      const p = getRoleProfile(groupName);
      if (!p?.description) return null;
      return (
        <div className="mb-3 px-3 py-2 rounded-lg bg-muted/30 border border-border/40 text-xs text-muted-foreground">
          {p.description}
        </div>
      );
    }
    return null;
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
          <div>
            {/* Header - streamlined */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
              <div>
                <h2 className="text-xl font-semibold">Network Contacts</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{contacts.length} contacts across {uniqueCountries.length} countries</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {/* AI tools grouped in dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={aiTagging || aiOrganising}>
                      {(aiTagging || aiOrganising) ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                      AI Tools
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={handleAiAutoTag} disabled={aiTagging}>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Auto-Tag (Country/Role)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleAiOrganise} disabled={aiOrganising}>
                      <SortAsc className="h-4 w-4 mr-2" />
                      Organise Fields
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => {
                      setCsvText('');
                      setCsvParsedContacts([]);
                      setShowCsvDialog(true);
                    }}>
                      <Upload className="h-4 w-4 mr-2" />
                      Import CSV (Paste)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Import CSV (File)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.xlsx"
                  onChange={handleCsvFileUpload}
                  className="hidden"
                />

                {/* Export dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleCsvExport(contacts)}>
                      Export All ({contacts.length})
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCsvExport(filteredContacts)}>
                      Export Filtered ({filteredContacts.length})
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button variant="outline" size="sm" onClick={() => setShowLeagueRules(true)} title="League Rules">
                  <Settings className="h-4 w-4" />
                </Button>

                <Button size="sm" onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>

            {/* Search bar with filter toggle */}
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, club, country, role, email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant={showFilters ? 'default' : 'outline'}
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                title="Filters & grouping"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            {/* Collapsible filters */}
            {showFilters && (
              <div className="flex flex-col sm:flex-row gap-2 mb-4 p-3 rounded-lg bg-muted/30 border border-border/40 animate-in fade-in-0 slide-in-from-top-2 duration-200">
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
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Group:</span>
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
                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Sort:</span>
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
            )}

            <div className="text-xs text-muted-foreground mb-3">
              Showing {filteredContacts.length} of {contacts.length} contacts
            </div>

            {/* Grouped contact cards with glass effect */}
            <div className="space-y-6">
              {Object.entries(groupedContacts).map(([groupName, groupContacts]) => (
                <div key={groupName}>
                  {groupBy !== 'none' && groupName !== 'Uncategorised' && (
                    <>
                      <GroupHeader groupName={groupName} groupContacts={groupContacts} />
                      {!collapsedGroups.has(groupName) && <GroupProfileSummary groupName={groupName} />}
                    </>
                  )}
                  {groupBy !== 'none' && groupName === 'Uncategorised' && (
                    <button
                      onClick={() => toggleGroup(groupName)}
                      className="flex items-center gap-2 mb-3 w-full text-left"
                    >
                      <h3 className="font-bebas text-lg uppercase tracking-wide text-muted-foreground">{groupName}</h3>
                      <Badge variant="secondary" className="text-xs">{groupContacts.length}</Badge>
                      {collapsedGroups.has(groupName) ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
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
                <div>
                  <Label>Playing Style</Label>
                  <Textarea value={profileEditData.playing_style || ''} onChange={e => setProfileEditData({ ...profileEditData, playing_style: e.target.value })} rows={3} placeholder="e.g. Possession-based, technical, emphasis on build-up play..." />
                </div>
                <div>
                  <Label>Common Formations</Label>
                  <Input value={profileEditData.common_formations || ''} onChange={e => setProfileEditData({ ...profileEditData, common_formations: e.target.value })} placeholder="e.g. 4-3-3, 4-2-3-1" />
                </div>
                <div>
                  <Label>Key Characteristics</Label>
                  <Textarea value={profileEditData.key_characteristics || ''} onChange={e => setProfileEditData({ ...profileEditData, key_characteristics: e.target.value })} rows={3} placeholder="What defines football in this country..." />
                </div>
                <div>
                  <Label>League Structure</Label>
                  <Textarea value={profileEditData.league_structure || ''} onChange={e => setProfileEditData({ ...profileEditData, league_structure: e.target.value })} rows={2} placeholder="Division structure, promotion/relegation..." />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={profileEditData.notes || ''} onChange={e => setProfileEditData({ ...profileEditData, notes: e.target.value })} rows={2} />
                </div>
              </>
            )}
            {showProfileDialog?.type === 'club' && (
              <>
                <div>
                  <Label>Description</Label>
                  <Textarea value={profileEditData.description || ''} onChange={e => setProfileEditData({ ...profileEditData, description: e.target.value })} rows={3} placeholder="About this club..." />
                </div>
                <div>
                  <Label>Playing Style</Label>
                  <Textarea value={profileEditData.playing_style || ''} onChange={e => setProfileEditData({ ...profileEditData, playing_style: e.target.value })} rows={2} placeholder="How they typically play..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>League</Label>
                    <Input value={profileEditData.league || ''} onChange={e => setProfileEditData({ ...profileEditData, league: e.target.value })} placeholder="e.g. Allsvenskan" />
                  </div>
                  <div>
                    <Label>Tier</Label>
                    <Input value={profileEditData.tier || ''} onChange={e => setProfileEditData({ ...profileEditData, tier: e.target.value })} placeholder="e.g. 1st Division" />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={profileEditData.notes || ''} onChange={e => setProfileEditData({ ...profileEditData, notes: e.target.value })} rows={2} />
                </div>
              </>
            )}
            {showProfileDialog?.type === 'role' && (
              <>
                <div>
                  <Label>Description</Label>
                  <Textarea value={profileEditData.description || ''} onChange={e => setProfileEditData({ ...profileEditData, description: e.target.value })} rows={3} placeholder="What this role involves..." />
                </div>
                <div>
                  <Label>Typical Responsibilities</Label>
                  <Textarea value={profileEditData.typical_responsibilities || ''} onChange={e => setProfileEditData({ ...profileEditData, typical_responsibilities: e.target.value })} rows={3} placeholder="Key responsibilities..." />
                </div>
                <div>
                  <Label>Seniority Level</Label>
                  <Input value={profileEditData.seniority_level || ''} onChange={e => setProfileEditData({ ...profileEditData, seniority_level: e.target.value })} placeholder="e.g. Senior, Mid-level, Entry" />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={profileEditData.notes || ''} onChange={e => setProfileEditData({ ...profileEditData, notes: e.target.value })} rows={2} />
                </div>
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
