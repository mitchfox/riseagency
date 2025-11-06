import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Search, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
import { MarketingManagement } from "@/components/staff/MarketingManagement";
import { RecruitmentManagement } from "@/components/staff/RecruitmentManagement";
import { StaffAccountManagement } from "@/components/staff/StaffAccountManagement";
import ClubNetworkManagement from "@/components/staff/ClubNetworkManagement";
import LegalManagement from "@/components/staff/LegalManagement";

import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Checkbox } from "@/components/ui/checkbox";
import marbleBackground from "@/assets/smudged-marble-overlay.png";
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
  Lock
} from "lucide-react";

const Staff = () => {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMarketeer, setIsMarketeer] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'overview' | 'staffaccounts' | 'players' | 'playerlist' | 'recruitment' | 'blog' | 'betweenthelines' | 'coaching' | 'analysis' | 'marketing' | 'submissions' | 'visitors' | 'invoices' | 'updates' | 'clubnetwork' | 'legal' | null>('overview');
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check URL parameters for section and player
  useEffect(() => {
    const section = searchParams.get('section');
    if (section && isStaff) {
      setExpandedSection(section as any);
    }
  }, [searchParams, isStaff]);

  const handleSectionToggle = (section: 'overview' | 'staffaccounts' | 'players' | 'playerlist' | 'recruitment' | 'blog' | 'betweenthelines' | 'coaching' | 'analysis' | 'marketing' | 'submissions' | 'visitors' | 'invoices' | 'updates' | 'clubnetwork' | 'legal') => {
    setExpandedSection(expandedSection === section ? null : section);
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
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
      <div className="min-h-screen bg-background">
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
      sections: [{ id: 'overview', title: 'Overview', icon: Calendar }],
      locked: false
    },
    {
      id: 'coaching',
      title: 'Coaching & Management',
      icon: Dumbbell,
      locked: isMarketeer,
      sections: [
        { id: 'players', title: 'Player Management', icon: UserCog },
        { id: 'coaching', title: 'Coaching Database', icon: Dumbbell },
        { id: 'analysis', title: 'Analysis Writer', icon: LineChart },
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
        { id: 'blog', title: 'News Articles', icon: Newspaper },
        { id: 'betweenthelines', title: 'Between The Lines', icon: FileText },
        { id: 'visitors', title: 'Site Visitors', icon: Eye },
      ]
    },
    {
      id: 'admin',
      title: 'Admin & Legal',
      icon: Scale,
      locked: isMarketeer,
      sections: [
        { id: 'legal', title: 'Legal', icon: Scale },
        { id: 'invoices', title: 'Invoices', icon: FileCheck },
        ...(isAdmin ? [{ id: 'staffaccounts', title: 'Staff Accounts', icon: Shield }] : []),
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
          backgroundImage: `url(${marbleBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.25,
        }}
      />
      <Header />
      
      {/* Search Bar */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 relative">
        <div className="container mx-auto px-3 md:px-4 py-3">
          <div className="flex items-center justify-between gap-2 md:gap-4">
            {/* Mobile menu button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-4 overflow-y-auto">
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

      {/* Main Layout with Sidebar */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar */}
        <div className="flex w-14 md:w-24 border-r bg-muted/30 backdrop-blur-sm flex-col items-start py-4 gap-2 overflow-y-auto relative z-10">
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
                  <span className={`hidden md:block text-[6px] leading-tight text-center px-0.5 font-medium uppercase tracking-tight ${hasActiveSection || isExpanded ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
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
                          <span className={`hidden md:block text-[5px] leading-tight text-center px-0.5 font-medium uppercase tracking-tight ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
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
        <main className="flex-1 overflow-y-auto relative z-10">
          {expandedSection ? (
            <div className="container mx-auto px-3 md:px-6 py-4 md:py-6">
              <Card className="animate-in fade-in slide-in-from-top-4 duration-300">
                <CardHeader>
                  <CardTitle className="text-2xl">
                    {categories.flatMap(c => c.sections).find(s => s.id === expandedSection)?.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {expandedSection === 'overview' && <StaffOverview isAdmin={isAdmin} />}
                  {expandedSection === 'playerlist' && <PlayerList isAdmin={isAdmin} />}
                  {expandedSection === 'players' && <PlayerManagement isAdmin={isAdmin} />}
                  {expandedSection === 'recruitment' && <RecruitmentManagement isAdmin={isAdmin} />}
                  {expandedSection === 'coaching' && <CoachingDatabase isAdmin={isAdmin} />}
                  {expandedSection === 'analysis' && <AnalysisManagement isAdmin={isAdmin} />}
                  {expandedSection === 'marketing' && <MarketingManagement isAdmin={isAdmin} />}
                  {expandedSection === 'blog' && <BlogManagement isAdmin={isAdmin} />}
                  {expandedSection === 'betweenthelines' && <BetweenTheLinesManagement isAdmin={isAdmin} />}
                  {expandedSection === 'submissions' && <FormSubmissionsManagement isAdmin={isAdmin} />}
                  {expandedSection === 'visitors' && <SiteVisitorsManagement isAdmin={isAdmin} />}
                  {expandedSection === 'invoices' && <InvoiceManagement isAdmin={isAdmin} />}
                  {expandedSection === 'updates' && <UpdatesManagement isAdmin={isAdmin} />}
                  {expandedSection === 'clubnetwork' && <ClubNetworkManagement />}
                  {expandedSection === 'legal' && <LegalManagement isAdmin={isAdmin} />}
                  {expandedSection === 'staffaccounts' && isAdmin && <StaffAccountManagement />}
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
    </div>
  );
};

export default Staff;