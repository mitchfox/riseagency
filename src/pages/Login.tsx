import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import smudgedMarbleBg from "@/assets/smudged-marble-login.png";

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(true); // Default to true

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      // Check localStorage for player email
      const playerEmail = localStorage.getItem("player_email") || sessionStorage.getItem("player_email");
      if (playerEmail) {
        const { data } = await supabase
          .from("players")
          .select("id")
          .eq("email", playerEmail)
          .maybeSingle();
          
        if (data) {
          navigate("/portal");
          return;
        } else {
          localStorage.removeItem("player_email");
          sessionStorage.removeItem("player_email");
        }
      }

      // Check localStorage for scout email
      const scoutEmail = localStorage.getItem("scout_email") || sessionStorage.getItem("scout_email");
      if (scoutEmail) {
        const { data } = await supabase
          .from("scouts")
          .select("id")
          .eq("email", scoutEmail)
          .maybeSingle();
          
        if (data) {
          navigate("/scout-portal");
          return;
        } else {
          localStorage.removeItem("scout_email");
          sessionStorage.removeItem("scout_email");
        }
      }
    };

    checkAuth();

    // Load saved email (check both player and scout)
    const savedPlayerEmail = localStorage.getItem("player_saved_email");
    const savedScoutEmail = localStorage.getItem("scout_saved_email");
    const savedEmail = savedPlayerEmail || savedScoutEmail;
    
    if (savedEmail) setEmail(savedEmail);
    
    const savedPlayerRemember = localStorage.getItem("player_remember_me");
    const savedScoutRemember = localStorage.getItem("scout_remember_me");
    
    if (savedPlayerRemember === "false" || savedScoutRemember === "false") {
      setRememberMe(false);
    }
  }, [navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First check if email exists in players table
      const { data: player, error: playerError } = await supabase
        .from("players")
        .select("id, email")
        .eq("email", email)
        .maybeSingle();

      if (playerError) throw playerError;
      
      if (player) {
        // Save player login info
        try {
          localStorage.setItem("player_email", email);
          sessionStorage.setItem("player_email", email);
          localStorage.setItem("player_login_timestamp", Date.now().toString());
          
          if (rememberMe) {
            localStorage.setItem("player_saved_email", email);
            localStorage.setItem("player_remember_me", "true");
          } else {
            localStorage.removeItem("player_saved_email");
            localStorage.setItem("player_remember_me", "false");
          }
        } catch (storageError) {
          console.error("Storage error:", storageError);
        }
        
        toast.success("Welcome to your portal!");
        navigate("/portal");
        return;
      }

      // If not a player, check if email exists in scouts table
      const { data: scout, error: scoutError } = await supabase
        .from("scouts")
        .select("id, email")
        .eq("email", email)
        .maybeSingle();

      if (scoutError) throw scoutError;
      
      if (scout) {
        // Save scout login info
        try {
          localStorage.setItem("scout_email", email);
          sessionStorage.setItem("scout_email", email);
          localStorage.setItem("scout_login_timestamp", Date.now().toString());
          
          if (rememberMe) {
            localStorage.setItem("scout_saved_email", email);
            localStorage.setItem("scout_remember_me", "true");
          } else {
            localStorage.removeItem("scout_saved_email");
            localStorage.setItem("scout_remember_me", "false");
          }
        } catch (storageError) {
          console.error("Storage error:", storageError);
        }
        
        toast.success("Welcome to your scout portal!");
        navigate("/scout-portal");
        return;
      }

      // If neither player nor scout found
      toast.error("Email not found. Please contact support to get access.");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Failed to access portal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
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
              Access your portal to view your personal analysis, programming, and submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email</Label>
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
                  Keep me logged in
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
    </div>
  );
};

export default Login;
