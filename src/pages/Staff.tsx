import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
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

import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronRight } from "lucide-react";

const Staff = () => {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'schedule' | 'staffaccounts' | 'players' | 'playerlist' | 'recruitment' | 'blog' | 'betweenthelines' | 'coaching' | 'analysis' | 'marketing' | 'submissions' | 'visitors' | 'invoices' | 'updates' | 'clubnetwork' | null>('schedule');
  const navigate = useNavigate();
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const handleSectionToggle = (section: 'schedule' | 'staffaccounts' | 'players' | 'playerlist' | 'recruitment' | 'blog' | 'betweenthelines' | 'coaching' | 'analysis' | 'marketing' | 'submissions' | 'visitors' | 'invoices' | 'updates' | 'clubnetwork') => {
    const isExpanding = expandedSection !== section;
    setExpandedSection(expandedSection === section ? null : section);
    
    // Keep the section header in view when expanding
    if (isExpanding) {
      setTimeout(() => {
        sectionRefs.current[section]?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 50);
    }
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold">Staff Dashboard</h1>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </div>


        <div className="space-y-4">
          {/* Schedule Section */}
          <Card className="cursor-pointer">
            <CardHeader 
              ref={(el) => sectionRefs.current['schedule'] = el}
              onClick={() => handleSectionToggle('schedule')}
              className="hover:bg-accent/50 transition-colors"
            >
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl">SCHEDULE</CardTitle>
                <div className="text-muted-foreground">
                  {expandedSection === 'schedule' ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                </div>
              </div>
            </CardHeader>
            {expandedSection === 'schedule' && (
              <CardContent className="pt-6">
                <StaffSchedule isAdmin={isAdmin} />
              </CardContent>
            )}
          </Card>

          {/* Player List Section */}
          <Card className="cursor-pointer">
            <CardHeader 
              ref={(el) => sectionRefs.current['playerlist'] = el}
              onClick={() => handleSectionToggle('playerlist')}
              className="hover:bg-accent/50 transition-colors"
            >
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl">PLAYER LIST</CardTitle>
                <div className="text-muted-foreground">
                  {expandedSection === 'playerlist' ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                </div>
              </div>
            </CardHeader>
            {expandedSection === 'playerlist' && (
              <CardContent className="pt-6">
                <PlayerList isAdmin={isAdmin} />
              </CardContent>
            )}
          </Card>

          {/* Players Section */}
          <Card className="cursor-pointer">
            <CardHeader 
              ref={(el) => sectionRefs.current['players'] = el}
              onClick={() => handleSectionToggle('players')}
              className="hover:bg-accent/50 transition-colors"
            >
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl">PLAYER MANAGEMENT</CardTitle>
                <div className="text-muted-foreground">
                  {expandedSection === 'players' ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                </div>
              </div>
            </CardHeader>
            {expandedSection === 'players' && (
              <CardContent className="pt-6">
                <PlayerManagement isAdmin={isAdmin} />
              </CardContent>
            )}
          </Card>

          {/* Recruitment Section */}
          <Card className="cursor-pointer">
            <CardHeader 
              ref={(el) => sectionRefs.current['recruitment'] = el}
              onClick={() => handleSectionToggle('recruitment')}
              className="hover:bg-accent/50 transition-colors"
            >
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl">RECRUITMENT</CardTitle>
                <div className="text-muted-foreground">
                  {expandedSection === 'recruitment' ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                </div>
              </div>
            </CardHeader>
            {expandedSection === 'recruitment' && (
              <CardContent className="pt-6">
                <RecruitmentManagement isAdmin={isAdmin} />
              </CardContent>
            )}
          </Card>

          {/* Coaching Database Section */}
          <Card className="cursor-pointer">
            <CardHeader 
              ref={(el) => sectionRefs.current['coaching'] = el}
              onClick={() => handleSectionToggle('coaching')}
              className="hover:bg-accent/50 transition-colors"
            >
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl">Coaching Database</CardTitle>
                <div className="text-muted-foreground">
                  {expandedSection === 'coaching' ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                </div>
              </div>
            </CardHeader>
            {expandedSection === 'coaching' && (
              <CardContent className="pt-6">
                <CoachingDatabase isAdmin={isAdmin} />
              </CardContent>
            )}
          </Card>

          {/* Analysis Writer Section */}
          <Card className="cursor-pointer">
            <CardHeader 
              ref={(el) => sectionRefs.current['analysis'] = el}
              onClick={() => handleSectionToggle('analysis')}
              className="hover:bg-accent/50 transition-colors"
            >
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl">Analysis Writer</CardTitle>
                <div className="text-muted-foreground">
                  {expandedSection === 'analysis' ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                </div>
              </div>
            </CardHeader>
            {expandedSection === 'analysis' && (
              <CardContent className="pt-6">
                <AnalysisManagement isAdmin={isAdmin} />
              </CardContent>
            )}
          </Card>

          {/* Marketing Section */}
          <Card className="cursor-pointer">
            <CardHeader 
              ref={(el) => sectionRefs.current['marketing'] = el}
              onClick={() => handleSectionToggle('marketing')}
              className="hover:bg-accent/50 transition-colors"
            >
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl">MARKETING</CardTitle>
                <div className="text-muted-foreground">
                  {expandedSection === 'marketing' ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                </div>
              </div>
            </CardHeader>
            {expandedSection === 'marketing' && (
              <CardContent className="pt-6">
                <MarketingManagement isAdmin={isAdmin} />
              </CardContent>
            )}
          </Card>


          {/* News Articles Section */}
          <Card className="cursor-pointer">
            <CardHeader 
              ref={(el) => sectionRefs.current['blog'] = el}
              onClick={() => handleSectionToggle('blog')}
              className="hover:bg-accent/50 transition-colors"
            >
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl">News Articles</CardTitle>
                <div className="text-muted-foreground">
                  {expandedSection === 'blog' ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                </div>
              </div>
            </CardHeader>
            {expandedSection === 'blog' && (
              <CardContent className="pt-6">
                <BlogManagement isAdmin={isAdmin} />
              </CardContent>
            )}
          </Card>

          {/* Between The Lines Section */}
          <Card className="cursor-pointer">
            <CardHeader 
              ref={(el) => sectionRefs.current['betweenthelines'] = el}
              onClick={() => handleSectionToggle('betweenthelines')}
              className="hover:bg-accent/50 transition-colors"
            >
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl">Between The Lines</CardTitle>
                <div className="text-muted-foreground">
                  {expandedSection === 'betweenthelines' ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                </div>
              </div>
            </CardHeader>
            {expandedSection === 'betweenthelines' && (
              <CardContent className="pt-6">
                <BetweenTheLinesManagement isAdmin={isAdmin} />
              </CardContent>
            )}
          </Card>

          {/* Form Submissions Section */}
          <Card className="cursor-pointer">
            <CardHeader 
              ref={(el) => sectionRefs.current['submissions'] = el}
              onClick={() => handleSectionToggle('submissions')}
              className="hover:bg-accent/50 transition-colors"
            >
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl">Form Submissions</CardTitle>
                <div className="text-muted-foreground">
                  {expandedSection === 'submissions' ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                </div>
              </div>
            </CardHeader>
            {expandedSection === 'submissions' && (
              <CardContent className="pt-6">
                <FormSubmissionsManagement isAdmin={isAdmin} />
              </CardContent>
            )}
          </Card>

          {/* Site Visitors Section */}
          <Card className="cursor-pointer">
            <CardHeader 
              ref={(el) => sectionRefs.current['visitors'] = el}
              onClick={() => handleSectionToggle('visitors')}
              className="hover:bg-accent/50 transition-colors"
            >
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl">SITE VISITORS</CardTitle>
                <div className="text-muted-foreground">
                  {expandedSection === 'visitors' ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                </div>
              </div>
            </CardHeader>
            {expandedSection === 'visitors' && (
              <CardContent className="pt-6">
                <SiteVisitorsManagement isAdmin={isAdmin} />
              </CardContent>
            )}
          </Card>

          {/* Invoices Section */}
          <Card className="cursor-pointer">
            <CardHeader 
              ref={(el) => sectionRefs.current['invoices'] = el}
              onClick={() => handleSectionToggle('invoices')}
              className="hover:bg-accent/50 transition-colors"
            >
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl">INVOICES</CardTitle>
                <div className="text-muted-foreground">
                  {expandedSection === 'invoices' ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                </div>
              </div>
            </CardHeader>
            {expandedSection === 'invoices' && (
              <CardContent className="pt-6">
                <InvoiceManagement isAdmin={isAdmin} />
              </CardContent>
            )}
          </Card>

          {/* Updates Section */}
          <Card className="cursor-pointer">
            <CardHeader 
              ref={(el) => sectionRefs.current['updates'] = el}
              onClick={() => handleSectionToggle('updates')}
              className="hover:bg-accent/50 transition-colors"
            >
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl">UPDATES</CardTitle>
                <div className="text-muted-foreground">
                  {expandedSection === 'updates' ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                </div>
              </div>
            </CardHeader>
            {expandedSection === 'updates' && (
              <CardContent className="pt-6">
                <UpdatesManagement isAdmin={isAdmin} />
              </CardContent>
            )}
          </Card>

          {/* Club Network Section */}
          <Card className="cursor-pointer">
            <CardHeader 
              ref={(el) => sectionRefs.current['clubnetwork'] = el}
              onClick={() => handleSectionToggle('clubnetwork')}
              className="hover:bg-accent/50 transition-colors"
            >
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl">CLUB NETWORK</CardTitle>
                <div className="text-muted-foreground">
                  {expandedSection === 'clubnetwork' ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                </div>
              </div>
            </CardHeader>
            {expandedSection === 'clubnetwork' && (
              <CardContent className="pt-6">
                <ClubNetworkManagement />
              </CardContent>
            )}
          </Card>

          {/* Staff Accounts Section - Admin Only */}
          {isAdmin && (
            <Card className="cursor-pointer">
              <CardHeader 
                ref={(el) => sectionRefs.current['staffaccounts'] = el}
                onClick={() => handleSectionToggle('staffaccounts')}
                className="hover:bg-accent/50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <CardTitle className="text-2xl">STAFF ACCOUNTS</CardTitle>
                  <div className="text-muted-foreground">
                    {expandedSection === 'staffaccounts' ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                  </div>
                </div>
              </CardHeader>
              {expandedSection === 'staffaccounts' && (
                <CardContent className="pt-6">
                  <StaffAccountManagement />
                </CardContent>
              )}
            </Card>
          )}

          {/* Logout Button */}
          <div className="mt-8 flex justify-center">
            <Button
              onClick={handleLogout}
              variant="outline"
              size="lg"
              className="font-bebas uppercase tracking-wider text-lg"
            >
              Logout
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Staff;