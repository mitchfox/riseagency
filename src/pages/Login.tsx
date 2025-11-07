import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";
import smudgedMarbleBg from "@/assets/smudged-marble-login.png";

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // Load saved email and remember me preference on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("player_saved_email");
    const savedRememberMe = localStorage.getItem("player_remember_me");
    if (savedEmail) setEmail(savedEmail);
    if (savedRememberMe === "true") setRememberMe(true);
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if email exists in players table
      const { data: player, error: playerError } = await supabase
        .from("players")
        .select("id, email")
        .eq("email", email)
        .maybeSingle();

      if (playerError) throw playerError;
      
      if (!player) {
        toast.error("Email not found. Please contact your coach to get access.");
        setLoading(false);
        return;
      }

      // Save email to localStorage if remember me is checked
      if (rememberMe) {
        localStorage.setItem("player_saved_email", email);
        localStorage.setItem("player_remember_me", "true");
        localStorage.setItem("player_email", email);
      } else {
        // Don't save email for future logins, but keep them logged in this session
        sessionStorage.setItem("player_email", email);
      }
      
      toast.success("Welcome to your portal!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Failed to access portal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-20 px-4">
        <div className="max-w-md mx-auto">
          <Card 
            className="w-full bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${smudgedMarbleBg})` }}
          >
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-bebas uppercase tracking-wider text-center text-white">
              Player Portal
            </CardTitle>
            <CardDescription className="text-center text-white/90">
              The player portal is for our represented players to view their personal analysis and programming
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Login</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder=""
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="email"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/10 text-primary focus:ring-primary focus:ring-offset-0"
                />
                <Label htmlFor="remember" className="text-white text-sm cursor-pointer">
                  Remember me
                </Label>
              </div>
              <Button 
                type="submit" 
                className="w-full btn-shine font-bebas text-lg uppercase tracking-wider"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Access Portal"}
              </Button>
            </form>
          </CardContent>
        </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Login;
