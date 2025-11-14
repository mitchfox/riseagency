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
      // Check for existing Supabase auth session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // User is authenticated, get their email
        const userEmail = session.user.email;
        if (userEmail) {
          // Verify the email still exists in database
          const { data: player } = await supabase
            .from("players")
            .select("id")
            .eq("email", userEmail)
            .maybeSingle();
            
          if (player) {
            // Restore to both storages if missing
            try {
              localStorage.setItem("player_email", userEmail);
              sessionStorage.setItem("player_email", userEmail);
            } catch (e) {
              console.error("Storage error:", e);
            }
            navigate("/dashboard");
            return;
          }
        }
      }
      
      // Fallback to old localStorage check for backwards compatibility
      let playerEmail = localStorage.getItem("player_email") || sessionStorage.getItem("player_email");
      if (playerEmail) {
        // Verify the email still exists in database
        const { data } = await supabase
          .from("players")
          .select("id")
          .eq("email", playerEmail)
          .maybeSingle();
          
        if (data) {
          navigate("/dashboard");
        } else {
          // Email no longer valid, clear it
          localStorage.removeItem("player_email");
          sessionStorage.removeItem("player_email");
        }
      }
    };

    checkAuth();

    const savedEmail = localStorage.getItem("player_saved_email");
    const savedRememberMe = localStorage.getItem("player_remember_me");
    if (savedEmail) setEmail(savedEmail);
    if (savedRememberMe === "false") setRememberMe(false);
  }, [navigate]);

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

      // Authenticate with Supabase using player ID as password
      // This allows RLS policies to work properly
      const playerPassword = `rise_player_${player.id}`;
      
      // Try to sign in first
      let authResult = await supabase.auth.signInWithPassword({
        email: email,
        password: playerPassword,
      });

      // If sign in fails (account doesn't exist), create the account
      if (authResult.error?.message.includes('Invalid login credentials')) {
        const signUpResult = await supabase.auth.signUp({
          email: email,
          password: playerPassword,
          options: {
            data: {
              player_id: player.id,
            }
          }
        });
        
        if (signUpResult.error) throw signUpResult.error;
        
        // Auto sign-in is enabled, so we should be logged in now
        authResult = signUpResult;
      } else if (authResult.error) {
        throw authResult.error;
      }

      // Save login session to BOTH localStorage and sessionStorage for maximum persistence
      try {
        localStorage.setItem("player_email", email);
        sessionStorage.setItem("player_email", email);
        localStorage.setItem("player_login_timestamp", Date.now().toString());
        
        // Save email for auto-fill if remember me is checked
        if (rememberMe) {
          localStorage.setItem("player_saved_email", email);
          localStorage.setItem("player_remember_me", "true");
        } else {
          localStorage.removeItem("player_saved_email");
          localStorage.setItem("player_remember_me", "false");
        }
      } catch (storageError) {
        console.error("Storage error:", storageError);
        // Continue anyway - the app might still work
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
