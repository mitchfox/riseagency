import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import { PageLoading, LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useNightMode } from "@/hooks/useNightMode";
import { useDayMode } from "@/hooks/useDayMode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Menu, ChevronRight, ChevronLeft, ExternalLink, Lightbulb, Star, HelpCircle, Plus, RefreshCw, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { StaffBreadcrumb } from "@/components/staff/StaffBreadcrumb";
import { KeyboardShortcutsDialog } from "@/components/staff/KeyboardShortcutsDialog";
import { StaffCommandPalette } from "@/components/staff/StaffCommandPalette";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
// Eager shell pieces (small, needed for first paint or always mounted)
import { StaffOverview } from "@/components/staff/StaffOverview";
import { FocusedTasksSection } from "@/components/staff/FocusedTasksSection";
import { StaffNotificationsDropdown } from "@/components/staff/StaffNotificationsDropdown";
import { PlayerPortalQuickOpenDialog } from "@/components/staff/PlayerPortalQuickOpenDialog";
import { PlayerBirthdayDialog } from "@/components/staff/PlayerBirthdayDialog";
import { MobileScrollButtons } from "@/components/staff/MobileScrollButtons";
import { useStaffNotifications } from "@/hooks/useStaffNotifications";

// Heavy section components — lazy loaded, only fetched when their tab is opened.
// This is critical for slow mobile connections (e.g. Anthony on Nigerian 4G).
const PlayerManagement = lazy(() => import("@/components/staff/PlayerManagement"));
const PlayerList = lazy(() => import("@/components/staff/PlayerList").then(m => ({ default: m.PlayerList })));
const CoachingDatabase = lazy(() => import("@/components/staff/CoachingDatabase").then(m => ({ default: m.CoachingDatabase })));
const AnalysisManagement = lazy(() => import("@/components/staff/AnalysisManagement").then(m => ({ default: m.AnalysisManagement })));
const CoachingDataSection = lazy(() => import("@/components/staff/CoachingDataSection").then(m => ({ default: m.CoachingDataSection })));
const FormSubmissionsManagement = lazy(() => import("@/components/staff/FormSubmissionsManagement").then(m => ({ default: m.FormSubmissionsManagement })));
const SiteVisitorsManagement = lazy(() => import("@/components/staff/SiteVisitorsManagement").then(m => ({ default: m.SiteVisitorsManagement })));
const InvoiceManagement = lazy(() => import("@/components/staff/InvoiceManagement").then(m => ({ default: m.InvoiceManagement })));
const UpdatesManagement = lazy(() => import("@/components/staff/UpdatesManagement").then(m => ({ default: m.UpdatesManagement })));
const StaffAccountabilityOverview = lazy(() => import("@/components/staff/StaffAccountabilityOverview").then(m => ({ default: m.StaffAccountabilityOverview })));
const TeamPerformance = lazy(() => import("@/components/staff/TeamPerformance").then(m => ({ default: m.TeamPerformance })));
const InteractionHistory = lazy(() => import("@/components/staff/InteractionHistory").then(m => ({ default: m.InteractionHistory })));
const StaffAvailabilityManagement = lazy(() => import("@/components/staff/StaffAvailabilityManagement").then(m => ({ default: m.StaffAvailabilityManagement })));
const StaffSchedulesManagement = lazy(() => import("@/components/staff/StaffSchedulesManagement").then(m => ({ default: m.StaffSchedulesManagement })));
const MarketingManagement = lazy(() => import("@/components/staff/MarketingManagement").then(m => ({ default: m.MarketingManagement })));
const ScheduleManager = lazy(() => import("@/components/staff/marketing/ScheduleManager").then(m => ({ default: m.ScheduleManager })));
const MarketingGalleryViewer = lazy(() => import("@/components/staff/MarketingGalleryViewer").then(m => ({ default: m.MarketingGalleryViewer })));
const ContentCreator = lazy(() => import("@/components/staff/marketing").then(m => ({ default: m.ContentCreator })));
const SalesDeck = lazy(() => import("@/components/staff/marketing").then(m => ({ default: m.SalesDeck })));
const RecruitmentManagement = lazy(() => import("@/components/staff/RecruitmentManagement").then(m => ({ default: m.RecruitmentManagement })));
const ScoutingCentreManagement = lazy(() => import("@/components/staff/ScoutingCentreManagement").then(m => ({ default: m.ScoutingCentreManagement })));
const HighlightMakersManagement = lazy(() => import("@/components/staff/HighlightMakersManagement").then(m => ({ default: m.HighlightMakersManagement })));
const PlayerDatabaseManagement = lazy(() => import("@/components/staff/PlayerDatabaseManagement").then(m => ({ default: m.PlayerDatabaseManagement })));
const StaffAccountManagement = lazy(() => import("@/components/staff/StaffAccountManagement").then(m => ({ default: m.StaffAccountManagement })));
const PlayerPasswordManagement = lazy(() => import("@/components/staff/PlayerPasswordManagement").then(m => ({ default: m.PlayerPasswordManagement })));
const ClubNetworkManagement = lazy(() => import("@/components/staff/ClubNetworkManagement"));
const ClubOutreachManager = lazy(() => import("@/components/staff/ClubOutreachManager"));
const MarketTablesStandalone = lazy(() => import("@/components/staff/outreach/MarketTablesTab"));
const LegalManagement = lazy(() => import("@/components/staff/LegalManagement"));
const PartnersManagement = lazy(() => import("@/components/staff/PartnersManagement").then(m => ({ default: m.PartnersManagement })));
const LanguagesManagement = lazy(() => import("@/components/staff/LanguagesManagement"));
const SiteTextManagement = lazy(() => import("@/components/staff/SiteTextManagement"));
const StaffPWAInstall = lazy(() => import("@/components/staff/StaffPWAInstall").then(m => ({ default: m.StaffPWAInstall })));
const StaffOfflineManager = lazy(() => import("@/components/staff/StaffOfflineManager").then(m => ({ default: m.StaffOfflineManager })));
const StaffPushNotifications = lazy(() => import("@/components/staff/StaffPushNotifications").then(m => ({ default: m.StaffPushNotifications })));
const TransferHub = lazy(() => import("@/components/staff/TransferHub").then(m => ({ default: m.TransferHub })));
const ExpensesManagement = lazy(() => import("@/components/staff/ExpensesManagement").then(m => ({ default: m.ExpensesManagement })));
const TaxRecordsManagement = lazy(() => import("@/components/staff/TaxRecordsManagement").then(m => ({ default: m.TaxRecordsManagement })));
const CorporationTaxSection = lazy(() => import("@/components/staff/CorporationTaxSection").then(m => ({ default: m.CorporationTaxSection })));
const BudgetsManagement = lazy(() => import("@/components/staff/BudgetsManagement").then(m => ({ default: m.BudgetsManagement })));
const FinancialReports = lazy(() => import("@/components/staff/FinancialReports").then(m => ({ default: m.FinancialReports })));
const PaymentsManagement = lazy(() => import("@/components/staff/PaymentsManagement"));
const AthleteCentre = lazy(() => import("@/components/staff/AthleteCentre").then(m => ({ default: m.AthleteCentre })));
const PublicContentManagement = lazy(() => import("@/components/staff/PublicContentManagement"));
const TacticsBoard = lazy(() => import("@/components/staff/coaching/TacticsBoard").then(m => ({ default: m.TacticsBoard })));
const Meetings = lazy(() => import("@/components/staff/coaching/Meetings").then(m => ({ default: m.Meetings })));
const NotificationSettingsManagement = lazy(() => import("@/components/staff/NotificationSettingsManagement").then(m => ({ default: m.NotificationSettingsManagement })));
const JobsManagement = lazy(() => import("@/components/staff/JobsManagement").then(m => ({ default: m.JobsManagement })));
const SocialShareManagement = lazy(() => import("@/components/staff/SocialShareManagement").then(m => ({ default: m.SocialShareManagement })));
const RequestsManagement = lazy(() => import("@/components/staff/RequestsManagement").then(m => ({ default: m.RequestsManagement })));
const StaffSMSNotifications = lazy(() => import("@/components/staff/StaffSMSNotifications").then(m => ({ default: m.StaffSMSNotifications })));
const VisionBoardSection = lazy(() => import("@/components/staff/VisionBoardSection").then(m => ({ default: m.VisionBoardSection })));
const DocsSection = lazy(() => import("@/components/staff/DocsSection").then(m => ({ default: m.DocsSection })));
const SheetsSection = lazy(() => import("@/components/staff/SheetsSection").then(m => ({ default: m.SheetsSection })));
const DesignProjects = lazy(() => import("@/components/staff/design/DesignProjects").then(m => ({ default: m.DesignProjects })));
const AnnotationProjects = lazy(() => import("@/components/staff/annotations/AnnotationProjects").then(m => ({ default: m.AnnotationProjects })));
const StreamsSection = lazy(() => import("@/components/staff/StreamsSection").then(m => ({ default: m.StreamsSection })));
const ActivityLog = lazy(() => import("@/components/staff/ActivityLog").then(m => ({ default: m.ActivityLog })));
const DatabaseExport = lazy(() => import("@/components/staff/DatabaseExport").then(m => ({ default: m.DatabaseExport })));
const VideoAnalysis = lazy(() => import("@/components/staff/coaching/VideoAnalysis").then(m => ({ default: m.VideoAnalysis })));
const StrengthPowerSpeedSection = lazy(() => import("@/components/staff/programming/StrengthPowerSpeedSection").then(m => ({ default: m.StrengthPowerSpeedSection })));
const TechnicalSection = lazy(() => import("@/components/staff/programming/TechnicalSection").then(m => ({ default: m.TechnicalSection })));
const NutritionSection = lazy(() => import("@/components/staff/programming/NutritionSection").then(m => ({ default: m.NutritionSection })));
const PsychologySection = lazy(() => import("@/components/staff/programming/PsychologySection").then(m => ({ default: m.PsychologySection })));
const ScriptsAndCaseStudies = lazy(() => import("@/components/staff/ScriptsAndCaseStudies"));
const RepresentationOffers = lazy(() => import("@/components/staff/RepresentationOffers").then(m => ({ default: m.RepresentationOffers })));
const TransferReports = lazy(() => import("@/components/staff/TransferReports").then(m => ({ default: m.TransferReports })));
const PortalManagement = lazy(() => import("@/components/staff/PortalManagement").then(m => ({ default: m.PortalManagement })));
const VideoCompressor = lazy(() => import("@/components/staff/VideoCompressor").then(m => ({ default: m.VideoCompressor })));
const MusicStudio = lazy(() => import("@/components/staff/MusicStudio").then(m => ({ default: m.MusicStudio })));
const HighlightCompiler = lazy(() => import("@/components/staff/HighlightCompiler").then(m => ({ default: m.HighlightCompiler })));
const DatasetBuilder = lazy(() => import("@/components/staff/DatasetBuilder").then(m => ({ default: m.DatasetBuilder })));
const UsageSection = lazy(() => import("@/components/staff/UsageSection").then(m => ({ default: m.UsageSection })));

import { supabase } from "@/integrations/supabase/client";
import { VersionManager } from "@/lib/versionManager";
import type { User } from "@supabase/supabase-js";
import { ExportProgressFloat } from "@/components/staff/ExportProgressFloat";
import { SectionGridPicker } from "@/components/staff/SectionGridPicker";
import { StaffMusicPlayer } from "@/components/staff/StaffMusicPlayer";
import { playSectionSwitch } from "@/lib/soundEffects";
import { Checkbox } from "@/components/ui/checkbox";
import { useTheme } from "next-themes";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import marbleBackground from "@/assets/smudged-marble-overlay.png";
import whiteMarbleBackground from "@/assets/white-marble-overlay.png";
import { Palette, Tv, Music } from "lucide-react";
import { UserRoundCheck } from "lucide-react";
import { Image as GalleryImageIcon } from "lucide-react";
import { Trophy } from "lucide-react";
import { 
  Calendar, 
  Users, 
  UserCog, 
  Target, 
  Dumbbell, 
  LineChart, 
  Megaphone, 
  Newspaper, 
  FileText, 
  Mail, 
  Eye, 
  FileCheck, 
  BellRing, 
  Network, 
  Scale,
  Shield,
  Lock,
  Download,
  HardDrive,
  Bell,
  ClipboardList,
  Settings,
  Languages,
  Film,
  Building2,
  Wallet,
  Receipt,
  Calculator,
  PiggyBank,
  TrendingUp,
  FileSpreadsheet,
  UserRound,
  MessageSquare,
  Briefcase,
  Share2,
  Handshake,
  Database,
  UtensilsCrossed,
  LayoutGrid,
  Monitor,
  BarChart3,
  Brain,
} from "lucide-react";

const STAFF_BASE_ROLES = ['admin', 'staff', 'marketeer'] as const;
const DEFAULT_STAFF_SECTION = 'cluboutreach';
const STALE_STAFF_DEFAULTS = new Set(['teamperformance', 'overview', 'dashboard']);

const normaliseOpeningStaffSection = (section: string | null | undefined) => {
  if (!section) return DEFAULT_STAFF_SECTION;
  return STALE_STAFF_DEFAULTS.has(section) ? DEFAULT_STAFF_SECTION : section;
};

const getPrimaryStaffRole = (roles: string[]) => {
  if (roles.includes('admin')) return 'admin';

  const customRole = roles.find((role) => !STAFF_BASE_ROLES.includes(role as (typeof STAFF_BASE_ROLES)[number]));
  if (customRole) return customRole;

  if (roles.includes('marketeer') && !roles.includes('staff')) return 'marketeer';
  if (roles.includes('staff')) return 'staff';

  return roles[0] ?? null;
};

const Staff = () => {
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMarketeer, setIsMarketeer] = useState(false);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'dashboard' | 'overview' | 'teamperformance' | 'focusedtasks' | 'visionboard' | 'docs' | 'sheets' | 'designstudio' | 'annotations' | 'streams' | 'schedule' | 'staffschedules' | 'staffaccounts' | 'passwords' | 'pwainstall' | 'offlinemanager' | 'pushnotifications' | 'notifications' | 'smsnotifications' | 'players' | 'playerlist' | 'recruitment' | 'playerdatabase' | 'scouts' | 'scoutingcentre' | 'publiccontent' | 'coaching' | 'coachingdata' | 'analysis' | 'marketingschedule' | 'marketing' | 'marketinggallery' | 'contentcreator' | 'marketingideas' | 'salesdeck' | 'submissions' | 'visitors' | 'invoices' | 'updates' | 'clubnetwork' | 'cluboutreach' | 'markettables' | 'casestudies' | 'representationoffers' | 'transferreports' | 'interactionhistory' | 'legal' | 'partners' | 'jobs' | 'socialshare' | 'requests' | 'sitetext' | 'languages' | 'transferhub' | 'payments' | 'expenses' | 'taxrecords' | 'corporationtax' | 'financialreports' | 'budgets' | 'athletecentre' | 'tacticsboard' | 'meetings' | 'videoanalysis' | 'activitylog' | 'dataexport' | 'strengthpower' | 'technical' | 'nutrition' | 'psychology' | 'portalmanagement' | 'videocompressor' | 'highlightcompiler' | 'highlightmakers' | 'datasetbuilder' | 'musicstudio' | 'usage' | '__grid_picker__' | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth < 768);
  const [pinnedSections, setPinnedSections] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('staff_pinned_sections') || '[]'); } catch { return []; }
  });
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [showGridPickerDialog, setShowGridPickerDialog] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const isNight = useNightMode();
  const isDay = useDayMode();
  useEffect(() => {
    const root = document.documentElement;
    if (isDay) root.classList.add('staff-daytime');
    else root.classList.remove('staff-daytime');
    return () => root.classList.remove('staff-daytime');
  }, [isDay]);
  const logoPressTimerRef = useRef<number | null>(null);
  const logoLongPressFiredRef = useRef(false);
  const initialStaffSectionResolvedRef = useRef(false);
  const [portalQuickOpen, setPortalQuickOpen] = useState(false);
  
  // Role permissions from database
  const { canView, canEdit, loading: permissionsLoading, getViewableSections } = useRolePermissions(currentRole);
  const permissionManagedRole = !!currentRole && !isAdmin && currentRole !== 'marketeer' && currentRole !== 'staff';
  const canManageSection = (sectionId: string) => {
    if (isAdmin) return true;
    if (!permissionManagedRole) return true;
    return canEdit(sectionId);
  };

  const applyRoleVisibility = (categoryList: any[]) => {
    if (!permissionManagedRole || permissionsLoading) {
      return categoryList.map((category) => ({ ...category, locked: false }));
    }

    const filtered = categoryList
      .map((category) => {
        const visibleSections = category.sections.filter((section: any) => section.isGroupLabel || canView(section.id));

        const cleanedSections = visibleSections.filter((section: any, index: number, sections: any[]) => {
          if (!section.isGroupLabel) return true;

          const nextVisibleSectionExists = sections.slice(index + 1).some((item: any) => !item.isGroupLabel);
          const previousIsGroupLabel = index > 0 && sections[index - 1]?.isGroupLabel;

          return nextVisibleSectionExists && !previousIsGroupLabel;
        });

        const unlockedSections = cleanedSections.filter((section: any) => !section.isGroupLabel);

        return {
          ...category,
          locked: unlockedSections.length === 0,
          sections: cleanedSections,
        };
      })
      .filter((category) => category.sections.some((section: any) => !section.isGroupLabel));

    // Flat list (no headers) when a role has 7 or fewer visible sections total
    const FLAT_SIDEBAR_THRESHOLD = 7;
    const totalVisible = filtered.reduce(
      (sum, c) => sum + c.sections.filter((s: any) => !s.isGroupLabel).length,
      0,
    );
    if (totalVisible > 0 && totalVisible <= FLAT_SIDEBAR_THRESHOLD) {
      const flatSections = filtered.flatMap((c) =>
        c.sections.filter((s: any) => !s.isGroupLabel),
      );
      return [
        {
          ...(filtered[0] || {}),
          id: 'flat',
          name: '',
          locked: false,
          sections: flatSections,
        },
      ];
    }

    return filtered;
  };
  
  // Check for app updates on load (force check on every staff portal load)
  useEffect(() => {
    if (!navigator.onLine) return;
    // Defer until after first paint so it doesn't compete with section loading on slow links
    const run = () => VersionManager.initialize(true);
    const w = window as any;
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(run, { timeout: 3000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(run, 1500);
    return () => window.clearTimeout(t);
  }, []);
  
  // Hydration guard for PWA cold start
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Force dark mode on staff portal
  useEffect(() => {
    setTheme('dark');
  }, [setTheme]);
  
  // Memoize notification triggers to prevent infinite re-renders
  const notificationTriggers = useMemo(() => {
    if (!isHydrated) return {};
    return {
      onVisitor: true,
      onFormSubmission: true,
      onClipUpload: true,
      onPlaylistChange: true,
    };
  }, [isHydrated]);
  
  // Enable staff notifications - only after hydration
  useStaffNotifications(notificationTriggers);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [sidebarSearchOpen, setSidebarSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{
    id: string;
    title: string;
    description?: string;
    section: string;
    sectionId: string;
    type: string;
  }>>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const createStaffSearchParams = (updates: Record<string, string | null>, options?: { preservePlayer?: boolean }) => {
    const nextParams = new URLSearchParams();
    new URLSearchParams(window.location.search).forEach((value, key) => {
      if (key.startsWith('__lovable') || (options?.preservePlayer && key === 'player')) nextParams.set(key, value);
    });
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') nextParams.delete(key);
      else nextParams.set(key, value);
    });
    return nextParams;
  };

  const setStaffSectionParams = (updates: Record<string, string | null>, options?: { replace?: boolean; preservePlayer?: boolean }) => {
    const nextParams = createStaffSearchParams(updates, options);
    setSearchParams(nextParams, options);
  };

  useEffect(() => {
    // Staff must open on Club Outreach every fresh load. Old local state and old
    // links kept forcing Team Performance back in before auth finished resolving.
    try {
      const rawSection = new URLSearchParams(window.location.search).get('section');
      const openingSection = normaliseOpeningStaffSection(rawSection);
      if (rawSection !== openingSection) {
        const nextParams = createStaffSearchParams({ section: openingSection });
        setSearchParams(nextParams, { replace: true });
      }

      const savedTabs = JSON.parse(localStorage.getItem('staff_open_tabs') || '[]') as string[];
      const cleanedTabs = savedTabs.filter((tab) => !STALE_STAFF_DEFAULTS.has(tab));
      if (cleanedTabs[0] !== DEFAULT_STAFF_SECTION) {
        localStorage.setItem('staff_open_tabs', JSON.stringify([DEFAULT_STAFF_SECTION, ...cleanedTabs.filter((tab) => tab !== DEFAULT_STAFF_SECTION)].slice(0, 12)));
        setTabsVersion(v => v + 1);
      }
      if (STALE_STAFF_DEFAULTS.has(localStorage.getItem('staff_active_tab') || '')) {
        localStorage.setItem('staff_active_tab', DEFAULT_STAFF_SECTION);
      }
      if (STALE_STAFF_DEFAULTS.has(localStorage.getItem('staff_active_tab_prev') || '')) {
        localStorage.setItem('staff_active_tab_prev', DEFAULT_STAFF_SECTION);
      }
    } catch {}
  // Run once only, before staff auth effects can restore stale tabs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore tabs and active section from localStorage / URL on mount
  useEffect(() => {
    if (!isStaff) return;
    const rawUrlSection = searchParams.get('section');
    // The user has repeatedly asked that Club Outreach is the opening section.
    // Stale links / localStorage values keep forcing teamperformance/overview,
    // so on initial mount we ignore those two and fall through to the default.
    const urlSection = initialStaffSectionResolvedRef.current && rawUrlSection && !STALE_STAFF_DEFAULTS.has(rawUrlSection)
      ? rawUrlSection
      : null;
    const isTrustedNetworkRole = !!currentRole && /trusted[_\s-]?network/i.test(currentRole);

    // For permission-managed roles, wait for permissions to load before determining initial section
    // This prevents the overview flash for roles that can't view overview
    if (permissionManagedRole && permissionsLoading) return;

    // Determine the default section based on role permissions
    let defaultSection = DEFAULT_STAFF_SECTION;
    if (permissionManagedRole) {
      const viewable = getViewableSections();
      const firstViewable = viewable.find(s => s !== 'overview' && s !== 'teamperformance' && s !== 'dashboard' && s !== 'header_search' && s !== 'header_notifications' && s !== 'header_music' && s !== 'pwainstall')
        || viewable.find(s => s !== 'header_search' && s !== 'header_notifications' && s !== 'header_music' && s !== 'pwainstall');
      if (firstViewable) defaultSection = firstViewable;
    }
    
    // Restore saved tabs if none currently open
    try {
      const savedTabs = JSON.parse(localStorage.getItem('staff_open_tabs') || '[]') as string[];
      // For permission-managed roles, strip any saved tabs the role can't actually view
      // (prevents stats_updater from landing on my-tasks / having a sidebar full of forbidden tabs)
      const cleanedTabs = permissionManagedRole
        ? savedTabs.filter(t => canView(t))
        : savedTabs;
      if (cleanedTabs.length !== savedTabs.length) {
        localStorage.setItem('staff_open_tabs', JSON.stringify(cleanedTabs));
        setTabsVersion(v => v + 1);
      }
      if (cleanedTabs.length === 0) {
        const initial = urlSection || defaultSection;
        localStorage.setItem('staff_open_tabs', JSON.stringify([initial]));
        setTabsVersion(v => v + 1);
      }
    } catch {}

    // Determine which section to show.
    // Always default to cluboutreach on initial load when no URL section is given,
    // regardless of which tab was last active in the previous session.
    const section = urlSection && (!permissionManagedRole || canView(urlSection))
      ? urlSection
      : defaultSection;
    // Validate that the role can actually view this section
    const finalSection = (permissionManagedRole && !canView(section)) ? defaultSection : section;
    initialStaffSectionResolvedRef.current = true;
    setExpandedSection(finalSection as any);
    setStaffSectionParams({ section: finalSection }, { replace: true });
    try {
      localStorage.setItem('staff_active_tab', finalSection);
      const savedTabs = JSON.parse(localStorage.getItem('staff_open_tabs') || '[]') as string[];
      const cleanedTabs = savedTabs.filter((tab) => !STALE_STAFF_DEFAULTS.has(tab) && tab !== finalSection);
      localStorage.setItem('staff_open_tabs', JSON.stringify([finalSection, ...cleanedTabs].slice(0, 12)));
      setTabsVersion(v => v + 1);
    } catch {}

    // Expand parent category
    const cats = buildCategories();
    const parentCat = cats.find(c => c.sections.some(s => s.id === finalSection));
    if (parentCat) setExpandedCategory(parentCat.id);
  }, [isStaff, permissionManagedRole, permissionsLoading, currentRole]);

  // Keep URL in sync with section changes from searchParams
  useEffect(() => {
    const rawSection = searchParams.get('section');
    // On cold load, ignore stale Team Performance/My Tasks URLs until the
    // opening-section effect above has replaced them with Club Outreach. If the
    // user later clicks Team Performance directly, expandedSection already
    // matches it, so the click still works.
    if (rawSection && STALE_STAFF_DEFAULTS.has(rawSection) && expandedSection !== rawSection) {
      return;
    }
    const section = rawSection;
    if (section && isStaff && section !== expandedSection) {
      setExpandedSection(section as any);
      const cats = buildCategories();
      const parentCat = cats.find(c => c.sections.some(s => s.id === section));
      if (parentCat) setExpandedCategory(parentCat.id);
    }
  }, [searchParams]);

  // Keyboard shortcut for search
  // Persist pinned sections
  useEffect(() => {
    localStorage.setItem('staff_pinned_sections', JSON.stringify(pinnedSections));
  }, [pinnedSections]);

  const togglePin = (sectionId: string) => {
    setPinnedSections(prev => 
      prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]
    );
  };

  // Extended keyboard shortcuts
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Suppress staff hotkeys when video analysis, annotation editor, or performance report editing is active
      const section = searchParams.get('section');
      if (section === 'videoanalysis' || section === 'annotations' || section === 'coachingdata') return;

      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
        return;
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }
      if (e.key === "Escape") {
        // Don't go to overview — just close any open dialogs/modals
        return;
      }
      // Number keys 1-9 to jump to categories
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) {
        const cats = buildCategories();
        const target = cats[num - 1];
        if (target) {
          setExpandedCategory(target.id);
          const realSections = target.sections.filter(s => !(s as any).isGroupLabel);
          if (realSections.length === 1) {
            handleSectionToggle(realSections[0].id as any);
          }
        }
        return;
      }
      // Letter shortcuts for quick section access
      const sectionShortcuts: Record<string, string> = {
        'a': 'analysis',
        'r': 'coachingdata',
        'p': 'players',
        'd': 'playerdatabase',
        'm': 'contentcreator',
        't': 'tacticsboard',
        'c': 'meetings',
      };
      const lowerKey = e.key.toLowerCase();
      if (sectionShortcuts[lowerKey] && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        handleSectionToggle(sectionShortcuts[lowerKey]);
        return;
      }
      // Arrow keys to navigate sections within expanded category
      if ((e.key === "ArrowUp" || e.key === "ArrowDown") && expandedCategory) {
        e.preventDefault();
        const cat = buildCategories().find(c => c.id === expandedCategory);
        if (!cat) return;
        const realSections = cat.sections.filter(s => !(s as any).isGroupLabel);
        const currentIdx = realSections.findIndex(s => s.id === expandedSection);
        const nextIdx = e.key === "ArrowDown" 
          ? Math.min(currentIdx + 1, realSections.length - 1)
          : Math.max(currentIdx - 1, 0);
        handleSectionToggle(realSections[nextIdx].id as any);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [expandedCategory, expandedSection]);

  const handleSectionToggle = (section: string, replaceCurrentTab = false) => {
    // Always navigate to the section - never toggle off by clicking the same one
    playSectionSwitch();
    setExpandedSection(section as any);
    setStaffSectionParams({ section });
    // Persist active tab for session restoration
    localStorage.setItem('staff_active_tab', section);
    // Update tabs - use functional update pattern to avoid stale reads
    try {
      const tabs = JSON.parse(localStorage.getItem('staff_open_tabs') || '[]') as string[];
      let updated = [...tabs];
      
      if (replaceCurrentTab) {
        // Replace the previously active tab with the new section
        const prevActive = localStorage.getItem('staff_active_tab_prev');
        const activeIdx = prevActive ? updated.indexOf(prevActive) : -1;
        if (activeIdx !== -1 && !updated.includes(section)) {
          updated[activeIdx] = section;
        }
      }
      
      // Always ensure the section exists in tabs (add if missing)
      if (!updated.includes(section)) {
        updated.push(section);
        updated = updated.slice(-12);
      }
      
      localStorage.setItem('staff_open_tabs', JSON.stringify(updated));
      setTabsVersion(v => v + 1);
    } catch {}
    // Track previous active tab for replace operations
    localStorage.setItem('staff_active_tab_prev', section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addSectionAsTab = (section: string) => {
    try {
      const tabs = JSON.parse(localStorage.getItem('staff_open_tabs') || '[]') as string[];
      // Allow duplicate section tabs
      const updated = [...tabs, section].slice(-12);
      localStorage.setItem('staff_open_tabs', JSON.stringify(updated));
      setTabsVersion(v => v + 1);
    } catch {}
    handleSectionToggle(section);
  };

  const removeTab = (tabId: string) => {
    try {
      const tabs = JSON.parse(localStorage.getItem('staff_open_tabs') || '[]') as string[];
      const updated = tabs.filter(t => t !== tabId);
      localStorage.setItem('staff_open_tabs', JSON.stringify(updated));
      if (expandedSection === tabId) {
        if (updated.length > 0) {
          handleSectionToggle(updated[updated.length - 1]);
        } else {
          handleSectionToggle(DEFAULT_STAFF_SECTION);
        }
      }
      setTabsVersion(v => v + 1);
    } catch {}
  };

  const [tabOverflowOpen, setTabOverflowOpen] = useState(false);
  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const [tabsVersion, setTabsVersion] = useState(0);
  const dragStartXRef = useRef<number>(0);
  const isDragConfirmedRef = useRef(false);

  // Load saved email and remember me preference on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("staff_saved_email");
    const savedRememberMe = localStorage.getItem("staff_remember_me");
    if (savedEmail) setEmail(savedEmail);
    if (savedRememberMe === "true") setRememberMe(true);
  }, []);

  useEffect(() => {
    // Check for existing Supabase Auth session
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Verify the user still has staff role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id);

        if (!roleError && roleData && roleData.length > 0) {
          const resolvedRoles = roleData.map((row) => row.role);
          const hasAdmin = resolvedRoles.includes('admin');
          const primaryRole = getPrimaryStaffRole(resolvedRoles);
          setIsStaff(true); // Any role grants staff portal access
          setIsAdmin(hasAdmin);
          setIsMarketeer(primaryRole === 'marketeer');
          setCurrentRole(primaryRole);
          setUser(session.user);
          
          // Store for edge function auth
          localStorage.setItem("staff_email", session.user.email || '');
          localStorage.setItem("staff_user_id", session.user.id);
          sessionStorage.setItem("staff_email", session.user.email || '');
          sessionStorage.setItem("staff_user_id", session.user.id);
        } else {
          // No staff role, sign out
          await supabase.auth.signOut();
        }
      }
      setLoading(false);
    };

    checkExistingSession();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsStaff(false);
        setIsAdmin(false);
        setIsMarketeer(false);
        localStorage.removeItem("staff_email");
        localStorage.removeItem("staff_user_id");
        sessionStorage.removeItem("staff_email");
        sessionStorage.removeItem("staff_user_id");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkStaffRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error checking staff role:', error);
        setIsStaff(false);
        setIsAdmin(false);
        setIsMarketeer(false);
      } else if (data && data.length > 0) {
        const resolvedRoles = data.map((row) => row.role);
        const hasAdmin = resolvedRoles.includes('admin');
        const primaryRole = getPrimaryStaffRole(resolvedRoles);
        setIsStaff(true);
        setIsAdmin(hasAdmin);
        setIsMarketeer(primaryRole === 'marketeer');
        setCurrentRole(primaryRole);
      } else {
        setIsStaff(false);
        setIsAdmin(false);
        setIsMarketeer(false);
      }
    } catch (err) {
      console.error('Error:', err);
      setIsStaff(false);
      setIsAdmin(false);
      setIsMarketeer(false);
    } finally {
      setLoading(false);
    }
  };

  const performGlobalSearch = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    const results: Array<{
      id: string;
      title: string;
      description?: string;
      section: string;
      sectionId: string;
      type: string;
    }> = [];

    try {
      const searchTerm = `%${query}%`;

      // Run all queries in parallel with Promise.all
      const [
        playersRes,
        updatesRes,
        blogsRes,
        analysesRes,
        prospectsRes,
        scoutingRes,
        invoicesRes,
        drillsRes,
        sessionsRes,
        exercisesRes,
        campaignsRes,
        contactsRes,
        legalDocsRes,
        expensesRes,
        perfReportsRes,
      ] = await Promise.all([
        supabase.from('players').select('id, name, position, club').ilike('name', searchTerm).limit(10),
        supabase.from('updates').select('id, title, content, date').or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`).limit(5),
        supabase.from('blog_posts').select('id, title, excerpt').or(`title.ilike.${searchTerm},excerpt.ilike.${searchTerm}`).limit(5),
        supabase.from('analyses').select('id, title, analysis_type').ilike('title', searchTerm).limit(5),
        supabase.from('prospects').select('id, name, position, current_club').ilike('name', searchTerm).limit(5),
        supabase.from('scouting_reports').select('id, player_name, position, current_club, status').ilike('player_name', searchTerm).limit(5),
        supabase.from('invoices').select('id, invoice_number, description, amount').or(`invoice_number.ilike.${searchTerm},description.ilike.${searchTerm}`).limit(5),
        supabase.from('coaching_drills').select('id, title, category').ilike('title', searchTerm).limit(5),
        supabase.from('coaching_sessions').select('id, title, category').ilike('title', searchTerm).limit(5),
        supabase.from('coaching_exercises').select('id, title, category').ilike('title', searchTerm).limit(5),
        supabase.from('marketing_campaigns').select('id, title, status').ilike('title', searchTerm).limit(5),
        supabase.from('club_network_contacts').select('id, name, club_name, position').or(`name.ilike.${searchTerm},club_name.ilike.${searchTerm}`).limit(5),
        supabase.from('legal_documents').select('id, title, category').ilike('title', searchTerm).limit(5),
        supabase.from('expenses').select('id, description, category, amount').ilike('description', searchTerm).limit(5),
        supabase.from('player_analysis').select('id, opponent, analysis_date, players!player_analysis_player_id_fkey(name)').ilike('opponent', searchTerm).limit(5),
      ]);

      playersRes.data?.forEach(player => {
        results.push({ id: player.id, title: player.name, description: `${player.position}${player.club ? ` at ${player.club}` : ''}`, section: 'Player Management', sectionId: 'players', type: 'player' });
      });
      updatesRes.data?.forEach(update => {
        results.push({ id: update.id, title: update.title, description: update.content?.substring(0, 80) + '...', section: 'Player Updates', sectionId: 'updates', type: 'update' });
      });
      blogsRes.data?.forEach(blog => {
        results.push({ id: blog.id, title: blog.title, description: blog.excerpt?.substring(0, 80), section: 'News Articles', sectionId: 'blog', type: 'blog' });
      });
      analysesRes.data?.forEach(analysis => {
        results.push({ id: analysis.id, title: analysis.title || 'Untitled Analysis', description: analysis.analysis_type, section: 'Analysis', sectionId: 'analysis', type: 'analysis' });
      });
      prospectsRes.data?.forEach(prospect => {
        results.push({ id: prospect.id, title: prospect.name, description: `${prospect.position || 'Unknown'}${prospect.current_club ? ` at ${prospect.current_club}` : ''}`, section: 'Recruitment', sectionId: 'recruitment', type: 'prospect' });
      });
      scoutingRes.data?.forEach(report => {
        results.push({ id: report.id, title: report.player_name, description: `${report.position || 'Unknown'}${report.current_club ? ` at ${report.current_club}` : ''} - ${report.status}`, section: 'Scouting Centre', sectionId: 'scoutingcentre', type: 'scouting_report' });
      });
      invoicesRes.data?.forEach(invoice => {
        results.push({ id: invoice.id, title: invoice.invoice_number, description: `${invoice.description || ''} - €${invoice.amount}`, section: 'Invoices', sectionId: 'invoices', type: 'invoice' });
      });
      drillsRes.data?.forEach(drill => {
        results.push({ id: drill.id, title: drill.title, description: drill.category || 'Drill', section: 'Coaching Database', sectionId: 'coaching', type: 'drill' });
      });
      sessionsRes.data?.forEach(session => {
        results.push({ id: session.id, title: session.title, description: session.category || 'Session', section: 'Coaching Database', sectionId: 'coaching', type: 'coaching_session' });
      });
      exercisesRes.data?.forEach(exercise => {
        results.push({ id: exercise.id, title: exercise.title, description: exercise.category || 'Exercise', section: 'Coaching Database', sectionId: 'coaching', type: 'coaching_exercise' });
      });
      campaignsRes.data?.forEach(campaign => {
        results.push({ id: campaign.id, title: campaign.title, description: campaign.status, section: 'Marketing', sectionId: 'marketing', type: 'campaign' });
      });
      contactsRes.data?.forEach(contact => {
        results.push({ id: contact.id, title: contact.name, description: `${contact.position || ''}${contact.club_name ? ` at ${contact.club_name}` : ''}`, section: 'Network', sectionId: 'clubnetwork', type: 'contact' });
      });
      legalDocsRes.data?.forEach(doc => {
        results.push({ id: doc.id, title: doc.title, description: doc.category, section: 'Legal', sectionId: 'legal', type: 'legal_doc' });
      });
      expensesRes.data?.forEach(expense => {
        results.push({ id: expense.id, title: expense.description, description: `${expense.category} - £${expense.amount}`, section: 'Expenses', sectionId: 'expenses', type: 'expense' });
      });
      perfReportsRes.data?.forEach((report: any) => {
        results.push({ id: report.id, title: `vs ${report.opponent || 'Unknown'} - ${report.players?.name || ''}`, description: report.analysis_date, section: 'Data', sectionId: 'coachingdata', type: 'performance_report' });
      });

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use Supabase Auth with email and password
      const idRaw = email.trim().toLowerCase();
      const emailForAuth = idRaw.includes("@") ? idRaw : `${idRaw}@rise.local`;
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailForAuth,
        password,
      });

      if (authError) {
        console.error('Auth error:', authError);
        toast.error(authError.message || 'Invalid email or password');
        setLoading(false);
        return;
      }

      if (!authData.user) {
        toast.error('Login failed. Please try again.');
        setLoading(false);
        return;
      }

      // Check if user has staff, admin, or marketeer role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id);

      if (roleError || !roleData || roleData.length === 0) {
        await supabase.auth.signOut();
        toast.error('You do not have staff permissions to access this page.');
        setLoading(false);
        return;
      }

      // Store login state
      if (rememberMe) {
        localStorage.setItem("staff_saved_email", email);
        localStorage.setItem("staff_remember_me", "true");
      } else {
        localStorage.removeItem("staff_saved_email");
        localStorage.removeItem("staff_remember_me");
      }
      
      // Store staff session info for edge functions
      localStorage.setItem("staff_email", email);
      localStorage.setItem("staff_user_id", authData.user.id);
      sessionStorage.setItem("staff_email", email);
      sessionStorage.setItem("staff_user_id", authData.user.id);
      
      // Set user state
      const resolvedRoles = roleData.map((row) => row.role);
      const hasAdmin = resolvedRoles.includes('admin');
      const primaryRole = getPrimaryStaffRole(resolvedRoles);
      setIsStaff(true);
      setIsAdmin(hasAdmin);
      setIsMarketeer(primaryRole === 'marketeer');
      setCurrentRole(primaryRole);
      setUser(authData.user);
      
      toast.success("Login successful");
    } catch (err) {
      console.error('Login error:', err);
      toast.error("An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("staff_email");
    localStorage.removeItem("staff_user_id");
    sessionStorage.removeItem("staff_email");
    sessionStorage.removeItem("staff_user_id");
    setUser(null);
    setIsStaff(false);
    setIsAdmin(false);
    setIsMarketeer(false);
    setEmail("");
    setPassword("");
    toast.success("Logged out");
  };

  // Build categories based on role
  const buildCategories = () => {
    // Marketeer-only sections (marketeer without admin role)
    if (isMarketeer && !isAdmin) {
      return applyRoleVisibility([
        {
          id: 'dashboard',
          title: 'Dashboard',
          icon: Calendar,
        sections: [
            { id: 'teamperformance', title: 'Team Performance', icon: Trophy },
            { id: 'overview', title: 'My Tasks', icon: Users },
            { id: 'dashboard', title: 'Dashboard', icon: Calendar },
            { id: 'focusedtasks', title: 'Focused Tasks', icon: ClipboardList },
            { id: 'visionboard', title: 'Vision Board', icon: Target },
            { id: 'docs', title: 'Docs', icon: FileText },
            { id: 'sheets', title: 'Sheets', icon: FileSpreadsheet },
          ],
          locked: false
        },
        {
          id: 'management',
          title: 'Management',
          icon: UserCog,
          locked: false,
          sections: [
            { id: 'players', title: 'Player Management', icon: UserCog },
          ]
        },
        {
          id: 'network',
          title: 'Network & Recruitment',
          icon: Network,
          locked: false,
          sections: [
{ id: 'clubnetwork', title: 'Network', icon: Network },
            { id: 'playerlist', title: 'Player List', icon: Users },
            { id: 'representationoffers', title: 'Player Outreach', icon: UserRoundCheck },
            { id: 'casestudies', title: 'Scripts', icon: MessageSquare },
            { id: 'transferreports', title: 'Transfer Reports', icon: FileText },
            { id: 'recruitment', title: 'Recruitment', icon: Target },
            { id: 'cluboutreach', title: 'Club Outreach', icon: Mail },
            { id: 'markettables', title: 'Market Tables', icon: Mail },
            { id: 'playerdatabase', title: 'Player Database', icon: Users },
            { id: 'scoutingcentre', title: 'Scouting Centre', icon: ClipboardList },
            { id: 'submissions', title: 'Form Submissions', icon: Mail },
          ]
        },
        {
          id: 'marketing',
          title: 'Marketing & Brand',
          icon: Megaphone,
          locked: false,
          sections: [
            { id: '_group_schedule', title: 'Schedule', isGroupLabel: true },
            { id: 'marketingschedule', title: 'Schedule', icon: Calendar },
            { id: 'marketing', title: 'Marketing', icon: Megaphone },
            { id: 'contentcreator', title: 'Content Creator', icon: Film },
            { id: 'publiccontent', title: 'Public Content', icon: Megaphone },
            { id: 'visitors', title: 'Site Visitors', icon: Eye },
          ]
        },
        {
          id: 'admin',
          title: 'Admin & Legal',
          icon: Scale,
          locked: false,
          sections: [
            { id: 'legal', title: 'Legal', icon: Scale },
            { id: 'pwainstall', title: 'PWA Install', icon: Download },
            { id: 'offlinemanager', title: 'Offline Content', icon: HardDrive },
          ]
        }
      ]);
    }

    // Full staff/admin sections
    return applyRoleVisibility([
      {
        id: 'dashboard',
        title: 'Dashboard',
        icon: Calendar,
        sections: [
          { id: 'teamperformance', title: 'Team Performance', icon: Trophy },
          { id: 'overview', title: 'My Tasks', icon: Users },
          { id: 'dashboard', title: 'Dashboard', icon: Calendar },
          { id: '_group_schedule', title: 'Schedule', isGroupLabel: true },
          { id: 'schedule', title: 'Schedule', icon: Calendar },
          { id: 'meetings', title: 'Meetings', icon: Users },
          { id: 'staffschedules', title: 'Staff Schedules', icon: Users },
          { id: '_group_tasks', title: 'Tasks', isGroupLabel: true },
          { id: 'focusedtasks', title: 'Focused Tasks', icon: ClipboardList },
          { id: 'visionboard', title: 'Vision Board', icon: Target },
        ],
        locked: false
      },
      {
        id: 'apps',
        title: 'Apps',
        icon: LayoutGrid,
        locked: false,
        sections: [
          { id: 'docs', title: 'Docs', icon: FileText },
          { id: 'sheets', title: 'Sheets', icon: FileSpreadsheet },
          { id: 'designstudio', title: 'Design Studio', icon: Palette },
          { id: 'annotations', title: 'Annotations', icon: Film },
          { id: 'videoanalysis', title: 'Video Analysis', icon: Film },
          { id: 'streams', title: 'Streams', icon: Tv },
          { id: 'videocompressor', title: 'Video Compressor', icon: Film },
          { id: 'highlightcompiler', title: 'Highlight Compiler', icon: Film },
          { id: 'highlightmakers', title: 'Highlights Makers', icon: Film },
          { id: 'musicstudio', title: 'Music Studio', icon: Music },
        ],
      },
      {
        id: 'coaching',
        title: 'Coaching',
        icon: Dumbbell,
        locked: false,
        sections: [
          { id: 'coaching', title: 'Coaching Database', icon: Dumbbell },
          { id: '_group_analysis', title: 'Analysis', isGroupLabel: true },
          { id: 'analysis', title: 'Analysis', icon: LineChart },
          { id: 'coachingdata', title: 'Data', icon: Database },
          { id: '_group_planning', title: 'Planning', isGroupLabel: true },
          { id: 'athletecentre', title: 'Athlete Centre', icon: UserRound },
          { id: 'tacticsboard', title: 'Tactics Board', icon: Target },
          { id: '_group_programming', title: 'Programming', isGroupLabel: true },
          { id: 'strengthpower', title: 'Strength, Power & Speed', icon: Dumbbell },
          { id: 'technical', title: 'Technical', icon: Target },
          { id: 'nutrition', title: 'Nutrition', icon: UtensilsCrossed },
          { id: 'psychology', title: 'Psychology', icon: Brain },
        ]
      },
      {
        id: 'management',
        title: 'Management',
        icon: UserCog,
        locked: false,
        sections: [
          { id: 'players', title: 'Players', icon: UserCog },
          { id: '_group_transfers', title: 'Transfers', isGroupLabel: true },
          { id: 'transferhub', title: 'Transfer Hub', icon: Building2 },
          { id: 'updates', title: 'Player Updates', icon: BellRing },
          { id: 'requests', title: 'Requests', icon: Target },
          { id: '_group_portal', title: 'Portal', isGroupLabel: true },
          { id: 'portalmanagement', title: 'Portal', icon: Monitor },
        ]
      },
      {
        id: 'network',
        title: 'Network & Recruitment',
        icon: Network,
        locked: false,
        sections: [
          { id: '_group_network', title: 'Network', isGroupLabel: true },
          { id: 'clubnetwork', title: 'Network', icon: Network },
          { id: 'playerlist', title: 'Player List', icon: Users },
          { id: 'interactionhistory', title: 'Interaction History', icon: MessageSquare },
           { id: 'representationoffers', title: 'Representation Offers', icon: UserRoundCheck },
           { id: 'casestudies', title: 'Scripts', icon: MessageSquare },
           { id: 'transferreports', title: 'Transfer Reports', icon: FileText },
          { id: '_group_scouting', title: 'Scouting', isGroupLabel: true },
          { id: 'recruitment', title: 'Recruitment', icon: Target },
          { id: 'cluboutreach', title: 'Club Outreach', icon: Mail },
          { id: 'markettables', title: 'Market Tables', icon: Mail },
          { id: 'playerdatabase', title: 'Player Database', icon: Users },
          { id: 'scoutingcentre', title: 'Scouting Centre', icon: ClipboardList },
          { id: 'submissions', title: 'Form Submissions', icon: Mail },
        ]
      },
      {
        id: 'marketing',
        title: 'Marketing & Brand',
        icon: Megaphone,
        locked: false,
        sections: [
          { id: '_group_content', title: 'Content', isGroupLabel: true },
            { id: 'marketingschedule', title: 'Schedule', icon: Calendar },
          { id: 'marketing', title: 'Marketing', icon: Megaphone },
          { id: 'marketinggallery', title: 'Marketing Gallery', icon: GalleryImageIcon },
          { id: 'contentcreator', title: 'Content Creator', icon: Film },
          { id: 'publiccontent', title: 'Public Content', icon: Megaphone },
          { id: '_group_commercial', title: 'Commercial', isGroupLabel: true },
          { id: 'salesdeck', title: 'Sales Deck', icon: Briefcase },
          { id: 'visitors', title: 'Site Visitors', icon: Eye },
        ]
      },
      {
        id: 'financial',
        title: 'Financial',
        icon: Wallet,
        locked: false,
        sections: [
          { id: '_group_billing', title: 'Billing', isGroupLabel: true },
          { id: 'invoices', title: 'Invoices', icon: FileCheck },
          { id: 'payments', title: 'Payments In/Out', icon: Receipt },
          { id: '_group_tracking', title: 'Tracking', isGroupLabel: true },
          { id: 'expenses', title: 'Expenses', icon: Calculator },
          { id: 'taxrecords', title: 'Tax Records', icon: FileSpreadsheet },
          { id: 'corporationtax', title: 'Corporation Tax', icon: Building2 },
          { id: '_group_overview_fin', title: 'Overview', isGroupLabel: true },
          { id: 'budgets', title: 'Budgets', icon: PiggyBank },
          { id: 'financialreports', title: 'Reports', icon: TrendingUp },
        ]
      },
      {
        id: 'legal',
        title: 'Legal',
        icon: Scale,
        locked: false,
        sections: [
          { id: 'legal', title: 'Legal', icon: Scale },
          { id: 'partners', title: 'Partners', icon: Handshake },
          { id: 'jobs', title: 'Jobs', icon: Briefcase },
          { id: 'socialshare', title: 'Social Share', icon: Share2 },
        ]
      },
      {
        id: 'admin',
        title: 'Admin',
        icon: Shield,
        locked: false,
        sections: [
          { id: '_group_site', title: 'Site', isGroupLabel: true },
          { id: 'sitetext', title: 'Site Text', icon: FileText },
          { id: 'languages', title: 'Languages', icon: Languages },
          ...(isAdmin ? [
            { id: '_group_comms', title: 'Communications', isGroupLabel: true },
            { id: 'notifications', title: 'Notifications', icon: BellRing },
            { id: 'smsnotifications', title: 'SMS Notifications', icon: MessageSquare },
          ] : []),
          ...(isAdmin ? [
            { id: '_group_access', title: 'Access', isGroupLabel: true },
            { id: 'passwords', title: 'Player Passwords', icon: Lock },
            { id: 'staffaccounts', title: 'Staff Accounts', icon: Shield },
            { id: '_group_data', title: 'Data', isGroupLabel: true },
            { id: 'activitylog', title: 'Activity Log', icon: ClipboardList },
            { id: 'dataexport', title: 'Data Export', icon: Download },
            { id: 'datasetbuilder', title: 'Dataset Builder', icon: Film },
            { id: 'usage', title: 'Usage', icon: BarChart3 },
          ] : []),
          { id: '_group_system', title: 'System', isGroupLabel: true },
          { id: 'pwainstall', title: 'PWA Install', icon: Download },
          { id: 'offlinemanager', title: 'Offline Content', icon: HardDrive },
          { id: 'pushnotifications', title: 'Push Notifications', icon: Bell },
        ]
      }
    ]);
  };

  const categories = buildCategories();
  const visibleSectionIds = categories.flatMap((category) =>
    category.sections.filter((section: any) => !(section as any).isGroupLabel).map((section: any) => section.id)
  );

  // Escape hatch for stuck PWA caches (especially mobile Safari on slow networks).
  // Unregisters service workers, clears caches and reloads.
  const resetAppCache = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.allSettled(regs.map(r => r.unregister()));
      }
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys();
        await Promise.allSettled(keys.map(k => caches.delete(k)));
      }
    } catch (e) {
      console.warn('resetAppCache failed', e);
    } finally {
      window.location.reload();
    }
  };

  useEffect(() => {
    if (!isStaff || permissionsLoading || visibleSectionIds.length === 0) return;
    if (expandedSection && visibleSectionIds.includes(expandedSection)) return;

    const rawUrlSection = searchParams.get('section');
    const validUrlSection = rawUrlSection && !STALE_STAFF_DEFAULTS.has(rawUrlSection) && visibleSectionIds.includes(rawUrlSection)
      ? rawUrlSection
      : null;
    const fallbackSection = validUrlSection
      ?? (visibleSectionIds.includes(DEFAULT_STAFF_SECTION)
        ? DEFAULT_STAFF_SECTION
        : visibleSectionIds.find((id) => !STALE_STAFF_DEFAULTS.has(id)) ?? visibleSectionIds[0]);
    const fallbackCategory = categories.find((category) =>
      category.sections.some((section: any) => section.id === fallbackSection)
    )?.id || null;

    setExpandedSection(fallbackSection as any);
    setExpandedCategory(fallbackCategory);
    setStaffSectionParams({ section: fallbackSection }, { replace: true });
    localStorage.setItem('staff_active_tab', fallbackSection);
  }, [categories, expandedSection, isStaff, permissionsLoading, setSearchParams, visibleSectionIds]);

  if (loading) {
    return <PageLoading />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center overflow-x-hidden">
        <div className="max-w-md w-full mx-4">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">
                Staff Login
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4" autoComplete="on">
                <div className="space-y-2">
                  <Label htmlFor="email">Email or username</Label>
                  <Input id="email" name="email" type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff@example.com or username" required autoFocus autoComplete="username" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required autoComplete="current-password" />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember-me-staff" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked as boolean)} />
                  <Label htmlFor="remember-me-staff" className="text-sm cursor-pointer">Remember me</Label>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "Logging in..." : "Access Dashboard"}</Button>
              </form>
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={resetAppCache}
                  className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  Having trouble loading? Reset app cache
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center overflow-x-hidden">
        <div className="max-w-md w-full mx-4">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center text-destructive">Access Denied</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-muted-foreground">You do not have staff permissions to access this page.</p>
              <Button onClick={handleLogout} className="w-full" variant="outline">Logout</Button>
              <Button onClick={resetAppCache} className="w-full" variant="ghost">Reset app cache</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isStaff && permissionManagedRole && permissionsLoading) {
    return <PageLoading />;
  }

  // Keyword map for deeper sidebar search
  const SECTION_KEYWORDS: Record<string, string[]> = {
    coaching: ['drills', 'sessions', 'exercises', 'database', 'training'],
    coachingdata: ['performance', 'reports', 'r90', 'stats', 'data', 'actions'],
    analysis: ['match', 'pre-match', 'post-match', 'video', 'reports'],
    players: ['player', 'management', 'squad', 'roster', 'profile'],
    marketing: ['campaigns', 'social', 'brand', 'content', 'posts'],
    invoices: ['billing', 'payments', 'fees', 'charges'],
    legal: ['contracts', 'documents', 'compliance', 'agreements'],
    clubnetwork: ['contacts', 'clubs', 'agents', 'scouts', 'network'],
    casestudies: ['messaging', 'conversations', 'case studies', 'outreach', 'examples'],
    representationoffers: ['representation', 'offers', 'risewithus', 'invitation', 'invite'],
    transferreports: ['transfer', 'reports', 'player reports', 'shareable', 'links'],
    recruitment: ['prospects', 'signings', 'targets', 'transfers'],
    expenses: ['costs', 'receipts', 'spending', 'reimbursement'],
    athletecentre: ['athlete', 'development', 'programming', 'periodisation'],
    videoanalysis: ['video', 'footage', 'annotations', 'clips', 'timestamps'],
    strengthpower: ['strength', 'power', 'speed', 'gym', 'training', 'exercises', 'programming'],
    technical: ['technical', 'drills', 'sessions', 'tactical', 'programming', 'ball work'],
    nutrition: ['nutrition', 'diet', 'food', 'macros', 'calories', 'meal', 'supplements'],
    psychology: ['psychology', 'spq', 'mental', 'confidence', 'resilience', 'personality'],
    activitylog: ['audit', 'activity', 'log', 'history', 'actions'],
    dataexport: ['export', 'backup', 'download', 'csv', 'data'],
    streams: ['stream', 'live', 'watch', 'channel', 'broadcast', 'tv'],
    scoutingcentre: ['scouting', 'reports', 'scouts', 'evaluations'],
    transferhub: ['transfers', 'outreach', 'clubs', 'deals'],
    portalmanagement: ['portal', 'features', 'visibility', 'hero', 'toggle'],
    highlightcompiler: ['highlight', 'compiler', 'reel', 'compilation', 'export', 'clips'],
    musicstudio: ['music', 'suno', 'audio', 'tracks', 'playlist', 'portal music', 'songs'],
    datasetbuilder: ['dataset', 'training', 'roboflow', 'annotation', 'labelling', 'frames'],
  };

  const filteredCategories = categories.map(category => ({
    ...category,
    sections: category.sections.filter(section => {
      if ((section as any).isGroupLabel) return true; // Always show group labels if their siblings match
      const q = searchQuery.toLowerCase();
      if (!q) return true;
      if (section.title.toLowerCase().includes(q)) return true;
      const keywords = SECTION_KEYWORDS[section.id] || [];
      return keywords.some(kw => kw.includes(q));
    })
  })).filter(category => category.sections.filter(s => !(s as any).isGroupLabel).length > 0);

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden overflow-x-hidden">
      <ExportProgressFloat />
      {/* Marble background with more visible overlay */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `url(${theme === 'light' ? whiteMarbleBackground : marbleBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: theme === 'light' ? 0.5 : 0.25,
        }}
      />
      {isNight && <div className="staff-night-aura" aria-hidden="true" />}

      {/* Header with Logo - always visible */}
       <header className={`fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border pwa-safe-top transition-all duration-200 ${headerCollapsed ? 'h-10' : ''}`}>
        {isNight && <div className="staff-night-glow" aria-hidden="true" />}
        <div className={`flex items-center ${headerCollapsed ? 'h-10' : 'h-16'} px-4 relative`}>
          {/* Centre logo — clickable to collapse/expand */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer"
            onPointerDown={() => {
              logoLongPressFiredRef.current = false;
              if (logoPressTimerRef.current) window.clearTimeout(logoPressTimerRef.current);
              logoPressTimerRef.current = window.setTimeout(() => {
                logoLongPressFiredRef.current = true;
                if (expandedSection !== DEFAULT_STAFF_SECTION) {
                  setExpandedSection(DEFAULT_STAFF_SECTION as any);
                  setStaffSectionParams({ section: DEFAULT_STAFF_SECTION }, { replace: true });
                }
              }, 500);
            }}
            onPointerUp={() => {
              if (logoPressTimerRef.current) { window.clearTimeout(logoPressTimerRef.current); logoPressTimerRef.current = null; }
              if (!logoLongPressFiredRef.current) {
                setHeaderCollapsed(prev => !prev);
              }
            }}
            onPointerLeave={() => {
              if (logoPressTimerRef.current) { window.clearTimeout(logoPressTimerRef.current); logoPressTimerRef.current = null; }
            }}
            onContextMenu={(e) => e.preventDefault()}
            title={headerCollapsed ? 'Tap to show header — hold to open My Tasks' : 'Tap to hide header — hold to open My Tasks'}
          >
            <img
              src={theme === 'light' ? '/RISEBlack.png' : '/RISEWhite.png'}
              alt="RISE"
              className={`${headerCollapsed ? 'h-6' : 'h-9'} w-auto transition-all duration-200 select-none`}
              draggable={false}
            />
          </div>

          {!headerCollapsed && (
            <>
          {/* Left side: open tabs — stops before logo */}
          <div className="flex items-center gap-1.5 overflow-hidden min-w-0 mr-4"
            style={{ maxWidth: 'calc(50% - 60px)' }}
            onDragOver={(e) => e.preventDefault()}
            onDragEnd={() => { setDraggingTabId(null); setDragOverTabId(null); isDragConfirmedRef.current = false; }}
          >
            {(() => {
              const openTabs: string[] = (() => { try { return JSON.parse(localStorage.getItem('staff_open_tabs') || '[]'); } catch { return []; } })();
              const allSections = categories.flatMap(c => c.sections.filter(s => !(s as any).isGroupLabel));
              const MAX_VISIBLE = isMobile ? 2 : 3;
              
              // Compute display order: if dragging, show the reordered preview
              const displayTabs = (() => {
                if (draggingTabId && dragOverTabId && draggingTabId !== dragOverTabId) {
                  const reordered = [...openTabs];
                  const fromIdx = reordered.indexOf(draggingTabId);
                  const toIdx = reordered.indexOf(dragOverTabId);
                  if (fromIdx !== -1 && toIdx !== -1) {
                    reordered.splice(fromIdx, 1);
                    reordered.splice(toIdx, 0, draggingTabId);
                    return reordered;
                  }
                }
                return openTabs;
              })();
              
              const visibleTabs = displayTabs.slice(0, MAX_VISIBLE);
              const overflowTabs = displayTabs.slice(MAX_VISIBLE);

              return (
                <>
                  {visibleTabs.map((tabId, tabIndex) => {
                    const sec = allSections.find(s => s.id === tabId);
                    if (!sec) return null;
                    const TabIcon = sec.icon;
                    const isActive = expandedSection === tabId;
                    const isDragging = draggingTabId === tabId;

                    return (
                      <motion.div
                        key={`${tabId}-${tabIndex}-${tabsVersion}`}
                        layout
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        className="shrink-0"
                      >
                        <Popover>
                          <PopoverTrigger asChild>
                          <button
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', tabId);
                                e.dataTransfer.effectAllowed = 'move';
                                dragStartXRef.current = e.clientX;
                                isDragConfirmedRef.current = false;
                                setDraggingTabId(tabId);
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                                // Only consider reorder after dragging 30px+
                                if (!isDragConfirmedRef.current && Math.abs(e.clientX - dragStartXRef.current) < 30) return;
                                isDragConfirmedRef.current = true;
                                if (dragOverTabId !== tabId) setDragOverTabId(tabId);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                const draggedId = e.dataTransfer.getData('text/plain');
                                if (draggedId === tabId) { setDraggingTabId(null); setDragOverTabId(null); isDragConfirmedRef.current = false; return; }
                                if (!isDragConfirmedRef.current) { setDraggingTabId(null); setDragOverTabId(null); return; }
                                const updated = [...openTabs];
                                const fromIdx = updated.indexOf(draggedId);
                                const toIdx = updated.indexOf(tabId);
                                if (fromIdx === -1 || toIdx === -1) return;
                                updated.splice(fromIdx, 1);
                                updated.splice(toIdx, 0, draggedId);
                                localStorage.setItem('staff_open_tabs', JSON.stringify(updated));
                                setDraggingTabId(null);
                                setDragOverTabId(null);
                                isDragConfirmedRef.current = false;
                                setTabsVersion(v => v + 1);
                              }}
                              onClick={() => handleSectionToggle(tabId as any)}
                              className={`group/tab relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all shrink-0 rounded-full border-2 cursor-grab active:cursor-grabbing ${
                                isActive
                                  ? 'border-risegold text-risegold bg-risegold/10'
                                  : 'border-border/50 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/40'
                              } ${isDragging ? 'opacity-50 scale-95' : ''}`}
                            >
                              <TabIcon className="w-3.5 h-3.5 shrink-0" />
                              {!isMobile && <span className="truncate max-w-[90px]">{sec.title}</span>}
                              {openTabs.length >= 2 && (
                                <span
                                  className="ml-0.5 hidden group-hover/tab:inline-flex items-center justify-center h-4 w-4 rounded-full text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                  onClick={(e) => { e.stopPropagation(); removeTab(tabId); }}
                                >
                                  ×
                                </span>
                              )}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent side="bottom" align="start" className="w-auto p-2 flex items-center gap-2">
                            <span className="text-xs font-medium">{sec.title}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                // Refresh the current tab without falling back to Team Performance / My Tasks.
                                if (expandedSection === tabId) {
                                  setExpandedSection(null);
                                  setTimeout(() => handleSectionToggle(tabId as any), 50);
                                } else {
                                  handleSectionToggle(tabId as any);
                                }
                              }}
                              title="Refresh"
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-muted-foreground hover:text-destructive"
                              onClick={() => removeTab(tabId)}
                            >
                              <span className="text-sm">×</span>
                            </Button>
                          </PopoverContent>
                        </Popover>
                      </motion.div>
                    );
                  })}

                  {overflowTabs.length > 0 && (
                    <>
                      <button
                        onClick={() => setTabOverflowOpen(true)}
                        className="flex items-center px-2.5 py-1.5 text-xs font-medium rounded-full border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/40 shrink-0"
                      >
                        +{overflowTabs.length}
                      </button>
                      <Dialog open={tabOverflowOpen} onOpenChange={setTabOverflowOpen}>
                        <DialogContent className="max-w-sm">
                          <div className="space-y-3">
                            <p className="text-sm font-semibold">Open Tabs</p>
                            <div className="space-y-1 max-h-80 overflow-y-auto">
                              {openTabs.map((tId, idx) => {
                                const s = allSections.find(x => x.id === tId);
                                if (!s) return null;
                                const TIcon = s.icon;
                                const active = expandedSection === tId;
                                return (
                                  <div key={`${tId}-${idx}-${tabsVersion}`} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer ${active ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'}`}>
                                    <TIcon className="w-4 h-4 shrink-0" />
                                    <span className="text-sm flex-1 truncate" onClick={() => { handleSectionToggle(tId as any); setTabOverflowOpen(false); }}>{s.title}</span>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeTab(tId)}>
                                      <span className="text-xs">×</span>
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </>
                  )}

                  {/* Add tab button — opens section grid picker */}
                  <button
                    className="flex items-center justify-center w-7 h-7 rounded-full border border-dashed border-border/50 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/40 shrink-0 transition-colors"
                    onClick={() => setShowGridPickerDialog(true)}
                    title="Open new tab"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </>
              );
            })()}
          </div>

          {/* Right side: home + music + notifications — always far right */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {isMobile ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" title="Menu">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="bottom" className="w-56">
                  <DropdownMenuItem onClick={() => window.open('/', '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-2" /> Home
                  </DropdownMenuItem>
                  {(isAdmin || !permissionManagedRole || canView('overview')) && (
                    <DropdownMenuItem onClick={() => setExpandedSection('overview')}>
                      <ClipboardList className="h-4 w-4 mr-2" /> My Tasks
                    </DropdownMenuItem>
                  )}
                  {(isAdmin || !permissionManagedRole) && (
                    <DropdownMenuItem onClick={() => setPortalQuickOpen(true)}>
                      <Users className="h-4 w-4 mr-2" /> Open a Player Portal
                    </DropdownMenuItem>
                  )}
                  {(isAdmin || !permissionManagedRole || canView('schedule')) && (
                    <DropdownMenuItem onClick={() => {
                      if (expandedSection !== 'schedule' && expandedSection !== 'marketingschedule' && expandedSection !== 'staffschedules') {
                        setExpandedSection('schedule');
                      }
                    }}>
                      <Calendar className="h-4 w-4 mr-2" /> Schedule
                    </DropdownMenuItem>
                  )}
                  {((isAdmin || !permissionManagedRole || canView('header_music')) || (user && (isAdmin || !permissionManagedRole || canView('header_notifications')))) && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="flex items-center justify-around px-1 py-1">
                        {(isAdmin || !permissionManagedRole || canView('header_music')) && <StaffMusicPlayer />}
                        {user && (isAdmin || !permissionManagedRole || canView('header_notifications')) && <StaffNotificationsDropdown userId={user.id} />}
                      </div>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Home"
                  onClick={() => window.open('/', '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                {(isAdmin || !permissionManagedRole || canView('header_music')) && <StaffMusicPlayer />}
                {(isAdmin || !permissionManagedRole || canView('overview')) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Open My Tasks"
                    onClick={() => setExpandedSection('overview')}
                  >
                    <ClipboardList className="h-4 w-4" />
                  </Button>
                )}
                {(isAdmin || !permissionManagedRole) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Open a Player Portal"
                    onClick={() => setPortalQuickOpen(true)}
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                )}
                {(isAdmin || !permissionManagedRole || canView('schedule')) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Open Schedule"
                    onClick={() => {
                      if (expandedSection !== 'schedule' && expandedSection !== 'marketingschedule' && expandedSection !== 'staffschedules') {
                        setExpandedSection('schedule');
                      }
                    }}
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                )}
                {user && (isAdmin || !permissionManagedRole || canView('header_notifications')) && <StaffNotificationsDropdown userId={user.id} />}
              </>
            )}
          </div>
            </>
          )}
        </div>
      </header>

      <PlayerPortalQuickOpenDialog open={portalQuickOpen} onOpenChange={setPortalQuickOpen} />

      <PlayerBirthdayDialog />

      {/* Main Layout with Sidebar */}
      <div className="flex flex-1 relative">
        {/* Quick Search Command Dialog */}
        <Dialog open={sidebarSearchOpen} onOpenChange={setSidebarSearchOpen}>
          <DialogContent className="overflow-hidden p-0 shadow-lg max-w-3xl w-[90vw]">
            <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
              <CommandInput 
                placeholder="Search players, updates, content..." 
                onValueChange={(value) => {
                  // Update query state immediately so section filtering reacts
                  // to every keystroke (entity results still run on debounce).
                  setSearchQuery(value);
                  // Clear previous timeout
                  if (searchTimeoutRef.current) {
                    clearTimeout(searchTimeoutRef.current);
                  }
                  // Set new timeout for debounced search
                  searchTimeoutRef.current = setTimeout(() => {
                    performGlobalSearch(value);
                  }, 300);
                }}
              />
              <CommandList>
            {searchLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Searching...</div>
            ) : (
              <>
                {(() => {
                  const currentSearch = (searchQuery || '').trim().toLowerCase();
                  // Strict section filter: only show sections whose title contains the typed letters.
                  const allSections = categories.flatMap(category =>
                    category.sections.filter(s => !(s as any).isGroupLabel).map(section => ({ section, category }))
                  );
                  const matchedSections = currentSearch
                    ? allSections.filter(({ section }) => section.title.toLowerCase().includes(currentSearch))
                    : allSections;
                  // Sort: exact > starts-with > contains
                  const sortedSections = matchedSections.sort((a, b) => {
                    if (!currentSearch) return 0;
                    const aTitle = a.section.title.toLowerCase();
                    const bTitle = b.section.title.toLowerCase();
                    if (aTitle === currentSearch && bTitle !== currentSearch) return -1;
                    if (bTitle === currentSearch && aTitle !== currentSearch) return 1;
                    const aStarts = aTitle.startsWith(currentSearch);
                    const bStarts = bTitle.startsWith(currentSearch);
                    if (aStarts && !bStarts) return -1;
                    if (bStarts && !aStarts) return 1;
                    return 0;
                  });
                  return (
                    <>
                      {sortedSections.length > 0 && (
                        <CommandGroup heading="Jump to Section">
                          {sortedSections.map(({ section, category }) => {
                            const Icon = section.icon;
                            return (
                              <CommandItem
                                key={section.id}
                                value={`section-${section.id}-${section.title}`}
                                onSelect={() => {
                                  if (category.locked) {
                                    toast.error("You don't have permission to access this section");
                                    return;
                                  }
                                  handleSectionToggle(section.id as any);
                                  setExpandedCategory(category.id);
                                  setSidebarSearchOpen(false);
                                }}
                                disabled={category.locked}
                                className="cursor-pointer"
                              >
                                <Icon className="mr-2 h-4 w-4" />
                                <span>{section.title}</span>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      )}

                      {searchResults.length > 0 && (
                        <CommandGroup heading={`Found ${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`}>
                          {searchResults.map((result) => (
                            <CommandItem
                              key={`${result.type}-${result.id}`}
                              value={`result-${result.type}-${result.id}-${result.title}`}
                              onSelect={() => {
                                setExpandedSection(result.sectionId as any);
                                setExpandedCategory(
                                  categories.find(c => c.sections.some(s => s.id === result.sectionId))?.id || null
                                );
                                if (result.type === 'player') {
                                  const nextParams = createStaffSearchParams({ section: result.sectionId, player: result.id });
                                  navigate(`/staff?${nextParams.toString()}`);
                                  toast.success(`Opening ${result.title} in ${result.section}`);
                                } else {
                                  toast.success(`Opening ${result.section}`);
                                }
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                setSidebarSearchOpen(false);
                              }}
                              className="cursor-pointer"
                            >
                              <div className="flex flex-col gap-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{result.title}</span>
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">{result.section}</span>
                                </div>
                                {result.description && (
                                  <span className="text-xs text-muted-foreground line-clamp-1">{result.description}</span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}

                      {sortedSections.length === 0 && searchResults.length === 0 && (
                        <CommandEmpty>
                          {searchLoading ? 'Searching...' : 'No matching section or content.'}
                        </CommandEmpty>
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </CommandList>
            </Command>
          </DialogContent>
        </Dialog>

        {/* Sidebar Collapse Toggle Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={`fixed ${isMobile ? 'top-16' : 'top-20'} left-2 z-20 p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border shadow-lg hover:bg-background transition-all duration-300 pwa-toggle-top ${
            sidebarCollapsed ? 'opacity-50 hover:opacity-100' : ''
          }`}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        {/* Left Sidebar */}
        <div className={`fixed ${headerCollapsed ? 'top-10' : isMobile ? 'top-14' : 'top-16'} left-0 bottom-0 border-r bg-muted/30 backdrop-blur-sm flex flex-col items-start py-4 pb-20 gap-2 overflow-y-auto scrollbar-thin z-10 transition-all duration-300 pwa-sidebar-top ${
          sidebarCollapsed ? 'w-0 border-0 opacity-0 pointer-events-none' : isMobile ? 'w-14' : 'w-14 md:w-24'
        }`}>
          {/* Pinned Sections */}
          {pinnedSections.length > 0 && !expandedCategory && (
            <div className="w-full space-y-1 pb-1">
              {pinnedSections.map(pinId => {
                const section = categories.flatMap(c => c.sections).find(s => s.id === pinId && !(s as any).isGroupLabel);
                if (!section) return null;
                const PinIcon = section.icon;
                const isActive = expandedSection === pinId;
                return (
                  <button
                    key={pinId}
                    onClick={() => {
                      handleSectionToggle(pinId as any);
                      const parent = categories.find(c => c.sections.some(s => s.id === pinId));
                      if (parent) setExpandedCategory(parent.id);
                    }}
                    className={`group w-full rounded-lg flex flex-col items-center justify-center py-1.5 px-1 transition-all ${
                      isActive ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-primary/10'
                    }`}
                    title={section.title}
                  >
                    <PinIcon className={`w-4 h-4 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
                  </button>
                );
              })}
              <div className="w-full px-2 py-1">
                <div className="h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
              </div>
            </div>
          )}

          {/* Search Button */}
          <button
            onClick={() => setSidebarSearchOpen(true)}
            className="group w-full rounded-lg flex flex-col items-center justify-center py-2 md:py-3 px-1 md:px-2 transition-all hover:bg-primary/20"
            title="Search sections (⌘K)"
          >
            <div className="p-1.5 md:p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors border border-primary/20">
              <Search className="w-3 h-3 md:w-4 md:h-4 text-primary" />
            </div>
          </button>
          {filteredCategories.map((category, index) => {
            const CategoryIcon = category.icon;
            const isExpanded = expandedCategory === category.id;
            const hasActiveSection = category.sections.filter(s => !(s as any).isGroupLabel).some(s => s.id === expandedSection);
            const realSections = category.sections.filter(s => !(s as any).isGroupLabel);
            const isSingleSection = realSections.length === 1;
            
            // Hide this category if another one is expanded
            const shouldShow = !expandedCategory || expandedCategory === category.id;
            
            return (
              <div key={category.id} className={`w-full ${!shouldShow ? 'hidden' : ''}`}>
                {/* Category Button */}
                <button
                  onClick={() => {
                    if (category.locked) {
                      toast.error("You don't have permission to access this section");
                      return;
                    }
                    if (isSingleSection) {
                      handleSectionToggle(category.sections[0].id as any);
                    } else {
                      setExpandedCategory(isExpanded ? null : category.id);
                    }
                  }}
                  className={`group relative w-full rounded-lg flex flex-col items-center justify-center py-2 md:py-3 px-1 md:px-2 transition-all ${
                    category.locked 
                      ? 'opacity-50 cursor-not-allowed hover:bg-muted/30' 
                      : 'hover:bg-primary/20'
                  } ${
                    hasActiveSection || isExpanded ? 'bg-gradient-to-br from-primary via-primary to-primary-glow shadow-lg' : ''
                  }`}
                >
                  <CategoryIcon className={`w-5 h-5 md:w-6 md:h-6 mb-0.5 md:mb-1 ${hasActiveSection || isExpanded ? 'text-primary-foreground' : ''}`} />
                  <span className={`text-[6px] sm:text-[7px] leading-tight text-center px-0.5 font-medium uppercase tracking-tight ${hasActiveSection || isExpanded ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                    {category.title.split(' ').map((word, i) => (
                      <span key={i} className="block">{word}</span>
                    ))}
                  </span>
                  {/* Lock icon */}
                  {category.locked && (
                    <Lock className="absolute bottom-1 right-1 w-2.5 h-2.5 md:w-3 md:h-3 text-muted-foreground" />
                  )}
                </button>

                {/* Sections (shown when expanded) - staggered animation */}
                <AnimatePresence>
                {isExpanded && !isSingleSection && (
                  <motion.div 
                    className="w-full space-y-1 mt-2 pb-16"
                    initial="hidden"
                    animate="show"
                    exit="hidden"
                    variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
                  >
                    {category.sections.map((section) => {
                      if ((section as any).isGroupLabel) {
                        return (
                          <motion.div 
                            key={section.id} 
                            className="pt-2 pb-0.5 px-1"
                            variants={{ hidden: { x: -10, opacity: 0 }, show: { x: 0, opacity: 1 } }}
                          >
                            <span className="text-[5px] sm:text-[6px] uppercase tracking-widest text-primary/60 font-bold text-center block">
                              {section.title}
                            </span>
                            <div className="h-px bg-primary/20 mt-0.5" />
                          </motion.div>
                        );
                      }
                      const SectionIcon = section.icon;
                      const isActive = expandedSection === section.id;
                      const isPinned = pinnedSections.includes(section.id);
                      return (
                        <motion.div
                          key={section.id}
                          variants={{ hidden: { x: -10, opacity: 0 }, show: { x: 0, opacity: 1 } }}
                        >
                          <button
                            onClick={() => handleSectionToggle(section.id as any)}
                            className={`group relative w-full rounded-lg flex flex-col items-center justify-center py-1.5 md:py-2 px-1 transition-all ${
                              isActive 
                                ? 'bg-primary text-primary-foreground shadow-md' 
                                : 'hover:bg-primary/10'
                            }`}
                          >
                            <SectionIcon className={`w-4 h-4 md:w-5 md:h-5 mb-0.5 md:mb-1 ${isActive ? 'text-primary-foreground' : ''}`} />
                            <span className={`text-[5px] sm:text-[6px] leading-tight text-center px-0.5 font-medium uppercase tracking-tight ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                              {section.title.split(' ').map((word, i) => (
                                <span key={i} className="block">{word}</span>
                              ))}
                            </span>
                            {/* Pin/star icon on hover */}
                            <button
                              onClick={(e) => { e.stopPropagation(); togglePin(section.id); }}
                              className={`absolute -top-0.5 -right-0.5 p-0.5 rounded-full transition-all ${
                                isPinned ? 'opacity-100 text-primary' : 'opacity-0 group-hover:opacity-60 text-muted-foreground hover:text-primary'
                              }`}
                              title={isPinned ? 'Unpin section' : 'Pin section'}
                            >
                              <Star className={`w-2.5 h-2.5 ${isPinned ? 'fill-primary' : ''}`} />
                            </button>
                          </button>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
                </AnimatePresence>
                
                {/* Gold divider between categories */}
                {index < filteredCategories.length - 1 && (
                  <div className="w-full px-2 py-2">
                    <div className="h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Main Content Area */}
        <main className={`flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin relative z-10 transition-all duration-300 ${headerCollapsed ? 'pt-14' : 'pt-20'} pwa-content-offset ${
          sidebarCollapsed ? 'ml-0' : isMobile ? 'ml-14' : 'ml-14 md:ml-24'
        } ${isMobile ? 'pb-[70px]' : ''}`}>
          {expandedSection ? (
            <div className="container mx-auto px-3 md:px-6 py-4 md:py-6">
              {/* Breadcrumb */}
              {(() => {
                const parentCat = categories.find(c => c.sections.some(s => s.id === expandedSection && !(s as any).isGroupLabel));
                const activeSection = parentCat?.sections.find(s => s.id === expandedSection && !(s as any).isGroupLabel);
                if (parentCat && activeSection) {
                  return (
                    <StaffBreadcrumb
                      categoryTitle={parentCat.title}
                      categoryIcon={parentCat.icon}
                      sectionTitle={activeSection.title}
                      onCategoryClick={() => {
                        setExpandedCategory(parentCat.id);
                        setExpandedSection(null);
                        setStaffSectionParams({ section: null });
                      }}
                    />
                  );
                }
                return null;
              })()}
              <Card className="animate-in fade-in slide-in-from-top-4 duration-300">
                <CardContent className="pt-6">
              {/* Use hidden class for key sections to preserve state (popups, playback, etc.) */}
              {/* ErrorBoundary keyed by section so one tab crashing never blanks the whole portal. */}
              <ErrorBoundary key={expandedSection ?? 'none'}>
                <Suspense fallback={<PageLoading />}>
                  <div className={expandedSection === 'videoanalysis' ? '' : 'hidden'}><VideoAnalysis /></div>
                  <div className={expandedSection === 'annotations' ? '' : 'hidden'}><AnnotationProjects /></div>
                  <div className={expandedSection === 'players' ? '' : 'hidden'}><PlayerManagement isAdmin={canManageSection('players')} /></div>
                  <div className={expandedSection === 'analysis' ? '' : 'hidden'}><AnalysisManagement isAdmin={canManageSection('analysis')} /></div>
                  {expandedSection === 'dashboard' && <StaffOverview isAdmin={isAdmin} userId={user?.id} isMarketeer={isMarketeer} />}
                  {expandedSection === 'overview' && <StaffAccountabilityOverview isAdmin={isAdmin} userId={user?.id} />}
                  {expandedSection === 'teamperformance' && <TeamPerformance />}
                  {expandedSection === 'focusedtasks' && <FocusedTasksSection />}
                  {expandedSection === 'schedule' && (
                    <div className="space-y-6">
                      <div className="mb-6">
                        <h3 className="text-xl font-semibold mb-2">Staff Availability</h3>
                        <p className="text-sm text-muted-foreground">Manage your availability hours and view the team schedule</p>
                      </div>
                      <StaffAvailabilityManagement isAdmin={isAdmin} />
                    </div>
                  )}
                  {expandedSection === 'visionboard' && <VisionBoardSection />}
                  {expandedSection === 'docs' && <DocsSection />}
                  {expandedSection === 'sheets' && <SheetsSection />}
                  {expandedSection === 'designstudio' && <DesignProjects />}
                  {expandedSection === 'streams' && <StreamsSection />}
                  {expandedSection === 'staffschedules' && <StaffSchedulesManagement />}
                  {expandedSection === 'playerlist' && <PlayerList isAdmin={canManageSection('playerlist')} />}
                  {expandedSection === 'recruitment' && <RecruitmentManagement isAdmin={canManageSection('recruitment')} />}
                  {expandedSection === 'playerdatabase' && <PlayerDatabaseManagement isAdmin={canManageSection('playerdatabase')} />}
                  
                  {expandedSection === 'scoutingcentre' && <ScoutingCentreManagement isAdmin={canManageSection('scoutingcentre')} />}
                  {expandedSection === 'coaching' && <CoachingDatabase isAdmin={canManageSection('coaching')} />}
                  {expandedSection === 'tacticsboard' && <TacticsBoard />}
                  {expandedSection === 'meetings' && <Meetings />}
                  {expandedSection === 'coachingdata' && <CoachingDataSection />}
                  {expandedSection === 'psychology' && <PsychologySection />}
                  {expandedSection === 'marketingschedule' && <ScheduleManager canManage={canManageSection('marketingschedule')} />}
                  {expandedSection === 'marketing' && <MarketingManagement isAdmin={canManageSection('marketing')} isMarketeer={isMarketeer} />}
                  {expandedSection === 'marketinggallery' && <MarketingGalleryViewer />}
                  {expandedSection === 'contentcreator' && <ContentCreator />}
                  {expandedSection === 'videocompressor' && <VideoCompressor />}
                  {expandedSection === 'highlightcompiler' && <HighlightCompiler />}
                  {expandedSection === 'highlightmakers' && <HighlightMakersManagement isAdmin={canManageSection('highlightmakers')} />}
                  {expandedSection === 'datasetbuilder' && <DatasetBuilder />}
                  {expandedSection === 'musicstudio' && <MusicStudio />}
                  {expandedSection === 'salesdeck' && <SalesDeck />}
                  
                  {expandedSection === 'publiccontent' && <PublicContentManagement isAdmin={canManageSection('publiccontent')} />}
                  {expandedSection === 'submissions' && <FormSubmissionsManagement isAdmin={canManageSection('submissions')} />}
                  {expandedSection === 'visitors' && <SiteVisitorsManagement isAdmin={canManageSection('visitors')} />}
                  {expandedSection === 'invoices' && <InvoiceManagement isAdmin={canManageSection('invoices')} />}
                  {expandedSection === 'payments' && <PaymentsManagement isAdmin={canManageSection('payments')} />}
                  {expandedSection === 'expenses' && <ExpensesManagement isAdmin={canManageSection('expenses')} />}
                  {expandedSection === 'taxrecords' && <TaxRecordsManagement isAdmin={canManageSection('taxrecords')} />}
                  {expandedSection === 'corporationtax' && <CorporationTaxSection isAdmin={canManageSection('corporationtax')} />}
                  {expandedSection === 'budgets' && <BudgetsManagement isAdmin={canManageSection('budgets')} />}
                  {expandedSection === 'financialreports' && <FinancialReports isAdmin={canManageSection('financialreports')} />}
                  {expandedSection === 'updates' && <UpdatesManagement isAdmin={canManageSection('updates')} />}
                  {expandedSection === 'clubnetwork' && <ClubNetworkManagement isAdmin={canManageSection('clubnetwork')} userRole={currentRole || undefined} />}
                  {expandedSection === 'cluboutreach' && <ClubOutreachManager />}
                  {expandedSection === 'markettables' && <MarketTablesStandalone />}
                  {expandedSection === 'casestudies' && <ScriptsAndCaseStudies />}
                  {expandedSection === 'representationoffers' && <RepresentationOffers />}
                  {expandedSection === 'transferreports' && <TransferReports />}
                  {expandedSection === 'interactionhistory' && <InteractionHistory />}
                  {expandedSection === 'transferhub' && <TransferHub isAdmin={canManageSection('transferhub')} />}
                  {expandedSection === 'portalmanagement' && <PortalManagement />}
                  {expandedSection === 'athletecentre' && <AthleteCentre />}
                  {expandedSection === 'legal' && <LegalManagement isAdmin={canManageSection('legal')} />}
                  {expandedSection === 'partners' && <PartnersManagement isAdmin={canManageSection('partners')} />}
                  {expandedSection === 'jobs' && <JobsManagement />}
                  {expandedSection === 'socialshare' && <SocialShareManagement />}
                  {expandedSection === 'requests' && <RequestsManagement />}
                  {expandedSection === 'sitetext' && <SiteTextManagement isAdmin={canManageSection('sitetext')} />}
                  {expandedSection === 'languages' && <LanguagesManagement isAdmin={canManageSection('languages')} />}
                  {expandedSection === 'passwords' && isAdmin && <PlayerPasswordManagement />}
                  {expandedSection === 'staffaccounts' && isAdmin && <StaffAccountManagement />}
                  {expandedSection === 'pwainstall' && <StaffPWAInstall />}
                  {expandedSection === 'offlinemanager' && <StaffOfflineManager />}
                  {expandedSection === 'pushnotifications' && <StaffPushNotifications />}
                  {expandedSection === 'notifications' && isAdmin && <NotificationSettingsManagement />}
                  {expandedSection === 'smsnotifications' && isAdmin && <StaffSMSNotifications />}
                  {expandedSection === 'strengthpower' && <StrengthPowerSpeedSection />}
                  {expandedSection === 'technical' && <TechnicalSection />}
                  {expandedSection === 'nutrition' && <NutritionSection />}
                  {expandedSection === 'activitylog' && isAdmin && <ActivityLog />}
                  {expandedSection === 'dataexport' && isAdmin && <DatabaseExport />}
                  {expandedSection === 'usage' && isAdmin && <UsageSection />}
                </Suspense>
              </ErrorBoundary>
                </CardContent>
              </Card>
            </div>
          ) : expandedCategory ? (
            <div className="container mx-auto px-3 md:px-6 py-4 md:py-6">
              {(() => {
                const cat = categories.find(c => c.id === expandedCategory);
                if (!cat) return null;
                const CatIcon = cat.icon;
                return (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <CatIcon className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-semibold">{cat.title}</h2>
                    </div>
                    <SectionGridPicker
                      categories={[cat]}
                      onSelect={(sectionId, categoryId) => {
                        handleSectionToggle(sectionId as any);
                        setExpandedCategory(categoryId);
                      }}
                    />
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="container mx-auto px-3 md:px-6 py-4 md:py-6">
              <SectionGridPicker
                categories={categories}
                onSelect={(sectionId, categoryId) => {
                  handleSectionToggle(sectionId as any);
                  setExpandedCategory(categoryId);
                }}
              />
            </div>
          )}
        </main>
      </div>

      {/* Search Bar - At Bottom on Mobile */}
      <div className={`border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${isMobile ? 'fixed bottom-0 left-0 right-0' : 'sticky bottom-0'} z-10 relative`} style={{ paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 0px)' : undefined }}>
        <div className="container mx-auto px-3 md:px-4 py-3">
          <div className="flex items-center justify-between gap-2 md:gap-4">
            {/* Mobile menu button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-4 overflow-y-auto scrollbar-thin">
                <div className="space-y-6">
                  {filteredCategories.map((category) => (
                    <div key={category.id} className="space-y-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2">
                        {category.title}
                      </h3>
                      <div className="space-y-1">
                        {category.sections.map((section) => {
                          if ((section as any).isGroupLabel) {
                            return (
                              <p key={section.id} className="text-[10px] font-bold uppercase tracking-wider text-primary/60 px-2 pt-2">
                                {section.title}
                              </p>
                            );
                          }
                          const Icon = section.icon;
                          return (
                            <Button
                              key={section.id}
                              variant={expandedSection === section.id ? "default" : "ghost"}
                              className="w-full justify-start text-sm h-10"
                              onClick={() => handleSectionToggle(section.id as any)}
                            >
                              <Icon className="w-4 h-4 mr-2 shrink-0" />
                              <span className="truncate">{section.title}</span>
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
            
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm" className="shrink-0">
              Logout
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 shrink-0 hidden md:flex"
              onClick={() => setShortcutsOpen(true)}
              title="Keyboard shortcuts (?)"
            >
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} visibleSectionIds={visibleSectionIds} />

      {/* Global command palette (Cmd-K / /) */}
      <StaffCommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        sections={categories.flatMap((c: any) =>
          c.sections.filter((s: any) => !s.isGroupLabel).map((s: any) => ({ id: s.id, title: s.title, icon: s.icon }))
        )}
        onNavigateSection={(sectionId) => handleSectionToggle(sectionId)}
      />
      
      {/* Grid Picker Dialog for new tabs */}
      <Dialog open={showGridPickerDialog} onOpenChange={setShowGridPickerDialog}>
        <DialogContent className="max-w-[98vw] md:max-w-[90vw] w-full max-h-[90vh] overflow-y-auto p-0">
          <div className="p-4 md:p-6">
            <SectionGridPicker
              categories={categories}
              onSelect={(sectionId, categoryId) => {
                addSectionAsTab(sectionId);
                setExpandedCategory(categoryId);
                setShowGridPickerDialog(false);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <MobileScrollButtons />
    </div>
  );
};

export default Staff;