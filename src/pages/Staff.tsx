import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Search } from "lucide-react";
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
import { MarketingManagement } from "@/components/staff/MarketingManagement";
import { RecruitmentManagement } from "@/components/staff/RecruitmentManagement";
import { StaffAccountManagement } from "@/components/staff/StaffAccountManagement";
import ClubNetworkManagement from "@/components/staff/ClubNetworkManagement";
import LegalManagement from "@/components/staff/LegalManagement";

import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Checkbox } from "@/components/ui/checkbox";
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
  Shield
} from "lucide-react";

const Staff = () => {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'overview' | 'staffaccounts' | 'players' | 'playerlist' | 'recruitment' | 'blog' | 'betweenthelines' | 'coaching' | 'analysis' | 'marketing' | 'submissions' | 'visitors' | 'invoices' | 'updates' | 'clubnetwork' | 'legal' | null>('overview');
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

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
        .in('role', ['staff', 'admin']);

      if (error) {
        console.error('Error checking staff role:', error);
        setIsStaff(false);
        setIsAdmin(false);
      } else {
        setIsStaff(data && data.length > 0);
        setIsAdmin(data?.some(row => row.role === 'admin') ?? false);
      }
    } catch (err) {
      console.error('Error:', err);
      setIsStaff(false);
      setIsAdmin(false);
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

  const sections = [
    { id: 'overview', title: 'Overview', icon: Calendar },
    { id: 'playerlist', title: 'Player List', icon: Users },
    { id: 'players', title: 'Player Management', icon: UserCog },
    { id: 'recruitment', title: 'Recruitment', icon: Target },
    { id: 'coaching', title: 'Coaching Database', icon: Dumbbell },
    { id: 'analysis', title: 'Analysis Writer', icon: LineChart },
    { id: 'marketing', title: 'Marketing', icon: Megaphone },
    { id: 'blog', title: 'News Articles', icon: Newspaper },
    { id: 'betweenthelines', title: 'Between The Lines', icon: FileText },
    { id: 'submissions', title: 'Form Submissions', icon: Mail },
    { id: 'visitors', title: 'Site Visitors', icon: Eye },
    { id: 'invoices', title: 'Invoices', icon: FileCheck },
    { id: 'updates', title: 'Player Updates', icon: BellRing },
    { id: 'clubnetwork', title: 'Club Network', icon: Network },
    { id: 'legal', title: 'Legal', icon: Scale },
    ...(isAdmin ? [{ id: 'staffaccounts', title: 'Staff Accounts', icon: Shield }] : []),
  ] as const;

  const filteredSections = sections.filter(section =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      {/* Search Bar */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm">
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Layout with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-16 border-r bg-muted/30 flex flex-col items-center py-4 gap-2 overflow-y-auto">
          {filteredSections.map((section) => {
            const Icon = section.icon;
            const isActive = expandedSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => handleSectionToggle(section.id as any)}
                className={`group relative w-12 h-12 rounded-lg flex items-center justify-center transition-all hover:bg-primary/10 ${
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                }`}
                title={section.title}
              >
                <Icon className="w-5 h-5" />
                <span className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-md">
                  {section.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          {expandedSection ? (
            <div className="container mx-auto px-6 py-6">
              <Card className="animate-in fade-in slide-in-from-top-4 duration-300">
                <CardHeader>
                  <CardTitle className="text-2xl">
                    {sections.find(s => s.id === expandedSection)?.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {expandedSection === 'overview' && <StaffSchedule isAdmin={isAdmin} />}
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