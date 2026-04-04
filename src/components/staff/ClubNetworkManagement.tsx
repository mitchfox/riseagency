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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Plus,
  X,
  Upload,
  Camera,
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
  ArrowLeft,
  FileText,
  CheckSquare,
  Square,
  Mail,
  Copy,
  Link2,
  ShieldCheck,
  Bot,
  CheckCircle2,
  Search,
  Pencil,
  Eye,
  BarChart3,
  AlertTriangle,
  Pin,
  Clock,
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { openExternalUrl, openMailto } from '@/utils/openExternalUrl';
import { getCountryFlagUrl } from '@/lib/countryFlags';
import { invokeEdgeFunction } from '@/lib/edgeFunctionHelper';
import { normalizeClubName } from '@/lib/clubNameUtils';
import { ScrollReveal, ScrollRevealContainer, ScrollRevealItem } from '@/components/ScrollReveal';
import { ImageCropDialog } from './ImageCropDialog';
import { StaffSearchInput } from './StaffSearchInput';
import { QuickMessageSection } from './QuickMessageSection';
import MessagePathways from './MessagePathways';
import { FormationDisplay } from '@/components/FormationDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import { NetworkAnalytics, computeContactStrength, strengthColor, strengthBg } from './NetworkAnalytics';
import { NetworkDuplicateDetector } from './NetworkDuplicateDetector';
import { NetworkActivityTimeline } from './NetworkActivityTimeline';

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

type ImportCandidate = {
  name: string;
  club_name: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  image_url: string | null;
  notes: string | null;
};

type ImportProgressState = {
  active: boolean;
  processed: number;
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  completed: boolean;
  message: string;
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

const normalisePhone = (value: string | null | undefined) => (value || '').replace(/\D+/g, '');

const sanitiseImportedContact = (contact: any): ImportCandidate => ({
  name: normaliseText(contact.name) || 'Unknown',
  club_name: normaliseText(contact.club_name) || null,
  position: normaliseText(contact.position) || null,
  email: normaliseText(contact.email).toLowerCase() || null,
  phone: normaliseText(contact.phone) || null,
  country: normaliseText(contact.country) || null,
  city: normaliseText(contact.city) || null,
  image_url: normaliseText(contact.image_url) || null,
  notes: normaliseText(contact.notes) || null,
});

const buildContactMatchKeys = (contact: { name: string | null; club_name: string | null; email: string | null; phone: string | null; country: string | null }) => {
  const keys = new Set<string>();
  const emailKey = normaliseText(contact.email).toLowerCase();
  const phoneKey = normalisePhone(contact.phone);
  const nameKey = normalizeClubName(normaliseText(contact.name));
  const clubKey = normalizeClubName(normaliseText(contact.club_name));
  const countryKey = normalizeClubName(normaliseText(contact.country));

  if (emailKey) keys.add(`email:${emailKey}`);
  if (phoneKey) keys.add(`phone:${phoneKey}`);
  if (nameKey && clubKey) keys.add(`name-club:${nameKey}:${clubKey}`);
  if (nameKey && countryKey) keys.add(`name-country:${nameKey}:${countryKey}`);

  return [...keys];
};

const appendUniqueNotes = (existingNotes: string | null, incomingNotes: string | null) => {
  const current = normaliseText(existingNotes);
  const incoming = normaliseText(incomingNotes);

  if (!incoming) return current || null;
  if (!current) return incoming;
  if (current.toLowerCase().includes(incoming.toLowerCase())) return current;

  return `${current}\n\n${incoming}`;
};

const mergeImportCandidates = (base: ImportCandidate, incoming: ImportCandidate): ImportCandidate => ({
  ...base,
  name: base.name === 'Unknown' && incoming.name !== 'Unknown' ? incoming.name : base.name,
  club_name: base.club_name || incoming.club_name,
  position: base.position || incoming.position,
  email: base.email || incoming.email,
  phone: base.phone || incoming.phone,
  country: base.country || incoming.country,
  city: base.city || incoming.city,
  image_url: base.image_url || incoming.image_url,
  notes: appendUniqueNotes(base.notes, incoming.notes),
});

const mergeIntoExistingContact = (existing: Contact, incoming: ImportCandidate) => {
  const merged: Contact = {
    ...existing,
    name: existing.name === 'Unknown' && incoming.name !== 'Unknown' ? incoming.name : existing.name,
    club_name: existing.club_name || incoming.club_name,
    position: existing.position || incoming.position,
    email: existing.email || incoming.email,
    phone: existing.phone || incoming.phone,
    country: existing.country || incoming.country,
    city: existing.city || incoming.city,
    image_url: existing.image_url || incoming.image_url,
    notes: appendUniqueNotes(existing.notes, incoming.notes),
  };

  const changed = merged.name !== existing.name || merged.club_name !== existing.club_name || merged.position !== existing.position || merged.email !== existing.email || merged.phone !== existing.phone || merged.country !== existing.country || merged.city !== existing.city || merged.image_url !== existing.image_url || merged.notes !== existing.notes;

  return { merged, changed };
};

const dedupeImportedContacts = (contacts: any[]) => {
  const deduped: ImportCandidate[] = [];
  const keyToIndex = new Map<string, number>();

  contacts.map(sanitiseImportedContact).forEach((contact) => {
    const keys = buildContactMatchKeys(contact);
    const existingIndex = keys.map((key) => keyToIndex.get(key)).find((value): value is number => value !== undefined);

    if (existingIndex !== undefined) {
      deduped[existingIndex] = mergeImportCandidates(deduped[existingIndex], contact);
      buildContactMatchKeys(deduped[existingIndex]).forEach((key) => keyToIndex.set(key, existingIndex));
      return;
    }

    const nextIndex = deduped.push(contact) - 1;
    keys.forEach((key) => keyToIndex.set(key, nextIndex));
  });

  return deduped;
};

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
  // Match field with optional params e.g. TEL;TYPE=work:+123
  for (const line of lines) {
    const upperLine = line.toUpperCase();
    const upperField = field.toUpperCase();
    if (upperLine.startsWith(upperField + ':') || upperLine.startsWith(upperField + ';')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      return line.substring(colonIdx + 1).trim();
    }
  }
  return '';
};

const parseVCardName = (lines: string[]): string => {
  // Try FN first
  const fn = readVCardValue(lines, 'FN');
  if (fn) return fn;
  // Fall back to N property
  const n = readVCardValue(lines, 'N');
  if (!n) return '';
  const parts = n.split(';');
  const lastName = (parts[0] || '').trim();
  const firstName = (parts[1] || '').trim();
  const middle = (parts[2] || '').trim();
  const prefix = (parts[3] || '').trim();
  return [prefix, firstName, middle, lastName].filter(Boolean).join(' ');
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
      const city = adrParts[3] || adrParts[2] || '';
      const country = adrParts[6] || '';

      // Get all email lines
      const emailLines = lines.filter(l => l.toUpperCase().startsWith('EMAIL'));
      const email = emailLines.length > 0 ? emailLines[0].substring(emailLines[0].indexOf(':') + 1).trim() : '';

      // Get all tel lines
      const telLines = lines.filter(l => l.toUpperCase().startsWith('TEL'));
      const phone = telLines.length > 0 ? telLines[0].substring(telLines[0].indexOf(':') + 1).trim() : '';

      return {
        name: parseVCardName(lines),
        club_name: readVCardValue(lines, 'ORG') || null,
        position: readVCardValue(lines, 'TITLE') || readVCardValue(lines, 'ROLE') || null,
        email: email || null,
        phone: phone || null,
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

const ClubNetworkManagement = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [countrySummary, setCountrySummary] = useState<{ country: string; count: number }[]>([]);
  const [loadedCountryKeys, setLoadedCountryKeys] = useState<Set<string>>(new Set());
  const [countryContactsCache, setCountryContactsCache] = useState<Map<string, Contact[]>>(new Map());
  const [countryContactsLoading, setCountryContactsLoading] = useState(false);
  const [contactPage, setContactPage] = useState(0);
  const CONTACTS_PER_PAGE = 9;
  const [clubRatings, setClubRatings] = useState<ClubRating[]>([]);
  const [clubLogos, setClubLogos] = useState<ClubLogo[]>([]);
  const [countryProfiles, setCountryProfiles] = useState<CountryProfile[]>([]);
  const [clubProfiles, setClubProfiles] = useState<ClubProfile[]>([]);
  const [roleProfiles, setRoleProfiles] = useState<RoleProfile[]>([]);
  const [marketingTemplates, setMarketingTemplates] = useState<MarketingTemplate[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [landingRoleFilter, setLandingRoleFilter] = useState('all');
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
  const [viewingContact, setViewingContact] = useState<Contact | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgressState>({ active: false, processed: 0, total: 0, inserted: 0, updated: 0, skipped: 0, completed: false, message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const avatarObjectUrlRef = useRef<string | null>(null);
  const [avatarUploadTarget, setAvatarUploadTarget] = useState<Contact | null>(null);
  const [avatarCropSource, setAvatarCropSource] = useState<string | null>(null);

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

  // Lightweight summary: just country + count, no full contact data
  const fetchCountrySummary = useCallback(async () => {
    const { data, error } = await supabase
      .from('club_network_contacts')
      .select('country');
    
    if (error) {
      toast.error('Failed to fetch contacts');
      return;
    }

    const countMap = new Map<string, number>();
    let totalCount = 0;
    (data || []).forEach((row: any) => {
      const country = normaliseText(row.country) || 'Uncategorised';
      countMap.set(country.toLowerCase(), (countMap.get(country.toLowerCase()) || 0) + 1);
      totalCount++;
    });

    const summary = [...countMap.entries()]
      .map(([key, count]) => ({ country: key, count }))
      .sort((a, b) => b.count - a.count);

    setCountrySummary(summary);
    // Store total count in contacts array length for header display
    setContacts(new Array(totalCount) as any);
  }, []);

  // Load contacts for a specific country on demand
  const fetchCountryContacts = useCallback(async (countryKey: string) => {
    if (loadedCountryKeys.has(countryKey)) return;
    setCountryContactsLoading(true);

    try {
      let allContacts: Contact[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      const isUncategorised = countryKey === 'uncategorised';

      while (hasMore) {
        let query = supabase
          .from('club_network_contacts')
          .select('*')
          .order('name', { ascending: true })
          .range(from, from + pageSize - 1);

        if (isUncategorised) {
          query = query.or('country.is.null,country.eq.');
        } else {
          query = query.ilike('country', countryKey);
        }

        const { data, error } = await query;
        if (error) { toast.error('Failed to load contacts'); return; }
        allContacts = allContacts.concat(data || []);
        hasMore = (data?.length || 0) === pageSize;
        from += pageSize;
      }

      setCountryContactsCache((prev) => {
        const next = new Map(prev);
        next.set(countryKey, allContacts);
        return next;
      });
      setLoadedCountryKeys((prev) => new Set(prev).add(countryKey));
    } finally {
      setCountryContactsLoading(false);
    }
  }, [loadedCountryKeys]);

  // Full fetch for AI tools / duplicates / analytics that need all contacts
  const fetchAllContacts = useCallback(async () => {
    let allContacts: Contact[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('club_network_contacts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        toast.error('Failed to fetch contacts');
        return [];
      }

      allContacts = allContacts.concat(data || []);
      hasMore = (data?.length || 0) === pageSize;
      from += pageSize;
    }

    setContacts(allContacts);
    return allContacts;
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

  useEffect(() => {
    fetchCountrySummary();
    fetchProfiles();
    fetchAuxiliaryData();
  }, [fetchAuxiliaryData, fetchCountrySummary, fetchProfiles]);

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
    // Use lightweight summary for landing cards - no full contact data needed
    return countrySummary.map((entry) => {
      const key = entry.country.toLowerCase();
      const displayName = key === 'uncategorised' ? 'Uncategorised' : toTitleCase(entry.country);
      const profile = countryProfiles.find((item) => item.country_name.trim().toLowerCase() === displayName.trim().toLowerCase()) || null;
      // Contacts array is a placeholder with correct length for count display
      // Real contacts are loaded lazily via countryContactsCache
      const cachedContacts = countryContactsCache.get(key) || [];
      const placeholderContacts = cachedContacts.length > 0 ? cachedContacts : new Array(entry.count) as Contact[];
      return { key, name: displayName, contacts: placeholderContacts, profile };
    }).sort((a, b) => {
      if (a.key === 'uncategorised') return 1;
      if (b.key === 'uncategorised') return -1;
      return b.contacts.length - a.contacts.length;
    });
  }, [countrySummary, countryProfiles, countryContactsCache]);

  const selectedCountry = useMemo(
    () => countryData.find((country) => country.key === selectedCountryKey) || null,
    [countryData, selectedCountryKey]
  );

  const countrySchemes = useMemo(() => parseDelimitedList(selectedCountry?.profile?.common_formations), [selectedCountry]);

  const uniqueCountries = countryData.map((country) => country.name);

  // globalRoleOptions only computed when we have full contacts (for AI tools tab)
  const globalRoleOptions = useMemo(() => {
    // Use cached contacts from all loaded countries
    const allCached = [...countryContactsCache.values()].flat();
    const roleMap = new Map<string, string[]>();
    allCached.forEach((contact) => {
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
  }, [countryContactsCache]);

  const filteredCountries = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return countryData
      .filter((country) => {
        if (!searchQuery.trim()) return country.contacts.length > 0;
        return country.name.toLowerCase().includes(query) || country.contacts.length > 0;
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
    setFormData({ name: '', club_name: '', position: '', email: '', phone: '', country: '', city: '', latitude: '', longitude: '', image_url: '', notes: '' });
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
      if (error) { toast.error('Failed to update contact'); return; }
      toast.success('Contact updated');
    } else {
      const { error } = await supabase.from('club_network_contacts').insert(payload);
      if (error) { toast.error('Failed to create contact'); return; }
      toast.success('Contact created');
    }

    setShowDialog(false);
    setEditingContact(null);
    resetForm();
    fetchCountrySummary(); setLoadedCountryKeys(new Set()); setCountryContactsCache(new Map());
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    const { error } = await supabase.from('club_network_contacts').delete().eq('id', id);
    if (error) { toast.error('Failed to delete contact'); return; }
    toast.success('Contact deleted');
    fetchCountrySummary(); setLoadedCountryKeys(new Set()); setCountryContactsCache(new Map());
  };

  const handleShareContact = (contact: Contact) => {
    const shareUrl = `${window.location.origin}/contact/${contact.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied');
  };

  const exportContactsAsVcf = (exportContacts: Contact[], filenameBase: string) => {
    if (exportContacts.length === 0) { toast.info('No contacts to export'); return; }
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
        // Try AI fallback for non-vcard formats
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
        toast.error('No contacts found in that file');
        return;
      }

      setParsedContacts(parsed);
      setSelectedImportIndices(new Set(parsed.map((_: any, index: number) => index)));
      toast.success(`Parsed ${parsed.length} contact${parsed.length === 1 ? '' : 's'}`);
    } catch (error: any) {
      toast.error(`Failed to read file${error?.message ? `: ${error.message}` : ''}`);
    } finally {
      setImportProcessing(false);
    }
  };

  const handleImportContacts = async () => {
    const selected = parsedContacts.filter((_: any, index: number) => selectedImportIndices.has(index));
    if (selected.length === 0) { toast.info('No contacts selected'); return; }

    setImportProcessing(true);
    setImportProgress({ active: true, processed: 0, total: selected.length, inserted: 0, updated: 0, skipped: 0, completed: false, message: 'Preparing import' });
    try {
      const payload = dedupeImportedContacts(selected);
      const { data: existingContacts, error: existingContactsError } = await supabase.from('club_network_contacts').select('id, name, club_name, position, email, phone, country, city, latitude, longitude, image_url, notes');
      if (existingContactsError) throw existingContactsError;

      const existingByKey = new Map<string, Contact>();
      (existingContacts || []).forEach((contact) => {
        buildContactMatchKeys(contact).forEach((key) => {
          if (!existingByKey.has(key)) existingByKey.set(key, contact as Contact);
        });
      });

      let inserted = 0;
      let updated = 0;
      let skipped = 0;
      let processed = 0;
      const chunkSize = 100;

      for (let start = 0; start < payload.length; start += chunkSize) {
        const chunk = payload.slice(start, start + chunkSize);
        const insertBatch: ImportCandidate[] = [];
        const updateBatch: Array<{ id: string } & ImportCandidate> = [];

        chunk.forEach((contact) => {
          const existingContact = buildContactMatchKeys(contact).map((key) => existingByKey.get(key)).find((value): value is Contact => Boolean(value));
          if (!existingContact) {
            insertBatch.push(contact);
            return;
          }

          const { merged, changed } = mergeIntoExistingContact(existingContact, contact);
          if (!changed) {
            skipped += 1;
            return;
          }

          updateBatch.push({ id: merged.id, name: merged.name, club_name: merged.club_name, position: merged.position, email: merged.email, phone: merged.phone, country: merged.country, city: merged.city, image_url: merged.image_url, notes: merged.notes });
        });

        if (insertBatch.length > 0) {
          const { data: insertedRows, error } = await supabase.from('club_network_contacts').insert(insertBatch).select('id, name, club_name, position, email, phone, country, city, latitude, longitude, image_url, notes');
          if (error) throw error;
          inserted += insertedRows?.length || 0;
          (insertedRows || []).forEach((contact) => buildContactMatchKeys(contact).forEach((key) => existingByKey.set(key, contact as Contact)));
        }

        if (updateBatch.length > 0) {
          const { data: updatedRows, error } = await supabase.from('club_network_contacts').upsert(updateBatch, { onConflict: 'id' }).select('id, name, club_name, position, email, phone, country, city, latitude, longitude, image_url, notes');
          if (error) throw error;
          updated += updatedRows?.length || 0;
          (updatedRows || []).forEach((contact) => buildContactMatchKeys(contact).forEach((key) => existingByKey.set(key, contact as Contact)));
        }

        processed += chunk.length;
        setImportProgress({ active: true, processed, total: payload.length, inserted, updated, skipped, completed: false, message: 'Importing contacts' });
      }

      toast.success(`Imported ${inserted} new, updated ${updated}, skipped ${skipped}`);
      setShowImportDialog(false);
      setImportText('');
      setParsedContacts([]);
      setSelectedImportIndices(new Set());
      fetchCountrySummary(); setLoadedCountryKeys(new Set()); setCountryContactsCache(new Map());
      setImportProgress({ active: true, processed: payload.length, total: payload.length, inserted, updated, skipped, completed: true, message: 'Import complete' });
    } catch (error: any) {
      setImportProgress((current) => ({ ...current, active: false, completed: false, message: '' }));
      toast.error(`Import failed${error?.message ? `: ${error.message}` : ''}`);
    } finally {
      setImportProcessing(false);
    }
  };

  const closeAvatarCrop = useCallback(() => {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }
    setAvatarCropSource(null);
    setAvatarUploadTarget(null);
  }, []);

  const handleAvatarSelect = useCallback((contact: Contact) => {
    setAvatarUploadTarget(contact);
    avatarInputRef.current?.click();
  }, []);

  const handleAvatarFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !avatarUploadTarget) return;
    if (avatarObjectUrlRef.current) URL.revokeObjectURL(avatarObjectUrlRef.current);
    avatarObjectUrlRef.current = URL.createObjectURL(file);
    setAvatarCropSource(avatarObjectUrlRef.current);
    event.target.value = '';
  }, [avatarUploadTarget]);

  const handleAvatarCropComplete = useCallback(async (croppedBlob: Blob) => {
    if (!avatarUploadTarget) return;

    const filePath = `network-contact-images/${avatarUploadTarget.id}-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from('analysis-files')
      .upload(filePath, croppedBlob, { contentType: 'image/png', upsert: true });

    if (uploadError) {
      toast.error('Failed to upload profile photo');
      return;
    }

    const { data: publicUrlData } = supabase.storage.from('analysis-files').getPublicUrl(filePath);
    const nextUrl = publicUrlData.publicUrl;
    const { error: updateError } = await supabase.from('club_network_contacts').update({ image_url: nextUrl }).eq('id', avatarUploadTarget.id);

    if (updateError) {
      toast.error('Failed to save profile photo');
      return;
    }

    setContacts((current) => current.map((contact) => contact.id === avatarUploadTarget.id ? { ...contact, image_url: nextUrl } : contact));
    setViewingContact((current) => current?.id === avatarUploadTarget.id ? { ...current, image_url: nextUrl } : current);
    toast.success('Profile photo updated');
    closeAvatarCrop();
  }, [avatarUploadTarget, closeAvatarCrop]);

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
    setSelectedImportIndices(new Set(parsedContacts.map((_: any, index: number) => index)));
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
      if (!jsonMatch) { toast.info(emptyMessage); return; }
      const updates = JSON.parse(jsonMatch[0]);
      const applied = await onSuccess(updates);
      if (applied === 0) toast.info(emptyMessage);
      else toast.success(`${successLabel} ${applied} record${applied === 1 ? '' : 's'}`);
      fetchCountrySummary(); setLoadedCountryKeys(new Set()); setCountryContactsCache(new Map());
    } catch (error) {
      toast.error('AI update failed');
    } finally {
      setAiAction(null);
    }
  };

  const handleAiAutoTag = async () => {
    const candidates = contacts.filter((contact) => !contact.country || !contact.position);
    if (candidates.length === 0) { toast.info('Country and role tags are already filled'); return; }

    let totalApplied = 0;
    const batchSize = 50;
    setAiAction('tag');

    try {
      for (let i = 0; i < candidates.length; i += batchSize) {
        const batch = candidates.slice(i, i + batchSize).map((c) => ({ id: c.id, name: c.name, club_name: c.club_name, position: c.position, country: c.country, email: c.email, notes: c.notes }));
        const prompt = `You are a football industry expert. For each contact below, infer the MISSING country and/or position (role) fields. Country must be the country where they WORK (based on their club, league, or context clues in notes/email domain), NOT their nationality. Position means their job role (e.g. Director of Football, Scout, Agent, Head Coach, Sporting Director, Academy Director, etc). Only return fields that are currently null/empty. Return a JSON array with objects containing "id" and only the fields to update.\n\nContacts:\n${JSON.stringify(batch)}`;

        const { data, error } = await invokeEdgeFunction('generate-ai-response', { body: { prompt } });
        if (error) continue;
        const responseText = data?.response || '';
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) continue;

        const updates = JSON.parse(jsonMatch[0]);
        for (const update of updates) {
          const payload: Record<string, string> = {};
          if (update.country) payload.country = update.country;
          if (update.position) payload.position = update.position;
          if (Object.keys(payload).length === 0) continue;
          const { error: updateErr } = await supabase.from('club_network_contacts').update(payload).eq('id', update.id);
          if (!updateErr) totalApplied += 1;
        }
      }

      if (totalApplied === 0) toast.info('No new country or role tags were suggested');
      else toast.success(`AI tagged ${totalApplied} record${totalApplied === 1 ? '' : 's'}`);
      fetchCountrySummary(); setLoadedCountryKeys(new Set()); setCountryContactsCache(new Map());
    } catch {
      toast.error('AI tagging failed');
    } finally {
      setAiAction(null);
    }
  };

  const handleAiOrganise = async () => {
    let totalApplied = 0;
    const batchSize = 50;
    setAiAction('organise');

    try {
      for (let i = 0; i < contacts.length; i += batchSize) {
        const batch = contacts.slice(i, i + batchSize).map((c) => ({ id: c.id, name: c.name, club_name: c.club_name, position: c.position, country: c.country, city: c.city, notes: c.notes }));
        const prompt = `You are a data quality expert for a football contacts database. Review each contact for misplaced information. Common issues: club names appearing in the person's name field, role/position text in the wrong field, country showing nationality instead of where they work, city and country swapped. Return a JSON array with objects containing "id" and ONLY the corrected fields. Do not return contacts that need no changes.\n\nContacts:\n${JSON.stringify(batch)}`;

        const { data, error } = await invokeEdgeFunction('generate-ai-response', { body: { prompt } });
        if (error) continue;
        const responseText = data?.response || '';
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) continue;

        const updates = JSON.parse(jsonMatch[0]);
        for (const update of updates) {
          const payload: Record<string, string> = {};
          ['name', 'club_name', 'position', 'country', 'city', 'notes'].forEach((field) => {
            if (update[field]) payload[field] = update[field];
          });
          if (Object.keys(payload).length === 0) continue;
          const { error: updateErr } = await supabase.from('club_network_contacts').update(payload).eq('id', update.id);
          if (!updateErr) totalApplied += 1;
        }
      }

      if (totalApplied === 0) toast.info('No field changes were suggested');
      else toast.success(`AI organised ${totalApplied} record${totalApplied === 1 ? '' : 's'}`);
      fetchCountrySummary(); setLoadedCountryKeys(new Set()); setCountryContactsCache(new Map());
    } catch {
      toast.error('AI organise failed');
    } finally {
      setAiAction(null);
    }
  };

  const handleAiStandardiseClubs = async () => {
    const withClubs = contacts.filter((contact) => normaliseText(contact.club_name));
    if (withClubs.length === 0) { toast.info('No contacts with clubs to standardise'); return; }

    let totalApplied = 0;
    const batchSize = 80;
    setAiAction('clubs');

    try {
      for (let i = 0; i < withClubs.length; i += batchSize) {
        const batch = withClubs.slice(i, i + batchSize).map((c) => ({ id: c.id, club_name: c.club_name }));
        const prompt = `You are a football club name standardisation expert. These contacts may have the same club name with different spellings (accents, abbreviations, spacing, language variants). Group duplicates and pick the single preferred/official spelling for each club. Return a JSON array with objects containing "id" and "club_name" ONLY for those that should change.\n\n${JSON.stringify(batch)}`;

        const { data, error } = await invokeEdgeFunction('generate-ai-response', { body: { prompt } });
        if (error) continue;
        const responseText = data?.response || '';
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) continue;

        const updates = JSON.parse(jsonMatch[0]);
        for (const update of updates) {
          if (!update.club_name) continue;
          const { error: updateErr } = await supabase.from('club_network_contacts').update({ club_name: update.club_name }).eq('id', update.id);
          if (!updateErr) totalApplied += 1;
        }
      }

      if (totalApplied === 0) toast.info('No club names needed standardising');
      else toast.success(`AI standardised ${totalApplied} record${totalApplied === 1 ? '' : 's'}`);
      fetchCountrySummary(); setLoadedCountryKeys(new Set()); setCountryContactsCache(new Map());
    } catch {
      toast.error('AI standardise failed');
    } finally {
      setAiAction(null);
    }
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
            const reasons: string[] = [];
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
        fetchCountrySummary(); setLoadedCountryKeys(new Set()); setCountryContactsCache(new Map());
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

  // ── Contact card ──
  const ContactCard = ({ contact }: { contact: Contact }) => {
    const logo = getClubLogo(contact.club_name);
    const rating = getDisplayScore(getClubRating(contact.club_name));

    return (
      <article
        onClick={() => setViewingContact(contact)}
        className="group relative cursor-pointer overflow-hidden rounded-[1.6rem] border border-border/50 p-5 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/40"
        style={softPanelStyle}
      >
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary/80 via-accent/80 to-primary/60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_36%)] opacity-90" />
        <div className="absolute right-4 top-4 z-10 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(event) => { event.stopPropagation(); openEditDialog(contact); }}
                  className="rounded-full border border-border/60 bg-card/60 p-2 text-muted-foreground transition-colors hover:text-primary"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(event) => { event.stopPropagation(); handleShareContact(contact); }}
                  className="rounded-full border border-border/60 bg-card/60 p-2 text-muted-foreground transition-colors hover:text-primary"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Share</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(event) => { event.stopPropagation(); handleDelete(contact.id); }}
                  className="rounded-full border border-border/60 bg-card/60 p-2 text-muted-foreground transition-colors hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="relative z-[1] space-y-4">
          <div className="flex items-start gap-4">
            {contact.image_url ? (
              <img src={contact.image_url} alt={contact.name} className="h-16 w-16 rounded-2xl object-cover ring-1 ring-border/70" />
            ) : (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleAvatarSelect(contact);
                }}
                className="group/avatar relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-primary/25 bg-primary/10 text-lg font-semibold text-primary ring-1 ring-border/50"
                title="Upload profile photo"
              >
                <span>{contact.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span>
                <span className="absolute inset-0 flex items-center justify-center bg-background/70 opacity-0 transition-opacity group-hover/avatar:opacity-100">
                  <Camera className="h-4 w-4" />
                </span>
              </button>
            )}
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-semibold leading-tight tracking-[-0.02em] text-foreground">{contact.name}</h3>
                {(() => {
                  const s = computeContactStrength(contact);
                  return (
                    <span className={`text-xs font-bold ${strengthColor(s)}`}>{s}%</span>
                  );
                })()}
              </div>
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
              <Badge variant="outline" className="border-primary/40 text-primary">{rating}</Badge>
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
                onClick={(event) => { event.stopPropagation(); openExternalUrl(`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`); }}
                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <FaWhatsapp className="h-4 w-4 text-primary" />
                WhatsApp
              </button>
            )}
            {contact.email && (
              <button
                onClick={(event) => { event.stopPropagation(); openMailto(contact.email); }}
                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Mail className="h-4 w-4 text-primary" />
                Email
              </button>
            )}
          </div>
        </div>
      </article>
    );
  };

  const SchemeCarousel = ({ schemes }: { schemes: string[] }) => {
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
      setActiveIndex(0);
    }, [schemes]);

    useEffect(() => {
      if (schemes.length <= 1) return;
      const interval = window.setInterval(() => {
        setActiveIndex((current) => (current + 1) % schemes.length);
      }, 4000);
      return () => window.clearInterval(interval);
    }, [schemes]);

    if (schemes.length === 0) {
      return <p className="text-sm leading-relaxed text-muted-foreground">Add schemes to the country profile and they will appear here on a slider.</p>;
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary/40 text-primary">
            #{activeIndex + 1} {schemes[activeIndex]}
          </Badge>
        </div>
        <div className="rounded-[1.35rem] border border-border/50 bg-background/35 px-2 py-3">
          <AnimatePresence mode="wait">
            <motion.div key={`${schemes[activeIndex]}-${activeIndex}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}>
              <FormationDisplay formation={schemes[activeIndex]} />
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {schemes.map((scheme, index) => (
            <button
              key={scheme}
              onClick={() => setActiveIndex(index)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                index === activeIndex
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border/60 bg-background/45 text-muted-foreground hover:text-foreground'
              }`}
            >
              {scheme}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // ── Template quick copy with hover preview ──
  const TemplateQuickCopy = ({ templates }: { templates: MarketingTemplate[] }) => {
    if (templates.length === 0) return null;

    return (
      <TooltipProvider delayDuration={300}>
        <div className="flex flex-wrap gap-2 pt-3">
          {templates.map((template) => (
            <Tooltip key={template.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(template.message_content);
                    toast.success(`Copied ${template.message_title}`);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/45 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {template.message_title}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-sm whitespace-pre-wrap text-left text-xs">
                {template.message_content.length > 300 ? template.message_content.substring(0, 300) + '...' : template.message_content}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    );
  };

  const NetworkTabPanel = ({ title, description, icon: Icon, children }: { title: string; description: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) => (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[2rem] border border-border/50 p-5 backdrop-blur-2xl" style={panelStyle}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_40%)] opacity-85" />
        <div className="relative z-[1] flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <ScrollReveal>
              <h3 className="font-bebas text-xl tracking-[0.26em] text-foreground uppercase">{title}</h3>
            </ScrollReveal>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-[2rem] border border-border/50 p-4 backdrop-blur-2xl" style={softPanelStyle}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,hsl(var(--accent)/0.1),transparent_46%)] opacity-80" />
        <div className="relative z-[1]">{children}</div>
      </div>
    </div>
  );

  const ImportProgressIndicator = () => {
    if (!importProgress.active) return null;

    const progressValue = importProgress.total > 0 ? (importProgress.processed / importProgress.total) * 100 : 0;

    return (
      <div className="fixed bottom-6 right-6 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[1.6rem] border border-border/60 p-4 backdrop-blur-2xl" style={panelStyle}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_42%)] opacity-80" />
        <div className="relative z-[1] space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bebas text-sm tracking-[0.24em] text-foreground uppercase">{importProgress.message || 'Importing contacts'}</p>
              <p className="text-xs text-muted-foreground">{importProgress.processed} of {importProgress.total} processed</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/40 text-primary">{Math.round(progressValue)}%</Badge>
              {importProgress.completed && (
                <button
                  type="button"
                  onClick={() => setImportProgress((current) => ({ ...current, active: false }))}
                  className="rounded-full border border-border/60 bg-background/40 p-1 text-muted-foreground transition-colors hover:text-foreground"
                  title="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <Progress value={progressValue} className="h-2 bg-muted/60" />
          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
            <span>New {importProgress.inserted}</span>
            <span>Updated {importProgress.updated}</span>
            <span>Skipped {importProgress.skipped}</span>
          </div>
        </div>
      </div>
    );
  };

  // ── Country card ──
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
        className="group relative min-h-[15rem] w-full overflow-hidden rounded-[1.9rem] border border-border/50 text-left backdrop-blur-2xl transition-all duration-300 hover:border-primary/35"
        style={panelStyle}
      >
        <img src={getCountryFlagUrl(country.name)} alt={country.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/45 to-background/5" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_38%)] opacity-80" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        <div className="relative z-[1] flex h-full items-center justify-center p-5 text-center">
          <div className="w-full max-w-[16rem] space-y-3 rounded-[1.35rem] border border-border/40 bg-background/25 p-4 backdrop-blur-xl">
            <ScrollReveal>
              <h3 className="font-bebas text-[1.15rem] tracking-[0.22em] text-foreground">{country.name.toUpperCase()}</h3>
            </ScrollReveal>
            <div className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 bg-background/45 px-3.5 py-1.5 text-sm font-medium text-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              {country.contacts.length} contact{country.contacts.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>
      </motion.button>
    </ScrollRevealItem>
  );

  // ── Info block ──
  const InfoBlock = ({ title, children, className: extraClass = '' }: { title: string; children: React.ReactNode; className?: string }) => (
    <div className={`relative overflow-hidden rounded-[1.5rem] border border-border/50 p-4 backdrop-blur-2xl ${extraClass}`} style={softPanelStyle}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_36%)] opacity-80" />
      <div className="relative z-[1] space-y-3">
        <ScrollReveal>
          <h4 className="font-bebas text-sm tracking-[0.28em] text-primary uppercase">{title}</h4>
        </ScrollReveal>
        {children}
      </div>
    </div>
  );

  // ── Landing view ──
  const LandingView = () => (
    <div className="space-y-6">
      <ScrollReveal>
        <div className="relative overflow-hidden rounded-[2rem] border border-border/50 p-5 backdrop-blur-2xl" style={panelStyle}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_38%)] opacity-85" />
          <div className="relative z-[1] flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <ScrollReveal>
                <h2 className="font-bebas text-2xl tracking-[0.3em] text-foreground">NETWORK</h2>
              </ScrollReveal>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{contacts.length} contacts</span>
                <span className="text-border">·</span>
                <span>{uniqueCountries.length} countries</span>
                <span className="text-border">·</span>
                <span>{uniqueClubCount} organisations</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <StaffSearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search countries, contacts, clubs"
                className="w-64"
              />

              <Select value={landingRoleFilter} onValueChange={setLandingRoleFilter}>
                <SelectTrigger className="w-[12rem] rounded-xl border-border/60 bg-background/45">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {globalRoleOptions.map((role) => (
                    <SelectItem key={role.key} value={role.key}>{role.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="rounded-xl border-border/60 bg-background/45 shrink-0">
                    {aiAction ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
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
                  <Button variant="outline" size="icon" className="rounded-xl border-border/60 bg-background/45 shrink-0">
                    <Download className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
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

              <Button onClick={openAddDialog} size="icon" className="rounded-xl shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
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

  // ── Country detail view ──
  const CountryDetailView = () => (
    <div className="space-y-6">
      <ScrollReveal>
        <button
          onClick={() => { setSelectedCountryKey(null); setSearchQuery(''); setRoleFilter('all'); }}
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
                  <ScrollReveal>
                    <h2 className="font-bebas text-3xl tracking-[0.34em] text-foreground">{(selectedCountry?.name || '').toUpperCase()}</h2>
                  </ScrollReveal>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {countryContacts.length} contacts · {clubGroups.length} organisations · {roleGroups.length} roles
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 xl:justify-end">
                <TooltipProvider delayDuration={200}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" className="rounded-xl border-border/60 bg-background/45">
                            {aiAction ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>AI tools</TooltipContent>
                      </Tooltip>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-72">
                      <DropdownMenuItem onClick={handleAiAutoTag} disabled={!!aiAction}><Wand2 className="mr-2 h-4 w-4" />Auto-tag country and role</DropdownMenuItem>
                      <DropdownMenuItem onClick={handleAiOrganise} disabled={!!aiAction}><SortAsc className="mr-2 h-4 w-4" />Organise fields</DropdownMenuItem>
                      <DropdownMenuItem onClick={handleAiStandardiseClubs} disabled={!!aiAction}><Building2 className="mr-2 h-4 w-4" />Standardise club names</DropdownMenuItem>
                      <DropdownMenuItem onClick={handleAiMapLinks} disabled={!!aiAction}><Link2 className="mr-2 h-4 w-4" />Map likely network links</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="rounded-xl border-border/60 bg-background/45" onClick={() => openProfileEditor('country', selectedCountry?.name || '')}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit country profile</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="rounded-xl border-border/60 bg-background/45" onClick={() => exportContactsAsVcf(countryContacts, `${selectedCountry?.name || 'country'}-contacts`)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Export .vcf</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" className="rounded-xl" onClick={openAddDialog}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add contact</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* Style & Background (wider) + Schemes (thinner) */}
            <div className="grid gap-4 md:grid-cols-[1.6fr_1fr]">
              <InfoBlock title="Style & Background">
                <ScrollReveal>
                  <p className="text-sm leading-relaxed text-foreground/85">
                    {selectedCountry?.profile?.playing_style || 'Add the national style, background and league context here.'}
                  </p>
                </ScrollReveal>
                {selectedCountry?.profile?.notes && (
                  <ScrollReveal delay={0.1}>
                    <p className="text-xs leading-relaxed text-muted-foreground mt-2">{selectedCountry.profile.notes}</p>
                  </ScrollReveal>
                )}
              </InfoBlock>

              <InfoBlock title="Schemes">
                <SchemeCarousel schemes={countrySchemes} />
              </InfoBlock>
            </div>

            {/* Traits + League Rules */}
            <div className="grid gap-4 md:grid-cols-2">
              <InfoBlock title="Traits">
                <ScrollReveal>
                  <p className="text-sm leading-relaxed text-foreground/85">{selectedCountry?.profile?.key_characteristics || 'Add the core football traits for this country.'}</p>
                </ScrollReveal>
              </InfoBlock>

              <InfoBlock title="League Rules">
                <ScrollReveal>
                  <p className="text-sm leading-relaxed text-foreground/85">{selectedCountry?.profile?.league_structure || 'Add the league rules and key competition details.'}</p>
                </ScrollReveal>
              </InfoBlock>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Filters bar */}
      <ScrollReveal delay={0.1}>
        <div className="relative overflow-hidden rounded-[2rem] border border-border/50 p-4 backdrop-blur-2xl" style={softPanelStyle}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,hsl(var(--accent)/0.1),transparent_44%)] opacity-80" />
          <div className="relative z-[1] flex flex-wrap items-center gap-3">
            <StaffSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={`Search ${selectedCountry?.name || 'country'} contacts`}
              className="flex-1 min-w-[12rem]"
            />

            <div className="flex items-center gap-1 rounded-full border border-border/60 bg-background/40 p-1">
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

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[12rem] rounded-2xl border-border/60 bg-background/45">
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
      </ScrollReveal>

      {/* Contact groups */}
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
                        <ScrollReveal>
                          <h3 className="font-bebas text-xl tracking-[0.24em] text-foreground">{group.name.toUpperCase()}</h3>
                        </ScrollReveal>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="secondary">{group.contacts.length}</Badge>
                          <Badge variant="outline" className="border-primary/40 text-primary">{getDisplayScore(group.rating)}</Badge>
                          {group.profile?.league && <span>{group.profile.league}</span>}
                          {group.profile?.tier && <span>· Tier {group.profile.tier}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <TooltipProvider delayDuration={200}>
                        {group.name !== 'Independent' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="icon" className="rounded-full border-border/60 bg-background/45" onClick={() => openProfileEditor('club', group.name)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit club profile</TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className="rounded-full border-border/60 bg-background/45" onClick={() => exportContactsAsVcf(group.contacts, `${group.name}-contacts`)}>
                              <Download className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Export group</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  {/* Club bio */}
                  {group.profile?.description && (
                    <ScrollReveal delay={0.05}>
                      <p className="relative z-[1] mt-3 text-sm leading-relaxed text-muted-foreground">{group.profile.description}</p>
                    </ScrollReveal>
                  )}
                  {group.profile?.playing_style && (
                    <ScrollReveal delay={0.08}>
                      <p className="relative z-[1] mt-1 text-xs leading-relaxed text-muted-foreground/70 italic">{group.profile.playing_style}</p>
                    </ScrollReveal>
                  )}
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
                      <ScrollReveal>
                        <h3 className="font-bebas text-xl tracking-[0.24em] text-foreground">{group.name.toUpperCase()}</h3>
                      </ScrollReveal>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="secondary">{group.contacts.length}</Badge>
                        {group.profile?.seniority_level && <span>{group.profile.seniority_level}</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className="rounded-full border-border/60 bg-background/45" onClick={() => openProfileEditor('role', group.name)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit role profile</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className="rounded-full border-border/60 bg-background/45" onClick={() => exportContactsAsVcf(group.contacts, `${group.name}-contacts`)}>
                              <Download className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Export group</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  {group.profile?.description && (
                    <ScrollReveal delay={0.05}>
                      <p className="relative z-[1] mt-3 text-sm leading-relaxed text-muted-foreground">{group.profile.description}</p>
                    </ScrollReveal>
                  )}
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

  // ── Contact preview popup (shared card style) ──
  const ContactPreviewDialog = () => {
    if (!viewingContact) return null;
    const contact = viewingContact;
    const logo = getClubLogo(contact.club_name);
    const rating = getDisplayScore(getClubRating(contact.club_name));
    const shareUrl = `${window.location.origin}/contact/${contact.id}`;

    return (
      <Dialog open={!!viewingContact} onOpenChange={(open) => !open && setViewingContact(null)}>
        <DialogContent className="w-[96vw] max-w-lg p-0 overflow-hidden border-0 bg-transparent shadow-none">
          <div className="backdrop-blur-xl bg-gradient-to-br from-card/90 via-card/80 to-card/60 border border-white/10 rounded-3xl p-8 shadow-2xl" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.05)' }}>
            {/* Avatar */}
            <div className="flex justify-center mb-6">
              {contact.image_url ? (
                <img src={contact.image_url} alt={contact.name} className="w-24 h-24 rounded-full object-cover ring-4 ring-primary/20" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary/15 flex items-center justify-center ring-4 ring-primary/20">
                  <span className="text-3xl font-bold text-primary">
                    {contact.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Name */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">{contact.name}</h2>
              {contact.position && <p className="text-muted-foreground mt-1">{contact.position}</p>}
            </div>

            {/* Details */}
            <div className="space-y-3 mb-6">
              {contact.club_name && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30">
                  {logo ? (
                    <img src={logo} alt="" className="h-6 w-6 rounded object-contain" />
                  ) : (
                    <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <span className="font-medium flex-1">{contact.club_name}</span>
                  <Badge variant="outline" className="border-primary/40 text-primary">{rating}</Badge>
                </div>
              )}
              {contact.country?.trim() && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30">
                  <img src={getCountryFlagUrl(contact.country.trim())} alt={contact.country.trim()} className="w-6 h-4 object-cover rounded-sm shrink-0" />
                  <span>{contact.city ? `${contact.city}, ` : ''}{contact.country.trim()}</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              {contact.phone && (
                <button
                  onClick={() => openExternalUrl(`https://wa.me/${contact.phone!.replace(/[^0-9]/g, '')}`)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 transition-colors font-medium"
                >
                  <FaWhatsapp className="h-5 w-5" />WhatsApp
                </button>
              )}
              {contact.email && (
                <button
                  onClick={() => openMailto(contact.email)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary transition-colors font-medium"
                >
                  <Mail className="h-5 w-5" />Email
                </button>
              )}
            </div>

            {/* Pinned note */}
            {(contact as any).pinned_note && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Pin className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm text-foreground/85">{(contact as any).pinned_note}</p>
              </div>
            )}

            {/* Activity timeline */}
            <div className="pt-2 border-t border-border/30">
              <NetworkActivityTimeline contactId={contact.id} contactName={contact.name} />
            </div>

            {/* Share URL + actions */}
            <div className="mt-4 pt-4 border-t border-border/30 space-y-3">
              <div className="flex items-center gap-2 rounded-xl bg-muted/30 px-3 py-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-transparent text-xs text-muted-foreground outline-none"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success('Link copied'); }}
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setViewingContact(null); openEditDialog(contact); }}>
                  <Pencil className="h-4 w-4 mr-2" />Edit
                </Button>
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => handleShareContact(contact)}>
                  <Share2 className="h-4 w-4 mr-2" />Share
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="contacts" className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="relative overflow-hidden rounded-[2rem] border border-border/50 p-2 backdrop-blur-2xl" style={softPanelStyle}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_44%)] opacity-80" />
            <TabsList className="relative z-[1] grid min-w-[36rem] grid-cols-5 gap-2 bg-transparent p-0 sm:min-w-0">
              <TabsTrigger value="contacts" className="rounded-[1.25rem] border border-border/50 bg-background/30 px-4 py-3 text-sm font-medium data-[state=active]:border-primary/35 data-[state=active]:bg-primary/12 data-[state=active]:text-primary"><User className="mr-2 h-4 w-4" />Contacts</TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-[1.25rem] border border-border/50 bg-background/30 px-4 py-3 text-sm font-medium data-[state=active]:border-primary/35 data-[state=active]:bg-primary/12 data-[state=active]:text-primary"><BarChart3 className="mr-2 h-4 w-4" />Analytics</TabsTrigger>
              <TabsTrigger value="duplicates" className="rounded-[1.25rem] border border-border/50 bg-background/30 px-4 py-3 text-sm font-medium data-[state=active]:border-primary/35 data-[state=active]:bg-primary/12 data-[state=active]:text-primary"><AlertTriangle className="mr-2 h-4 w-4" />Duplicates</TabsTrigger>
              <TabsTrigger value="templates" className="rounded-[1.25rem] border border-border/50 bg-background/30 px-4 py-3 text-sm font-medium data-[state=active]:border-primary/35 data-[state=active]:bg-primary/12 data-[state=active]:text-primary"><FileText className="mr-2 h-4 w-4" />Templates</TabsTrigger>
              <TabsTrigger value="pathways" className="rounded-[1.25rem] border border-border/50 bg-background/30 px-4 py-3 text-sm font-medium data-[state=active]:border-primary/35 data-[state=active]:bg-primary/12 data-[state=active]:text-primary"><Link2 className="mr-2 h-4 w-4" />Pathways</TabsTrigger>
            </TabsList>
          </div>
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

        <TabsContent value="analytics" className="mt-6">
          <NetworkAnalytics contacts={contacts} />
        </TabsContent>

        <TabsContent value="duplicates" className="mt-6">
          <NetworkDuplicateDetector contacts={contacts} onRefresh={async () => { await fetchAllContacts(); fetchCountrySummary(); setLoadedCountryKeys(new Set()); setCountryContactsCache(new Map()); }} />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <NetworkTabPanel title="Templates" description="Quick-copy templates in the same glass layout as the rest of Network." icon={FileText}>
            <QuickMessageSection />
          </NetworkTabPanel>
        </TabsContent>

        <TabsContent value="pathways" className="mt-6">
          <NetworkTabPanel title="Pathways" description="Pathways now match the same visual system as the country and contact views." icon={Link2}>
            <MessagePathways />
          </NetworkTabPanel>
        </TabsContent>
      </Tabs>

      <ImportProgressIndicator />
      <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarFileChange} className="hidden" />

      {avatarCropSource && (
        <ImageCropDialog
          open={!!avatarCropSource}
          onOpenChange={(open) => {
            if (!open) closeAvatarCrop();
          }}
          imageSrc={avatarCropSource}
          onCropComplete={handleAvatarCropComplete}
          aspectRatio={1}
          title="Adjust profile photo"
        />
      )}

      {/* Contact preview popup */}
      <ContactPreviewDialog />

      {/* Import dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="w-[96vw] max-w-6xl max-h-[88vh] overflow-y-auto p-5 md:p-7">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Upload className="h-5 w-5 text-primary" />Import contacts from .vcf
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {parsedContacts.length === 0 ? (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div>
                  <Label className="mb-2 block">Paste .vcf content or open a .vcf file</Label>
                  <Textarea
                    value={importText}
                    onChange={(event) => setImportText(event.target.value)}
                    rows={14}
                    placeholder="BEGIN:VCARD&#10;VERSION:3.0&#10;FN:John Smith&#10;ORG:Arsenal&#10;TITLE:Scout&#10;EMAIL:john@example.com&#10;TEL:+441234567890&#10;END:VCARD"
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
                  {parsedContacts.map((contact: any, index: number) => (
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

      {/* Profile editor dialog */}
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
                  <Label>Style & Background</Label>
                  <Textarea value={profileEditData.playing_style || ''} onChange={(event) => setProfileEditData({ ...profileEditData, playing_style: event.target.value })} rows={4} />
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

      {/* Add/Edit contact dialog */}
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
