import { useState, useEffect, useRef } from "react";
import { PageLoading, LoadingSpinner } from "@/components/LoadingSpinner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Search, Menu, ChevronRight, ChevronLeft, ExternalLink, Lightbulb } from "lucide-react";
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
import PlayerManagement from "@/components/staff/PlayerManagement";
import { PlayerList } from "@/components/staff/PlayerList";
import BlogManagement from "@/components/staff/BlogManagement";
import BetweenTheLinesManagement from "@/components/staff/BetweenTheLinesManagement";
import { CoachingDatabase } from "@/components/staff/CoachingDatabase";
import { AnalysisManagement } from "@/components/staff/AnalysisManagement";
import { FormSubmissionsManagement } from "@/components/staff/FormSubmissionsManagement";
import { SiteVisitorsManagement } from "@/components/staff/SiteVisitorsManagement";
import { InvoiceManagement } from "@/components/staff/InvoiceManagement";
import { UpdatesManagement } from "@/components/staff/UpdatesManagement";
import { StaffSchedule } from "@/components/staff/StaffSchedule";
import { StaffOverview } from "@/components/staff/StaffOverview";
import { GoalsTasksManagement } from "@/components/staff/GoalsTasksManagement";
import { StaffAvailabilityManagement } from "@/components/staff/StaffAvailabilityManagement";
import { StaffSchedulesManagement } from "@/components/staff/StaffSchedulesManagement";
import { MarketingManagement } from "@/components/staff/MarketingManagement";
import { ContentCreator, MarketingIdeas } from "@/components/staff/marketing";
import { RecruitmentManagement } from "@/components/staff/RecruitmentManagement";
import { ScoutingCentreManagement } from "@/components/staff/ScoutingCentreManagement";

import { PlayerDatabaseManagement } from "@/components/staff/PlayerDatabaseManagement";
import { StaffAccountManagement } from "@/components/staff/StaffAccountManagement";
import { PlayerPasswordManagement } from "@/components/staff/PlayerPasswordManagement";
import ClubNetworkManagement from "@/components/staff/ClubNetworkManagement";
import LegalManagement from "@/components/staff/LegalManagement";
import { LanguagesManagement } from "@/components/staff/LanguagesManagement";
import { SiteTextManagement } from "@/components/staff/SiteTextManagement";
import { SiteManagement } from "@/components/staff/SiteManagement";
import { StaffPWAInstall } from "@/components/staff/StaffPWAInstall";
import { StaffOfflineManager } from "@/components/staff/StaffOfflineManager";
import { StaffPushNotifications } from "@/components/staff/StaffPushNotifications";
import { HighlightMaker } from "@/components/staff/HighlightMaker";
import { useStaffNotifications } from "@/hooks/useStaffNotifications";
import { TransferHub } from "@/components/staff/TransferHub";
import { ExpensesManagement } from "@/components/staff/ExpensesManagement";
import { TaxRecordsManagement } from "@/components/staff/TaxRecordsManagement";
import { BudgetsManagement } from "@/components/staff/BudgetsManagement";
import { FinancialReports } from "@/components/staff/FinancialReports";
import { PaymentsManagement } from "@/components/staff/PaymentsManagement";
import { AthleteCentre } from "@/components/staff/AthleteCentre";
import { CoachingAIChat } from "@/components/staff/coaching/CoachingAIChat";
import { OpenAccessManagement } from "@/components/staff/OpenAccessManagement";
import { FocusedTasksSection } from "@/components/staff/FocusedTasksSection";
import { StaffNotificationsDropdown } from "@/components/staff/StaffNotificationsDropdown";
import { NotificationSettingsManagement } from "@/components/staff/NotificationSettingsManagement";
import { InFrameSection } from "@/components/staff/InFrameSection";

import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Checkbox } from "@/components/ui/checkbox";
import { useTheme } from "next-themes";
import marbleBackground from "@/assets/smudged-marble-overlay.png";
import whiteMarbleBackground from "@/assets/white-marble-overlay.png";
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
} from "lucide-react";

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
  const [rememberMe, setRememberMe] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'overview' | 'inframe' | 'focusedtasks' | 'schedule' | 'goalstasks' | 'staffschedules' | 'staffaccounts' | 'passwords' | 'pwainstall' | 'offlinemanager' | 'pushnotifications' | 'notifications' | 'players' | 'playerlist' | 'recruitment' | 'playerdatabase' | 'scouts' | 'scoutingcentre' | 'blog' | 'betweenthelines' | 'openaccess' | 'coaching' | 'coachingchat' | 'analysis' | 'highlightmaker' | 'marketing' | 'contentcreator' | 'marketingideas' | 'submissions' | 'visitors' | 'invoices' | 'updates' | 'clubnetwork' | 'cluboutreach' | 'legal' | 'sitetext' | 'languages' | 'sitemanagement' | 'transferhub' | 'payments' | 'expenses' | 'taxrecords' | 'financialreports' | 'budgets' | 'athletecentre' | null>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Hydration guard for PWA cold start
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  
  // Enable staff notifications - only after hydration
  useStaffNotifications(isHydrated ? {
    onVisitor: true,
    onFormSubmission: true,
    onClipUpload: true,
    onPlaylistChange: true,
  } : {});
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
  const [searchParams] = useSearchParams();

  // Check URL parameters for section and player
  useEffect(() => {
    const section = searchParams.get('section');
    if (section && isStaff) {
      setExpandedSection(section as any);
    }
  }, [searchParams, isStaff]);

  // Keyboard shortcut for search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSidebarSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSectionToggle = (section: 'overview' | 'staffaccounts' | 'players' | 'playerlist' | 'recruitment' | 'blog' | 'betweenthelines' | 'coaching' | 'analysis' | 'marketing' | 'submissions' | 'visitors' | 'invoices' | 'updates' | 'clubnetwork' | 'legal') => {
    setExpandedSection(expandedSection === section ? null : section);
    // Scroll to top when section changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Load saved email and remember me preference on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("staff_saved_email");
    const savedRememberMe = localStorage.getItem("staff_remember_me");
    if (savedEmail) setEmail(savedEmail);
    if (savedRememberMe === "true") setRememberMe(true);
  }, []);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          checkStaffRole(session.user.id);
        } else {
          setIsStaff(false);
          setIsAdmin(false);
          setIsMarketeer(false);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkStaffRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkStaffRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .in('role', ['staff', 'admin', 'marketeer']);

      if (error) {
        console.error('Error checking staff role:', error);
        setIsStaff(false);
        setIsAdmin(false);
        setIsMarketeer(false);
      } else {
        const hasStaffOrAdmin = data?.some(row => row.role === 'staff' || row.role === 'admin') ?? false;
        const hasMarketeer = data?.some(row => row.role === 'marketeer') ?? false;
        setIsStaff(hasStaffOrAdmin || hasMarketeer);
        setIsAdmin(data?.some(row => row.role === 'admin') ?? false);
        setIsMarketeer(hasMarketeer);
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

      // Search players
      const { data: players } = await supabase
        .from('players')
        .select('id, name, position, club')
        .ilike('name', searchTerm)
        .limit(10);

      players?.forEach(player => {
        results.push({
          id: player.id,
          title: player.name,
          description: `${player.position}${player.club ? ` at ${player.club}` : ''}`,
          section: 'Player Management',
          sectionId: 'players',
          type: 'player'
        });
      });

      // Search updates
      const { data: updates } = await supabase
        .from('updates')
        .select('id, title, content, date')
        .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
        .limit(5);

      updates?.forEach(update => {
        results.push({
          id: update.id,
          title: update.title,
          description: update.content?.substring(0, 80) + '...',
          section: 'Player Updates',
          sectionId: 'updates',
          type: 'update'
        });
      });

      // Search blog posts
      const { data: blogs } = await supabase
        .from('blog_posts')
        .select('id, title, excerpt')
        .or(`title.ilike.${searchTerm},excerpt.ilike.${searchTerm}`)
        .limit(5);

      blogs?.forEach(blog => {
        results.push({
          id: blog.id,
          title: blog.title,
          description: blog.excerpt?.substring(0, 80),
          section: 'News Articles',
          sectionId: 'blog',
          type: 'blog'
        });
      });

      // Search analyses
      const { data: analyses } = await supabase
        .from('analyses')
        .select('id, title, analysis_type')
        .ilike('title', searchTerm)
        .limit(5);

      analyses?.forEach(analysis => {
        results.push({
          id: analysis.id,
          title: analysis.title || 'Untitled Analysis',
          description: analysis.analysis_type,
          section: 'Analysis Writer',
          sectionId: 'analysis',
          type: 'analysis'
        });
      });

      // Search prospects
      const { data: prospects } = await supabase
        .from('prospects')
        .select('id, name, position, current_club')
        .ilike('name', searchTerm)
        .limit(5);

      prospects?.forEach(prospect => {
        results.push({
          id: prospect.id,
          title: prospect.name,
          description: `${prospect.position || 'Unknown'}${prospect.current_club ? ` at ${prospect.current_club}` : ''}`,
          section: 'Recruitment',
          sectionId: 'recruitment',
          type: 'prospect'
        });
      });

      // Search scouting reports
      const { data: scoutingReports } = await supabase
        .from('scouting_reports')
        .select('id, player_name, position, current_club, status')
        .ilike('player_name', searchTerm)
        .limit(5);

      scoutingReports?.forEach(report => {
        results.push({
          id: report.id,
          title: report.player_name,
          description: `${report.position || 'Unknown'}${report.current_club ? ` at ${report.current_club}` : ''} - ${report.status}`,
          section: 'Scouting Centre',
          sectionId: 'scoutingcentre',
          type: 'scouting_report'
        });
      });

      // Search invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, description, amount')
        .or(`invoice_number.ilike.${searchTerm},description.ilike.${searchTerm}`)
        .limit(5);

      invoices?.forEach(invoice => {
        results.push({
          id: invoice.id,
          title: invoice.invoice_number,
          description: `${invoice.description || ''} - €${invoice.amount}`,
          section: 'Invoices',
          sectionId: 'invoices',
          type: 'invoice'
        });
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        // Save email and remember me preference if checked
        if (rememberMe) {
          localStorage.setItem("staff_saved_email", email);
          localStorage.setItem("staff_remember_me", "true");
        } else {
          localStorage.removeItem("staff_saved_email");
          localStorage.removeItem("staff_remember_me");
        }
        
        await checkStaffRole(data.user.id);
        toast.success("Login successful");
      }
    } catch (err) {
      toast.error("An error occurred during login");
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsStaff(false);
    setIsAdmin(false);
    setIsMarketeer(false);
    setEmail("");
    setPassword("");
    toast.success("Logged out");
  };

  if (loading) {
    return <PageLoading />;
  }

  // Show login form if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <Header />
        <main className="py-20">
          <div className="max-w-md mx-4 md:mx-auto">
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-center">
                  Staff Login
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4" autoComplete="on">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="staff@example.com"
                      required
                      autoFocus
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember-me-staff"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <Label htmlFor="remember-me-staff" className="text-sm cursor-pointer">
                      Remember me
                    </Label>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Logging in..." : "Access Dashboard"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Show access denied if user is authenticated but not staff
  if (!isStaff) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <Header />
        <main className="py-20">
          <div className="max-w-md mx-4 md:mx-auto">
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-center text-destructive">
                  Access Denied
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-center text-muted-foreground">
                  You do not have staff permissions to access this page.
                </p>
                <Button onClick={handleLogout} className="w-full" variant="outline">
                  Logout
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const categories = [
    {
      id: 'overview',
      title: 'Overview',
      icon: Calendar,
      sections: [
        { id: 'overview', title: 'Overview', icon: Calendar },
        { id: 'inframe', title: 'In Frame', icon: ExternalLink },
        { id: 'focusedtasks', title: 'Focused Tasks', icon: Target },
        { id: 'goalstasks', title: 'Goals & Tasks', icon: Target },
        { id: 'staffschedules', title: 'Staff Schedules', icon: Users },
        ...(user?.email === 'jolonlevene98@gmail.com' ? [
          { id: 'notifications', title: 'Notifications', icon: BellRing }
        ] : []),
      ],
      locked: false
    },
    {
      id: 'coaching',
      title: 'Coaching',
      icon: Dumbbell,
      locked: isMarketeer,
      sections: [
        { id: 'schedule', title: 'Schedule', icon: Calendar },
        { id: 'coaching', title: 'Coaching Database', icon: Dumbbell },
        { id: 'coachingchat', title: 'AI Chat', icon: MessageSquare },
        { id: 'analysis', title: 'Analysis Writer', icon: LineChart },
        { id: 'athletecentre', title: 'Athlete Centre', icon: UserRound },
      ]
    },
    {
      id: 'management',
      title: 'Management',
      icon: UserCog,
      locked: isMarketeer,
      sections: [
        { id: 'players', title: 'Player Management', icon: UserCog },
        { id: 'transferhub', title: 'Transfer Hub', icon: Building2 },
        { id: 'highlightmaker', title: 'Highlight Maker', icon: Film },
        { id: 'updates', title: 'Player Updates', icon: BellRing },
      ]
    },
    {
      id: 'network',
      title: 'Network & Recruitment',
      icon: Network,
      locked: false,
        sections: [
          { id: 'clubnetwork', title: 'Club Network', icon: Network },
          { id: 'playerlist', title: 'Player List', icon: Users },
          { id: 'recruitment', title: 'Recruitment', icon: Target },
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
        { id: 'marketing', title: 'Marketing', icon: Megaphone },
        { id: 'marketingideas', title: 'Ideas', icon: Target },
        { id: 'contentcreator', title: 'Content Creator', icon: Film },
        { id: 'blog', title: 'News Articles', icon: Newspaper },
        { id: 'betweenthelines', title: 'Between The Lines', icon: FileText },
        { id: 'openaccess', title: 'Open Access', icon: FileText },
        { id: 'visitors', title: 'Site Visitors', icon: Eye },
      ]
    },
    {
      id: 'financial',
      title: 'Financial',
      icon: Wallet,
      locked: isMarketeer,
      sections: [
        { id: 'invoices', title: 'Invoices', icon: FileCheck },
        { id: 'payments', title: 'Payments In/Out', icon: Receipt },
        { id: 'expenses', title: 'Expenses', icon: Calculator },
        { id: 'taxrecords', title: 'Tax Records', icon: FileSpreadsheet },
        { id: 'budgets', title: 'Budgets', icon: PiggyBank },
        { id: 'financialreports', title: 'Reports', icon: TrendingUp },
      ]
    },
    {
      id: 'admin',
      title: 'Admin & Legal',
      icon: Scale,
      locked: isMarketeer,
      sections: [
        { id: 'legal', title: 'Legal', icon: Scale },
        { id: 'sitetext', title: 'Site Text', icon: FileText },
        { id: 'languages', title: 'Languages', icon: Languages },
        ...(isAdmin ? [
          { id: 'sitemanagement', title: 'Site Management', icon: Settings },
          { id: 'passwords', title: 'Player Passwords', icon: Lock },
          { id: 'staffaccounts', title: 'Staff Accounts', icon: Shield },
        ] : []),
        ...(isAdmin || isStaff || isMarketeer ? [
          { id: 'pwainstall', title: 'PWA Install', icon: Download },
          { id: 'offlinemanager', title: 'Offline Content', icon: HardDrive },
          { id: 'pushnotifications', title: 'Push Notifications', icon: Bell }
        ] : []),
      ]
    }
  ];

  const filteredCategories = categories.map(category => ({
    ...category,
    sections: category.sections.filter(section =>
      section.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.sections.length > 0);

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
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

      {/* Header with Logo - always visible */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-10 w-10 group"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <Lightbulb className={`h-5 w-5 transition-colors ${theme === 'dark' ? 'text-primary group-hover:text-foreground' : 'text-primary fill-primary group-hover:text-foreground group-hover:fill-foreground'}`} />
            </Button>
            <img 
              src={theme === 'light' ? '/RISEBlack.png' : '/RISEWhite.png'}
              alt="RISE"
              className={theme === 'light' ? 'h-8 w-auto' : 'h-10 w-auto'}
            />
            <div className="flex items-center gap-2">
              {user && <StaffNotificationsDropdown userId={user.id} />}
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout with Sidebar */}
      <div className="flex flex-1 relative">
        {/* Quick Search Command Dialog */}
        <Dialog open={sidebarSearchOpen} onOpenChange={setSidebarSearchOpen}>
          <DialogContent className="overflow-hidden p-0 shadow-lg">
            <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
              <CommandInput 
                placeholder="Search players, updates, content..." 
                onValueChange={(value) => {
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
                {searchResults.length > 0 && (
                  <CommandGroup heading={`Found ${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`}>
                    {searchResults.map((result) => (
                      <CommandItem
                        key={`${result.type}-${result.id}`}
                        onSelect={() => {
                          // Always expand the section (don't toggle)
                          setExpandedSection(result.sectionId as any);
                          setExpandedCategory(
                            categories.find(c => c.sections.some(s => s.id === result.sectionId))?.id || null
                          );
                          
                          // Navigate with player ID if it's a player search result
                          if (result.type === 'player') {
                            navigate(`/staff?section=${result.sectionId}&player=${result.id}`);
                            toast.success(`Opening ${result.title} in ${result.section}`);
                          } else {
                            toast.success(`Opening ${result.section}`);
                          }
                          
                          // Ensure the opened section is visible at the top of the page
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
                
                {searchResults.length === 0 && (
                  <CommandEmpty>
                    {searchLoading ? 'Searching...' : 'No results found. Try searching for players, updates, or other content.'}
                  </CommandEmpty>
                )}
                
                <CommandGroup heading="Jump to Section">
                  {(() => {
                    const searchInput = document.querySelector('[cmdk-input]') as HTMLInputElement;
                    const currentSearch = searchInput?.value?.toLowerCase() || '';
                    
                    // Flatten sections and sort by relevance to search
                    const allSections = categories.flatMap(category => 
                      category.sections.map(section => ({ section, category }))
                    );
                    
                    // Sort: exact matches first, then starts-with, then contains
                    const sortedSections = allSections.sort((a, b) => {
                      if (!currentSearch) return 0;
                      
                      const aTitle = a.section.title.toLowerCase();
                      const bTitle = b.section.title.toLowerCase();
                      
                      const aExact = aTitle === currentSearch;
                      const bExact = bTitle === currentSearch;
                      if (aExact && !bExact) return -1;
                      if (bExact && !aExact) return 1;
                      
                      const aStarts = aTitle.startsWith(currentSearch);
                      const bStarts = bTitle.startsWith(currentSearch);
                      if (aStarts && !bStarts) return -1;
                      if (bStarts && !aStarts) return 1;
                      
                      const aContains = aTitle.includes(currentSearch);
                      const bContains = bTitle.includes(currentSearch);
                      if (aContains && !bContains) return -1;
                      if (bContains && !aContains) return 1;
                      
                      return 0;
                    });
                    
                    return sortedSections.map(({ section, category }) => {
                      const Icon = section.icon;
                      return (
                        <CommandItem
                          key={section.id}
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
                    });
                  })()}
                </CommandGroup>
              </>
            )}
          </CommandList>
            </Command>
          </DialogContent>
        </Dialog>

        {/* Sidebar Collapse Toggle Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={`fixed ${isMobile ? 'top-20' : 'top-20'} left-2 z-20 p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border shadow-lg hover:bg-background transition-all duration-300 ${
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

        {/* Left Sidebar - Fixed */}
        <div className={`fixed ${isMobile ? 'top-16' : 'top-16'} left-0 bottom-0 border-r bg-muted/30 backdrop-blur-sm flex flex-col items-start py-4 gap-2 overflow-y-auto scrollbar-thin z-10 transition-all duration-300 ${
          sidebarCollapsed ? 'w-0 border-0 opacity-0 pointer-events-none' : 'w-14 md:w-24'
        }`}>
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
            const hasActiveSection = category.sections.some(s => s.id === expandedSection);
            const isSingleSection = category.sections.length === 1;
            
            // Hide this category if another one is expanded
            const shouldShow = !expandedCategory || expandedCategory === category.id || isSingleSection;
            
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

                {/* Sections (shown when expanded) */}
                {isExpanded && !isSingleSection && (
                  <div className="w-full space-y-1.5 mt-2">
                    {category.sections.map((section) => {
                      const SectionIcon = section.icon;
                      const isActive = expandedSection === section.id;
                      return (
                        <button
                          key={section.id}
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
                        </button>
                      );
                    })}
                  </div>
                )}
                
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
        <main className={`flex-1 overflow-y-auto scrollbar-thin relative z-10 transition-all duration-300 pt-20 ${
          sidebarCollapsed ? 'ml-0' : 'ml-14 md:ml-24'
        } ${isMobile ? 'pb-[60px]' : ''}`}>
          {expandedSection ? (
            <div className="container mx-auto px-3 md:px-6 py-4 md:py-6">
              <Card className="animate-in fade-in slide-in-from-top-4 duration-300">
                <CardHeader>
                  <CardTitle className="text-2xl">
                    {categories.flatMap(c => c.sections).find(s => s.id === expandedSection)?.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {expandedSection === 'overview' && <StaffOverview isAdmin={isAdmin} userId={user?.id} />}
                  {expandedSection === 'inframe' && <InFrameSection />}
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
                  {expandedSection === 'goalstasks' && <GoalsTasksManagement />}
                  {expandedSection === 'staffschedules' && <StaffSchedulesManagement />}
                  {expandedSection === 'playerlist' && <PlayerList isAdmin={isAdmin} />}
                  {expandedSection === 'players' && <PlayerManagement isAdmin={isAdmin} />}
                  {expandedSection === 'recruitment' && <RecruitmentManagement isAdmin={isAdmin} />}
                  {expandedSection === 'playerdatabase' && <PlayerDatabaseManagement isAdmin={isAdmin} />}
                  
                  {expandedSection === 'scoutingcentre' && <ScoutingCentreManagement isAdmin={isAdmin} />}
                  {expandedSection === 'coaching' && <CoachingDatabase isAdmin={isAdmin} />}
                  {expandedSection === 'analysis' && <AnalysisManagement isAdmin={isAdmin} />}
                  {expandedSection === 'highlightmaker' && <HighlightMaker isAdmin={isAdmin} />}
                  {expandedSection === 'marketing' && <MarketingManagement isAdmin={isAdmin} isMarketeer={isMarketeer} />}
                  {expandedSection === 'contentcreator' && <ContentCreator />}
                  {expandedSection === 'marketingideas' && <MarketingIdeas />}
                  {expandedSection === 'blog' && <BlogManagement isAdmin={isAdmin} />}
                  {expandedSection === 'betweenthelines' && <BetweenTheLinesManagement isAdmin={isAdmin} />}
                  {expandedSection === 'openaccess' && <OpenAccessManagement />}
                  {expandedSection === 'submissions' && <FormSubmissionsManagement isAdmin={isAdmin} />}
                  {expandedSection === 'visitors' && <SiteVisitorsManagement isAdmin={isAdmin} />}
                  {expandedSection === 'invoices' && <InvoiceManagement isAdmin={isAdmin} />}
                  {expandedSection === 'payments' && <PaymentsManagement isAdmin={isAdmin} />}
                  {expandedSection === 'expenses' && <ExpensesManagement isAdmin={isAdmin} />}
                  {expandedSection === 'taxrecords' && <TaxRecordsManagement isAdmin={isAdmin} />}
                  {expandedSection === 'budgets' && <BudgetsManagement isAdmin={isAdmin} />}
                  {expandedSection === 'financialreports' && <FinancialReports isAdmin={isAdmin} />}
                  {expandedSection === 'updates' && <UpdatesManagement isAdmin={isAdmin} />}
                  {expandedSection === 'clubnetwork' && <ClubNetworkManagement />}
                  {expandedSection === 'transferhub' && <TransferHub isAdmin={isAdmin} />}
                  {expandedSection === 'athletecentre' && <AthleteCentre />}
                  {expandedSection === 'coachingchat' && <CoachingAIChat />}
                  {expandedSection === 'legal' && <LegalManagement isAdmin={isAdmin} />}
                  {expandedSection === 'sitetext' && <SiteTextManagement isAdmin={isAdmin} />}
                  {expandedSection === 'languages' && <LanguagesManagement isAdmin={isAdmin} />}
                  {expandedSection === 'sitemanagement' && isAdmin && <SiteManagement isAdmin={isAdmin} />}
                  {expandedSection === 'passwords' && isAdmin && <PlayerPasswordManagement />}
                  {expandedSection === 'staffaccounts' && isAdmin && <StaffAccountManagement />}
                  {expandedSection === 'pwainstall' && isAdmin && <StaffPWAInstall />}
                  {expandedSection === 'offlinemanager' && isAdmin && <StaffOfflineManager />}
                  {expandedSection === 'pushnotifications' && isAdmin && <StaffPushNotifications />}
                  {expandedSection === 'notifications' && user?.email === 'jolonlevene98@gmail.com' && <NotificationSettingsManagement />}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <p className="text-lg mb-2">Select a section from the sidebar</p>
                <p className="text-sm">or use the search bar to find what you need</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Search Bar - At Bottom on Mobile */}
      <div className={`border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${isMobile ? 'fixed bottom-0 left-0 right-0' : 'sticky bottom-0'} z-10 relative`}>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Staff;