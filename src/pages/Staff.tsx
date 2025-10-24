import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import PlayerManagement from "@/components/staff/PlayerManagement";
import BlogManagement from "@/components/staff/BlogManagement";
import BetweenTheLinesManagement from "@/components/staff/BetweenTheLinesManagement";
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
  const [rememberMe, setRememberMe] = useState(true);
  const [expandedSection, setExpandedSection] = useState<'players' | 'blog' | 'betweenthelines' | null>('players');
  const navigate = useNavigate();

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
        .eq('role', 'staff')
        .single();

      if (error) {
        console.error('Error checking staff role:', error);
        setIsStaff(false);
      } else {
        setIsStaff(!!data);
      }
    } catch (err) {
      console.error('Error:', err);
      setIsStaff(false);
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Staff Dashboard</h1>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </div>

        <div className="space-y-4">
          {/* Players Section */}
          <Card className="cursor-pointer">
            <CardHeader 
              onClick={() => setExpandedSection(expandedSection === 'players' ? null : 'players')}
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
                <PlayerManagement />
              </CardContent>
            )}
          </Card>

          {/* News Articles Section */}
          <Card className="cursor-pointer">
            <CardHeader 
              onClick={() => setExpandedSection(expandedSection === 'blog' ? null : 'blog')}
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
                <BlogManagement />
              </CardContent>
            )}
          </Card>

          {/* Between The Lines Section */}
          <Card className="cursor-pointer">
            <CardHeader 
              onClick={() => setExpandedSection(expandedSection === 'betweenthelines' ? null : 'betweenthelines')}
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
                <BetweenTheLinesManagement />
              </CardContent>
            )}
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Staff;