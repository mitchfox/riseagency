import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { toast } from 'sonner';
import {
  Plus,
  X,
  Upload,
  Sparkles,
  Globe,
  MapPin,
  Building2,
  User,
  ChevronRight,
  Loader2,
  Download,
  Wand2,
  SortAsc,
  Share2,
  ArrowUpDown,
  ArrowLeft,
  FileText,
  CheckSquare,
  Square,
  Mail,
  Copy,
  Link2,
  Layers3,
  ShieldCheck,
  Bot,
  CheckCircle2,
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { openExternalUrl, openMailto } from '@/utils/openExternalUrl';
import { getCountryFlagUrl } from '@/lib/countryFlags';
import { invokeEdgeFunction } from '@/lib/edgeFunctionHelper';
import { normalizeClubName } from '@/lib/clubNameUtils';
import { ScrollReveal, ScrollRevealContainer, ScrollRevealItem } from '@/components/ScrollReveal';
import { StaffSearchInput } from './StaffSearchInput';
import { QuickMessageSection } from './QuickMessageSection';
import MessagePathways from './MessagePathways';
import { FormationDisplay } from '@/components/FormationDisplay';
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
  league: string | null;
  tier: string | null;
  notes: string | null;
}

interface RoleProfile {
  id: string;
  role_name: string;
  description: string | null;
  typical_responsibilities: string | null;
  seniority_level: string | null;
  notes: string | null;
}

interface MarketingTemplate {
  id: string;
  recipient_type: string;
  message_title: string;
  message_content: string;
}

type SortField = 'name' | 'club_name' | 'country';
type SortDir = 'asc' | 'desc';
type GroupBy = 'flat' | 'club' | 'role';
type AiAction = 'tag' | 'organise' | 'clubs' | 'links' | null;

type CountryEntry = {
  key: string;
  name: string;
  contacts: Contact[];
  profile: CountryProfile | null;
};

type ClubGroup = {
  key: string;
  name: string;
  contacts: Contact[];
  rating: string | null;
  logo: string | null;
  profile: ClubProfile | null;
};

type RoleGroup = {
  key: string;
  name: string;
  contacts: Contact[];
  profile: RoleProfile | null;
  templates: MarketingTemplate[];
};

const panelStyle = {
  background: 'linear-gradient(145deg, hsl(var(--card) / 0.92), hsl(var(--muted) / 0.42))',
  boxShadow: '0 24px 70px -36px hsl(var(--foreground) / 0.55), inset 0 1px 0 hsl(var(--background) / 0.26)',
};

const softPanelStyle = {
  background: 'linear-gradient(145deg, hsl(var(--card) / 0.84), hsl(var(--muted) / 0.3))',
  boxShadow: '0 20px 54px -34px hsl(var(--foreground) / 0.38), inset 0 1px 0 hsl(var(--background) / 0.18)',
};

const normaliseText = (value: string | null | undefined) => (value || '').trim();

const toTitleCase = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

const formatRiseRating = (rating: string | null | undefined): string | null => {
  const raw = normaliseText(rating);
  if (!raw) return null;

  const digits = raw.match(/\d+/)?.[0];
  if (digits) return `R${digits}`;

  const cleaned = raw.replace(/^r+/i, '').trim();
  if (!cleaned) return null;
  return cleaned.toUpperCase().startsWith('R') ? cleaned.toUpperCase() : `R${cleaned.toUpperCase()}`;
};

const getDisplayScore = (value: string | null | undefined) => formatRiseRating(value) || '?';

const scoreDisplayName = (name: string, count: number) => {
  const trimmed = name.trim();
  const hasCase = trimmed !== trimmed.toLowerCase();
  const hasAccents = trimmed.normalize('NFD') !== trimmed;
  return count * 100 + (hasCase ? 8 : 0) + (hasAccents ? 3 : 0) + trimmed.length / 100;
};

const choosePreferredLabel = (values: string[], fallback: string) => {
  if (values.length === 0) return fallback;

  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));

  return [...counts.entries()]
    .sort((a, b) => scoreDisplayName(b[0], b[1]) - scoreDisplayName(a[0], a[1]))[0]?.[0] || fallback;
};

const parseDelimitedList = (value: string | null | undefined) => {
  if (!value) return [];
  return value
    .split(/[,•|/\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const createAssociationInitials = (country: string) =>
  country
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();

const buildVCard = (contact: Contact) => {
  const noteLines = [contact.notes, contact.club_name ? `Club: ${contact.club_name}` : '', contact.position ? `Role: ${contact.position}` : '']
    .filter(Boolean)
    .join(' | ')
    .replace(/\n/g, '\\n');

  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${contact.name}`,
    contact.club_name ? `ORG:${contact.club_name}` : '',
    contact.position ? `TITLE:${contact.position}` : '',
    contact.email ? `EMAIL:${contact.email}` : '',
    contact.phone ? `TEL:${contact.phone}` : '',
    contact.city || contact.country ? `ADR:;;${contact.city || ''};;;${contact.country || ''}` : '',
    noteLines ? `NOTE:${noteLines}` : '',
    'END:VCARD',
  ]
    .filter(Boolean)
    .join('\n');
};

const unfoldVCardLines = (text: string) => text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');

const readVCardValue = (lines: string[], field: string) => {
  const match = lines.find((line) => line.toUpperCase().startsWith(field.toUpperCase()));
  if (!match) return '';
  return match.split(':').slice(1).join(':').trim();
};

const parseVCardText = (text: string) => {
  const unfolded = unfoldVCardLines(text);
  const cards = unfolded
    .split(/END:VCARD/i)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.toUpperCase().includes('BEGIN:VCARD'));

  return cards
    .map((card) => {
      const lines = card
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const adrValue = readVCardValue(lines, 'ADR');
      const adrParts = adrValue.split(';');
      const city = adrParts[2] || '';
      const country = adrParts[6] || '';

      return {
        name: readVCardValue(lines, 'FN') || readVCardValue(lines, 'N'),
        club_name: readVCardValue(lines, 'ORG') || null,
        position: readVCardValue(lines, 'TITLE') || null,
        email: readVCardValue(lines, 'EMAIL') || null,
        phone: readVCardValue(lines, 'TEL') || null,
        country: country || null,
        city: city || null,
        notes: readVCardValue(lines, 'NOTE')?.replace(/\\n/g, '\n') || null,
      };
    })
    .filter((contact) => normaliseText(contact.name));
};

const matchesRoleTemplate = (role: string, recipientType: string) => {
  const target = role.toLowerCase();
  const recipient = recipientType.toLowerCase();

  if (target === recipient || target.includes(recipient) || recipient.includes(target)) return true;
  if (target.includes('scout') && recipient.includes('scout')) return true;
  if (target.includes('director') && recipient.includes('director')) return true;
  if (target.includes('recruit') && (recipient.includes('scout') || recipient.includes('director'))) return true;
  if ((target.includes('coach') || target.includes('manager')) && (recipient.includes('manager') || recipient.includes('coach'))) return true;
  return false;
};

const MarqueeText = ({ text, className = '' }: { text: string; className?: string }) => (
  <div className={`relative overflow-hidden whitespace-nowrap ${className}`}>
    <motion.div
      className="flex w-max items-center gap-8"
      animate={{ x: ['0%', '-50%'] }}
      transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
    >
      <span>{text}</span>
      <span className="text-muted-foreground/70">{text}</span>
      <span>{text}</span>
      <span className="text-muted-foreground/70">{text}</span>
    </motion.div>
  </div>
);

const ClubNetworkManagement = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [clubRatings, setClubRatings] = useState<ClubRating[]>([]);
  const [clubLogos, setClubLogos] = useState<ClubLogo[]>([]);
  const [countryProfiles, setCountryProfiles] = useState<CountryProfile[]>([]);
  const [clubProfiles, setClubProfiles] = useState<ClubProfile[]>([]);
  const [roleProfiles, setRoleProfiles] = useState<RoleProfile[]>([]);
  const [marketingTemplates, setMarketingTemplates] = useState<MarketingTemplate[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [groupBy, setGroupBy] = useState<GroupBy>('club');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importText, setImportText] = useState('');
  const [importProcessing, setImportProcessing] = useState(false);
  const [parsedContacts, setParsedContacts] = useState<any[]>([]);
  const [selectedImportIndices, setSelectedImportIndices] = useState<Set<number>>(new Set());
  const [aiAction, setAiAction] = useState<AiAction>(null);
  const [showProfileDialog, setShowProfileDialog] = useState<{ type: 'country' | 'club' | 'role'; name: string } | null>(null);
  const [profileEditData, setProfileEditData] = useState<any>({});
  const [selectedCountryKey, setSelectedCountryKey] = useState<string | null>(null);
  const [schemeIndex, setSchemeIndex] = useState(0);
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

  const fetchContacts = useCallback(async () => {
    const { data, error } = await supabase
      .from('club_network_contacts')
      .select('*')
      .not('position', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch contacts');
      return;
    }

    setContacts((data || []).filter((contact) => contact.position !== null && contact.position !== ''));
  }, []);

  const fetchProfiles = useCallback(async () => {
    const [countryRes, clubRes, roleRes] = await Promise.all([
      supabase.from('network_country_profiles').select('*'),
      supabase.from('network_club_profiles').select('*'),
      supabase.from('network_role_profiles').select('*'),
    ]);

    if (countryRes.data) setCountryProfiles(countryRes.data as CountryProfile[]);
    if (clubRes.data) setClubProfiles(clubRes.data as ClubProfile[]);
    if (roleRes.data) setRoleProfiles(roleRes.data as RoleProfile[]);
  }, []);

  const fetchAuxiliaryData = useCallback(async () => {
    const [ratingsRes, logosRes, templatesRes] = await Promise.all([
      supabase.from('club_ratings').select('club_name, first_team_rating, academy_rating'),
      supabase.from('club_map_positions').select('club_name, image_url').not('image_url', 'is', null),
      supabase.from('marketing_templates').select('id, recipient_type, message_title, message_content').order('recipient_type').order('message_title'),
    ]);

    if (ratingsRes.data) setClubRatings(ratingsRes.data);
    if (logosRes.data) setClubLogos(logosRes.data);
    if (templatesRes.data) setMarketingTemplates(templatesRes.data);
  }, []);

  const syncOutreachContacts = useCallback(async () => {
    const { data: outreachData, error: outreachError } = await supabase
      .from('club_outreach')
      .select('club_name, contact_name, contact_role')
      .in('status', ['meeting', 'responded', 'interested']);

    if (outreachError || !outreachData) return;

    const { data: existingContacts } = await supabase.from('club_network_contacts').select('name, club_name');
    const existingSet = new Set(
      (existingContacts || []).map((contact) => `${contact.name?.toLowerCase()}-${contact.club_name?.toLowerCase()}`)
    );

    const newContacts = outreachData
      .filter((item) => item.contact_name && !existingSet.has(`${item.contact_name.toLowerCase()}-${item.club_name.toLowerCase()}`))
      .map((item) => ({
        name: item.contact_name!,
        club_name: item.club_name,
        position: item.contact_role || null,
      }));

    if (newContacts.length === 0) return;

    const { error: insertError } = await supabase.from('club_network_contacts').insert(newContacts);
    if (!insertError) {
      toast.success(`Added ${newContacts.length} contact${newContacts.length === 1 ? '' : 's'} from outreach`);
      fetchContacts();
    }
  }, [fetchContacts]);

  useEffect(() => {
    fetchContacts();
    fetchProfiles();
    fetchAuxiliaryData();
    syncOutreachContacts();
  }, [fetchAuxiliaryData, fetchContacts, fetchProfiles, syncOutreachContacts]);

  const clubRatingsIndex = useMemo(
    () => clubRatings.map((rating) => ({ ...rating, norm: normalizeClubName(rating.club_name) })),
    [clubRatings]
  );

  const clubLogosIndex = useMemo(
    () => clubLogos.map((logo) => ({ ...logo, norm: normalizeClubName(logo.club_name) })),
    [clubLogos]
  );

  const clubProfilesIndex = useMemo(
    () => clubProfiles.map((profile) => ({ ...profile, norm: normalizeClubName(profile.club_name) })),
    [clubProfiles]
  );

  const roleProfilesIndex = useMemo(
    () => roleProfiles.map((profile) => ({ ...profile, norm: normalizeClubName(profile.role_name) })),
    [roleProfiles]
  );

  const matchClubRecord = useCallback(<T extends { norm: string }>(norm: string, items: T[]) => {
    if (!norm) return null;
    for (const item of items) {
      if (item.norm === norm) return item;
    }
    for (const item of items) {
      if (item.norm.length > 3 && norm.length > 3 && (item.norm.includes(norm) || norm.includes(item.norm))) {
        return item;
      }
    }
    return null;
  }, []);

  const getClubRating = useCallback(
    (clubName: string | null) => {
      if (!clubName) return null;
      const match = matchClubRecord(normalizeClubName(clubName), clubRatingsIndex);
      return formatRiseRating(match?.first_team_rating || null);
    },
    [clubRatingsIndex, matchClubRecord]
  );

  const getClubLogo = useCallback(
    (clubName: string | null) => {
      if (!clubName) return null;
      return matchClubRecord(normalizeClubName(clubName), clubLogosIndex)?.image_url || null;
    },
    [clubLogosIndex, matchClubRecord]
  );

  const getClubProfile = useCallback(
    (clubName: string | null) => {
      if (!clubName) return null;
      return matchClubRecord(normalizeClubName(clubName), clubProfilesIndex) || null;
    },
    [clubProfilesIndex, matchClubRecord]
  );

  const getRoleProfile = useCallback(
    (roleName: string | null) => {
      if (!roleName) return null;
      return matchClubRecord(normalizeClubName(roleName), roleProfilesIndex) || null;
    },
    [matchClubRecord, roleProfilesIndex]
  );

  const countryData = useMemo<CountryEntry[]>(() => {
    const map = new Map<string, { names: string[]; contacts: Contact[] }>();

    contacts.forEach((contact) => {
      const rawCountry = normaliseText(contact.country);
      const key = rawCountry ? rawCountry.toLowerCase() : 'uncategorised';
      const entry = map.get(key) || { names: [], contacts: [] };
      if (rawCountry) entry.names.push(rawCountry);
      entry.contacts.push(contact);
      map.set(key, entry);
    });

    return [...map.entries()]
      .map(([key, entry]) => {
        const displayName = key === 'uncategorised' ? 'Uncategorised' : choosePreferredLabel(entry.names, toTitleCase(entry.names[0] || key));
        const profile = countryProfiles.find((item) => item.country_name.trim().toLowerCase() === displayName.trim().toLowerCase()) || null;
        return {
          key,
          name: displayName,
          contacts: entry.contacts,
          profile,
        };
      })
      .sort((a, b) => {
        if (a.key === 'uncategorised') return 1;
        if (b.key === 'uncategorised') return -1;
        return b.contacts.length - a.contacts.length;
      });
  }, [contacts, countryProfiles]);

  const selectedCountry = useMemo(
    () => countryData.find((country) => country.key === selectedCountryKey) || null,
    [countryData, selectedCountryKey]
  );

  useEffect(() => {
    setSchemeIndex(0);
  }, [selectedCountryKey]);

  const uniqueCountries = countryData.map((country) => country.name);

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return countryData;
    const query = searchQuery.toLowerCase();

    return countryData.filter((country) => {
      if (country.name.toLowerCase().includes(query)) return true;
      return country.contacts.some((contact) =>
        [contact.name, contact.club_name || '', contact.position || '', contact.email || '']
          .join(' ')
          .toLowerCase()
          .includes(query)
      );
    });
  }, [countryData, searchQuery]);

  const countryContacts = useMemo(() => {
    const baseContacts = selectedCountry?.contacts || [];
    let result = [...baseContacts];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((contact) =>
        [contact.name, contact.club_name || '', contact.position || '', contact.email || '', contact.city || '', contact.notes || '']
          .join(' ')
          .toLowerCase()
          .includes(query)
      );
    }

    if (roleFilter !== 'all') {
      result = result.filter((contact) => normalizeClubName(contact.position || '') === roleFilter);
    }

    result.sort((a, b) => {
      const aValue = ((a[sortField] as string | null) || '').toLowerCase();
      const bValue = ((b[sortField] as string | null) || '').toLowerCase();
      return sortDir === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    });

    return result;
  }, [roleFilter, searchQuery, selectedCountry, sortDir, sortField]);

  const roleOptions = useMemo(() => {
    const roleMap = new Map<string, string[]>();
    (selectedCountry?.contacts || []).forEach((contact) => {
      const role = normaliseText(contact.position);
      if (!role) return;
      const key = normalizeClubName(role);
      const existing = roleMap.get(key) || [];
      existing.push(role);
      roleMap.set(key, existing);
    });

    return [...roleMap.entries()]
      .map(([key, labels]) => ({ key, label: choosePreferredLabel(labels, toTitleCase(labels[0] || key)) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [selectedCountry]);

  const schemes = useMemo(() => parseDelimitedList(selectedCountry?.profile?.common_formations), [selectedCountry]);

  const clubGroups = useMemo<ClubGroup[]>(() => {
    const groups = new Map<string, { names: string[]; contacts: Contact[] }>();

    countryContacts.forEach((contact) => {
      const rawClub = normaliseText(contact.club_name) || 'Independent';
      const key = rawClub === 'Independent' ? 'independent' : normalizeClubName(rawClub);
      const existing = groups.get(key) || { names: [], contacts: [] };
      if (rawClub !== 'Independent') existing.names.push(rawClub);
      existing.contacts.push(contact);
      groups.set(key, existing);
    });

    return [...groups.entries()]
      .map(([key, entry]) => {
        const preferredFromSources =
          matchClubRecord(key, clubProfilesIndex)?.club_name ||
          matchClubRecord(key, clubRatingsIndex)?.club_name ||
          matchClubRecord(key, clubLogosIndex)?.club_name ||
          '';

        const label =
          key === 'independent'
            ? 'Independent'
            : choosePreferredLabel(entry.names, preferredFromSources || toTitleCase(entry.names[0] || key));

        return {
          key,
          name: label,
          contacts: entry.contacts,
          rating: key === 'independent' ? null : getClubRating(label),
          logo: key === 'independent' ? null : getClubLogo(label),
          profile: key === 'independent' ? null : getClubProfile(label),
        };
      })
      .sort((a, b) => b.contacts.length - a.contacts.length || a.name.localeCompare(b.name));
  }, [clubLogosIndex, clubProfilesIndex, clubRatingsIndex, countryContacts, getClubLogo, getClubProfile, getClubRating, matchClubRecord]);

  const roleGroups = useMemo<RoleGroup[]>(() => {
    const groups = new Map<string, { names: string[]; contacts: Contact[] }>();

    countryContacts.forEach((contact) => {
      const rawRole = normaliseText(contact.position) || 'Unassigned';
      const key = rawRole === 'Unassigned' ? 'unassigned' : normalizeClubName(rawRole);
      const existing = groups.get(key) || { names: [], contacts: [] };
      if (rawRole !== 'Unassigned') existing.names.push(rawRole);
      existing.contacts.push(contact);
      groups.set(key, existing);
    });

    return [...groups.entries()]
      .map(([key, entry]) => {
        const preferredFromProfile = key === 'unassigned' ? '' : getRoleProfile(entry.names[0] || key)?.role_name || '';
        const label =
          key === 'unassigned'
            ? 'Unassigned'
            : choosePreferredLabel(entry.names, preferredFromProfile || toTitleCase(entry.names[0] || key));

        return {
          key,
          name: label,
          contacts: entry.contacts,
          profile: key === 'unassigned' ? null : getRoleProfile(label),
          templates: marketingTemplates.filter((template) => matchesRoleTemplate(label, template.recipient_type)).slice(0, 4),
        };
      })
      .sort((a, b) => b.contacts.length - a.contacts.length || a.name.localeCompare(b.name));
  }, [countryContacts, getRoleProfile, marketingTemplates]);

  const uniqueClubCount = useMemo(() => {
    const seen = new Set<string>();
    contacts.forEach((contact) => {
      const club = normaliseText(contact.club_name);
      if (club) seen.add(normalizeClubName(club));
    });
    return seen.size;
  }, [contacts]);

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

  const openAddDialog = () => {
    setEditingContact(null);
    resetForm();
    if (selectedCountry?.name) {
      setFormData((prev) => ({ ...prev, country: selectedCountry.name }));
    }
    setShowDialog(true);
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const payload = {
      name: normaliseText(formData.name),
      club_name: normaliseText(formData.club_name) || null,
      position: normaliseText(formData.position) || null,
      email: normaliseText(formData.email) || null,
      phone: normaliseText(formData.phone) || null,
      country: normaliseText(formData.country) || null,
      city: normaliseText(formData.city) || null,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      image_url: normaliseText(formData.image_url) || null,
      notes: normaliseText(formData.notes) || null,
    };

    if (!payload.name) {
      toast.error('Name is required');
      return;
    }

    if (editingContact) {
      const { error } = await supabase.from('club_network_contacts').update(payload).eq('id', editingContact.id);
      if (error) {
        toast.error('Failed to update contact');
        return;
      }
      toast.success('Contact updated');
    } else {
      const { error } = await supabase.from('club_network_contacts').insert(payload);
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

    const { error } = await supabase.from('club_network_contacts').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete contact');
      return;
    }

    toast.success('Contact deleted');
    fetchContacts();
  };

  const handleShareContact = (contact: Contact) => {
    const shareUrl = `${window.location.origin}/contact/${contact.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied');
  };

  const exportContactsAsVcf = (exportContacts: Contact[], filenameBase: string) => {
    if (exportContacts.length === 0) {
      toast.info('No contacts to export');
      return;
    }

    const vcfContent = exportContacts.map(buildVCard).join('\n');
    const blob = new Blob([vcfContent], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filenameBase}-${new Date().toISOString().split('T')[0]}.vcf`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${exportContacts.length} contact${exportContacts.length === 1 ? '' : 's'}`);
  };

  const handleImportFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setImportText((loadEvent.target?.result as string) || '');
      setParsedContacts([]);
      setSelectedImportIndices(new Set());
      setShowImportDialog(true);
    };
    reader.readAsText(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImportParse = async () => {
    if (!importText.trim()) return;
    setImportProcessing(true);

    try {
      let parsed = parseVCardText(importText);

      if (parsed.length === 0) {
        const { data, error } = await invokeEdgeFunction('generate-ai-response', {
          body: {
            prompt: `Parse this contact file text and return a JSON array of contacts with name, club_name, position, email, phone, country, city and notes. Country must be where the person works, not their nationality.\n\n${importText.substring(0, 12000)}`,
          },
        });

        if (error) throw error;
        const responseText = data?.response || '';
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      }

      if (parsed.length === 0) {
        toast.error('No contacts found in that .vcf file');
        return;
      }

      setParsedContacts(parsed);
      setSelectedImportIndices(new Set(parsed.map((_, index) => index)));
      toast.success(`Parsed ${parsed.length} contact${parsed.length === 1 ? '' : 's'}`);
    } catch (error: any) {
      toast.error(`Failed to read .vcf file${error?.message ? `: ${error.message}` : ''}`);
    } finally {
      setImportProcessing(false);
    }
  };

  const handleImportContacts = async () => {
    const selected = parsedContacts.filter((_, index) => selectedImportIndices.has(index));
    if (selected.length === 0) {
      toast.info('No contacts selected');
      return;
    }

    setImportProcessing(true);
    try {
      const payload = selected.map((contact) => ({
        name: normaliseText(contact.name) || 'Unknown',
        club_name: normaliseText(contact.club_name) || null,
        position: normaliseText(contact.position) || null,
        email: normaliseText(contact.email) || null,
        phone: normaliseText(contact.phone) || null,
        country: normaliseText(contact.country) || null,
        city: normaliseText(contact.city) || null,
        notes: normaliseText(contact.notes) || null,
      }));

      const { error } = await supabase.from('club_network_contacts').insert(payload);
      if (error) throw error;

      toast.success(`Imported ${payload.length} contact${payload.length === 1 ? '' : 's'}`);
      setShowImportDialog(false);
      setImportText('');
      setParsedContacts([]);
      setSelectedImportIndices(new Set());
      fetchContacts();
    } catch (error: any) {
      toast.error(`Import failed${error?.message ? `: ${error.message}` : ''}`);
    } finally {
      setImportProcessing(false);
    }
  };

  const toggleImportContact = (index: number) => {
    setSelectedImportIndices((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAllImportContacts = () => {
    if (selectedImportIndices.size === parsedContacts.length) {
      setSelectedImportIndices(new Set());
      return;
    }

    setSelectedImportIndices(new Set(parsedContacts.map((_, index) => index)));
  };

  const runAiBulkUpdate = async (
    action: Exclude<AiAction, null>,
    prompt: string,
    onSuccess: (updates: any[]) => Promise<number>,
    emptyMessage: string,
    successLabel: string
  ) => {
    setAiAction(action);
    try {
      const { data, error } = await invokeEdgeFunction('generate-ai-response', { body: { prompt } });
      if (error) throw error;
      const responseText = data?.response || '';
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        toast.info(emptyMessage);
        return;
      }
      const updates = JSON.parse(jsonMatch[0]);
      const applied = await onSuccess(updates);
      if (applied === 0) toast.info(emptyMessage);
      else toast.success(`${successLabel} ${applied} record${applied === 1 ? '' : 's'}`);
      fetchContacts();
    } catch (error) {
      toast.error('AI update failed');
    } finally {
      setAiAction(null);
    }
  };

  const handleAiAutoTag = async () => {
    const candidates = contacts.filter((contact) => !contact.country || !contact.position);
    if (candidates.length === 0) {
      toast.info('Country and role tags are already filled');
      return;
    }

    await runAiBulkUpdate(
      'tag',
      `For each of these contacts, infer missing country and position. Country must be where they work, not nationality. Return JSON array with id and only the fields that should change.\n\n${JSON.stringify(candidates.slice(0, 80))}`,
      async (updates) => {
        let applied = 0;
        for (const update of updates) {
          const payload: Record<string, string> = {};
          if (update.country) payload.country = update.country;
          if (update.position) payload.position = update.position;
          if (Object.keys(payload).length === 0) continue;
          const { error } = await supabase.from('club_network_contacts').update(payload).eq('id', update.id);
          if (!error) applied += 1;
        }
        return applied;
      },
      'No new country or role tags were suggested',
      'AI tagged'
    );
  };

  const handleAiOrganise = async () => {
    await runAiBulkUpdate(
      'organise',
      `Review these contacts for misplaced information, such as club names in the person name, or role text in the wrong field. Return a JSON array with id and only corrected fields. Country must still reflect where they work.\n\n${JSON.stringify(contacts.slice(0, 80))}`,
      async (updates) => {
        let applied = 0;
        for (const update of updates) {
          const payload: Record<string, string> = {};
          ['name', 'club_name', 'position', 'country', 'city', 'notes'].forEach((field) => {
            if (update[field]) payload[field] = update[field];
          });
          if (Object.keys(payload).length === 0) continue;
          const { error } = await supabase.from('club_network_contacts').update(payload).eq('id', update.id);
          if (!error) applied += 1;
        }
        return applied;
      },
      'No field changes were suggested',
      'AI organised'
    );
  };

  const handleAiStandardiseClubs = async () => {
    const withClubs = contacts.filter((contact) => normaliseText(contact.club_name));
    if (withClubs.length === 0) {
      toast.info('There are no clubs to standardise');
      return;
    }

    await runAiBulkUpdate(
      'clubs',
      `Standardise these club names so the same organisation uses one clear display name, even if accents, spacing or casing differ. Return JSON array with id and club_name only where a change is needed.\n\n${JSON.stringify(withClubs.slice(0, 120).map((contact) => ({ id: contact.id, club_name: contact.club_name, country: contact.country })) )}`,
      async (updates) => {
        let applied = 0;
        for (const update of updates) {
          if (!update.club_name) continue;
          const { error } = await supabase.from('club_network_contacts').update({ club_name: update.club_name }).eq('id', update.id);
          if (!error) applied += 1;
        }
        return applied;
      },
      'No club naming changes were suggested',
      'AI standardised'
    );
  };

  const handleAiMapLinks = async () => {
    setAiAction('links');
    try {
      let applied = 0;

      for (const contact of contacts) {
        const sharedContacts = contacts.filter((candidate) => {
          if (candidate.id === contact.id) return false;
          const sharedClub = normaliseText(contact.club_name) && normalizeClubName(contact.club_name || '') === normalizeClubName(candidate.club_name || '');
          const sharedRole = normaliseText(contact.position) && normalizeClubName(contact.position || '') === normalizeClubName(candidate.position || '');
          const sharedCountry = normaliseText(contact.country) && contact.country?.trim().toLowerCase() === candidate.country?.trim().toLowerCase();
          return sharedClub || sharedRole || sharedCountry;
        });

        if (sharedContacts.length === 0) continue;

        const sharedSummary = sharedContacts
          .slice(0, 3)
          .map((candidate) => {
            const reasons = [];
            if (normaliseText(contact.club_name) && normalizeClubName(contact.club_name || '') === normalizeClubName(candidate.club_name || '')) reasons.push('same club');
            if (normaliseText(contact.position) && normalizeClubName(contact.position || '') === normalizeClubName(candidate.position || '')) reasons.push('same role');
            if (normaliseText(contact.country) && contact.country?.trim().toLowerCase() === candidate.country?.trim().toLowerCase()) reasons.push('same country');
            return `${candidate.name} (${reasons.join(', ')})`;
          })
          .join(' | ');

        const nextNotes = `Likely network links: ${sharedSummary}`;
        if ((contact.notes || '').includes(nextNotes)) continue;

        const mergedNotes = [contact.notes, nextNotes].filter(Boolean).join('\n');
        const { error } = await supabase.from('club_network_contacts').update({ notes: mergedNotes }).eq('id', contact.id);
        if (!error) applied += 1;
      }

      if (applied === 0) toast.info('No new network links were found');
      else {
        toast.success(`Mapped network links for ${applied} contact${applied === 1 ? '' : 's'}`);
        fetchContacts();
      }
    } catch {
      toast.error('Failed to map links');
    } finally {
      setAiAction(null);
    }
  };

  const openProfileEditor = (type: 'country' | 'club' | 'role', name: string) => {
    let existing: any = {};
    if (type === 'country') existing = countryProfiles.find((profile) => profile.country_name === name) || {};
    if (type === 'club') existing = getClubProfile(name) || {};
    if (type === 'role') existing = getRoleProfile(name) || {};

    setProfileEditData(existing);
    setShowProfileDialog({ type, name });
  };

  const handleSaveProfile = async () => {
    if (!showProfileDialog) return;
    const { type, name } = showProfileDialog;

    try {
      if (type === 'country') {
        const { error } = await supabase.from('network_country_profiles').upsert(
          {
            country_name: name,
            playing_style: profileEditData.playing_style || null,
            common_formations: profileEditData.common_formations || null,
            key_characteristics: profileEditData.key_characteristics || null,
            league_structure: profileEditData.league_structure || null,
            notes: profileEditData.notes || null,
          },
          { onConflict: 'country_name' }
        );
        if (error) throw error;
      }

      if (type === 'club') {
        const { error } = await supabase.from('network_club_profiles').upsert(
          {
            club_name: name,
            description: profileEditData.description || null,
            playing_style: profileEditData.playing_style || null,
            league: profileEditData.league || null,
            tier: profileEditData.tier || null,
            notes: profileEditData.notes || null,
          },
          { onConflict: 'club_name' }
        );
        if (error) throw error;
      }

      if (type === 'role') {
        const { error } = await supabase.from('network_role_profiles').upsert(
          {
            role_name: name,
            description: profileEditData.description || null,
            typical_responsibilities: profileEditData.typical_responsibilities || null,
            seniority_level: profileEditData.seniority_level || null,
            notes: profileEditData.notes || null,
          },
          { onConflict: 'role_name' }
        );
        if (error) throw error;
      }

      toast.success('Profile saved');
      fetchProfiles();
      setShowProfileDialog(null);
    } catch (error: any) {
      toast.error(`Failed to save profile${error?.message ? `: ${error.message}` : ''}`);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const ContactCard = ({ contact }: { contact: Contact }) => {
    const logo = getClubLogo(contact.club_name);
    const rating = getDisplayScore(getClubRating(contact.club_name));

    return (
      <motion.article
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        onClick={() => openEditDialog(contact)}
        className="group relative cursor-pointer overflow-hidden rounded-[1.6rem] border border-border/50 p-5 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/40"
        style={softPanelStyle}
      >
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary/80 via-accent/80 to-primary/60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_36%)] opacity-90" />
        <div className="absolute right-4 top-4 z-10 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(event) => {
              event.stopPropagation();
              handleShareContact(contact);
            }}
            className="rounded-full border border-border/60 bg-card/60 p-2 text-muted-foreground transition-colors hover:text-primary"
            title="Share"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              handleDelete(contact.id);
            }}
            className="rounded-full border border-border/60 bg-card/60 p-2 text-muted-foreground transition-colors hover:text-destructive"
            title="Delete"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="relative z-[1] space-y-4">
          <div className="flex items-start gap-4">
            {contact.image_url ? (
              <img src={contact.image_url} alt={contact.name} className="h-16 w-16 rounded-2xl object-cover ring-1 ring-border/70" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-lg font-semibold text-primary ring-1 ring-border/50">
                {contact.name
                  .split(' ')
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1 pt-0.5">
              <h3 className="text-xl font-semibold leading-tight tracking-[-0.02em] text-foreground">{contact.name}</h3>
              {contact.position && <p className="mt-1 text-sm text-muted-foreground">{contact.position}</p>}
            </div>
          </div>

          {contact.club_name && (
            <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/35 px-3 py-2.5">
              {logo ? (
                <img src={logo} alt="" className="h-8 w-8 rounded-lg object-contain bg-card/60 p-1" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{contact.club_name}</p>
              </div>
              <Badge variant="outline" className="border-primary/40 text-primary">
                {rating}
              </Badge>
            </div>
          )}

          {(contact.city || contact.country) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{[contact.city, contact.country].filter(Boolean).join(', ')}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {contact.phone && (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  openExternalUrl(`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <FaWhatsapp className="h-4 w-4 text-primary" />
                WhatsApp
              </button>
            )}
            {contact.email && (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  openMailto(contact.email);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Mail className="h-4 w-4 text-primary" />
                Email
              </button>
            )}
          </div>
        </div>
      </motion.article>
    );
  };

  const TemplateQuickCopy = ({ templates }: { templates: MarketingTemplate[] }) => {
    if (templates.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2 pt-3">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => {
              navigator.clipboard.writeText(template.message_content);
              toast.success(`Copied ${template.message_title}`);
            }}
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/45 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Copy className="h-3.5 w-3.5" />
            {template.message_title}
          </button>
        ))}
      </div>
    );
  };

  const CountryCard = ({ country }: { country: CountryEntry }) => (
    <ScrollRevealItem>
      <motion.button
        whileHover={{ y: -4, scale: 1.01 }}
        whileTap={{ scale: 0.985 }}
        onClick={() => {
          setSelectedCountryKey(country.key);
          setSearchQuery('');
          setRoleFilter('all');
          setGroupBy('club');
        }}
        className="group relative w-full overflow-hidden rounded-[1.75rem] border border-border/50 p-5 text-left backdrop-blur-2xl transition-all duration-300 hover:border-primary/35"
        style={panelStyle}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_38%)] opacity-80" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        <div className="relative z-[1] flex h-full flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <img src={getCountryFlagUrl(country.name)} alt={country.name} className="h-12 w-[4.2rem] rounded-2xl object-cover ring-1 ring-border/70" />
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary shadow-sm">
              <div className="flex flex-col items-center leading-none">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="mt-0.5 text-[10px] font-semibold tracking-[0.18em]">{createAssociationInitials(country.name)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <MarqueeText text={country.name.toUpperCase()} className="font-bebas text-[1.15rem] tracking-[0.22em] text-foreground" />
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/35 px-3.5 py-1.5 text-sm font-medium text-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              {country.contacts.length} contact{country.contacts.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>
      </motion.button>
    </ScrollRevealItem>
  );

  const InfoBlock = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="relative overflow-hidden rounded-[1.5rem] border border-border/50 p-4 backdrop-blur-2xl" style={softPanelStyle}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_36%)] opacity-80" />
      <div className="relative z-[1] space-y-3">
        <MarqueeText text={title.toUpperCase()} className="font-bebas text-sm tracking-[0.28em] text-primary" />
        {children}
      </div>
    </div>
  );

  const LandingView = () => (
    <div className="space-y-6">
      <ScrollReveal>
        <div className="grid gap-4 xl:grid-cols-[1.25fr_0.95fr]">
          <div className="relative overflow-hidden rounded-[2rem] border border-border/50 p-6 backdrop-blur-2xl" style={panelStyle}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_38%)] opacity-85" />
            <div className="relative z-[1] space-y-5">
              <div className="space-y-2">
                <MarqueeText text="NETWORK" className="font-bebas text-3xl tracking-[0.32em] text-foreground" />
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Country-first navigation with cleaner organisation, stronger hierarchy and faster actions.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/50 bg-background/35 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Contacts</p>
                  <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-foreground">{contacts.length}</p>
                </div>
                <div className="rounded-2xl border border-border/50 bg-background/35 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Countries</p>
                  <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-foreground">{uniqueCountries.length}</p>
                </div>
                <div className="rounded-2xl border border-border/50 bg-background/35 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Organisations</p>
                  <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-foreground">{uniqueClubCount}</p>
                </div>
              </div>

              <StaffSearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search countries, contacts, clubs and roles"
                className="w-full"
              />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-border/50 p-6 backdrop-blur-2xl" style={panelStyle}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,hsl(var(--accent)/0.15),transparent_42%)] opacity-80" />
            <div className="relative z-[1] flex h-full flex-col justify-between gap-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Actions</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Import .vcf contacts, organise records, standardise clubs and grow the network cleanly.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="justify-between rounded-2xl border-border/60 bg-background/45 h-12">
                      <span className="inline-flex items-center gap-2"><Bot className="h-4 w-4" />AI tools</span>
                      {aiAction ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <DropdownMenuItem onClick={handleAiAutoTag} disabled={!!aiAction}><Wand2 className="mr-2 h-4 w-4" />Auto-tag country and role</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleAiOrganise} disabled={!!aiAction}><SortAsc className="mr-2 h-4 w-4" />Organise fields</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleAiStandardiseClubs} disabled={!!aiAction}><Building2 className="mr-2 h-4 w-4" />Standardise club names</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleAiMapLinks} disabled={!!aiAction}><Link2 className="mr-2 h-4 w-4" />Map likely network links</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="justify-between rounded-2xl border-border/60 bg-background/45 h-12">
                      <span className="inline-flex items-center gap-2"><ArrowUpDown className="h-4 w-4" />Import / Export</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <DropdownMenuItem onClick={() => { setImportText(''); setParsedContacts([]); setSelectedImportIndices(new Set()); setShowImportDialog(true); }}>
                      <Upload className="mr-2 h-4 w-4" />Import .vcf text
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                      <Upload className="mr-2 h-4 w-4" />Import .vcf file
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => exportContactsAsVcf(contacts, 'network-all-contacts')}>
                      <Download className="mr-2 h-4 w-4" />Export all as .vcf
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button onClick={openAddDialog} className="h-12 rounded-2xl sm:col-span-2">
                  <Plus className="mr-2 h-4 w-4" />Add contact
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>

      <input ref={fileInputRef} type="file" accept=".vcf,text/vcard,text/x-vcard" onChange={handleImportFileUpload} className="hidden" />

      <ScrollRevealContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" staggerDelay={0.05}>
        {filteredCountries.map((country) => (
          <CountryCard key={country.key} country={country} />
        ))}
      </ScrollRevealContainer>

      {filteredCountries.length === 0 && (
        <div className="rounded-[2rem] border border-border/50 py-16 text-center text-muted-foreground" style={softPanelStyle}>
          <Globe className="mx-auto mb-3 h-12 w-12 opacity-50" />
          <p className="font-medium text-foreground">No countries found</p>
        </div>
      )}
    </div>
  );

  const CountryDetailView = () => (
    <div className="space-y-6">
      <ScrollReveal>
        <button
          onClick={() => {
            setSelectedCountryKey(null);
            setSearchQuery('');
            setRoleFilter('all');
          }}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All Countries
        </button>
      </ScrollReveal>

      <ScrollReveal delay={0.05}>
        <div className="relative overflow-hidden rounded-[2rem] border border-border/50 p-6 backdrop-blur-2xl" style={panelStyle}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_40%)] opacity-90" />
          <div className="relative z-[1] space-y-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-4">
                <img src={getCountryFlagUrl(selectedCountry?.name || '')} alt={selectedCountry?.name || ''} className="h-16 w-[5.25rem] rounded-[1.35rem] object-cover ring-1 ring-border/70" />
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary shadow-sm">
                  <div className="flex flex-col items-center leading-none">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="mt-1 text-[11px] font-semibold tracking-[0.24em]">{createAssociationInitials(selectedCountry?.name || '')}</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <MarqueeText text={(selectedCountry?.name || '').toUpperCase()} className="font-bebas text-3xl tracking-[0.34em] text-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {countryContacts.length} contacts · {clubGroups.length} organisations · {roleGroups.length} roles
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 xl:justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="rounded-2xl border-border/60 bg-background/45">
                      <Bot className="mr-2 h-4 w-4" />AI tools
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <DropdownMenuItem onClick={handleAiAutoTag} disabled={!!aiAction}><Wand2 className="mr-2 h-4 w-4" />Auto-tag country and role</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleAiOrganise} disabled={!!aiAction}><SortAsc className="mr-2 h-4 w-4" />Organise fields</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleAiStandardiseClubs} disabled={!!aiAction}><Building2 className="mr-2 h-4 w-4" />Standardise club names</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleAiMapLinks} disabled={!!aiAction}><Link2 className="mr-2 h-4 w-4" />Map likely network links</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" className="rounded-2xl border-border/60 bg-background/45" onClick={() => openProfileEditor('country', selectedCountry?.name || '')}>
                  <FileText className="mr-2 h-4 w-4" />Edit country profile
                </Button>
                <Button variant="outline" className="rounded-2xl border-border/60 bg-background/45" onClick={() => exportContactsAsVcf(countryContacts, `${selectedCountry?.name || 'country'}-contacts`)}>
                  <Download className="mr-2 h-4 w-4" />Export .vcf
                </Button>
                <Button onClick={openAddDialog} className="rounded-2xl">
                  <Plus className="mr-2 h-4 w-4" />Add contact
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <InfoBlock title="Style">
                <p className="text-sm leading-relaxed text-foreground/85">{selectedCountry?.profile?.playing_style || 'Add the national style profile here.'}</p>
              </InfoBlock>

              <InfoBlock title="Schemes">
                {schemes.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="outline" className="border-primary/40 text-primary">
                        {schemes[schemeIndex]}
                      </Badge>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => setSchemeIndex((current) => (current === 0 ? schemes.length - 1 : current - 1))}
                        >
                          Prev
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => setSchemeIndex((current) => (current === schemes.length - 1 ? 0 : current + 1))}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-[1.35rem] border border-border/50 bg-background/35 px-2 py-3">
                      <FormationDisplay formation={schemes[schemeIndex]} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {schemes.map((scheme, index) => (
                        <button
                          key={scheme}
                          onClick={() => setSchemeIndex(index)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            index === schemeIndex
                              ? 'border-primary/40 bg-primary/10 text-primary'
                              : 'border-border/60 bg-background/45 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {scheme}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-muted-foreground">Add schemes to the country profile and they will appear here on a slider.</p>
                )}
              </InfoBlock>

              <InfoBlock title="Traits">
                <p className="text-sm leading-relaxed text-foreground/85">{selectedCountry?.profile?.key_characteristics || 'Add the core football traits for this country.'}</p>
              </InfoBlock>

              <InfoBlock title="League Rules">
                <p className="text-sm leading-relaxed text-foreground/85">{selectedCountry?.profile?.league_structure || 'Add the league rules and key competition details.'}</p>
              </InfoBlock>
            </div>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <div className="relative overflow-hidden rounded-[2rem] border border-border/50 p-5 backdrop-blur-2xl" style={softPanelStyle}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,hsl(var(--accent)/0.1),transparent_44%)] opacity-80" />
          <div className="relative z-[1] grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_auto_auto] lg:items-center">
            <StaffSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={`Search ${selectedCountry?.name || 'country'} contacts`}
            />

            <div className="flex flex-wrap items-center gap-2 rounded-full border border-border/60 bg-background/40 p-1">
              {[
                { value: 'club' as GroupBy, label: 'Club' },
                { value: 'role' as GroupBy, label: 'Role' },
                { value: 'flat' as GroupBy, label: 'All' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setGroupBy(option.value)}
                  className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                    groupBy === option.value ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[14rem] rounded-2xl border-border/60 bg-background/45">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.key} value={role.key}>{role.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1 rounded-full border border-border/60 bg-background/40 p-1">
                {(['name', 'club_name'] as SortField[]).map((field) => (
                  <button
                    key={field}
                    onClick={() => handleSort(field)}
                    className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                      sortField === field ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {field === 'club_name' ? 'Club' : 'Name'}
                    {sortField === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {groupBy === 'flat' && (
        <ScrollReveal>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {countryContacts.map((contact) => (
              <ContactCard key={contact.id} contact={contact} />
            ))}
          </div>
        </ScrollReveal>
      )}

      {groupBy === 'club' && (
        <div className="space-y-6">
          {clubGroups.map((group, index) => (
            <ScrollReveal key={group.key} delay={0.04 * index}>
              <section className="space-y-4">
                <div className="relative overflow-hidden rounded-[1.7rem] border border-border/50 p-4 backdrop-blur-2xl" style={softPanelStyle}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_40%)] opacity-80" />
                  <div className="relative z-[1] flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      {group.logo ? (
                        <img src={group.logo} alt="" className="h-11 w-11 rounded-xl bg-card/60 p-1.5 object-contain ring-1 ring-border/60" />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/70 text-muted-foreground ring-1 ring-border/60">
                          <Building2 className="h-4 w-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <MarqueeText text={group.name.toUpperCase()} className="font-bebas text-xl tracking-[0.24em] text-foreground" />
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="secondary">{group.contacts.length}</Badge>
                          <Badge variant="outline" className="border-primary/40 text-primary">{getDisplayScore(group.rating)}</Badge>
                          {group.profile?.league && <span>{group.profile.league}</span>}
                          {group.profile?.tier && <span>• Tier {group.profile.tier}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {group.name !== 'Independent' && (
                        <Button variant="outline" size="sm" className="rounded-full border-border/60 bg-background/45" onClick={() => openProfileEditor('club', group.name)}>
                          <FileText className="mr-2 h-4 w-4" />Edit club profile
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="rounded-full border-border/60 bg-background/45" onClick={() => exportContactsAsVcf(group.contacts, `${group.name}-contacts`)}>
                        <Download className="mr-2 h-4 w-4" />Export group
                      </Button>
                    </div>
                  </div>
                  {group.profile?.description && <p className="relative z-[1] mt-3 text-sm leading-relaxed text-muted-foreground">{group.profile.description}</p>}
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                  {group.contacts.map((contact) => (
                    <ContactCard key={contact.id} contact={contact} />
                  ))}
                </div>
              </section>
            </ScrollReveal>
          ))}
        </div>
      )}

      {groupBy === 'role' && (
        <div className="space-y-6">
          {roleGroups.map((group, index) => (
            <ScrollReveal key={group.key} delay={0.04 * index}>
              <section className="space-y-4">
                <div className="relative overflow-hidden rounded-[1.7rem] border border-border/50 p-4 backdrop-blur-2xl" style={softPanelStyle}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--accent)/0.12),transparent_42%)] opacity-85" />
                  <div className="relative z-[1] flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <MarqueeText text={group.name.toUpperCase()} className="font-bebas text-xl tracking-[0.24em] text-foreground" />
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="secondary">{group.contacts.length}</Badge>
                        {group.profile?.seniority_level && <span>{group.profile.seniority_level}</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" className="rounded-full border-border/60 bg-background/45" onClick={() => openProfileEditor('role', group.name)}>
                        <FileText className="mr-2 h-4 w-4" />Edit role profile
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-full border-border/60 bg-background/45" onClick={() => exportContactsAsVcf(group.contacts, `${group.name}-contacts`)}>
                        <Download className="mr-2 h-4 w-4" />Export group
                      </Button>
                    </div>
                  </div>
                  {group.profile?.description && <p className="relative z-[1] mt-3 text-sm leading-relaxed text-muted-foreground">{group.profile.description}</p>}
                  <TemplateQuickCopy templates={group.templates} />
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                  {group.contacts.map((contact) => (
                    <ContactCard key={contact.id} contact={contact} />
                  ))}
                </div>
              </section>
            </ScrollReveal>
          ))}
        </div>
      )}

      {countryContacts.length === 0 && (
        <div className="rounded-[2rem] border border-border/50 py-16 text-center text-muted-foreground" style={softPanelStyle}>
          <User className="mx-auto mb-3 h-12 w-12 opacity-50" />
          <p className="font-medium text-foreground">No contacts found</p>
        </div>
      )}
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
          <AnimatePresence mode="wait">
            {selectedCountry ? (
              <motion.div key="country-detail" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.24 }}>
                <CountryDetailView />
              </motion.div>
            ) : (
              <motion.div key="country-grid" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 18 }} transition={{ duration: 0.24 }}>
                <LandingView />
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <QuickMessageSection />
        </TabsContent>

        <TabsContent value="pathways" className="mt-6">
          <MessagePathways />
        </TabsContent>
      </Tabs>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="w-[96vw] max-w-6xl max-h-[88vh] overflow-y-auto p-5 md:p-7">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Upload className="h-5 w-5 text-primary" />Import contacts from .vcf
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {parsedContacts.length === 0 ? (
              <>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                  <div>
                    <Label className="mb-2 block">Paste .vcf content or open a .vcf file</Label>
                    <Textarea
                      value={importText}
                      onChange={(event) => setImportText(event.target.value)}
                      rows={14}
                      placeholder="BEGIN:VCARD\nVERSION:3.0\nFN:John Smith\nORG:Arsenal\nTITLE:Scout\nEMAIL:john@example.com\nTEL:+441234567890\nEND:VCARD"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-3 lg:w-64">
                    <Button variant="outline" className="justify-start rounded-2xl" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="mr-2 h-4 w-4" />Choose .vcf file
                    </Button>
                    <Button onClick={handleImportParse} disabled={importProcessing || !importText.trim()} className="rounded-2xl">
                      {importProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                      Parse contacts
                    </Button>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      You can review every contact before importing and select all or just the ones you want.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{parsedContacts.length} contacts found</p>
                    <p className="text-sm text-muted-foreground">Select the contacts you want to add.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={toggleAllImportContacts} className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80">
                      {selectedImportIndices.size === parsedContacts.length ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                      {selectedImportIndices.size === parsedContacts.length ? 'Deselect all' : 'Select all'}
                    </button>
                    <Badge variant="outline" className="border-primary/40 text-primary">{selectedImportIndices.size} selected</Badge>
                  </div>
                </div>

                <div className="grid gap-3">
                  {parsedContacts.map((contact, index) => (
                    <button
                      key={`${contact.name}-${index}`}
                      type="button"
                      onClick={() => toggleImportContact(index)}
                      className={`grid w-full gap-3 rounded-[1.35rem] border p-4 text-left transition-colors md:grid-cols-[auto_minmax(0,1fr)_auto] ${
                        selectedImportIndices.has(index)
                          ? 'border-primary/35 bg-primary/10'
                          : 'border-border/50 bg-card/50 hover:border-primary/20'
                      }`}
                    >
                      <div className="pt-1">
                        <Checkbox checked={selectedImportIndices.has(index)} onCheckedChange={() => toggleImportContact(index)} />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-foreground">{contact.name}</p>
                          {contact.position && <Badge variant="outline">{contact.position}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{[contact.club_name, contact.city, contact.country].filter(Boolean).join(' · ') || 'No club or location supplied'}</p>
                      </div>
                      <div className="space-y-1 text-right text-xs text-muted-foreground">
                        {contact.email && <p>{contact.email}</p>}
                        {contact.phone && <p>{contact.phone}</p>}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="outline" className="rounded-2xl sm:flex-1" onClick={() => { setParsedContacts([]); setSelectedImportIndices(new Set()); }}>
                    Re-parse
                  </Button>
                  <Button className="rounded-2xl sm:flex-1" onClick={handleImportContacts} disabled={importProcessing || selectedImportIndices.size === 0}>
                    {importProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Import {selectedImportIndices.size} contact{selectedImportIndices.size === 1 ? '' : 's'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showProfileDialog} onOpenChange={(open) => !open && setShowProfileDialog(null)}>
        <DialogContent className="w-[96vw] max-w-4xl max-h-[88vh] overflow-y-auto p-5 md:p-7">
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
                  <Label>Style</Label>
                  <Textarea value={profileEditData.playing_style || ''} onChange={(event) => setProfileEditData({ ...profileEditData, playing_style: event.target.value })} rows={3} />
                </div>
                <div>
                  <Label>Schemes</Label>
                  <Input value={profileEditData.common_formations || ''} onChange={(event) => setProfileEditData({ ...profileEditData, common_formations: event.target.value })} placeholder="4-3-3, 4-2-3-1, 3-4-3" />
                </div>
                <div>
                  <Label>Traits</Label>
                  <Textarea value={profileEditData.key_characteristics || ''} onChange={(event) => setProfileEditData({ ...profileEditData, key_characteristics: event.target.value })} rows={4} />
                </div>
                <div>
                  <Label>League Rules</Label>
                  <Textarea value={profileEditData.league_structure || ''} onChange={(event) => setProfileEditData({ ...profileEditData, league_structure: event.target.value })} rows={4} />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={profileEditData.notes || ''} onChange={(event) => setProfileEditData({ ...profileEditData, notes: event.target.value })} rows={3} />
                </div>
              </>
            )}

            {showProfileDialog?.type === 'club' && (
              <>
                <div>
                  <Label>Description</Label>
                  <Textarea value={profileEditData.description || ''} onChange={(event) => setProfileEditData({ ...profileEditData, description: event.target.value })} rows={4} />
                </div>
                <div>
                  <Label>Playing Style</Label>
                  <Textarea value={profileEditData.playing_style || ''} onChange={(event) => setProfileEditData({ ...profileEditData, playing_style: event.target.value })} rows={3} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>League</Label>
                    <Input value={profileEditData.league || ''} onChange={(event) => setProfileEditData({ ...profileEditData, league: event.target.value })} />
                  </div>
                  <div>
                    <Label>Tier</Label>
                    <Input value={profileEditData.tier || ''} onChange={(event) => setProfileEditData({ ...profileEditData, tier: event.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={profileEditData.notes || ''} onChange={(event) => setProfileEditData({ ...profileEditData, notes: event.target.value })} rows={3} />
                </div>
              </>
            )}

            {showProfileDialog?.type === 'role' && (
              <>
                <div>
                  <Label>Description</Label>
                  <Textarea value={profileEditData.description || ''} onChange={(event) => setProfileEditData({ ...profileEditData, description: event.target.value })} rows={4} />
                </div>
                <div>
                  <Label>Typical Responsibilities</Label>
                  <Textarea value={profileEditData.typical_responsibilities || ''} onChange={(event) => setProfileEditData({ ...profileEditData, typical_responsibilities: event.target.value })} rows={4} />
                </div>
                <div>
                  <Label>Seniority Level</Label>
                  <Input value={profileEditData.seniority_level || ''} onChange={(event) => setProfileEditData({ ...profileEditData, seniority_level: event.target.value })} />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={profileEditData.notes || ''} onChange={(event) => setProfileEditData({ ...profileEditData, notes: event.target.value })} rows={3} />
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowProfileDialog(null)}>Cancel</Button>
              <Button onClick={handleSaveProfile}>Save profile</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="w-[96vw] max-w-4xl max-h-[88vh] overflow-y-auto p-5 md:p-7">
          <DialogHeader>
            <DialogTitle>{editingContact ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} required />
              </div>
              <div>
                <Label htmlFor="club_name">Club Name</Label>
                <Input id="club_name" value={formData.club_name} onChange={(event) => setFormData({ ...formData, club_name: event.target.value })} />
              </div>
              <div>
                <Label htmlFor="position">Role / Position</Label>
                <Input id="position" value={formData.position} onChange={(event) => setFormData({ ...formData, position: event.target.value })} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} />
              </div>
              <div>
                <Label htmlFor="phone">WhatsApp Number</Label>
                <Input id="phone" value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={formData.country} onChange={(event) => setFormData({ ...formData, country: event.target.value })} />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" value={formData.city} onChange={(event) => setFormData({ ...formData, city: event.target.value })} />
              </div>
              <div>
                <Label htmlFor="image_url">Image URL</Label>
                <Input id="image_url" value={formData.image_url} onChange={(event) => setFormData({ ...formData, image_url: event.target.value })} />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={formData.notes} onChange={(event) => setFormData({ ...formData, notes: event.target.value })} rows={4} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setShowDialog(false); setEditingContact(null); resetForm(); }}>Cancel</Button>
              <Button type="submit">{editingContact ? 'Update Contact' : 'Create Contact'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClubNetworkManagement;
